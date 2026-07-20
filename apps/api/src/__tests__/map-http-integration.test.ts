import { describe, expect, it, vi } from "vitest";
import { OverpassSpotSearchSource } from "../modules/map/overpass-spot-search-source";
import { RouteService } from "../modules/map/route-service";
import { buildApi } from "../server";

const jsonResponse = (body: unknown) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });

describe("map HTTP integration", () => {
  it("normalizes bounded OpenStreetMap candidates without inventing facility facts and caches the upstream result", async () => {
    const transport = vi.fn(async () => jsonResponse({ elements: [
      { id: 7, lat: 22.6, lon: 114.0, tags: { "name:zh": "公开观景点", tourism: "viewpoint", toilets: "yes" } },
    ] }));
    const source = new OverpassSpotSearchSource({ transport, now: () => new Date("2026-07-20T12:00:00Z") });
    const request = { center: { lat: 22.529, lon: 113.9468, system: "WGS84" as const }, radiusMeters: 50_000, limit: 10 };
    const first = await source.search(request);
    const second = await source.search(request);
    const item = first.items[0];
    expect(item).toMatchObject({ id: "osm-7", status: "provisional", mapState: "insufficient", facilities: ["toilet"] });
    expect(item?.factsBoundary).toContain("未现场验证");
    expect(item?.source?.licenseId).toBe("ODbL-1.0");
    expect(second).toEqual(first);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("mounts bounded spots and honest missing-route degradation on the API", async () => {
    const source = new OverpassSpotSearchSource({ transport: async () => jsonResponse({ elements: [{ id: 8, lat: 22.55, lon: 113.97, tags: { name: "候选点" } }] }) });
    const routes = new RouteService({ route: async () => { throw new Error("provider_offline"); } }, { findUsable: async () => null, save: async (snapshot) => snapshot }, () => "route-missing");
    const app = await buildApi({
      nightReports: { create: async () => { throw new Error("not_used"); } }, spots: { getDetail: async () => { throw new Error("not_used"); } },
      resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }), allowedOrigins: ["http://127.0.0.1:8081"], mapSpots: source, routes,
    });
    const spots = await app.inject({ method: "GET", url: "/v1/map/spots?lat=22.529&lon=113.9468&radiusMeters=50000&limit=10" });
    expect(spots.statusCode).toBe(200);
    expect(spots.json().items[0].coordinate.system).toBe("WGS84");
    const route = await app.inject({ method: "POST", url: "/v1/routes/plan", payload: { requestId: "map-1", origin: { lat: 22.529, lon: 113.9468, system: "WGS84" }, destination: { lat: 22.55, lon: 113.97, system: "WGS84" }, mode: "drive" } });
    expect(route.statusCode).toBe(200);
    expect(route.json()).toMatchObject({ state: "missing", navigationUsable: false, distanceMeters: null });
    expect(route.json().warning).toContain("不能替代");
    await app.close();
  });
});
