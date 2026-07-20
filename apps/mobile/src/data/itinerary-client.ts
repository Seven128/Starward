export type ItineraryCommand = "generate" | "overview" | "add-candidate" | "select-route" | "refresh" | "share-offline" | "merge-collaboration" | "astronomy-timeline";
export interface ItinerarySnapshot {
  schemaVersion: "starward-itinerary-v1"; state: string; generatedAt: string;
  itinerary: { id: string; title: string; timezone: string; revision: number; sequence: number; stops: Array<{ id: string; spotId: string; role: string; source: string; coordinateVisibility: string }>; stages: Array<{ id: string; kind: string; startsAt: string; endsAt: string; stopId?: string }>; routeSnapshot: { id: string; generatedAt: string; driveMinutes: number; walkMinutes: number }; weatherSnapshot: { id: string; generatedAt: string } };
  inputs: { date: string; origin: string; people: number; transport: string; target: string; latestReturn: string; overnight: boolean; collaborative: boolean };
  generation: { confirmedDeparture: boolean; primary: string; backup: string; equipment: string[]; risks: string[]; sources: Array<{ part: string; version: string; generatedAt: string; state: string }> };
  candidates: Array<{ id: string; name: string; source: string; state: string }>;
  routes: Array<{ id: string; label: string; distanceKm: number; driveMinutes: number; walkMinutes: number; toll: string; road: string; facilities: string; arrivalAt: string; windowState: string; risk: string }>;
  selectedRouteId: string;
  refresh: { state: string; previousRevision: number | null; preservedUserEdits: string[]; differences: string[]; recoveryRevision: number | null };
  share: null | { expiresAt: string; publicProjection: { stops: Array<{ spotId: string; role: string; preciseCoordinateIncluded: boolean }> }; exportedSections: string[] };
  offlinePack: null | { revision: number; sizeBytes: number; checksum: string; state: string; items: Array<{ kind: string; version: string; state: string }> };
  collaboration: { cursor: number; conflicts: Array<{ field: string; original: unknown; incoming: unknown; originalActor: string; incomingActor: string }>; mergedFields: string[]; recoveryRevision: number; state: string };
  timeline: { valid: boolean; conflicts: string[]; observingNight: string; events: Array<{ kind: string; label: string; startsAt: string; endsAt: string; reachable: boolean }> };
}
export function createItineraryClient(options: { baseUrl?: string; fetcher?: typeof fetch } = {}) {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL; const fetcher = options.fetcher ?? fetch;
  const request = async (path: string, init?: RequestInit) => { if (!baseUrl) throw new Error("itinerary_api_base_url_missing"); const response = await fetcher(`${baseUrl.replace(/\/$/u, "")}${path}`, { headers: { accept: "application/json", "content-type": "application/json" }, ...init }); if (!response.ok) throw new Error(`itinerary_http_${response.status}`); const value = await response.json() as ItinerarySnapshot; if (value.schemaVersion !== "starward-itinerary-v1") throw new Error("itinerary_response_invalid"); return value; };
  return { get: (signal?: AbortSignal) => request("/v1/itineraries", { signal }), command: (command: ItineraryCommand) => request("/v1/itineraries/commands", { method: "POST", body: JSON.stringify({ command }) }) };
}
