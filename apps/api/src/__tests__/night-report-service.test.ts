import { describe, expect, it } from "vitest";
import type { NightReportRequest } from "../../../../packages/contracts/src/night-report";
import { InMemoryNightReportRepository, NightReportService, type NightReportProviders } from "../modules/night-report/night-report-service";
import { createNightReportHandler } from "../modules/night-report/night-report-handler";

const request: NightReportRequest = {
  requestId: "request-1",
  location: { lat: 22.529, lon: 113.9468, system: "WGS84", label: "深圳市 · 南山区" },
  timezone: "Asia/Shanghai",
  nightDate: "2026-08-12",
  profile: "milky-way",
  target: "milky-way-core",
  route: { origin: { lat: 22.529, lon: 113.9468, system: "WGS84", label: "深圳市 · 南山区" }, maxTravelMinutes: 120, modes: ["drive"] },
};

function providers(routeFailure = false): NightReportProviders {
  const samples = Array.from({ length: 8 }, (_, index) => ({ at: new Date(Date.parse("2026-08-12T16:00:00Z") + index * 15 * 60_000).toISOString().replace(".000Z", "Z"), eligible: true }));
  return {
    weather: { load: async () => ({ score: 82, confidence: 0.8, version: "weather-7", generatedAt: "2026-08-12T12:00:00Z", samples }) },
    astronomy: { load: async () => ({ score: 90, confidence: 0.9, version: "astro-5", generatedAt: "2026-08-12T12:00:00Z", samples, targets: [{ id: "milky-way-core", name: "银河核心", visible: true, window: { start: samples[0].at, end: samples[7].at }, peak: { at: samples[4].at, altitudeDeg: 34, azimuthDeg: 168 }, difficulty: "medium", impact: "月光较弱" }] }) },
    spots: { find: async () => ({ version: "spots-11", generatedAt: "2026-08-12T12:00:00Z", candidates: [
      { id: "closed-dark", name: "封闭暗点", sky: 99, access: 80, safety: 0, preference: 99, roadClosure: "confirmed", risks: ["已确认封路"] },
      { id: "safe", name: "安全主点", sky: 78, access: 76, safety: 92, preference: 84, risks: [] },
      { id: "backup", name: "天气备选", sky: 72, access: 88, safety: 90, preference: 76, risks: ["暗度一般"] },
    ] }) },
    routes: { load: async () => {
      if (routeFailure) throw new Error("route_timeout");
      return [
        { spotId: "safe", distanceKm: 42, travelMinutes: 58, accessScore: 78, version: "route-4", generatedAt: "2026-08-12T12:00:00Z", state: "fresh" },
        { spotId: "backup", distanceKm: 35, travelMinutes: 49, accessScore: 90, version: "route-4", generatedAt: "2026-08-12T12:00:00Z", state: "fresh" },
      ];
    } },
  };
}

describe("NightReportService", () => {
  it("builds and persists one explainable snapshot while safety overrides a darker closed site", async () => {
    const repository = new InMemoryNightReportRepository();
    const service = new NightReportService(providers(), repository, () => new Date("2026-08-12T12:00:00Z"), () => "night-1");
    const report = await service.create(request);
    expect(report.status).toBe("ready");
    expect(report.primarySpot?.id).not.toBe("closed-dark");
    expect(report.decision.blockers).toContain("封闭暗点：安全阻断");
    expect(report.observationWindow).toMatchObject({ start: "2026-08-12T16:00:00Z", end: "2026-08-12T18:00:00Z", durationMinutes: 120 });
    expect(report.provenance.map((item) => item.source)).toEqual(expect.arrayContaining(["weather", "astronomy", "spot-catalog", "route"]));
    expect(report.conditions.lightPollution).toMatchObject({ state: "unknown", radiance: null });
    expect(await repository.find("night-1")).toEqual(report);
  });

  it("returns a partial report with no invented route when the route provider times out", async () => {
    const service = new NightReportService(providers(true), new InMemoryNightReportRepository(), () => new Date("2026-08-12T12:00:00Z"), () => "night-2");
    const report = await service.create(request);
    expect(report.status).toBe("partial");
    expect(report.parts.route.state).toBe("missing");
    expect(report.primarySpot?.distanceKm).toBeNull();
    expect(report.warnings.join(" ")).toContain("不会把直线距离描述为驾车路线");
  });

  it("fails closed when weather evidence is unavailable", async () => {
    const unavailable = providers();
    unavailable.weather.load = async () => { throw new Error("weather_unavailable"); };
    const service = new NightReportService(unavailable, new InMemoryNightReportRepository(), () => new Date("2026-08-12T12:00:00Z"), () => "night-3");
    const report = await service.create(request);
    expect(report.status).toBe("insufficient-data");
    expect(report.decision.score).toBeNull();
    expect(report.primarySpot).toBeNull();
    expect(report.parts.weather.state).toBe("missing");
  });

  it("lets an active official severe warning block every high-scoring candidate", async () => {
    const source = providers();
    const original = source.weather.load;
    source.weather.load = async (value) => ({ ...await original(value), warnings: [{ id: "official-red", title: "暴雨红色预警", severity: "Red", sources: ["深圳市气象台"], safetyBlocking: true }] });
    const service = new NightReportService(source, new InMemoryNightReportRepository(), () => new Date("2026-08-12T12:00:00Z"), () => "night-warning");
    const report = await service.create({ ...request, requestId: "request-warning" });
    expect(report.status).toBe("blocked");
    expect(report.primarySpot).toBeNull();
    expect(report.decision.category).toBe("safety-risk");
    expect(report.decision.blockers.join(" ")).toContain("暴雨红色预警");
  });

  it("does not overwrite an immutable snapshot id", async () => {
    const repository = new InMemoryNightReportRepository();
    const service = new NightReportService(providers(), repository, () => new Date("2026-08-12T12:00:00Z"), () => "night-same");
    await service.create(request);
    await expect(service.create({ ...request, requestId: "request-2" })).rejects.toThrow("night_report_snapshot_immutable");
  });

  it("returns the original snapshot for a repeated request id without recomputing providers", async () => {
    const source = providers();
    let weatherCalls = 0;
    const original = source.weather.load;
    source.weather.load = async (value) => { weatherCalls += 1; return original(value); };
    const service = new NightReportService(source, new InMemoryNightReportRepository(), () => new Date("2026-08-12T12:00:00Z"), () => "night-idempotent");
    const first = await service.create(request);
    const second = await service.create(request);
    expect(second).toEqual(first);
    expect(weatherCalls).toBe(1);
  });

  it("enforces the HTTP request id boundary and returns a private no-store response", async () => {
    const service = new NightReportService(providers(), new InMemoryNightReportRepository(), () => new Date("2026-08-12T12:00:00Z"), () => "night-http");
    const handler = createNightReportHandler(service);
    const rejected = await handler({ body: request, headers: { "x-request-id": "different" } });
    expect(rejected).toMatchObject({ status: 422, body: { code: "night_report_request_id_mismatch" } });
    const accepted = await handler({ body: request, headers: { "x-request-id": request.requestId } });
    expect(accepted.status).toBe(200);
    expect(accepted.headers["cache-control"]).toBe("private, no-store");
    expect(accepted.headers.etag).toContain("night-http-1");
  });
});
