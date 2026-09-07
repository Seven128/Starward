import type { ObservationContext } from "@starward/miniapp-contracts";

type ContextVersion = Pick<ObservationContext, "contextId" | "revision" | "contextFingerprint">;

export function sameContextVersion(left: ContextVersion | null, right: ContextVersion | null) {
  return left === right || (!!left && !!right &&
    left.contextId === right.contextId && left.revision === right.revision &&
    left.contextFingerprint === right.contextFingerprint);
}

/** A recovery response may replace an expired ID, but never a newer user intent. */
export function canApplyContextRestore(
  expected: ContextVersion | null,
  current: ContextVersion | null,
  restored: ContextVersion,
) {
  if (!sameContextVersion(expected, current)) return false;
  return !current || current.contextId !== restored.contextId || restored.revision >= current.revision;
}
