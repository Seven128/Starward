import type { PrivateCommandOwnerQualification } from "../../packages/contracts/src/private-command-owner";
export function privateOwnerQualification(ownerId = "local-owner"): PrivateCommandOwnerQualification {
  return { schemaVersion: "starward-private-command-owner-v1", ownerId };
}
/** Unit transport fixtures keep qualification separate from the POST/readback
 * boundary under test. Real actor/SQL qualification uses private-draft-http. */
export function qualifiedDraftCommandFetcher(fetcher: typeof fetch, family: "itinerary" | "field", ownerId = "local-owner"): typeof fetch {
  return (async (target, init) => {
    const path = new URL(String(target)).pathname;
    if ((init?.method ?? "GET") === "GET" && path === (family === "itinerary" ? "/v2/itineraries" : "/v2/field-reports")) {
      return new Response(JSON.stringify({ schemaVersion: family === "itinerary" ? "starward-itinerary-v2" : "starward-field-reports-v2",
        items: [], nextCursor: null, scope: "local-owner-poc", ownerQualification: privateOwnerQualification(ownerId) }), { status: 200 });
    }
    return fetcher(target, init);
  }) as typeof fetch;
}
