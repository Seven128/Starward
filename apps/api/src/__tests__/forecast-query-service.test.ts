import { describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nativeForecastRun as weatherRun } from "../../../../tests/fixtures/native-forecast";
import { ForecastQueryService } from "../modules/forecast/forecast-query-service";
import { buildApi } from "../server";
import { createForecastHandler } from "../modules/forecast/forecast-handler";
import { createForecastRuntime } from "../modules/forecast/runtime";

describe("forecast query service", () => {
  it("bounds cached locations by recent use and expires entries before reuse", async () => {
    let now = Date.parse("2026-07-20T12:05:00.000Z");
    const primary = { load: vi.fn(async () => weatherRun("gfs_seamless")) };
    const service = new ForecastQueryService({ primary, maxCacheEntries: 2, cacheTtlMs: 1000, now: () => new Date(now) });
    const a = { latitude: 22.529, longitude: 113.9468, timezone: "Asia/Shanghai", nightDate: "2026-07-20", target: "milky-way-core" as const };
    const b = { ...a, longitude: 114 };
    const c = { ...a, longitude: 114.1 };
    await service.get(a);
    await service.get(b);
    expect((await service.get(a)).status).toBe("cached");
    await service.get(c);
    expect((await service.get(a)).status).toBe("cached");
    expect(primary.load).toHaveBeenCalledTimes(3);
    await service.get(b);
    expect(primary.load).toHaveBeenCalledTimes(4);
    now += 1001;
    await service.get(b);
    expect(primary.load).toHaveBeenCalledTimes(5);
  });

  it("can disable completed-result caching without losing concurrent request coalescing or retry", async () => {
    const query = { latitude: 22.529, longitude: 113.9468, timezone: "Asia/Shanghai", nightDate: "2026-07-20", target: "milky-way-core" as const };
    const primary = { load: vi.fn(async () => weatherRun("gfs_seamless")) };
    const service = new ForecastQueryService({ primary, maxCacheEntries: 0 });
    await Promise.all([service.get(query), service.get(query)]);
    expect(primary.load).toHaveBeenCalledTimes(1);
    primary.load.mockRejectedValueOnce(new Error("provider unavailable"));
    await expect(service.get(query)).rejects.toThrow("provider unavailable");
    await service.get(query);
    expect(primary.load).toHaveBeenCalledTimes(3);
    expect(() => new ForecastQueryService({ primary, maxCacheEntries: -1 })).toThrow("forecast_cache_capacity_invalid");
  });

  it("combines normalized provider runs with astronomy, trends, provenance, and cache semantics", async () => {
    const primary = { load: vi.fn(async () => weatherRun("gfs_seamless")) };
    const comparison = { load: vi.fn(async () => weatherRun("ecmwf_ifs025", 30)) };
    const service = new ForecastQueryService({ primary, comparison, now: () => new Date("2026-07-20T12:05:00.000Z") });
    const query = { latitude: 22.529, longitude: 113.9468, timezone: "Asia/Shanghai", nightDate: "2026-07-20", target: "milky-way-core" as const };
    const first = await service.get(query);
    const second = await service.get(query);
    expect(first.schemaVersion).toBe("starward-forecast-bundle-v1");
    expect(first.primary.hours[0].totalCloudPct).toBe(12);
    expect(first.primary.hours[0].moonAltitudeDeg).not.toBeNull();
    expect(first.primary.run.attribution[0].licenseId).toBe("CC-BY-4.0");
    expect(first.modelComparison.disagreementStartUtc).not.toBeNull();
    expect(first.trends.length).toBeGreaterThan(1);
    expect(first.astronomy.algorithmVersion).toContain("astronomy-engine");
    expect(first.layers[0].tileUrl).toBeNull();
    expect(first.layers[0].limitation).toContain("不伪造");
    expect(second.status).toBe("cached");
    expect(primary.load).toHaveBeenCalledTimes(1);
    expect(comparison.load).toHaveBeenCalledTimes(1);
  });

  it("serves the real query service through both forecast and astronomy HTTP routes", async () => {
    const service = new ForecastQueryService({ primary: { load: async () => weatherRun("gfs_seamless") }, now: () => new Date("2026-07-20T12:05:00.000Z") });
    const app = await buildApi({
      nightReports: { create: async () => { throw new Error("not_used"); } },
      spots: { getDetail: async () => { throw new Error("not_used"); } },
      resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }),
      allowedOrigins: ["http://127.0.0.1:8081"], forecast: service,
    });
    const query = "latitude=22.529&longitude=113.9468&timezone=Asia%2FShanghai&nightDate=2026-07-20&target=milky-way-core";
    const forecast = await app.inject({ method: "GET", url: `/v1/forecast/hourly?${query}`, headers: { origin: "http://127.0.0.1:8081" } });
    expect(forecast.statusCode).toBe(200);
    expect(forecast.json().primary.hours.length).toBe(48);
    expect(forecast.headers["x-data-mode"]).toBe("noncommercial-poc");
    const astronomy = await app.inject({ method: "GET", url: `/v1/astronomy/evidence?${query}` });
    expect(astronomy.statusCode).toBe(200);
    expect(astronomy.json().coordinateSystem).toBe("WGS84");
    await app.close();
  });

  it("replays one cached batch but accepts a newly generated batch after process restart", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "starward-forecast-runtime-"));
    const query = { latitude: 22.529, longitude: 113.9468, timezone: "Asia/Shanghai", nightDate: "2026-07-20", target: "milky-way-core" };
    const boundary = { invoke: async (request: { kind: string }) => ({ status: "available", kind: request.kind }) };
    try {
      const firstRuntime = await createForecastRuntime({ dataDir, boundary });
      const firstService = new ForecastQueryService({ primary: { load: async () => weatherRun("gfs_seamless") }, now: () => new Date("2026-07-20T12:05:00.000Z") });
      const firstHandler = createForecastHandler(firstService, firstRuntime);
      expect((await firstHandler(query)).status).toBe(200);
      expect((await firstHandler(query)).status).toBe(200);
      await firstRuntime.close();

      const restartedRuntime = await createForecastRuntime({ dataDir, boundary });
      const restartedService = new ForecastQueryService({ primary: { load: async () => weatherRun("gfs_seamless") }, now: () => new Date("2026-07-20T12:06:00.000Z") });
      expect((await createForecastHandler(restartedService, restartedRuntime)(query)).status).toBe(200);
      await restartedRuntime.close();
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
