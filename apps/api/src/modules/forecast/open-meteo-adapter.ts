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

export interface OpenMeteoAirQualityPayload {
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
  resolutionKm?: number | null;
  airQuality?: OpenMeteoAirQualityPayload;
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

const conditionLabels: Record<number, string> = {
  0: "晴", 1: "大部晴朗", 2: "多云", 3: "阴", 45: "雾", 48: "雾凇",
  51: "小毛毛雨", 53: "毛毛雨", 55: "强毛毛雨", 61: "小雨", 63: "中雨", 65: "大雨",
  71: "小雪", 73: "中雪", 75: "大雪", 80: "阵雨", 81: "较强阵雨", 82: "强阵雨",
  95: "雷雨", 96: "雷雨伴小冰雹", 99: "雷雨伴强冰雹",
};

export function normalizeOpenMeteo(input: OpenMeteoAdapterInput): NormalizedWeatherRun {
  assertWeatherProviderUse(input.gate, input.use, input.endpointClass);
  if (input.payload.utc_offset_seconds !== 0) throw new TypeError("open_meteo_hourly_must_be_requested_in_utc");
  const hourly = input.payload.hourly;
  const units = input.payload.hourly_units;
  const airQualityIndex = new Map((input.airQuality?.hourly.time ?? []).map((time, index) => [time, index]));
  const gridCellId = `${input.payload.latitude.toFixed(4)},${input.payload.longitude.toFixed(4)}`;
  const hours = hourly.time.map((validTimeUtc, index) => {
    const airIndex = airQualityIndex.get(validTimeUtc);
    const air = input.airQuality?.hourly;
    const conditionCode = finiteOrNull(at(hourly.weather_code, index), `hourly_${index}_weather_code`);
    return finalizeWeatherHour({
      gridCellId,
      providerRunId: input.runId,
      validTimeUtc: /(?:[zZ]|[+-]\d\d:\d\d)$/u.test(validTimeUtc) ? validTimeUtc : `${validTimeUtc}Z`,
      conditionCode,
      conditionText: conditionCode === null ? null : conditionLabels[conditionCode] ?? `WMO ${conditionCode}`,
      temperatureC: finiteOrNull(at(hourly.temperature_2m, index), `hourly_${index}_temperature`),
      apparentTemperatureC: finiteOrNull(at(hourly.apparent_temperature, index), `hourly_${index}_apparent_temperature`),
      relativeHumidityPct: percentOrNull(at(hourly.relative_humidity_2m, index), `hourly_${index}_humidity`),
      dewPointC: finiteOrNull(at(hourly.dew_point_2m, index), `hourly_${index}_dew_point`),
      pressureHpa: nonNegativeOrNull(at(hourly.surface_pressure, index), `hourly_${index}_pressure`),
      totalCloudPct: percentOrNull(at(hourly.cloud_cover, index), `hourly_${index}_cloud`),
      lowCloudPct: percentOrNull(at(hourly.cloud_cover_low, index), `hourly_${index}_cloud_low`),
      midCloudPct: percentOrNull(at(hourly.cloud_cover_mid, index), `hourly_${index}_cloud_mid`),
      highCloudPct: percentOrNull(at(hourly.cloud_cover_high, index), `hourly_${index}_cloud_high`),
      visibilityM: visibilityM(at(hourly.visibility, index), units.visibility, `hourly_${index}_visibility`),
      windSpeedMps: speedMps(at(hourly.wind_speed_10m, index), units.wind_speed_10m, `hourly_${index}_wind`),
      windGustMps: speedMps(at(hourly.wind_gusts_10m, index), units.wind_gusts_10m, `hourly_${index}_gust`),
      windDirectionDeg: finiteOrNull(at(hourly.wind_direction_10m, index), `hourly_${index}_wind_direction`),
      precipitationMm: nonNegativeOrNull(at(hourly.precipitation, index), `hourly_${index}_precipitation`),
      precipitationProbabilityPct: percentOrNull(at(hourly.precipitation_probability, index), `hourly_${index}_precipitation_probability`),
      fogProbabilityPct: null,
      aqi: airIndex === undefined ? null : finiteOrNull(at(air?.european_aqi, airIndex), `hourly_${index}_aqi`),
      aqiScale: airIndex === undefined ? null : "European AQI (POC)",
      pm25UgM3: airIndex === undefined ? null : nonNegativeOrNull(at(air?.pm2_5, airIndex), `hourly_${index}_pm25`),
      pm10UgM3: airIndex === undefined ? null : nonNegativeOrNull(at(air?.pm10, airIndex), `hourly_${index}_pm10`),
      aerosolOpticalDepth: airIndex === undefined ? null : nonNegativeOrNull(at(air?.aerosol_optical_depth, airIndex), `hourly_${index}_aerosol_optical_depth`),
    });
  });

  return assertNormalizedWeatherRun({
    provider: "open-meteo",
    use: input.use,
    model: input.model,
    runId: input.runId,
    modelRunTimeUtc: new Date(input.issuedAt).toISOString(),
    ingestedAt: new Date(input.fetchedAt).toISOString(),
    resolutionKm: input.resolutionKm ?? null,
    status: hours.some((hour) => hour.missingFields.length > 0) ? "partial" : "complete",
    sourceLicense: `open-meteo-CC-BY-4.0@${input.licenseVersion}`,
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
