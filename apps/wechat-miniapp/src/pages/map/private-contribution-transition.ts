import type { ContributionSubmission, ObservationContext, ObservationContextResolveRequest, SpotId } from "@starward/miniapp-contracts";
import { matchesPrivateProposal } from "../../services/observation-context-version";

export function pendingProposalContextLocation(submission: ContributionSubmission): Extract<ObservationContextResolveRequest["location"], { kind: "PENDING_PROPOSAL" }> | null {
  const attempt = (submission.attempts ?? []).at(-1);
  if (submission.kind !== "NEW_SPOT_PROPOSAL" || !["PENDING_REVIEW", "ACCEPTED"].includes(submission.submissionState) ||
      !submission.preciseLocationConsent || !attempt || !attempt.snapshot.preciseLocationConsent || !attempt.snapshot.candidateLocation)
    return null;
  return { kind: "PENDING_PROPOSAL", submissionId: submission.submissionId,
    attemptId: attempt.attemptId, attemptBaseRevision: attempt.baseRevision };
}

export function samePendingProposalIntent(expected: ContributionSubmission, current: ContributionSubmission | null, owner: string | null, currentOwner: string | null) {
  const a = pendingProposalContextLocation(expected), b = current && pendingProposalContextLocation(current);
  return Boolean(owner && owner === currentOwner && a && b && expected.revision === current?.revision &&
    expected.submissionState === current?.submissionState && expected.publicationImpact === current?.publicationImpact &&
    a.submissionId === b.submissionId && a.attemptId === b.attemptId && a.attemptBaseRevision === b.attemptBaseRevision);
}

export type PrivateContributionSelectionTransition =
  | { kind: "NONE" }
  | { kind: "REMOVE" }
  | { kind: "PRIVATE"; submission: ContributionSubmission }
  | { kind: "FORMAL"; spotId: SpotId };

export function privateContributionSelectionTransition(
  selected: ContributionSubmission | null,
  submissions: readonly ContributionSubmission[],
  context?: ObservationContext | null,
  owner?: string | null,
): PrivateContributionSelectionTransition {
  if (!selected) return { kind: "NONE" };
  const current = submissions.find((item) => item.submissionId === selected.submissionId);
  if (!current) return { kind: "REMOVE" };
  const selectedAttempt = pendingProposalContextLocation(selected), currentAttempt = pendingProposalContextLocation(current);
  if (context?.location.kind === "FORMAL_SPOT" && selectedAttempt && currentAttempt &&
      matchesPrivateProposal(context, owner, selected.submissionId, selectedAttempt.attemptId, selectedAttempt.attemptBaseRevision) &&
      matchesPrivateProposal(context, owner, current.submissionId, currentAttempt.attemptId, currentAttempt.attemptBaseRevision))
    return { kind: "FORMAL", spotId: context.location.spotId };
  if (current.publicationImpact === "SPOT_PUBLISHED" && current.spotId)
    return { kind: "FORMAL", spotId: current.spotId };
  return { kind: "PRIVATE", submission: current };
}
