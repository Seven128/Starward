import { describe, expect, it, vi } from "vitest";
import { finalizeWeatherHour, type NormalizedWeatherRun } from "../../../../packages/weather-schema/src/index";
import { ForecastQueryService } from "../modules/forecast/forecast-query-service";
import { buildApi } from "../server";

function weatherRun(model: string, cloudOffset = 0): NormalizedWeatherRun {
  const issuedAt = "2026-07-20T12:00:00.000Z";
  const runId = `${model}-20260720T12`;
  const hours = Array.from({ length: 48 }, (_, index) => finalizeWeatherHour({
    gridCellId: "22.5290,113.9468", providerRunId: runId,
    validTimeUtc: new Date(Date.parse(issuedAt) + index * 3_600_000).toISOString(),
    conditionCode: 1, conditionText: "大部晴朗", temperatureC: 28 - index / 12,
    apparentTemperatureC: 29 - index / 12, relativeHumidityPct: 62, dewPointC: 20,
    pressureHpa: 1008 + index / 10, totalCloudPct: 12 + cloudOffset, lowCloudPct: 5 + cloudOffset,
    midCloudPct: 7, highCloudPct: 10, visibilityM: 24_000, windSpeedMps: 2.2,
    windGustMps: 3.8, windDirectionDeg: 140, precipitationMm: 0,
    precipitationProbabilityPct: 5, fogProbabilityPct: null, aqi: 24, aqiScale: "European AQI",
    pm25UgM3: 8, pm10UgM3: 15, aerosolOpticalDepth: 0.12,
  }));
  return {
    provider: "open-meteo", use: "noncommercial-poc", model, runId,
    modelRunTimeUtc: issuedAt, ingestedAt: issuedAt, resolutionKm: 25, status: "partial",
    sourceLicense: "open-meteo-CC-BY-4.0@4.0", issuedAt, expiresAt: "2026-07-20T13:00:00.000Z",
    fetchedAt: issuedAt, latitude: 22.529, longitude: 113.9468, coordinateSystem: "WGS84",
    hours, warnings: [], attribution: [{ provider: "open-meteo", label: "Weather data by Open-Meteo", url: "https://open-meteo.com/", licenseId: "CC-BY-4.0", licenseVersion: "4.0", modified: true }],
    qualityFlags: ["fog-probability-unavailable"], rawRetentionAllowed: false,
  };
}

describe("forecast query service", () => {
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
});
