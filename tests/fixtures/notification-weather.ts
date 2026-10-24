import { normalizeOpenMeteo, type OpenMeteoPayload } from "../../apps/api/src/modules/forecast/open-meteo-adapter";
import type { ForecastQuery } from "../../packages/contracts/src/forecast";
import { ruleDefinition } from "./notification-rules";

export const notificationForecastQuery: ForecastQuery = { latitude: 0, longitude: 0, timezone: "UTC", nightDate: "2026-10-24", target: "moon" };
export function notificationWeatherPayload(cloud: number | null, hours = ["2026-10-24T20:00", "2026-10-24T21:00"], point = { latitude: 0, longitude: 0 }): OpenMeteoPayload {
  return { ...point, utc_offset_seconds: 0, hourly_units: { temperature_2m: "°C", wind_speed_10m: "m/s", wind_gusts_10m: "m/s", visibility: "m" },
    hourly: { time: hours, cloud_cover: hours.map(() => cloud), temperature_2m: hours.map(() => 20), wind_speed_10m: hours.map(() => 2), wind_gusts_10m: hours.map(() => 3), precipitation: hours.map(() => 0), precipitation_probability: hours.map(() => 5), visibility: hours.map(() => 10000) } };
}
export function notificationWeatherRun(at: string, cloud: number | null, runId = "qualified-test-primary", hours?: string[], point?: { latitude: number; longitude: number }) {
  return normalizeOpenMeteo({ payload: notificationWeatherPayload(cloud, hours, point), use: "noncommercial-poc", endpointClass: "free",
    gate: { id: "open-meteo", productionEnabled: false, passedGates: ["provenance", "authenticity", "target-region-stability", "safe-degradation"], licenseStatus: "noncommercial-poc-only" },
    fetchedAt: at, issuedAt: at, expiresAt: new Date(Date.parse(at) + 30 * 60_000).toISOString(), model: "gfs_seamless", runId, licenseVersion: "4.0", rawRetentionAllowed: false });
}
export function notificationWeatherRule() {
  return { ...ruleDefinition(), location: { kind: "place" as const, label: "已选地点", latitude: 0, longitude: 0 }, target: "moon",
    threshold: { metric: "totalCloudPct", direction: "below" as const, value: 20, unit: "%" }, category: "pretrip" as const,
    leadMinutes: 60, quietHours: { start: "01:00", end: "02:00", timezone: "UTC" }, cooldownMinutes: 120,
    channel: "inbox" as const, enabled: true, expiresAt: null };
}
