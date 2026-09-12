import type { ContributionKind, ContributionSubmission } from "@starward/miniapp-contracts";

const EDITABLE = new Set(["DRAFT", "CHANGES_REQUESTED", "REJECTED"]);

export function findMatchingContributionDraft(
  submissions: readonly ContributionSubmission[],
  hasFormalSpot: boolean,
  boundSpotId: string,
  kind: ContributionKind,
  requestedSubmissionId = "",
  forceNew = false,
) {
  if (forceNew) return null;
  if (requestedSubmissionId) {
    return submissions.find((item) =>
      item.submissionId === requestedSubmissionId &&
      EDITABLE.has(item.submissionState),
    ) ?? null;
  }
  if (!hasFormalSpot) {
    return null;
  }
  return submissions.find((item) =>
    item.submissionState === "DRAFT" &&
    item.spotId === boundSpotId &&
    item.kind === kind,
  ) ?? null;
}
