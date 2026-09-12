import type { ContributionSubmission, SpotId } from "@starward/miniapp-contracts";

export type PrivateContributionSelectionTransition =
  | { kind: "NONE" }
  | { kind: "REMOVE" }
  | { kind: "PRIVATE"; submission: ContributionSubmission }
  | { kind: "FORMAL"; spotId: SpotId };

export function privateContributionSelectionTransition(
  selected: ContributionSubmission | null,
  submissions: readonly ContributionSubmission[],
): PrivateContributionSelectionTransition {
  if (!selected) return { kind: "NONE" };
  const current = submissions.find((item) => item.submissionId === selected.submissionId);
  if (!current) return { kind: "REMOVE" };
  if (current.publicationImpact === "SPOT_PUBLISHED" && current.spotId)
    return { kind: "FORMAL", spotId: current.spotId };
  return { kind: "PRIVATE", submission: current };
}
