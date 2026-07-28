import { describe, expect, it, vi } from "vitest";
import { OverpassSpotSearchSource } from "../modules/map/overpass-spot-search-source";
import { RouteService } from "../modules/map/route-service";
import { buildApi } from "../server";

const jsonResponse = (body: unknown) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });
const errorResponse = (status: number) => ({ ok: false, status, headers: { get: () => null }, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) });

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

  it("keeps a source-aged static candidate for 24 hours and labels stale fallback after refresh failure", async () => {
    let now = new Date("2026-07-20T12:00:00Z");
    const transport = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ elements: [
        { id: 9, lat: 22.57, lon: 113.99, tags: { name: "有来源候选" } },
      ] }))
      .mockRejectedValue(new Error("overpass_unavailable"));
    const source = new OverpassSpotSearchSource({ transport, now: () => now });
    const request = { center: { lat: 22.529, lon: 113.9468, system: "WGS84" as const }, radiusMeters: 50_000, limit: 10 };

    const first = await source.search(request);
    now = new Date("2026-07-21T11:59:59Z");
    expect(await source.search(request)).toEqual(first);
    now = new Date("2026-07-21T12:00:01Z");
    const stale = await source.search(request);

    expect(stale.items[0]?.id).toBe("osm-9");
    expect(stale.items[0]?.source?.fetchedAt).toBe("2026-07-20T12:00:00.000Z");
    expect(stale.items[0]?.source?.label).toContain("缓存已过期");
    expect(stale.items[0]?.factsBoundary).toContain("动态开放、安全和路线必须重新核对");
    expect(transport.mock.calls.length).toBeGreaterThan(1);
  });

  it("fails over between allow-listed global Overpass instances without changing OSM provenance", async () => {
    const transport = vi.fn(async (input: string | URL) => (
      new URL(input).hostname === "overpass-api.de"
        ? errorResponse(503)
        : jsonResponse({ elements: [
          { id: 11, lat: 22.58, lon: 114.01, tags: { name: "备用实例候选" } },
        ] })
    ));
    const source = new OverpassSpotSearchSource({ transport });
    const result = await source.search({
      center: { lat: 22.529, lon: 113.9468, system: "WGS84" },
      radiusMeters: 50_000,
      limit: 10,
    });

    expect(transport).toHaveBeenCalledTimes(2);
    expect(new URL(transport.mock.calls[0]![0]).hostname).toBe("overpass-api.de");
    expect(new URL(transport.mock.calls[1]![0]).hostname).toBe("maps.mail.ru");
    expect(result.items[0]).toMatchObject({
      id: "osm-11",
      source: { licenseId: "ODbL-1.0" },
    });
  });

  it("rejects unapproved Overpass endpoint hosts", () => {
    expect(() => new OverpassSpotSearchSource({ endpoints: ["https://example.com/api/interpreter"] }))
      .toThrow("provider_host_not_allowed");
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
