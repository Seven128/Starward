import type { ContributionKind, ContributionTopic } from "@starward/miniapp-contracts";

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
}

const topics = new Set(["LAST_ROAD", "PARKING", "FACILITIES", "OPENNESS", "LEGAL_ACCESS", "NIGHT_SAFETY", "HORIZON", "SITE_MEDIA", "OTHER"]);
const textLimits = { spotId: 180, spotName: 180, date: 30, time: 30, detail: 2000, candidateName: 180, candidateRegion: 180, latitude: 100, longitude: 100 } as const;

/** Preserve incomplete input, but never copy unrecognized storage fields. */
export function parseLocalContributionDraft(value: unknown): LocalContributionDraft | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.schema !== 1 || !["FIELD_REPORT", "CORRECTION", "NEW_SPOT_PROPOSAL"].includes(String(raw.kind))) return null;
  if (!Array.isArray(raw.topics) || raw.topics.length > topics.size || raw.topics.some((item) => typeof item !== "string" || !topics.has(item))) return null;
  if (typeof raw.rightsConfirmed !== "boolean" || typeof raw.preciseLocationConsent !== "boolean") return null;
  if (raw.baseSubmissionId === null ? raw.baseRevision !== null :
    typeof raw.baseSubmissionId !== "string" || !raw.baseSubmissionId.startsWith("contribution:") || raw.baseSubmissionId.length > 180 || !Number.isSafeInteger(raw.baseRevision) || Number(raw.baseRevision) < 1) return null;
  const fields = {} as Pick<LocalContributionDraft, keyof typeof textLimits>;
  for (const [key, limit] of Object.entries(textLimits)) {
    const text = raw[key];
    if (typeof text !== "string" || text.length > limit) return null;
    fields[key as keyof typeof textLimits] = text;
  }
  return {
    schema: 1, ...fields,
    baseSubmissionId: raw.baseSubmissionId as string | null,
    baseRevision: raw.baseRevision as number | null,
    kind: raw.kind as ContributionKind,
    topics: [...raw.topics] as ContributionTopic[],
    rightsConfirmed: raw.rightsConfirmed,
    preciseLocationConsent: raw.preciseLocationConsent,
  };
}
