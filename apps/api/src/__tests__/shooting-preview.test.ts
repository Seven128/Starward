import { describe, expect, it } from "vitest";
import { ShootingPreviewService } from "../modules/shooting/shooting-preview-service";
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
});
