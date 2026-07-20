import type { MapSpotPage } from "../../../../../packages/contracts/src/map";
import type { RouteService } from "./route-service";
import type { SpotSearchProvider } from "./spot-search-service";

function number(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new TypeError(`${field}_invalid`);
  return parsed;
}

export function createMapSpotsHandler(provider: SpotSearchProvider, now: () => Date = () => new Date()) {
  return async (query: Record<string, unknown>) => {
    try {
      const center = { lat: number(query.lat, "map_latitude"), lon: number(query.lon, "map_longitude"), system: "WGS84" as const };
      const radiusMeters = number(query.radiusMeters, "map_radius");
      const limit = query.limit === undefined ? 20 : number(query.limit, "map_limit");
      const page = await provider.search({ center, radiusMeters, limit, cursor: typeof query.cursor === "string" ? query.cursor : undefined });
      const body: MapSpotPage = {
        items: page.items.map((item) => ({
          ...item,
          mapState: item.mapState ?? (item.status === "verified" ? "caution" : "insufficient"),
          imageUrl: item.imageUrl ?? null,
          source: item.source ?? { label: "Starward verified catalog", url: "https://starward.invalid/data-sources", licenseId: "first-party", fetchedAt: now().toISOString() },
          factsBoundary: item.factsBoundary ?? "仅显示已有验证事实；缺失项不从 POI 推断。",
        })),
        nextCursor: page.nextCursor, context: { center, radiusMeters, limit }, generatedAt: now().toISOString(), status: page.items.length ? "partial" : "empty",
      };
      return { status: 200, body };
    } catch (error) {
      const code = error instanceof Error ? error.message : "map_spot_search_invalid";
      return { status: code.includes("invalid") || code.includes("out_of_range") || code.includes("required") ? 422 : 503, body: { code } };
    }
  };
}

export function createRouteHandler(service: Pick<RouteService, "load">) {
  return async (body: unknown) => {
    try {
      if (!body || typeof body !== "object") throw new TypeError("route_body_invalid");
      const input = body as Record<string, unknown>;
      const origin = input.origin as Record<string, unknown>;
      const destination = input.destination as Record<string, unknown>;
      const mode = String(input.mode);
      if (!origin || !destination || origin.system !== "WGS84" || destination.system !== "WGS84") throw new TypeError("route_wgs84_required");
      if (!["drive", "walk", "cycle", "transit"].includes(mode)) throw new TypeError("route_mode_invalid");
      const result = await service.load({ requestId: String(input.requestId || crypto.randomUUID()), origin: { lat: number(origin.lat, "route_origin_lat"), lon: number(origin.lon, "route_origin_lon"), system: "WGS84" }, destination: { lat: number(destination.lat, "route_destination_lat"), lon: number(destination.lon, "route_destination_lon"), system: "WGS84" }, mode: mode as "drive" | "walk" | "cycle" | "transit" });
      return { status: 200, body: result };
    } catch (error) {
      const code = error instanceof Error ? error.message : "route_request_invalid";
      return { status: 422, body: { code } };
    }
  };
}
