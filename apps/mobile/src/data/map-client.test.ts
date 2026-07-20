import { describe, expect, it, vi } from "vitest";
import { createMapClient } from "./map-client";

describe("map client", () => {
  it("loads bounded candidates and route snapshots from Starward API", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => String(input).includes("/v1/map/spots")
      ? new Response(JSON.stringify({ items: [], nextCursor: null, context: { center: { lat: 1, lon: 2, system: "WGS84" }, radiusMeters: 50000, limit: 20 }, generatedAt: "2026-07-20T00:00:00Z", status: "empty" }), { status: 200 })
      : new Response(JSON.stringify({ id: "route-1", requestId: "r", provider: "amap", providerVersion: "unavailable", generatedAt: "1970-01-01T00:00:00Z", expiresAt: "1970-01-01T00:00:00Z", state: "missing", authoritativeCoordinates: { origin: { lat: 1, lon: 2, system: "WGS84" }, destination: { lat: 2, lon: 3, system: "WGS84" } }, providerCoordinateSystem: "GCJ-02", mode: "drive", distanceMeters: null, durationSeconds: null, straightLineReferenceMeters: 100, navigationUsable: false, geometry: null, warning: "不可用" }), { status: 200 }));
    const client = createMapClient({ baseUrl: "http://127.0.0.1:4318", fetcher });
    await expect(client.spots({ lat: 1, lon: 2, radiusMeters: 50000 })).resolves.toMatchObject({ status: "empty" });
    await expect(client.route({ requestId: "r", origin: { lat: 1, lon: 2, system: "WGS84" }, destination: { lat: 2, lon: 3, system: "WGS84" }, mode: "drive" })).resolves.toMatchObject({ state: "missing" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("requires an API base URL", async () => {
    await expect(createMapClient({ baseUrl: "" }).spots({ lat: 1, lon: 2, radiusMeters: 50_000 })).rejects.toThrow("map_api_base_url_missing");
  });
});
