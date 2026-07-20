import {
  assertNormalizedWeatherRun,
  finalizeWeatherHour,
  finiteOrNull,
  nonNegativeOrNull,
  percentOrNull,
  type NormalizedWeatherRun,
  type ProviderUse,
} from "../../../../../packages/weather-schema/src/index";
import { assertWeatherProviderUse, type WeatherProviderGateRecord } from "./provider-gate";

export interface OpenMeteoPayload {
  latitude: number;
  longitude: number;
  utc_offset_seconds: number;
  hourly: Record<string, unknown[]> & { time: string[] };
  hourly_units: Record<string, string>;
}

export interface OpenMeteoAdapterInput {
  payload: OpenMeteoPayload;
  use: ProviderUse;
  endpointClass: "free" | "commercial";
  gate: WeatherProviderGateRecord;
  fetchedAt: string;
  issuedAt: string;
  expiresAt: string;
  model: string;
  runId: string;
  licenseVersion: string;
  rawRetentionAllowed: boolean;
}

function at(values: unknown[] | undefined, index: number): unknown {
  return values?.[index] ?? null;
}

function speedMps(value: unknown, unit: string | undefined, field: string): number | null {
  const speed = nonNegativeOrNull(value, field);
  if (speed === null) return null;
  if (unit === "km/h") return speed / 3.6;
  if (unit === "m/s") return speed;
  throw new TypeError(`${field}_unsupported_unit`);
}

function visibilityM(value: unknown, unit: string | undefined, field: string): number | null {
  const visibility = nonNegativeOrNull(value, field);
  if (visibility === null) return null;
  if (unit === "m") return visibility;
  if (unit === "km") return visibility * 1000;
  throw new TypeError(`${field}_unsupported_unit`);
}

export function normalizeOpenMeteo(input: OpenMeteoAdapterInput): NormalizedWeatherRun {
  assertWeatherProviderUse(input.gate, input.use, input.endpointClass);
  if (input.payload.utc_offset_seconds !== 0) throw new TypeError("open_meteo_hourly_must_be_requested_in_utc");
  const hourly = input.payload.hourly;
  const units = input.payload.hourly_units;
  const hours = hourly.time.map((validTimeUtc, index) => finalizeWeatherHour({
    validTimeUtc: /(?:[zZ]|[+-]\d\d:\d\d)$/u.test(validTimeUtc) ? validTimeUtc : `${validTimeUtc}Z`,
    temperatureC: finiteOrNull(at(hourly.temperature_2m, index), `hourly_${index}_temperature`),
    relativeHumidityPct: percentOrNull(at(hourly.relative_humidity_2m, index), `hourly_${index}_humidity`),
    totalCloudPct: percentOrNull(at(hourly.cloud_cover, index), `hourly_${index}_cloud`),
    lowCloudPct: percentOrNull(at(hourly.cloud_cover_low, index), `hourly_${index}_cloud_low`),
    midCloudPct: percentOrNull(at(hourly.cloud_cover_mid, index), `hourly_${index}_cloud_mid`),
    highCloudPct: percentOrNull(at(hourly.cloud_cover_high, index), `hourly_${index}_cloud_high`),
    visibilityM: visibilityM(at(hourly.visibility, index), units.visibility, `hourly_${index}_visibility`),
    windSpeedMps: speedMps(at(hourly.wind_speed_10m, index), units.wind_speed_10m, `hourly_${index}_wind`),
    precipitationMm: nonNegativeOrNull(at(hourly.precipitation, index), `hourly_${index}_precipitation`),
  }));

  return assertNormalizedWeatherRun({
    provider: "open-meteo",
    use: input.use,
    model: input.model,
    runId: input.runId,
    issuedAt: new Date(input.issuedAt).toISOString(),
    expiresAt: new Date(input.expiresAt).toISOString(),
    fetchedAt: new Date(input.fetchedAt).toISOString(),
    latitude: input.payload.latitude,
    longitude: input.payload.longitude,
    coordinateSystem: "WGS84",
    hours,
    warnings: [],
    attribution: [{ provider: "open-meteo", label: "Weather data by Open-Meteo", url: "https://open-meteo.com/", licenseId: "CC-BY-4.0", licenseVersion: input.licenseVersion, modified: true }],
    qualityFlags: hours.some((hour) => hour.quality === "missing") ? ["empty-hour"] : [],
    rawRetentionAllowed: input.rawRetentionAllowed,
  });
}
