import { isCelestialObjectReference, celestialReferenceKindMatches, type ApiEnvelope, type CelestialObjectSearchData } from "@starward/miniapp-contracts";

/** Cached and network results must belong to this query before exposing a
 * selectable identity. A malformed row must never open another object's data. */
export function matchingCelestialSearchResponse(response: ApiEnvelope<CelestialObjectSearchData>, query: string) {
  const data = response?.data;
  const seen = new Set<string>();
  if (!data || data.query !== query.trim() || !Array.isArray(data.results) || data.results.length > 50 ||
    typeof data.truncated !== "boolean" || !Array.isArray(data.unavailableCatalogs) ||
    !data.unavailableCatalogs.every(value => typeof value === "string") ||
    !data.results.every(row => {
      if (!row || !isCelestialObjectReference(row.reference) || seen.has(row.reference) ||
        typeof row.displayName !== "string" || !row.displayName.trim() ||
        typeof row.matchedAlias !== "string" || !row.matchedAlias.trim() ||
        !Array.isArray(row.aliases) || !row.aliases.every(value => typeof value === "string") ||
        !celestialReferenceKindMatches(row.reference, row.kind)) return false;
      seen.add(row.reference);
      return true;
    })) throw new Error("celestial_search_response_invalid");
  return response;
}
