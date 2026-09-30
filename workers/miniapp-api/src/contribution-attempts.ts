import { randomUUID } from "node:crypto";
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
    fields: structuredClone(current.fields),
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
    fields: structuredClone(value.candidateProfile.fields),
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

/** Legacy attached uploads may predate explicit attempt snapshots. */
export function contributionMediaHasHistory(value: ContributionSubmission, upload: ContributionMediaUpload) {
  return upload.state === "ATTACHED" || (value.attempts ?? []).some(attempt =>
    attempt.snapshot.media.some(media => media.uploadId === upload.uploadId));
}
