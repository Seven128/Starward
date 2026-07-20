import { describe, expect, it } from "vitest";
import { normalizeOpenMeteo } from "../modules/forecast/open-meteo-adapter";
import { ProviderGateError } from "../modules/forecast/provider-gate";
import { normalizeQWeather } from "../modules/forecast/qweather-adapter";
import { NormalizedNightReportWeatherProvider } from "../modules/forecast/night-report-weather-provider";
import type { NightReportRequest } from "../../../../packages/contracts/src/night-report";

const pendingQWeather = {
  id: "qweather" as const,
  productionEnabled: false,
  passedGates: ["provenance" as const],
  licenseStatus: "pending-commercial-confirmation",
};

const pendingOpenMeteo = {
  id: "open-meteo" as const,
  productionEnabled: false,
  passedGates: ["provenance" as const],
  licenseStatus: "pending-commercial-confirmation",
};

describe("weather provider production gate", () => {
  it("refuses a pending QWeather candidate in production and reports every missing gate", () => {
    expect(() => normalizeQWeather({
      forecast: { updateTime: "2026-08-12T20:00:00+08:00", fxLink: "https://example.invalid/qweather", hourly: [] },
      use: "production",
      gate: pendingQWeather,
      latitude: 22.529,
      longitude: 113.9468,
      fetchedAt: "2026-08-12T12:01:00Z",
      expiresAt: "2026-08-12T13:00:00Z",
      runId: "fixture-run",
      licenseVersion: "pending",
      rawRetentionAllowed: false,
    })).toThrowError(expect.objectContaining<Partial<ProviderGateError>>({
      code: "weather_provider_not_approved_for_production",
      details: expect.arrayContaining(["authenticity", "target-region-stability", "commercial-rights", "safe-degradation"]),
    }));
  });

  it("forbids the Open-Meteo free endpoint in production even if a record is accidentally enabled", () => {
    expect(() => normalizeOpenMeteo({
      payload: { latitude: 22.529, longitude: 113.9468, utc_offset_seconds: 0, hourly: { time: [] }, hourly_units: {} },
      use: "production",
      endpointClass: "free",
      gate: { ...pendingOpenMeteo, productionEnabled: true, licenseStatus: "approved-commercial", passedGates: ["provenance", "authenticity", "target-region-stability", "commercial-rights", "safe-degradation"] },
      fetchedAt: "2026-08-12T12:01:00Z",
      issuedAt: "2026-08-12T12:00:00Z",
      expiresAt: "2026-08-12T13:00:00Z",
      model: "fixture-model",
      runId: "fixture-run",
      licenseVersion: "4.0",
      rawRetentionAllowed: false,
    })).toThrowError("open_meteo_free_endpoint_forbidden_in_production");
  });
});

describe("weather provider normalization", () => {
  it("normalizes QWeather units, preserves null layered cloud, and carries warning sources", () => {
    const run = normalizeQWeather({
      forecast: {
        updateTime: "2026-08-12T20:00:00+08:00",
        fxLink: "https://example.invalid/qweather",
        hourly: [{ fxTime: "2026-08-12T21:00:00+08:00", temp: "28", humidity: "74", cloud: "18", windSpeed: "18", vis: "12", precip: "0" }],
      },
      warning: {
        warning: [{ id: "440300-1", title: "雷雨大风黄色预警", pubTime: "2026-08-12T19:30:00+08:00", endTime: "2026-08-12T23:30:00+08:00", severity: "Yellow" }],
        refer: { sources: ["深圳市气象台"] },
      },
      use: "noncommercial-poc",
      gate: pendingQWeather,
      latitude: 22.529,
      longitude: 113.9468,
      fetchedAt: "2026-08-12T12:01:00Z",
      expiresAt: "2026-08-12T13:00:00Z",
      runId: "qweather-fixture-20260812T20",
      licenseVersion: "fixture-only",
      rawRetentionAllowed: false,
    });
    expect(run.hours[0]).toMatchObject({ windSpeedMps: 5, visibilityM: 12_000, lowCloudPct: null, precipitationMm: 0 });
    expect(run.hours[0].missingFields).toEqual(expect.arrayContaining(["lowCloudPct", "midCloudPct", "highCloudPct"]));
    expect(run.warnings[0].sources).toEqual(["深圳市气象台"]);
    expect(run.qualityFlags).toContain("layered-cloud-unavailable");
  });

  it("normalizes Open-Meteo arrays in UTC without converting missing values to zero", () => {
    const run = normalizeOpenMeteo({
      payload: {
        latitude: 22.529,
        longitude: 113.9468,
        utc_offset_seconds: 0,
        hourly: {
          time: ["2026-08-12T13:00"],
          temperature_2m: [27.5],
          relative_humidity_2m: [null],
          cloud_cover: [12],
          cloud_cover_low: [4],
          cloud_cover_mid: [6],
          cloud_cover_high: [8],
          visibility: [15],
          wind_speed_10m: [10.8],
          precipitation: [0],
        },
        hourly_units: { visibility: "km", wind_speed_10m: "km/h" },
      },
      use: "noncommercial-poc",
      endpointClass: "free",
      gate: pendingOpenMeteo,
      fetchedAt: "2026-08-12T12:01:00Z",
      issuedAt: "2026-08-12T12:00:00Z",
      expiresAt: "2026-08-12T18:00:00Z",
      model: "best-match-fixture",
      runId: "open-meteo-fixture-20260812T12",
      licenseVersion: "CC-BY-4.0-fixture",
      rawRetentionAllowed: false,
    });
    expect(run.hours[0]).toMatchObject({ validTimeUtc: "2026-08-12T13:00:00.000Z", relativeHumidityPct: null, visibilityM: 15_000, windSpeedMps: 3, precipitationMm: 0 });
    expect(run.hours[0].missingFields).toContain("relativeHumidityPct");
    expect(run.attribution[0]).toMatchObject({ licenseId: "CC-BY-4.0", modified: true });
  });

  it("feeds NightReport only through an explicit versioned scoring policy", async () => {
    const run = normalizeOpenMeteo({
      payload: {
        latitude: 22.529,
        longitude: 113.9468,
        utc_offset_seconds: 0,
        hourly: { time: ["2026-08-12T13:00"], temperature_2m: [27], cloud_cover: [12], cloud_cover_low: [4], cloud_cover_mid: [6], cloud_cover_high: [8], visibility: [15_000], wind_speed_10m: [3], precipitation: [0], relative_humidity_2m: [70] },
        hourly_units: { visibility: "m", wind_speed_10m: "m/s" },
      },
      use: "noncommercial-poc", endpointClass: "free", gate: pendingOpenMeteo,
      fetchedAt: "2026-08-12T12:01:00Z", issuedAt: "2026-08-12T12:00:00Z", expiresAt: "2026-08-12T18:00:00Z",
      model: "fixture-model", runId: "fixture-run", licenseVersion: "fixture", rawRetentionAllowed: false,
    });
    const provider = new NormalizedNightReportWeatherProvider(
      { load: async () => run },
      { version: "approved-fixture-policy@1", evaluate: ({ hour }) => ({ eligible: hour.totalCloudPct !== null && hour.totalCloudPct < 30, score: 88, confidence: 0.73, reasons: ["fixture threshold"] }) },
    );
    const request = {
      requestId: "weather-evidence-1", location: { lat: 22.529, lon: 113.9468, system: "WGS84", label: "深圳" },
      timezone: "Asia/Shanghai", nightDate: "2026-08-12", profile: "milky-way", target: "milky-way-core",
      route: { origin: { lat: 22.529, lon: 113.9468, system: "WGS84", label: "深圳" }, maxTravelMinutes: 120, modes: ["drive"] },
    } satisfies NightReportRequest;
    const evidence = await provider.load(request);
    expect(evidence).toMatchObject({ score: 88, confidence: 0.73, version: "open-meteo/fixture-model/fixture-run;policy=approved-fixture-policy@1" });
    expect(evidence.samples).toEqual([{ at: "2026-08-12T13:00:00.000Z", eligible: true }]);
    expect(evidence.attribution?.[0].licenseId).toBe("CC-BY-4.0");
  });
});
