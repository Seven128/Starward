import { isMapRouteSnapshot, isMapSpotPage, type MapRouteRequest, type MapRouteSnapshot, type MapSpotPage } from "@starward/contracts/map";

export interface MapClient {
  spots(input: { lat: number; lon: number; radiusMeters: number; limit?: number }, signal?: AbortSignal): Promise<MapSpotPage>;
  route(input: MapRouteRequest, signal?: AbortSignal): Promise<MapRouteSnapshot>;
}

export function createMapClient(options: { baseUrl?: string; fetcher?: typeof fetch } = {}): MapClient {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL;
  const fetcher = options.fetcher ?? fetch;
  const endpoint = (path: string) => {
    if (!baseUrl) throw new Error("map_api_base_url_missing");
    return `${baseUrl.replace(/\/$/u, "")}${path}`;
  };
  return {
    async spots(input, signal) {
      const params = new URLSearchParams({ lat: String(input.lat), lon: String(input.lon), radiusMeters: String(input.radiusMeters), limit: String(input.limit ?? 20) });
      const response = await fetcher(endpoint(`/v1/map/spots?${params}`), { headers: { accept: "application/json" }, signal });
      if (!response.ok) throw new Error(`map_spots_http_${response.status}`);
      const value: unknown = await response.json();
      if (!isMapSpotPage(value)) throw new Error("map_spots_response_invalid");
      return value;
    },
    async route(input, signal) {
      const response = await fetcher(endpoint("/v1/routes/plan"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input), signal });
      if (!response.ok) throw new Error(`map_route_http_${response.status}`);
      const value: unknown = await response.json();
      if (!isMapRouteSnapshot(value)) throw new Error("map_route_response_invalid");
      return value;
    },
  };
}
