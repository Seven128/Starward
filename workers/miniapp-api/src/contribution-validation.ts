import { isDeepStrictEqual } from "node:util";
import {
  CONTRIBUTION_FORMAL_FIELD_KEYS,
  CONTRIBUTION_MEDIA_KINDS,
  type ContributionDraftRequest,
  type ContributionKind,
  type ContributionMediaUpload,
  type ContributionSubmission,
  type ContributionTopic,
  type ContributionUpdateRequest,
  type ContributionFormalSubmitRequest,
  type ContributionFormalBaseline,
  type ContributionFormalProposal,
  type SpotId,
} from "@starward/miniapp-contracts";
import { isContributionEditable } from "./contribution-attempts.ts";

const KINDS = new Set<ContributionKind>([
  "FIELD_REPORT",
  "CORRECTION",
  "NEW_SPOT_PROPOSAL",
]);
const TOPICS = new Set<ContributionTopic>([
  "LAST_ROAD",
  "PARKING",
  "FACILITIES",
  "OPENNESS",
  "LEGAL_ACCESS",
  "NIGHT_SAFETY",
  "HORIZON",
  "SITE_MEDIA",
  "OTHER",
]);

export const CONTRIBUTION_MEDIA_MIME_TYPES = new Set<
  ContributionMediaUpload["mimeType"]
>(["image/jpeg", "image/png"]);
export const CONTRIBUTION_UPLOAD_TTL_MS = 20 * 60 * 1_000;
export const MAX_CONTRIBUTION_MEDIA = 3;
export const MAX_NEW_SPOT_MEDIA = 9;

export function assertContributionUploadFits(
  submission: ContributionSubmission,
  upload: ContributionMediaUpload,
  replaced?: ContributionMediaUpload,
) {
  if (submission.kind === "NEW_SPOT_PROPOSAL") {
    if (!upload.kind || !(CONTRIBUTION_MEDIA_KINDS as readonly string[]).includes(upload.kind))
      throw new Error("contribution_media_kind_required");
    if (replaced && replaced.kind !== upload.kind)
      throw new Error("contribution_media_replacement_kind_invalid");
    if (!replaced && submission.media.length >= MAX_NEW_SPOT_MEDIA)
      throw new Error("contribution_media_count_invalid");
    if (!replaced && submission.media.filter((item) => item.kind === upload.kind).length >= 3)
      throw new Error("contribution_media_kind_count_invalid");
    return;
  }
  if (upload.kind) throw new Error("contribution_media_kind_invalid");
  if (!replaced && submission.media.length >= MAX_CONTRIBUTION_MEDIA)
    throw new Error("contribution_media_count_invalid");
}

const FORMAL_ENUMS: Readonly<Partial<Record<(typeof CONTRIBUTION_FORMAL_FIELD_KEYS)[number], ReadonlySet<string>>>> = {
  openness: new Set(["开放", "有条件开放", "不开放"]),
  access: new Set(["允许进入", "需预约或其他条件", "禁止进入"]),
  parking: new Set(["有", "没有", "季节性开放"]),
  toilet: new Set(["有", "没有", "季节性开放"]),
};

function assertFormalBaseline(value: ContributionFormalBaseline) {
  if (!value || typeof value !== "object" || typeof value.spotId !== "string" || !value.spotId.startsWith("spot:") ||
      !Number.isSafeInteger(value.revision) || value.revision < 1 || !value.fields || !value.media)
    throw new Error("contribution_baseline_invalid");
  for (const key of CONTRIBUTION_FORMAL_FIELD_KEYS) {
    const field = value.fields[key];
    if (field !== null) cleanContributionText(field, 2_000);
  }
  for (const key of CONTRIBUTION_MEDIA_KINDS) {
    const ids = value.media[key];
    if (!Array.isArray(ids) || ids.length > 24 || ids.some(id => typeof id !== "string" || !id || id.length > 180) || new Set(ids).size !== ids.length)
      throw new Error("contribution_baseline_media_invalid");
  }
}

export function assertContributionBaselineMatches(provided: ContributionFormalBaseline, authoritative: ContributionFormalBaseline) {
  assertFormalBaseline(provided);
  if (!isDeepStrictEqual(provided, authoritative))
    throw new Error("contribution_baseline_snapshot_invalid");
}

function normalizeFormalProposal(value: ContributionFormalProposal): ContributionFormalProposal {
  if (!value || typeof value !== "object" || !value.fields || !value.media)
    throw new Error("contribution_formal_proposal_invalid");
  const fields: Partial<Record<(typeof CONTRIBUTION_FORMAL_FIELD_KEYS)[number], string>> = {};
  for (const key of Object.keys(value.fields)) {
    if (!(CONTRIBUTION_FORMAL_FIELD_KEYS as readonly string[]).includes(key)) throw new Error("contribution_formal_field_invalid");
    const typedKey = key as (typeof CONTRIBUTION_FORMAL_FIELD_KEYS)[number];
    const cleaned = cleanContributionText(value.fields[typedKey], typedKey === "detail" ? 2_000 : 300);
    if (FORMAL_ENUMS[typedKey] && cleaned && !FORMAL_ENUMS[typedKey]!.has(cleaned)) throw new Error("contribution_formal_choice_invalid");
    fields[typedKey] = cleaned;
  }
  const media: Partial<Record<(typeof CONTRIBUTION_MEDIA_KINDS)[number], readonly string[]>> = {};
  for (const key of Object.keys(value.media)) {
    if (!(CONTRIBUTION_MEDIA_KINDS as readonly string[]).includes(key)) throw new Error("contribution_formal_media_kind_invalid");
    const typedKey = key as (typeof CONTRIBUTION_MEDIA_KINDS)[number];
    const ids = value.media[typedKey];
    if (!Array.isArray(ids) || ids.length > 9 || ids.some(id => typeof id !== "string" || !id || id.length > 180) || new Set(ids).size !== ids.length)
      throw new Error("contribution_formal_media_invalid");
    media[typedKey] = [...ids];
  }
  if (!Object.keys(fields).length && !Object.keys(media).length) throw new Error("contribution_formal_changes_required");
  return { fields, media };
}

function normalizeCandidateProfile(value: ContributionFormalProposal): ContributionFormalProposal {
  if (!value || typeof value !== "object" || !value.fields || !value.media)
    throw new Error("contribution_candidate_profile_invalid");
  const fields: Partial<Record<(typeof CONTRIBUTION_FORMAL_FIELD_KEYS)[number], string>> = {};
  for (const key of Object.keys(value.fields)) {
    if (!(CONTRIBUTION_FORMAL_FIELD_KEYS as readonly string[]).includes(key))
      throw new Error("contribution_formal_field_invalid");
    const typedKey = key as (typeof CONTRIBUTION_FORMAL_FIELD_KEYS)[number];
    const cleaned = cleanContributionText(value.fields[typedKey], typedKey === "detail" ? 2_000 : 300);
    if (FORMAL_ENUMS[typedKey] && cleaned && !FORMAL_ENUMS[typedKey]!.has(cleaned))
      throw new Error("contribution_formal_choice_invalid");
    fields[typedKey] = cleaned;
  }
  const media: Partial<Record<(typeof CONTRIBUTION_MEDIA_KINDS)[number], readonly string[]>> = {};
  for (const key of Object.keys(value.media)) {
    if (!(CONTRIBUTION_MEDIA_KINDS as readonly string[]).includes(key))
      throw new Error("contribution_formal_media_kind_invalid");
    const typedKey = key as (typeof CONTRIBUTION_MEDIA_KINDS)[number];
    const ids = value.media[typedKey];
    if (!Array.isArray(ids) || ids.length > 3 || ids.some(id => typeof id !== "string" || !id || id.length > 180) || new Set(ids).size !== ids.length)
      throw new Error("contribution_formal_media_invalid");
    media[typedKey] = [...ids];
  }
  return { fields, media };
}

export function normalizeFormalContributionInput(input: ContributionFormalSubmitRequest): ContributionFormalSubmitRequest {
  if (!input || !["FIELD_REPORT", "CORRECTION"].includes(input.kind)) throw new Error("contribution_kind_invalid");
  assertFormalBaseline(input.baseline);
  const observed = input.observedAt === null ? null : Date.parse(input.observedAt);
  if (observed !== null && (!Number.isFinite(observed) || observed > Date.now() + 5 * 60_000)) throw new Error("contribution_observed_at_invalid");
  if (input.kind === "FIELD_REPORT" && observed === null) throw new Error("contribution_observed_at_required");
  if (typeof input.rightsConfirmed !== "boolean") throw new Error("contribution_rights_invalid");
  if ((input.submissionId === undefined) !== (input.expectedSubmissionRevision === undefined)) throw new Error("contribution_resubmit_identity_invalid");
  if (input.expectedSubmissionRevision !== undefined && (!Number.isSafeInteger(input.expectedSubmissionRevision) || input.expectedSubmissionRevision < 1)) throw new Error("contribution_revision_invalid");
  if ((input.uploadIntentId === undefined) !== (input.expectedUploadIntentRevision === undefined)) throw new Error("formal_upload_intent_identity_invalid");
  if (input.uploadIntentId !== undefined && (!/^formal-upload-intent:[a-zA-Z0-9-]{16,80}$/u.test(input.uploadIntentId) || !Number.isSafeInteger(input.expectedUploadIntentRevision) || input.expectedUploadIntentRevision! < 1)) throw new Error("formal_upload_intent_identity_invalid");
  return { ...structuredClone(input), proposal: normalizeFormalProposal(input.proposal) };
}

export function cleanContributionText(value: unknown, maximum: number) {
  if (
    typeof value !== "string" ||
    value.length > maximum ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)
  )
    throw new Error("contribution_text_invalid");
  return value.trim();
}

function uniqueTopics(value: readonly ContributionTopic[]) {
  if (
    !Array.isArray(value) ||
    value.length > TOPICS.size ||
    value.some((topic) => !TOPICS.has(topic)) ||
    new Set(value).size !== value.length
  )
    throw new Error("contribution_topics_invalid");
  return [...value];
}

export function normalizeContributionInput(
  input: ContributionDraftRequest | ContributionUpdateRequest,
) {
  if (!KINDS.has(input.kind)) throw new Error("contribution_kind_invalid");
  const observedTimestamp =
    input.observedAt === null ? null : Date.parse(input.observedAt);
  if (
    observedTimestamp !== null &&
    (!Number.isFinite(observedTimestamp) ||
      observedTimestamp > Date.now() + 5 * 60_000)
  )
    throw new Error("contribution_observed_at_invalid");
  if (typeof input.rightsConfirmed !== "boolean")
    throw new Error("contribution_rights_invalid");
  if (typeof input.preciseLocationConsent !== "boolean")
    throw new Error("contribution_location_consent_invalid");
  const spotId = input.spotId?.trim() || null;
  if (spotId !== null && !spotId.startsWith("spot:"))
    throw new Error("contribution_spot_invalid");
  const candidate = input.candidateLocation;
  if (candidate !== null) assertCandidateCoordinates(candidate.wgs84);
  const candidateProfile = input.candidateProfile
    ? normalizeCandidateProfile(input.candidateProfile)
    : undefined;
  return {
    kind: input.kind,
    spotId: spotId as SpotId | null,
    candidateLocation:
      candidate === null
        ? null
        : {
            displayName: cleanContributionText(candidate.displayName, 120),
            region: cleanContributionText(candidate.region, 120),
            wgs84: structuredClone(candidate.wgs84),
          },
    observedAt: input.observedAt,
    topics: uniqueTopics(input.topics),
    detail: cleanContributionText(input.detail, 2_000),
    rightsConfirmed: input.rightsConfirmed,
    preciseLocationConsent: input.preciseLocationConsent,
    ...(candidateProfile ? { candidateProfile } : {}),
  };
}

function assertCandidateCoordinates(
  coordinates: NonNullable<ContributionDraftRequest["candidateLocation"]>["wgs84"],
) {
  if (
    coordinates?.system !== "WGS84" ||
    !Number.isFinite(coordinates.latitude) ||
    !Number.isFinite(coordinates.longitude) ||
    Math.abs(coordinates.latitude) > 90 ||
    Math.abs(coordinates.longitude) > 180 ||
    (coordinates.latitude === 0 && coordinates.longitude === 0)
  )
    throw new Error("contribution_candidate_coordinate_invalid");
}

export function assertContributionRelation(
  input: ReturnType<typeof normalizeContributionInput>,
) {
  if (input.kind === "NEW_SPOT_PROPOSAL") {
    if (input.spotId) throw new Error("contribution_candidate_spot_invalid");
  } else if (!input.spotId || input.candidateLocation) {
    throw new Error("contribution_formal_spot_required");
  }
}

export function assertContributionSubmittable(
  submission: ContributionSubmission,
) {
  if (!isContributionEditable(submission.state))
    throw new Error("contribution_not_editable");
  if (submission.kind !== "NEW_SPOT_PROPOSAL" && submission.detail.length < 20)
    throw new Error("contribution_detail_too_short");
  if (submission.kind !== "NEW_SPOT_PROPOSAL" && submission.topics.length === 0)
    throw new Error("contribution_topics_required");
  if (submission.kind === "FIELD_REPORT" && !submission.observedAt)
    throw new Error("contribution_observed_at_required");
  if (
    submission.kind === "NEW_SPOT_PROPOSAL" &&
    (!submission.candidateLocation ||
      !submission.candidateProfile?.fields.name?.trim() ||
      !submission.candidateProfile.fields.address?.trim() ||
      !submission.preciseLocationConsent)
  )
    throw new Error("contribution_candidate_submission_incomplete");
  if (submission.kind === "NEW_SPOT_PROPOSAL") {
    for (const kind of CONTRIBUTION_MEDIA_KINDS) {
      const attachedIds = submission.media
        .filter((media) => media.kind === kind)
        .map((media) => media.uploadId);
      const profileIds = [...(submission.candidateProfile?.media[kind] ?? [])];
      if (attachedIds.length !== profileIds.length || attachedIds.some((id, index) => id !== profileIds[index]))
        throw new Error("contribution_candidate_media_mismatch");
    }
    if (submission.media.some((media) => !media.kind))
      throw new Error("contribution_media_kind_required");
  }
  if (submission.media.length > 0 && !submission.rightsConfirmed)
    throw new Error("contribution_media_rights_required");
  if (submission.media.some((media) => media.state !== "UPLOADED" && media.state !== "ATTACHED"))
    throw new Error("contribution_media_upload_incomplete");
}

export function decodeContributionBase64(
  value: unknown,
  maximumBytes: number,
) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > Math.ceil(maximumBytes / 3) * 4 + 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
      value,
    )
  )
    throw new Error("contribution_media_base64_invalid");
  const bytes = Buffer.from(value, "base64");
  if (!bytes.length || bytes.length > maximumBytes)
    throw new Error("contribution_media_size_invalid");
  return bytes;
}
