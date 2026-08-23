import type {
  ContributionDraftRequest,
  ContributionKind,
  ContributionMediaUpload,
  ContributionSubmission,
  ContributionTopic,
  ContributionUpdateRequest,
  SpotId,
} from "@starward/miniapp-contracts";

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
    if (input.spotId || !input.candidateLocation)
      throw new Error("contribution_candidate_location_required");
  } else if (!input.spotId || input.candidateLocation) {
    throw new Error("contribution_formal_spot_required");
  }
}

export function assertContributionSubmittable(
  submission: ContributionSubmission,
) {
  if (submission.state !== "DRAFT")
    throw new Error("contribution_not_editable");
  if (submission.detail.length < 20)
    throw new Error("contribution_detail_too_short");
  if (submission.topics.length === 0)
    throw new Error("contribution_topics_required");
  if (submission.kind === "FIELD_REPORT" && !submission.observedAt)
    throw new Error("contribution_observed_at_required");
  if (
    submission.kind === "NEW_SPOT_PROPOSAL" &&
    !submission.preciseLocationConsent
  )
    throw new Error("contribution_location_consent_required");
  if (submission.media.length > 0 && !submission.rightsConfirmed)
    throw new Error("contribution_media_rights_required");
  if (submission.media.some((media) => media.state !== "UPLOADED"))
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
