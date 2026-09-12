import type { ContributionId, ContributionKind, ContributionMediaUpload, ContributionSubmission, ContributionUploadId, SpotId } from "./types.ts";

export const CONTRIBUTION_FORMAL_FIELD_KEYS = [
  "address",
  "name",
  "openness",
  "hours",
  "access",
  "accessNote",
  "road",
  "safety",
  "parking",
  "parkingNote",
  "toilet",
  "toiletNote",
  "platform",
  "horizon",
  "light",
  "signal",
  "camping",
  "contact",
  "detail",
] as const;

export type ContributionFormalFieldKey =
  (typeof CONTRIBUTION_FORMAL_FIELD_KEYS)[number];

export const CONTRIBUTION_MEDIA_KINDS = ["parking", "toilet", "site"] as const;
export type ContributionMediaKind = (typeof CONTRIBUTION_MEDIA_KINDS)[number];

export interface ContributionFormalBaseline {
  spotId: SpotId;
  revision: number;
  fields: Readonly<Record<ContributionFormalFieldKey, string | null>>;
  media: Readonly<Record<ContributionMediaKind, readonly string[]>>;
}

export interface ContributionFormalProposal {
  fields: Readonly<Partial<Record<ContributionFormalFieldKey, string>>>;
  media: Readonly<Partial<Record<ContributionMediaKind, readonly string[]>>>;
}

export type ContributionConflictResolution = "CURRENT" | "PROPOSED";

export interface ContributionFieldConflict {
  kind: "FIELD";
  key: ContributionFormalFieldKey;
  baselineValue: string | null;
  currentValue: string | null;
  proposedValue: string;
}

export interface ContributionMediaConflict {
  kind: "MEDIA";
  key: ContributionMediaKind;
  baselineValue: readonly string[];
  currentValue: readonly string[];
  proposedValue: readonly string[];
}

export type ContributionFormalConflict =
  | ContributionFieldConflict
  | ContributionMediaConflict;

export interface ContributionFormalConflictResolutions {
  fields?: Readonly<Partial<Record<ContributionFormalFieldKey, ContributionConflictResolution>>>;
  media?: Readonly<Partial<Record<ContributionMediaKind, ContributionConflictResolution>>>;
}

export interface ContributionFormalFeedbackSnapshot {
  baseline: ContributionFormalBaseline;
  /** User-authored differences against baseline. Missing keys were untouched. */
  proposal: ContributionFormalProposal;
  /** Proposal after rebasing onto the version verified at submission time. */
  resolvedProposal: ContributionFormalProposal;
}

export interface ContributionFormalSubmitRequest {
  kind: Extract<ContributionKind, "FIELD_REPORT" | "CORRECTION">;
  baseline: ContributionFormalBaseline;
  proposal: ContributionFormalProposal;
  resolutions?: ContributionFormalConflictResolutions;
  observedAt: string | null;
  rightsConfirmed: boolean;
  /** Present only when resubmitting a rejected/changes-requested aggregate. */
  submissionId?: ContributionId;
  expectedSubmissionRevision?: number;
  uploadIntentId?: string;
  expectedUploadIntentRevision?: number;
}

export type ContributionFormalSubmitResult =
  | {
      state: "CONFLICT";
      currentBaseline: ContributionFormalBaseline;
      conflicts: readonly ContributionFormalConflict[];
    }
  | {
      state: "SUBMITTED";
      submission: ContributionSubmission;
    };

export interface ContributionFormalMediaUpload extends ContributionMediaUpload {
  kind: ContributionMediaKind;
}

export interface ContributionFormalUploadIntent {
  intentId: string;
  spotId: SpotId;
  baselineRevision: number;
  uploads: readonly ContributionFormalMediaUpload[];
  revision: number;
  createdAt: string;
  expiresAt: string;
}

export interface ContributionFormalUploadIntentRequest {
  spotId: SpotId;
  baselineRevision: number;
}

export interface ContributionFormalUploadSessionRequest {
  kind: ContributionMediaKind;
  originalName: string;
  mimeType: ContributionMediaUpload["mimeType"];
  byteSize: number;
  expectedRevision: number;
}

export interface ContributionFormalUploadCompleteRequest {
  dataBase64: string;
}

export interface ContributionFormalUploadRemoveRequest {
  expectedRevision: number;
}

function equalIds(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * Three-way rebase for one formal-spot feedback attempt. Missing proposal keys
 * are untouched; an empty string is an explicit clear. The caller must not
 * submit while conflicts remain unresolved.
 */
export function resolveContributionFormalRebase(input: {
  baseline: ContributionFormalBaseline;
  current: ContributionFormalBaseline;
  proposal: ContributionFormalProposal;
  resolutions?: ContributionFormalConflictResolutions;
}) {
  if (input.baseline.spotId !== input.current.spotId)
    throw new Error("contribution_baseline_spot_mismatch");
  if (!Number.isSafeInteger(input.baseline.revision) || input.baseline.revision <= 0)
    throw new Error("contribution_baseline_revision_invalid");
  if (!Number.isSafeInteger(input.current.revision) || input.current.revision < input.baseline.revision)
    throw new Error("contribution_current_revision_invalid");

  const conflicts: ContributionFormalConflict[] = [];
  const fields: Partial<Record<ContributionFormalFieldKey, string>> = {};
  for (const key of CONTRIBUTION_FORMAL_FIELD_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(input.proposal.fields, key)) continue;
    const proposed = input.proposal.fields[key]!;
    const before = input.baseline.fields[key];
    const current = input.current.fields[key];
    if (proposed === before || proposed === current) continue;
    const resolution = input.resolutions?.fields?.[key];
    if (current !== before && !resolution) {
      conflicts.push({ kind: "FIELD", key, baselineValue: before, currentValue: current, proposedValue: proposed });
      continue;
    }
    if (current === before || resolution === "PROPOSED") fields[key] = proposed;
  }

  const media: Partial<Record<ContributionMediaKind, readonly string[]>> = {};
  for (const key of CONTRIBUTION_MEDIA_KINDS) {
    if (!Object.prototype.hasOwnProperty.call(input.proposal.media, key)) continue;
    const proposed = [...input.proposal.media[key]!];
    const before = input.baseline.media[key];
    const current = input.current.media[key];
    if (equalIds(proposed, before) || equalIds(proposed, current)) continue;
    const resolution = input.resolutions?.media?.[key];
    if (!equalIds(current, before) && !resolution) {
      conflicts.push({ kind: "MEDIA", key, baselineValue: [...before], currentValue: [...current], proposedValue: proposed });
      continue;
    }
    if (equalIds(current, before) || resolution === "PROPOSED") media[key] = proposed;
  }

  return {
    baseline: input.current,
    proposal: { fields, media } satisfies ContributionFormalProposal,
    conflicts,
  };
}
