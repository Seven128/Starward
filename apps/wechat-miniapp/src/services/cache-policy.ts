export type MiniappMutationKind =
  | "FAVORITE"
  | "PLAN"
  | "PROFILE_LINK"
  | "IMPORT"
  | "PREFERENCES";

export interface MutationInvalidationPolicy {
  responsePrefixes: readonly string[];
  queryRoots: readonly string[];
}

/**
 * Latest-request cancellation is grouped by resource owner, while conditional
 * response reuse must be keyed by the exact HTTP representation. Keeping these
 * identities separate prevents one map viewport or filter URL from supplying
 * another URL's ETag/body.
 */
export function responseCacheKey(group: string, path: string): string {
  return `${group}:${path}`;
}

export const READ_MODEL_INVALIDATION_POLICY: Readonly<
  Record<MiniappMutationKind, MutationInvalidationPolicy>
> = Object.freeze({
  FAVORITE: Object.freeze({
    responsePrefixes: Object.freeze(["favorites", "user-library", "map-scene"]),
    queryRoots: Object.freeze(["favorites", "user-library", "map-scene"]),
  }),
  PLAN: Object.freeze({
    responsePrefixes: Object.freeze(["plans", "user-library"]),
    queryRoots: Object.freeze(["plans", "user-library"]),
  }),
  PROFILE_LINK: Object.freeze({
    responsePrefixes: Object.freeze(["profile-links", "user-library"]),
    queryRoots: Object.freeze(["profile-links", "user-library"]),
  }),
  IMPORT: Object.freeze({
    responsePrefixes: Object.freeze(["import:", "user-library"]),
    queryRoots: Object.freeze(["import", "user-library"]),
  }),
  PREFERENCES: Object.freeze({
    responsePrefixes: Object.freeze(["preferences", "user-library", "map-scene"]),
    queryRoots: Object.freeze(["preferences", "user-library", "map-scene"]),
  }),
});

export function invalidationPolicy(
  mutation: MiniappMutationKind,
): MutationInvalidationPolicy {
  return READ_MODEL_INVALIDATION_POLICY[mutation];
}
