import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApi } from "../server";
import { OverpassSpotSearchSource } from "../modules/map/overpass-spot-search-source";
import { PocSpotTrustRepository } from "../modules/spots/poc-spot-trust-repository";
import { SpotTrustService, type SpotRecord } from "../modules/spots/spot-trust-service";

const anonymous = { userId: null, verified: false, roles: [], invitedSpotIds: [] };
const jsonResponse = (body: unknown) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => body, arrayBuffer: async () => new ArrayBuffer(0) });
const apps: Awaited<ReturnType<typeof buildApi>>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

// Real loopback HTTP, route, handler, service, repository and provider adapter.
// Only upstream OSM transport and private stored input are controlled fixtures;
// this does not assert actual supplier coverage or production authorization.
describe("spot identity through HTTP and its business owner", () => {
  it("reads cross-region B by node identity, with no first-page/current fallback or private disclosure", async () => {
    const upstreamQueries: string[] = [];
    const a = { type: "node", id: 42001, lat: 22.529123, lon: 113.946812, tags: { name: "隔离地点 A" } };
    const b = { type: "node", id: 42002, lat: 40.123456, lon: 116.234567, tags: { name: "隔离跨区域 B", tourism: "viewpoint", toilets: "yes" } };
    const transport = vi.fn(async (input: string | URL) => {
      const query = new URL(input).searchParams.get("data")!;
      upstreamQueries.push(query);
      return jsonResponse({ elements: query.includes("node(42002)") ? [a, b] : [a] });
    });
    const source = new OverpassSpotSearchSource({ transport, now: () => new Date("2026-10-23T08:00:00Z") });
    const publicRepository = new PocSpotTrustRepository(source);
    const privateSpot: SpotRecord = {
      id: "private-b", ownerId: "owner-b", name: "私有地点 B", coordinate: { lat: 35.654321, lon: 105.123456, system: "WGS84" },
      visibility: "private", status: "open", statusReason: null, updatedAt: "2026-10-23T08:00:00Z",
    };
    const service = new SpotTrustService({
      load: (id) => id === privateSpot.id ? Promise.resolve({ spot: privateSpot, facts: [] }) : publicRepository.load(id),
    });
    const app = await buildApi({
      allowedOrigins: ["http://127.0.0.1"], nightReports: { create: async () => { throw new Error("unused"); } },
      spots: service, resolveSpotActor: async () => anonymous,
    });
    apps.push(app);
    const origin = await app.listen({ host: "127.0.0.1", port: 0 });

    const response = await fetch(`${origin}/v1/spots/osm-42002`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const detail = await response.json();
    expect(detail).toMatchObject({ id: "osm-42002", name: "隔离跨区域 B", coordinate: { exact: false, coordinate: { lat: 40.12, lon: 116.23, system: "WGS84" } } });
    expect(detail.facts.find((fact: { key: string }) => fact.key === "toilet")).toMatchObject({ value: "poi-tag-only", sources: [{ version: "ODbL-1.0" }] });
    expect(detail.actions.find((action: { action: string }) => action.action === "navigate").allowed).toBe(false);
    expect(upstreamQueries).toEqual(["[out:json][timeout:30];node(42002);out;"]);

    for (const id of ["osm-42003", "current", "private-b"]) {
      const unavailable = await fetch(`${origin}/v1/spots/${id}`);
      expect(unavailable.status).toBe(404);
      expect(await unavailable.json()).toEqual({ code: "spot_not_found" });
    }
    expect(upstreamQueries).toHaveLength(2);
    expect(upstreamQueries[1]).toContain("node(42003)");
  });

  it.each(["transport", "runtime-remark", "missing-elements"])("does not convert %s failure into a missing record or another successful place", async (failure) => {
    const source = new OverpassSpotSearchSource({ transport: async () => {
      if (failure === "transport") throw new Error("fixture_upstream_unavailable");
      return jsonResponse(failure === "runtime-remark" ? { elements: [], remark: "runtime error: Query timed out" } : {});
    } });
    const app = await buildApi({
      allowedOrigins: ["http://127.0.0.1"], nightReports: { create: async () => { throw new Error("unused"); } },
      spots: new SpotTrustService(new PocSpotTrustRepository(source)), resolveSpotActor: async () => anonymous,
    });
    apps.push(app);
    const origin = await app.listen({ host: "127.0.0.1", port: 0 });
    const unavailable = await fetch(`${origin}/v1/spots/osm-42002`);
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({ code: "spot_detail_unavailable" });
  });

  it("uses the existing fallback after an HTTP 200 runtime error instead of caching false absence", async () => {
    const transport = vi.fn().mockResolvedValueOnce(jsonResponse({ elements: [], remark: "runtime error: Query timed out" }))
      .mockResolvedValueOnce(jsonResponse({ elements: [{ type: "node", id: 42, lat: 40, lon: 116, tags: { tourism: "viewpoint" } }] }));
    const source = new OverpassSpotSearchSource({ transport });
    expect((await source.findById("osm-42"))?.id).toBe("osm-42");
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("validates the node id/type/coordinate and coalesces only in-flight reads", async () => {
    let complete!: (value: ReturnType<typeof jsonResponse>) => void;
    const transport = vi.fn(() => new Promise<ReturnType<typeof jsonResponse>>((resolve) => { complete = resolve; }));
    const source = new OverpassSpotSearchSource({ transport });
    const first = source.findById("osm-42");
    const second = source.findById("osm-42");
    complete(jsonResponse({ elements: [{ type: "node", id: 42, lat: 0, lon: 0, tags: { tourism: "viewpoint" } }] }));
    const [one, two] = await Promise.all([first, second]);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(one?.coordinate).toEqual({ lat: 0, lon: 0, system: "WGS84" });
    expect(two).toEqual(one);
    expect(two).not.toBe(one);
    for (const id of ["current", "osm-42);node(1", "osm-9007199254740992", "osm-00"]) expect(await source.findById(id)).toBeNull();
    expect(transport).toHaveBeenCalledTimes(1);
    const invalidSource = new OverpassSpotSearchSource({ transport: async () => jsonResponse({ elements: [{ type: "way", id: 42, lat: 40, lon: 116, tags: { tourism: "viewpoint" } }] }) });
    expect(await invalidSource.findById("osm-42")).toBeNull();
    const invalidCoordinate = new OverpassSpotSearchSource({ transport: async () => jsonResponse({ elements: [{ type: "node", id: 42, lat: 91, lon: 116, tags: { tourism: "viewpoint" } }] }) });
    expect(await invalidCoordinate.findById("osm-42")).toBeNull();
    const outsideCandidateScope = new OverpassSpotSearchSource({ transport: async () => jsonResponse({ elements: [{ type: "node", id: 42, lat: 40, lon: 116, tags: { amenity: "cafe" } }] }) });
    expect(await outsideCandidateScope.findById("osm-42")).toBeNull();
    const missingType = new OverpassSpotSearchSource({ transport: async () => jsonResponse({ elements: [{ id: 42, lat: 40, lon: 116, tags: { tourism: "viewpoint" } }] }) });
    expect(await missingType.findById("osm-42")).toBeNull();
    const search = { center: { lat: 40, lon: 116, system: "WGS84" as const }, radiusMeters: 1000, limit: 5 };
    for (const rejected of [missingType, invalidSource, outsideCandidateScope]) {
      expect((await rejected.search(search)).items).toEqual([]);
    }
  });
});
