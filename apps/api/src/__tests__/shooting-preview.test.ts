import { describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { ShootingPreviewService } from "../modules/shooting/shooting-preview-service";
import { createShootingPreviewHandler } from "../modules/shooting/shooting-preview-handler";
import { createShootingRuntime } from "../modules/shooting/runtime";
import type { ForecastBundle } from "../../../../packages/contracts/src/forecast";
import { buildApi } from "../server";
import { positionMilkyWayCoreDirection } from "../../../../packages/astronomy-core/src/milky-way-direction";

async function removeGeneratedDirectory(dataDir: string) {
  if (dirname(resolve(dataDir)) !== resolve(tmpdir()) || !basename(dataDir).startsWith("starward-shooting-runtime-")) throw new Error("test_cleanup_outside_scope");
  await rm(dataDir, { recursive: true, force: true });
}

describe("shooting preview aggregation", () => {
  it("uses provider conditions and preserves missing light pollution", async () => {
    const bundle = { status: "fresh", generatedAt: "2026-08-12T12:00:00Z", primary: { run: { runId: "weather-run", provider: "provider", model: "model" }, hours: [{ validTimeUtc: "2026-08-12T16:00:00Z", moonIlluminationPct: 10, totalCloudPct: 12, windSpeedMps: 2, relativeHumidityPct: 60, targetAltitudeDeg: 36 }] }, astronomy: { algorithmVersion: "astro-v1" } } as unknown as ForecastBundle;
    const service = new ShootingPreviewService({ get: async () => bundle });
    const result = await service.get({ latitude: 22.5, longitude: 113.9, timezone: "Asia/Shanghai", nightDate: "2026-08-12", locationId: "spot", scheduledAt: "2026-08-12T16:40:00Z", focalLengthMm: 24, acceptsStacking: true });
    expect(result.conditions.lightPollutionSqm).toBeNull();
    expect(result.camera.result.deterministic).toBe(true);
    expect(result.camera.result.missingConditions).toContain("lightPollutionSqm");
    expect(result.provenance.weather.runId).toBe("weather-run");
    expect(result.context.scheduledAt).toBe("2026-08-12T16:40:00.000Z");
    expect(result.camera.input.scheduledAt).toBe("2026-08-12T16:40:00.000Z");
    expect(result.conditions).toMatchObject({ weatherSampleAt: "2026-08-12T16:00:00Z", weatherSampleOffsetMinutes: 40, astronomyAt: "2026-08-12T16:40:00.000Z" });
    expect(result.conditions.targetAltitudeDeg).toBe(positionMilkyWayCoreDirection({ latitude: 22.5, longitude: 113.9, elevationM: 0, at: new Date("2026-08-12T16:40:00Z") }).altitudeDeg);
    expect(result.conditions.targetAltitudeDeg).not.toBe(36);
  });

  it("persists one idempotent versioned rule receipt across runtime restart", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "starward-shooting-runtime-"));
    const invocations: string[] = [];
    const boundary = { invoke: async (request: { kind: string }) => { invocations.push(request.kind); return { status: "available", kind: request.kind }; } };
    const bundle = { status: "fresh", generatedAt: "2026-08-12T12:00:00Z", primary: { run: { runId: "weather-run", provider: "provider", model: "model" }, hours: [{ validTimeUtc: "2026-08-12T16:00:00Z", moonIlluminationPct: 10, totalCloudPct: 12, windSpeedMps: 2, relativeHumidityPct: 60, targetAltitudeDeg: 36 }] }, astronomy: { algorithmVersion: "astro-v1" } } as unknown as ForecastBundle;
    const service = new ShootingPreviewService({ get: async () => bundle });
    const query = { latitude: 22.5, longitude: 113.9, timezone: "Asia/Shanghai", nightDate: "2026-08-12", locationId: "spot", scheduledAt: "2026-08-12T16:40:00Z", focalLengthMm: 24, acceptsStacking: true };
    try {
      const firstRuntime = await createShootingRuntime({ dataDir, boundary });
      const handler = createShootingPreviewHandler(service, firstRuntime);
      expect((await handler(query)).status).toBe(200);
      expect((await handler(query)).status).toBe(200);
      expect(await firstRuntime.list({ actorId: "personal-trial-owner" })).toHaveLength(1);
      await firstRuntime.close();

      const restarted = await createShootingRuntime({ dataDir, boundary });
      const restartedHandler = createShootingPreviewHandler(service, restarted);
      expect((await restartedHandler(query)).status).toBe(200);
      (bundle as { generatedAt: string }).generatedAt = "2026-08-12T12:05:00Z";
      expect((await restartedHandler(query)).status).toBe(200);
      const records = await restarted.list({ actorId: "personal-trial-owner" });
      expect(records).toHaveLength(2);
      expect(records[0]?.result.payload).toMatchObject({ weatherRunId: "weather-run", astronomyVersion: expect.stringContaining("starward-shooting-instant"), conditionsCapturedAt: "2026-08-12T12:00:00Z", context: { scheduledAt: "2026-08-12T16:40:00.000Z" } });
      expect(records[1]?.result.payload).toMatchObject({ weatherRunId: "weather-run", astronomyVersion: expect.stringContaining("starward-shooting-instant"), conditionsCapturedAt: "2026-08-12T12:05:00Z" });
      expect(invocations).toEqual(["weather", "astronomy", "weather", "astronomy"]);
      await restarted.close();
    } finally {
      await removeGeneratedDirectory(dataDir);
    }
  });

  it("preserves precise HTTP input through real conditions, rule output, receipt and restart; rejects unsupported or inconsistent inputs", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "starward-shooting-runtime-"));
    const getForecast = vi.fn(async () => ({
      status: "fresh", generatedAt: "2026-10-24T12:00:00Z",
      primary: { run: { runId: "weather-hour-sample", provider: "fixture", model: "fixture" }, hours: [
        { validTimeUtc: "2026-10-24T18:00:00Z", totalCloudPct: 88, windSpeedMps: 9, relativeHumidityPct: 96, targetAltitudeDeg: -80 },
        { validTimeUtc: "2026-10-24T19:00:00Z", totalCloudPct: 12, windSpeedMps: 2, relativeHumidityPct: 60, targetAltitudeDeg: -80 },
      ] }, astronomy: { algorithmVersion: "night-sampled-fixture" },
    } as unknown as ForecastBundle));
    const boundary = { invoke: async () => ({ status: "available" }) };
    let runtime = await createShootingRuntime({ dataDir, boundary });
    const app = await buildApi({
      allowedOrigins: ["https://app.test"], nightReports: { create: async () => { throw new Error("unused"); } },
      spots: { getDetail: async () => { throw new Error("unused"); } }, resolveSpotActor: async () => ({ userId: null, verified: false, roles: [], invitedSpotIds: [] }),
      shooting: new ShootingPreviewService({ get: getForecast }), shootingRuntime: runtime,
    });
    const query = { latitude: "31.23", longitude: "121.47", timezone: "Asia/Shanghai", nightDate: "2026-10-24", locationId: "selected-b", scheduledAt: "2026-10-24T18:45:12.000Z", focalLengthMm: "24", acceptsStacking: "true", target: "milky-way-core" };
    const request = (change: Partial<typeof query> = {}) => app.inject({ method: "GET", url: `/v1/shooting-plans?${new URLSearchParams({ ...query, ...change })}` });
    try {
      const response = await request();
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        context: { scheduledAt: query.scheduledAt, nightDate: query.nightDate, locationId: "selected-b", latitude: 31.23, longitude: 121.47, target: "milky-way-core" },
        conditions: { weatherSampleAt: "2026-10-24T19:00:00Z", weatherSampleOffsetMinutes: 14.8, totalCloudPercent: 12, astronomyAt: query.scheduledAt },
        camera: { input: { scheduledAt: query.scheduledAt, target: "milky-way", conditions: { weatherSampleAt: "2026-10-24T19:00:00Z" } }, result: { deterministic: true } },
      });
      expect(getForecast).toHaveBeenCalledWith({ latitude: 31.23, longitude: 121.47, timezone: query.timezone, nightDate: query.nightDate, target: "milky-way-core" });
      expect((await request()).statusCode).toBe(200);
      expect((await request({ scheduledAt: "2026-10-24T18:45:13.000Z", latitude: "40.12" })).statusCode).toBe(200);
      const beforeRejected = getForecast.mock.calls.length;
      expect((await request({ target: "moon" })).statusCode).toBe(422);
      expect((await request({ target: "unknown" })).statusCode).toBe(422);
      expect((await request({ nightDate: "2026-10-25" })).statusCode).toBe(400);
      expect((await request({ scheduledAt: "2026-10-24T18:45:12" })).statusCode).toBe(400);
      expect((await request({ timezone: "Not/AZone" })).statusCode).toBe(400);
      expect(getForecast).toHaveBeenCalledTimes(beforeRejected);
      await app.close();
      await runtime.close();
      runtime = await createShootingRuntime({ dataDir, boundary });
      const records = await runtime.list({ actorId: "personal-trial-owner" });
      expect(records).toHaveLength(2);
      expect(records[0].result.payload).toMatchObject({ context: { scheduledAt: query.scheduledAt, latitude: 31.23 }, weatherSampleAt: "2026-10-24T19:00:00Z", weatherSampleOffsetMinutes: 14.8 });
      expect(records[1].result.payload).toMatchObject({ context: { scheduledAt: "2026-10-24T18:45:13.000Z", latitude: 40.12 } });
    } finally {
      await app.close(); await runtime.close(); await removeGeneratedDirectory(dataDir);
    }
  });
});
