import type {
  ContributionKind,
  ContributionSubmission,
  ContributionTopic,
} from "@starward/miniapp-contracts";
import {
  contributionNeedsMediaRecovery,
  contributionSubmissionState,
} from "./contribution-model";
import type {
  ContributionHistoryFilter,
  ContributionPhase,
} from "./use-contribution-form";

export function initialContributionSelection(hasFormalSpot: boolean): {
  kind: ContributionKind;
  topics: ContributionTopic[];
} {
  return hasFormalSpot
    ? { kind: "FIELD_REPORT", topics: ["NIGHT_SAFETY"] }
    : { kind: "NEW_SPOT_PROPOSAL", topics: ["OTHER"] };
}

export function findMatchingContributionDraft(
  submissions: readonly ContributionSubmission[],
  hasFormalSpot: boolean,
  boundSpotId: string,
  kind: ContributionKind,
) {
  const expectedSpotId = hasFormalSpot ? boundSpotId : null;
  return (
    submissions.find(
      (item) =>
        contributionSubmissionState(item) === "DRAFT" &&
        item.spotId === expectedSpotId &&
        item.kind === kind,
    ) ?? null
  );
}

export function filterContributionHistory(
  submissions: readonly ContributionSubmission[],
  filter: ContributionHistoryFilter,
) {
  return submissions.filter((item) => {
    const state = contributionSubmissionState(item);
    if (filter === "PENDING") return state === "PENDING_REVIEW";
    if (filter === "CHANGES_REQUESTED") return state === "CHANGES_REQUESTED";
    return true;
  });
}

export function countPendingContributions(
  submissions: readonly ContributionSubmission[],
) {
  return submissions.filter((item) => {
    const state = contributionSubmissionState(item);
    return state === "PENDING_REVIEW" || state === "CHANGES_REQUESTED";
  }).length;
}

export function previousContributionPhase(
  current: ContributionPhase,
): ContributionPhase {
  if (current === "HISTORY") return "TYPE";
  if (current === "UPLOAD") return "FORM";
  return "TYPE";
}

export function currentContributionMedia(
  draft: ContributionSubmission | null,
  matchingDraft: ContributionSubmission | null,
) {
  return draft?.media ?? matchingDraft?.media ?? [];
}

export function contributionNeedsRecovery(
  draft: ContributionSubmission | null,
  matchingDraft: ContributionSubmission | null,
) {
  return contributionNeedsMediaRecovery(draft ?? matchingDraft);
}
