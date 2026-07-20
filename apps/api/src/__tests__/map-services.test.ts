import { describe, expect, it } from "vitest";
import { PostgresSpotSearchRepository, type SqlQueryClient } from "../modules/map/spot-search-service";
import { RouteService, type RouteSnapshot } from "../modules/map/route-service";

const origin = { lat: 22.529, lon: 113.9468, system: "WGS84" as const };
const destination = { lat: 22.482, lon: 114.521, system: "WGS84" as const };

describe("bounded spot search", () => {
  it("uses PostGIS geography with a hard result cap and an opaque keyset cursor", async () => {
    let sql = ""; let values: unknown[] = [];
    const rows = [
      { id: "11111111-1111-4111-8111-111111111111", name: "主点", latitude: 22.5, longitude: 114.1, distance_meters: 12000, status: "verified", facilities: ["parking"], verification_at: "2026-07-01T00:00:00Z" },
      { id: "22222222-2222-4222-8222-222222222222", name: "备选", latitude: 22.6, longitude: 114.2, distance_meters: 22000, status: "provisional", facilities: ["parking"], verification_at: null },
    ];
    const client: SqlQueryClient = { query: async <T extends Record<string, unknown>>(text: string, params: unknown[]) => {
      sql = text; values = params;
      return { rows: rows as unknown as T[] };
    } };
    const repository = new PostgresSpotSearchRepository(client);
    const page = await repository.search({ center: origin, radiusMeters: 50_000, limit: 1, requireFacilities: ["parking"] });
    expect(sql).toContain("ST_DWithin");
    expect(sql).toContain("LIMIT $8");
    expect(values.at(-1)).toBe(2);
    expect(page.items).toHaveLength(1);
    expect(page.items[0].coordinate.system).toBe("WGS84");
    expect(page.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/u);
    await expect(repository.search({ center: origin, radiusMeters: 50_000, limit: 51 })).rejects.toThrow("spot_search_limit_out_of_range");
  });
});

describe("route degradation", () => {
  it("converts only at the AMap adapter boundary and persists an attributable route", async () => {
    let providerOriginSystem = "";
    const service = new RouteService(
      { route: async (input) => { providerOriginSystem = input.origin.system; return { providerVersion: "amap-route-v1", distanceMeters: 68_000, durationSeconds: 4_200, geometry: "encoded-fixture", generatedAt: "2026-08-12T12:00:00Z", expiresAt: "2026-08-12T12:30:00Z" }; } },
      { findUsable: async () => null, save: async (snapshot) => snapshot },
      () => "route-1",
    );
    const result = await service.load({ requestId: "req-1", origin, destination, mode: "drive" });
    expect(providerOriginSystem).toBe("GCJ-02");
    expect(result.authoritativeCoordinates.origin).toEqual(origin);
    expect(result).toMatchObject({ state: "fresh", navigationUsable: true, providerCoordinateSystem: "GCJ-02" });
  });

  it("never labels straight-line distance as a route when provider and cache are unavailable", async () => {
    const service = new RouteService(
      { route: async () => { throw new Error("timeout"); } },
      { findUsable: async () => null, save: async (snapshot) => snapshot },
      () => "route-missing",
    );
    const result = await service.load({ requestId: "req-2", origin, destination, mode: "drive" });
    expect(result.distanceMeters).toBeNull();
    expect(result.straightLineReferenceMeters).toBeGreaterThan(0);
    expect(result.navigationUsable).toBe(false);
    expect(result.warning).toContain("不能替代");
  });

  it("uses only an explicitly usable cached route on provider failure", async () => {
    const cached: RouteSnapshot = {
      id: "cached", requestId: "old", provider: "amap", providerVersion: "v1", generatedAt: "2026-08-12T11:45:00Z", expiresAt: "2026-08-12T12:15:00Z", state: "fresh",
      authoritativeCoordinates: { origin, destination }, providerCoordinateSystem: "GCJ-02", distanceMeters: 70_000, durationSeconds: 4_400,
      mode: "drive",
      straightLineReferenceMeters: 59_000, navigationUsable: true, geometry: "cached", warning: null,
    };
    const service = new RouteService({ route: async () => { throw new Error("timeout"); } }, { findUsable: async () => cached, save: async (snapshot) => snapshot });
    const result = await service.load({ requestId: "req-3", origin, destination, mode: "drive" });
    expect(result).toMatchObject({ state: "cached", distanceMeters: 70_000, navigationUsable: true });
  });
});
