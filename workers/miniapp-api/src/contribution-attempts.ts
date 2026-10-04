import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type {
  ContributionAttempt,
  ContributionReview,
  ContributionSubmission,
  ContributionMediaUpload,
} from "@starward/miniapp-contracts";

export const EDITABLE_CONTRIBUTION_STATES = new Set([
  "DRAFT",
  "CHANGES_REQUESTED",
  "REJECTED",
]);

export function isContributionEditable(state: string) {
  return EDITABLE_CONTRIBUTION_STATES.has(state);
}

export function normalizeContributionAttempts(
  value: ContributionSubmission,
): ContributionSubmission {
  return {
    ...structuredClone(value),
    attempts: value.attempts ?? [],
    workingCopyFromAttemptId: value.workingCopyFromAttemptId ?? null,
  };
}

export function appendContributionAttempt(
  value: ContributionSubmission,
  submittedAt: string,
): Pick<ContributionSubmission, "attempts" | "workingCopyFromAttemptId"> {
  const normalized = normalizeContributionAttempts(value);
  const attempt: ContributionAttempt = {
    attemptId: `contribution-attempt:${randomUUID()}`,
    attemptNo: normalized.attempts.length + 1,
    baseRevision: value.revision,
    submittedAt,
    snapshot: {
      kind: value.kind,
      spotId: value.spotId,
      spotNameSnapshot: value.spotNameSnapshot,
      candidateLocation: structuredClone(value.candidateLocation),
      observedAt: value.observedAt,
      topics: structuredClone(value.topics),
      detail: value.detail,
      rightsConfirmed: value.rightsConfirmed,
      preciseLocationConsent: value.preciseLocationConsent,
      media: structuredClone(value.media),
      ...(value.candidateProfile
        ? { candidateProfile: structuredClone(value.candidateProfile) }
        : {}),
      ...(value.formalFeedback
        ? { formalFeedback: structuredClone(value.formalFeedback) }
        : {}),
    },
    review: null,
  };
  return {
    attempts: [...normalized.attempts, attempt],
    workingCopyFromAttemptId: null,
  };
}

export function appendCandidateProfileMedia(
  value: ContributionSubmission,
  upload: ContributionMediaUpload,
  replaced?: ContributionMediaUpload,
) {
  if (value.kind !== "NEW_SPOT_PROPOSAL" || !upload.kind) return value.candidateProfile;
  const current = value.candidateProfile ?? { fields: {}, media: {} };
  const ids = [...(current.media[upload.kind] ?? [])]
    .filter((id) => id !== replaced?.uploadId);
  if (!ids.includes(upload.uploadId)) ids.push(upload.uploadId);
  return {
    ...structuredClone(current),
    media: { ...structuredClone(current.media), [upload.kind]: ids },
  };
}

export function removeCandidateProfileMedia(
  value: ContributionSubmission,
  upload: ContributionMediaUpload,
) {
  if (value.kind !== "NEW_SPOT_PROPOSAL" || !upload.kind || !value.candidateProfile)
    return value.candidateProfile;
  return {
    ...structuredClone(value.candidateProfile),
    media: {
      ...structuredClone(value.candidateProfile.media),
      [upload.kind]: (value.candidateProfile.media[upload.kind] ?? []).filter((id) => id !== upload.uploadId),
    },
  };
}

export function reviewLatestContributionAttempt(
  value: ContributionSubmission,
  review: ContributionReview,
): Pick<ContributionSubmission, "attempts" | "workingCopyFromAttemptId"> {
  if ((review.resolution === "APPROVED" || review.resolution === "ACCEPTED") && hasVersionedCandidateAttempt(value)) {
    if (value.state !== "PENDING_REVIEW") throw new Error("contribution_review_attempt_mismatch");
    assertCandidateAttemptCurrent(value, false);
  }
  const normalized = normalizeContributionAttempts(value);
  const latest = normalized.attempts.at(-1);
  return {
    attempts: latest
      ? normalized.attempts.map((attempt) =>
          attempt.attemptId === latest.attemptId
            ? { ...structuredClone(attempt), review: structuredClone(review) }
            : structuredClone(attempt),
        )
      : normalized.attempts,
    workingCopyFromAttemptId: latest?.attemptId ?? null,
  };
}

/** Bind new versioned intake to the same immutable submitted content at approval and merge. */
export function assertCandidateAttemptCurrent(value: ContributionSubmission, requireApproved: boolean) {
  if (!hasVersionedCandidateAttempt(value)) return;
  const latest = value.attempts?.at(-1);
  if (!latest || (requireApproved && latest.review?.resolution !== "APPROVED" && latest.review?.resolution !== "ACCEPTED")) throw new Error("contribution_review_attempt_mismatch");
  const frozen = latest.snapshot;
  const currentMedia = value.media.map((item, index) => ({ ...item,
    state: item.state === "ATTACHED" && frozen.media[index]?.state === "UPLOADED" ? "UPLOADED" : item.state,
  }));
  if (!isDeepStrictEqual({
    kind: value.kind, spotId: value.spotId, spotNameSnapshot: value.spotNameSnapshot,
    candidateLocation: value.candidateLocation, observedAt: value.observedAt, topics: value.topics,
    detail: value.detail, rightsConfirmed: value.rightsConfirmed, preciseLocationConsent: value.preciseLocationConsent,
    candidateProfile: value.candidateProfile, formalFeedback: value.formalFeedback, media: currentMedia,
  }, {
    kind: frozen.kind, spotId: frozen.spotId, spotNameSnapshot: frozen.spotNameSnapshot,
    candidateLocation: frozen.candidateLocation, observedAt: frozen.observedAt, topics: frozen.topics,
    detail: frozen.detail, rightsConfirmed: frozen.rightsConfirmed, preciseLocationConsent: frozen.preciseLocationConsent,
    candidateProfile: frozen.candidateProfile, formalFeedback: frozen.formalFeedback, media: frozen.media,
  })) throw new Error("contribution_review_attempt_mismatch");
}

function hasVersionedCandidateAttempt(value: ContributionSubmission) {
  return value.kind === "NEW_SPOT_PROPOSAL" && Boolean(value.candidateProfile?.intake ||
    value.attempts?.some(attempt => attempt.snapshot.candidateProfile?.intake));
}

/** Legacy attached uploads may predate explicit attempt snapshots. */
export function contributionMediaHasHistory(value: ContributionSubmission, upload: ContributionMediaUpload) {
  return upload.state === "ATTACHED" || (value.attempts ?? []).some(attempt =>
    attempt.snapshot.media.some(media => media.uploadId === upload.uploadId));
}
