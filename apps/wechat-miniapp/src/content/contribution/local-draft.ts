import {
  CONTRIBUTION_FORMAL_FIELD_KEYS,
  CONTRIBUTION_MEDIA_KINDS,
  type ContributionFormalFieldKey,
  type ContributionFormalProposal,
  type ContributionKind,
  type ContributionMediaKind,
  type ContributionTopic,
} from "@starward/miniapp-contracts";

export interface LocalContributionDraft {
  schema: 1;
  baseSubmissionId: string | null;
  baseRevision: number | null;
  spotId: string;
  spotName: string;
  kind: ContributionKind;
  topics: ContributionTopic[];
  date: string;
  time: string;
  detail: string;
  candidateName: string;
  candidateRegion: string;
  latitude: string;
  longitude: string;
  rightsConfirmed: boolean;
  preciseLocationConsent: boolean;
  candidateProfile?: ContributionFormalProposal;
}

const topics = new Set(["LAST_ROAD", "PARKING", "FACILITIES", "OPENNESS", "LEGAL_ACCESS", "NIGHT_SAFETY", "HORIZON", "SITE_MEDIA", "OTHER"]);
const formalChoices: Partial<Record<ContributionFormalFieldKey, ReadonlySet<string>>> = {
  openness: new Set(["", "开放", "有条件开放", "不开放"]),
  access: new Set(["", "允许进入", "需预约或其他条件", "禁止进入"]),
  parking: new Set(["", "有", "没有", "季节性开放"]),
  toilet: new Set(["", "有", "没有", "季节性开放"]),
};
const textLimits = { spotId: 180, spotName: 180, date: 30, time: 30, detail: 2000, candidateName: 180, candidateRegion: 180, latitude: 100, longitude: 100 } as const;
const forbiddenControls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u;

function parseCandidateProfile(value: unknown): ContributionFormalProposal | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  if (!raw.fields || typeof raw.fields !== "object" || !raw.media || typeof raw.media !== "object") return undefined;
  const fields: Partial<Record<ContributionFormalFieldKey, string>> = {};
  for (const [key, value] of Object.entries(raw.fields)) {
    const typedKey = key as ContributionFormalFieldKey;
    if (!(CONTRIBUTION_FORMAL_FIELD_KEYS as readonly string[]).includes(key) || typeof value !== "string" || value.length > (key === "detail" ? 2_000 : 300) || forbiddenControls.test(value) || (formalChoices[typedKey] && !formalChoices[typedKey]!.has(value))) return undefined;
    fields[typedKey] = value;
  }
  const media: Partial<Record<ContributionMediaKind, readonly string[]>> = {};
  for (const [key, value] of Object.entries(raw.media)) {
    if (!(CONTRIBUTION_MEDIA_KINDS as readonly string[]).includes(key) || !Array.isArray(value) || value.length > 3 || value.some((id) => typeof id !== "string" || !id || id.length > 180 || forbiddenControls.test(id)) || new Set(value).size !== value.length) return undefined;
    media[key as ContributionMediaKind] = [...value] as string[];
  }
  return { fields, media };
}

/** Preserve incomplete input, but never copy unrecognized storage fields. */
export function parseLocalContributionDraft(value: unknown): LocalContributionDraft | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.schema !== 1 || !["FIELD_REPORT", "CORRECTION", "NEW_SPOT_PROPOSAL"].includes(String(raw.kind))) return null;
  if (!Array.isArray(raw.topics) || raw.topics.length > topics.size || raw.topics.some((item) => typeof item !== "string" || !topics.has(item)) || new Set(raw.topics).size !== raw.topics.length) return null;
  if (typeof raw.rightsConfirmed !== "boolean" || typeof raw.preciseLocationConsent !== "boolean") return null;
  if (raw.baseSubmissionId === null ? raw.baseRevision !== null :
    typeof raw.baseSubmissionId !== "string" || !raw.baseSubmissionId.startsWith("contribution:") || raw.baseSubmissionId.length > 180 || !Number.isSafeInteger(raw.baseRevision) || Number(raw.baseRevision) < 1) return null;
  const fields = {} as Pick<LocalContributionDraft, keyof typeof textLimits>;
  for (const [key, limit] of Object.entries(textLimits)) {
    const text = raw[key];
    if (typeof text !== "string" || text.length > limit || forbiddenControls.test(text)) return null;
    fields[key as keyof typeof textLimits] = text;
  }
  const candidateProfile = parseCandidateProfile(raw.candidateProfile);
  if (raw.candidateProfile !== undefined && !candidateProfile) return null;
  return {
    schema: 1, ...fields,
    baseSubmissionId: raw.baseSubmissionId as string | null,
    baseRevision: raw.baseRevision as number | null,
    kind: raw.kind as ContributionKind,
    topics: [...raw.topics] as ContributionTopic[],
    rightsConfirmed: raw.rightsConfirmed,
    preciseLocationConsent: raw.preciseLocationConsent,
    ...(candidateProfile ? { candidateProfile } : {}),
  };
}
