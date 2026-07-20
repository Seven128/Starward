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

export interface QWeatherHourlyPayload {
  updateTime: string;
  fxLink: string;
  hourly: Array<Record<string, unknown> & { fxTime: string }>;
}

export interface QWeatherWarningPayload {
  warning?: Array<Record<string, unknown> & { id?: string; title?: string; pubTime?: string; startTime?: string; endTime?: string; severity?: string; status?: string }>;
  refer?: { sources?: string[] };
}

export interface QWeatherAdapterInput {
  forecast: QWeatherHourlyPayload;
  warning?: QWeatherWarningPayload;
  use: ProviderUse;
  gate: WeatherProviderGateRecord;
  latitude: number;
  longitude: number;
  fetchedAt: string;
  expiresAt: string;
  runId: string;
  model?: string;
  licenseVersion: string;
  rawRetentionAllowed: boolean;
}

export function normalizeQWeather(input: QWeatherAdapterInput): NormalizedWeatherRun {
  assertWeatherProviderUse(input.gate, input.use, "commercial");
  const sourceNames = input.warning?.refer?.sources?.filter(Boolean) ?? [];
  const qualityFlags = new Set<string>();
  const hours = input.forecast.hourly.map((hour, index) => {
    const lowCloudPct = percentOrNull(hour.cloudLow, `hourly_${index}_cloud_low`);
    const midCloudPct = percentOrNull(hour.cloudMid, `hourly_${index}_cloud_mid`);
    const highCloudPct = percentOrNull(hour.cloudHigh, `hourly_${index}_cloud_high`);
    if (lowCloudPct === null || midCloudPct === null || highCloudPct === null) qualityFlags.add("layered-cloud-unavailable");
    return finalizeWeatherHour({
      validTimeUtc: hour.fxTime,
      temperatureC: finiteOrNull(hour.temp, `hourly_${index}_temp`),
      relativeHumidityPct: percentOrNull(hour.humidity, `hourly_${index}_humidity`),
      totalCloudPct: percentOrNull(hour.cloud, `hourly_${index}_cloud`),
      lowCloudPct,
      midCloudPct,
      highCloudPct,
      visibilityM: (() => { const km = nonNegativeOrNull(hour.vis, `hourly_${index}_vis`); return km === null ? null : km * 1000; })(),
      windSpeedMps: (() => { const kmh = nonNegativeOrNull(hour.windSpeed, `hourly_${index}_wind`); return kmh === null ? null : kmh / 3.6; })(),
      precipitationMm: nonNegativeOrNull(hour.precip, `hourly_${index}_precip`),
    });
  });
  const warnings = (input.warning?.warning ?? []).map((warning, index) => {
    const issuedAt = String(warning.pubTime ?? warning.startTime ?? input.forecast.updateTime);
    const expiresAt = warning.endTime ? String(warning.endTime) : null;
    const expired = expiresAt !== null && Date.parse(expiresAt) <= Date.parse(input.fetchedAt);
    return {
      id: String(warning.id ?? `qweather-warning-${index}`),
      title: String(warning.title ?? "未命名官方预警"),
      severity: warning.severity ? String(warning.severity) : null,
      issuedAt: new Date(issuedAt).toISOString(),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      status: expired ? "expired" as const : warning.status === "cancel" ? "expired" as const : "active" as const,
      sources: [...sourceNames],
    };
  });
  if (warnings.length && !sourceNames.length) qualityFlags.add("warning-upstream-sources-missing");

  return assertNormalizedWeatherRun({
    provider: "qweather",
    use: input.use,
    model: input.model ?? "qweather-hourly",
    runId: input.runId,
    issuedAt: new Date(input.forecast.updateTime).toISOString(),
    expiresAt: new Date(input.expiresAt).toISOString(),
    fetchedAt: new Date(input.fetchedAt).toISOString(),
    latitude: input.latitude,
    longitude: input.longitude,
    coordinateSystem: "WGS84",
    hours,
    warnings,
    attribution: [{ provider: "qweather", label: "天气数据：和风天气", url: input.forecast.fxLink, licenseId: "qweather-commercial", licenseVersion: input.licenseVersion, modified: true }],
    qualityFlags: [...qualityFlags],
    rawRetentionAllowed: input.rawRetentionAllowed,
  });
}
