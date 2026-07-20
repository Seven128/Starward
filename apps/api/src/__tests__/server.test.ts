import { afterEach, describe, expect, it } from "vitest";
import type { NightReport, NightReportRequest } from "../../../../packages/contracts/src/night-report";
import { buildApi } from "../server";

const apps: Awaited<ReturnType<typeof buildApi>>[] = [];
afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

function report(requestId: string): NightReport {
  return {
    id: "5e84b80e-71f9-4ad0-8be5-d00d4adc5a83", revision: 1, requestId,
    generatedAt: "2026-08-12T12:00:00Z", expiresAt: "2026-08-12T12:15:00Z", status: "insufficient-data",
    context: {
      location: { lat: 22.529, lon: 113.9468, system: "WGS84", label: "深圳" }, timezone: "Asia/Shanghai", nightDate: "2026-08-12", profile: "family", target: "moon",
      route: { origin: { lat: 22.529, lon: 113.9468, system: "WGS84", label: "深圳" }, maxTravelMinutes: 60, modes: ["drive"] },
    },
    decision: { category: "insufficient-data", score: null, confidence: 0, summary: "关键数据不足", reasons: [], blockers: [] },
    observationWindow: null, primarySpot: null, backupSpots: [], targets: [],
    conditions: { weather: null, astronomy: null, lightPollution: { radiance: null, year: null, state: "unknown", boundary: "fixture" } },
    parts: {
      weather: { state: "missing", source: "weather", sourceVersion: null, sourceTime: null, confidence: 0, warning: "missing" },
      astronomy: { state: "missing", source: "astronomy", sourceVersion: null, sourceTime: null, confidence: 0, warning: "missing" },
      spots: { state: "missing", source: "spot-catalog", sourceVersion: null, sourceTime: null, confidence: 0, warning: "missing" },
      route: { state: "missing", source: "route", sourceVersion: null, sourceTime: null, confidence: 0, warning: "missing" },
    },
    warnings: [], provenance: [],
  };
}

const apiDependencies = {
  allowedOrigins: ["https://app.starward.example"],
  nightReports: { create: async (request: NightReportRequest) => report(request.requestId) },
  spots: { getDetail: async (id: string) => ({
    id, name: "受限地点", status: "open" as const, statusReason: null, updatedAt: "2026-08-12T10:00:00Z",
    coordinate: { level: "approximate" as const, coordinate: { lat: 22.53, lon: 113.95, system: "WGS84" as const }, exact: false, reason: "需要邀请" },
    facts: [], actions: [], trust: { verifiedSources: 0, conflicts: [], fieldVerificationRequired: true },
  }) },
  resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }),
};

describe("Starward API host", () => {
  it("wires the NightReport HTTP boundary without exposing a permissive origin", async () => {
    const app = await buildApi({
      ...apiDependencies,
      nightReports: { create: async (request) => report(request.requestId) },
      now: () => new Date("2026-08-12T12:00:00Z"),
    });
    apps.push(app);
    const response = await app.inject({
      method: "POST", url: "/v1/night-reports",
      headers: { "x-request-id": "api-request-1", origin: "https://app.starward.example" },
      payload: { requestId: "api-request-1" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("https://app.starward.example");
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.json()).toMatchObject({ requestId: "api-request-1" });
  });

  it("rejects wildcard configuration and disallowed browser origins", async () => {
    await expect(buildApi({ ...apiDependencies, allowedOrigins: ["*"] })).rejects.toThrow("api_wildcard_origin_forbidden");
    const app = await buildApi(apiDependencies);
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/health/live", headers: { origin: "https://evil.example" } });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "origin_not_allowed" });
  });

  it("serves spot coordinates through the server-side actor policy with private caching", async () => {
    const app = await buildApi(apiDependencies);
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/v1/spots/spot-secret" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers.vary).toContain("authorization");
    expect(response.json()).toMatchObject({ id: "spot-secret", coordinate: { level: "approximate", exact: false } });
  });
});
