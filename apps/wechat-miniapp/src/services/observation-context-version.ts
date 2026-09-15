import type { ObservationContext } from "@starward/miniapp-contracts";

export type ContextVersion = Pick<ObservationContext, "contextId" | "revision" | "contextFingerprint">;

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
