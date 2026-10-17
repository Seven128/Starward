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
 * identities separate prevents one map viewport, filter URL, or API origin
 * from supplying another representation's ETag/body.
 */
export function responseCacheKey(group: string, apiBase: string, path: string): string {
  return `${group}:${apiBase}${path}`;
}

const TEMPORARY_QUERY_ROOTS = new Set([
  "map-scene", "spot-overview", "spot-guides", "spot-site", "spot-sky",
  "observation-context", "place-search", "spot-search",
  "map-observation-context", "search-observation-context", "search-scene",
  // These immutable publications also carry the Sky file owner's generation.
  // File clear must remove their old capabilities from hidden query observers.
  "sao-index", "deep-sky-image-discovery", "prepared-optical-manifest", "sdss-optical-manifest",
]);

/** Settings clears trip-discovery cache, never account/library data or drafts. */
export function isTemporaryCacheKey(key: string): boolean {
  return TEMPORARY_QUERY_ROOTS.has(key.split(":", 1)[0]!);
}

function frozenPolicy(responsePrefixes: readonly string[], queryRoots = responsePrefixes): MutationInvalidationPolicy {
  return Object.freeze({ responsePrefixes: Object.freeze(responsePrefixes), queryRoots: Object.freeze(queryRoots) });
}

export const READ_MODEL_INVALIDATION_POLICY: Readonly<
  Record<MiniappMutationKind, MutationInvalidationPolicy>
> = Object.freeze({
  FAVORITE: frozenPolicy(["favorites", "user-library", "map-scene"]),
  PLAN: frozenPolicy(["plans", "user-library"]),
  PROFILE_LINK: frozenPolicy(["profile-links", "user-library"]),
  IMPORT: frozenPolicy(["import:", "user-library"], ["import", "user-library"]),
  PREFERENCES: frozenPolicy(["preferences", "user-library", "map-scene"]),
});

export function invalidationPolicy(
  mutation: MiniappMutationKind,
): MutationInvalidationPolicy {
  return READ_MODEL_INVALIDATION_POLICY[mutation];
}
