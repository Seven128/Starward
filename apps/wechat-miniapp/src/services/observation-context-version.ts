import type { ObservationContext } from "@starward/miniapp-contracts";

export type ContextVersion = Pick<ObservationContext, "contextId" | "revision" | "contextFingerprint">;

export function matchesPrivateProposal(context: ObservationContext | null | undefined, ownerId: string | null | undefined,
  submissionId: string, attemptId: string | undefined, attemptBaseRevision: number | undefined) {
  const binding = context?.privateProposal;
  return Boolean(context?.schemaVersion === "observation-context-v3" && context.privacyClass === "ACCOUNT_PRIVATE" && binding &&
    ownerId && binding.ownerId === ownerId && binding.submissionId === submissionId && binding.attemptId === attemptId &&
    binding.attemptBaseRevision === attemptBaseRevision);
}

export function sameContextVersion(left: ContextVersion | null, right: ContextVersion | null) {
  return left === right || (!!left && !!right &&
    left.contextId === right.contextId && left.revision === right.revision &&
    left.contextFingerprint === right.contextFingerprint);
}

/** A recovery may replace an expired ID, but never a newer user intent. */
export function canApplyContextRestore(
  expected: ContextVersion | null,
  current: ContextVersion | null,
  restored: ContextVersion,
) {
  return sameContextVersion(expected, current) &&
    (!current || current.contextId !== restored.contextId || restored.revision >= current.revision);
}
