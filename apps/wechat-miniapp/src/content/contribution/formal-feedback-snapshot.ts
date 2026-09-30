import type { ContributionFormalFeedbackSnapshot } from "@starward/miniapp-contracts";

/** Old persisted snapshots did not retain the canonical version used for rebase. */
export function formalFeedbackFrozenView(snapshot: ContributionFormalFeedbackSnapshot) {
  return snapshot.resolvedBaseline
    ? { baseline: snapshot.resolvedBaseline, proposal: snapshot.resolvedProposal }
    : { baseline: snapshot.baseline, proposal: snapshot.proposal };
}
