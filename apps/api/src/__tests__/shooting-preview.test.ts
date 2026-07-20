import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ShootingPreviewService } from "../modules/shooting/shooting-preview-service";
import { createShootingPreviewHandler } from "../modules/shooting/shooting-preview-handler";
import { createShootingRuntime } from "../modules/shooting/runtime";
import type { ForecastBundle } from "../../../../packages/contracts/src/forecast";

describe("shooting preview aggregation", () => {
  it("uses provider conditions and preserves missing light pollution", async () => {
    const bundle = { status: "fresh", generatedAt: "2026-08-12T12:00:00Z", primary: { run: { runId: "weather-run", provider: "provider", model: "model" }, hours: [{ validTimeUtc: "2026-08-12T16:00:00Z", moonIlluminationPct: 10, totalCloudPct: 12, windSpeedMps: 2, relativeHumidityPct: 60, targetAltitudeDeg: 36 }] }, astronomy: { algorithmVersion: "astro-v1" } } as unknown as ForecastBundle;
    const service = new ShootingPreviewService({ get: async () => bundle });
    const result = await service.get({ latitude: 22.5, longitude: 113.9, timezone: "Asia/Shanghai", nightDate: "2026-08-12", locationId: "spot", scheduledAt: "2026-08-12T16:40:00Z", focalLengthMm: 24, acceptsStacking: true });
    expect(result.conditions.lightPollutionSqm).toBeNull();
    expect(result.camera.result.deterministic).toBe(true);
    expect(result.camera.result.missingConditions).toContain("lightPollutionSqm");
    expect(result.provenance.weather.runId).toBe("weather-run");
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
      const records = await restarted.list({ actorId: "personal-trial-owner" });
      expect(records).toHaveLength(1);
      expect(records[0]?.result.payload).toMatchObject({ weatherRunId: "weather-run", astronomyVersion: "astro-v1" });
      expect(invocations).toEqual(["weather", "astronomy"]);
      await restarted.close();
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
