import { assertNormalizedWeatherRun, finalizeWeatherHour, type NormalizedWeatherRun } from "../../packages/weather-schema/src/index";

export const nativeForecastClock = "2026-07-20T12:05:00.000Z";
export const nativeForecastQuery = { latitude: 22.529, longitude: 113.9468, timezone: "Asia/Shanghai", nightDate: "2026-07-20", target: "milky-way-core" as const };

export interface ForecastComparisonSample {
  hour: number;
  totalCloudPct: number | null;
  precipitationProbabilityPct: number | null;
}

/** Supported normalized, partial input; no external provider or clock is used. */
export function nativeForecastRun(model: string, cloudOffset = 0, samples?: ForecastComparisonSample[]): NormalizedWeatherRun {
  const issuedAt = "2026-07-20T12:00:00.000Z", runId = `${model}-20260720T12`;
  const points = samples ?? Array.from({ length: 48 }, (_, hour) => ({ hour, totalCloudPct: 12 + cloudOffset, precipitationProbabilityPct: 5 }));
  const hours = points.map(point => finalizeWeatherHour({
    gridCellId: "22.5290,113.9468", providerRunId: runId,
    validTimeUtc: new Date(Date.parse(issuedAt) + point.hour * 3_600_000).toISOString(),
    conditionCode: 1, conditionText: "大部晴朗", temperatureC: 28 - point.hour / 12,
    apparentTemperatureC: 29 - point.hour / 12, relativeHumidityPct: 62, dewPointC: 20,
    pressureHpa: 1008 + point.hour / 10, totalCloudPct: point.totalCloudPct, lowCloudPct: 5 + cloudOffset,
    midCloudPct: 7, highCloudPct: 10, visibilityM: 24_000, windSpeedMps: 2.2,
    windGustMps: 3.8, windDirectionDeg: 140, precipitationMm: 0,
    precipitationProbabilityPct: point.precipitationProbabilityPct, fogProbabilityPct: null, aqi: 24, aqiScale: "European AQI",
    pm25UgM3: 8, pm10UgM3: 15, aerosolOpticalDepth: 0.12,
  }));
  return assertNormalizedWeatherRun({
    provider: "open-meteo", use: "noncommercial-poc", model, runId,
    modelRunTimeUtc: issuedAt, ingestedAt: issuedAt, resolutionKm: 25, status: "partial",
    sourceLicense: "open-meteo-CC-BY-4.0@4.0", issuedAt, expiresAt: "2026-07-20T13:00:00.000Z",
    fetchedAt: issuedAt, latitude: 22.529, longitude: 113.9468, coordinateSystem: "WGS84",
    hours, warnings: [], attribution: [{ provider: "open-meteo", label: "Weather data by Open-Meteo", url: "https://open-meteo.com/", licenseId: "CC-BY-4.0", licenseVersion: "4.0", modified: true }],
    qualityFlags: ["fog-probability-unavailable"], rawRetentionAllowed: false,
  });
}
