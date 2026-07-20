export type WeatherProviderId = "qweather" | "open-meteo";
export type ProviderUse = "noncommercial-poc" | "production";
export type WeatherValueQuality = "observed" | "forecast" | "cached" | "missing";

export interface WeatherAttribution {
  provider: WeatherProviderId;
  label: string;
  url: string;
  licenseId: string;
  licenseVersion: string;
  modified: boolean;
}

export interface NormalizedWeatherHour {
  gridCellId: string;
  providerRunId: string;
  validTimeUtc: string;
  conditionCode: number | null;
  conditionText: string | null;
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  relativeHumidityPct: number | null;
  dewPointC: number | null;
  pressureHpa: number | null;
  totalCloudPct: number | null;
  lowCloudPct: number | null;
  midCloudPct: number | null;
  highCloudPct: number | null;
  visibilityM: number | null;
  windSpeedMps: number | null;
  windGustMps: number | null;
  windDirectionDeg: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPct: number | null;
  fogProbabilityPct: number | null;
  aqi: number | null;
  aqiScale: string | null;
  pm25UgM3: number | null;
  pm10UgM3: number | null;
  aerosolOpticalDepth: number | null;
  quality: WeatherValueQuality;
  missingFields: string[];
}

export interface NormalizedWeatherWarning {
  id: string;
  title: string;
  severity: string | null;
  issuedAt: string;
  expiresAt: string | null;
  status: "active" | "expired" | "unknown";
  sources: string[];
}

export interface NormalizedWeatherRun {
  provider: WeatherProviderId;
  use: ProviderUse;
  model: string;
  runId: string;
  modelRunTimeUtc: string;
  ingestedAt: string;
  resolutionKm: number | null;
  status: "complete" | "partial";
  sourceLicense: string;
  issuedAt: string;
  expiresAt: string;
  fetchedAt: string;
  latitude: number;
  longitude: number;
  coordinateSystem: "WGS84";
  hours: NormalizedWeatherHour[];
  warnings: NormalizedWeatherWarning[];
  attribution: WeatherAttribution[];
  qualityFlags: string[];
  rawRetentionAllowed: boolean;
}

const ISO_WITH_ZONE = /(?:[zZ]|[+-]\d\d:\d\d)$/u;

export function assertInstant(value: string, field: string): string {
  if (!ISO_WITH_ZONE.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${field}_must_be_iso_with_timezone`);
  }
  return new Date(value).toISOString();
}

export function finiteOrNull(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field}_must_be_finite_or_null`);
  return number;
}

export function percentOrNull(value: unknown, field: string): number | null {
  const number = finiteOrNull(value, field);
  if (number !== null && (number < 0 || number > 100)) throw new RangeError(`${field}_must_be_0_to_100`);
  return number;
}

export function nonNegativeOrNull(value: unknown, field: string): number | null {
  const number = finiteOrNull(value, field);
  if (number !== null && number < 0) throw new RangeError(`${field}_must_be_non_negative`);
  return number;
}

export function finalizeWeatherHour(input: Omit<NormalizedWeatherHour, "quality" | "missingFields">): NormalizedWeatherHour {
  const valueKeys = [
    "temperatureC", "apparentTemperatureC", "relativeHumidityPct", "dewPointC", "pressureHpa",
    "totalCloudPct", "lowCloudPct", "midCloudPct", "highCloudPct", "visibilityM", "windSpeedMps",
    "windGustMps", "windDirectionDeg", "precipitationMm", "precipitationProbabilityPct",
    "fogProbabilityPct", "aqi", "pm25UgM3", "pm10UgM3", "aerosolOpticalDepth",
  ] as const;
  const missingFields = valueKeys.filter((key) => input[key] === null);
  return {
    ...input,
    validTimeUtc: assertInstant(input.validTimeUtc, "valid_time"),
    quality: missingFields.length === valueKeys.length ? "missing" : "forecast",
    missingFields: [...missingFields],
  };
}

export function assertNormalizedWeatherRun(run: NormalizedWeatherRun): NormalizedWeatherRun {
  assertInstant(run.modelRunTimeUtc, "model_run_time");
  assertInstant(run.ingestedAt, "ingested_at");
  assertInstant(run.issuedAt, "issued_at");
  assertInstant(run.expiresAt, "expires_at");
  assertInstant(run.fetchedAt, "fetched_at");
  if (Date.parse(run.expiresAt) <= Date.parse(run.issuedAt)) throw new RangeError("weather_run_expiry_must_follow_issue");
  if (!Number.isFinite(run.latitude) || run.latitude < -90 || run.latitude > 90) throw new RangeError("latitude_out_of_range");
  if (!Number.isFinite(run.longitude) || run.longitude < -180 || run.longitude > 180) throw new RangeError("longitude_out_of_range");
  if (!run.runId || !run.model || !run.sourceLicense || !run.attribution.length) throw new TypeError("weather_run_metadata_incomplete");
  if (run.resolutionKm !== null && (!Number.isFinite(run.resolutionKm) || run.resolutionKm <= 0)) throw new RangeError("weather_run_resolution_invalid");
  if (run.hours.some((hour) => hour.providerRunId !== run.runId || !hour.gridCellId)) throw new TypeError("weather_hour_run_identity_incomplete");
  return run;
}
