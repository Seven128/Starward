import { createHash } from "node:crypto";
import { gcj02ToWgs84 } from "@starward/coordinate-system";
import type { MapLayerData, ObservationContext } from "@starward/miniapp-contracts";
import type { WeatherEvidenceResult, WeatherPort } from "./ports.ts";
import { WEATHER_DEADLINES, withDeadline } from "./provider-deadline.ts";

export interface MapCloudSample {
  id: string;
  center: { latitude: number; longitude: number };
  forecast: WeatherEvidenceResult | null;
}

/** Read the actual nearby query cells even when the formal-place catalogue is
 * empty. QWeather accepts two decimal coordinates at nominal 1 km resolution.
 * Nine adjacent cells bound work; no value is stretched across the viewport. */
export async function readMapCloudForecast(
  weather: WeatherPort,
  center: MapCloudSample["center"],
  context: ObservationContext,
  deadlineAt: number,
): Promise<readonly MapCloudSample[]> {
  const lat = Math.round(center.latitude * 100), lon = Math.round(center.longitude * 100);
  const cells = [-1, 0, 1].flatMap(y => [-1, 0, 1].map(x => ({ latitude: (lat + y) / 100, longitude: (lon + x) / 100 })))
    .filter(point => Math.abs(point.latitude) < 90 && Math.abs(point.longitude) < 180);
  return Promise.all(cells.map(async point => {
    const sample: MapCloudSample = { id: `cloud:query:${point.latitude.toFixed(2)}:${point.longitude.toFixed(2)}`, center: point, forecast: null };
    const remaining = Math.min(WEATHER_DEADLINES.overallMs, deadlineAt - Date.now());
    if (remaining <= 0) return sample;
    const wgs84 = gcj02ToWgs84({ lat: point.latitude, lon: point.longitude, system: "GCJ-02" });
    try {
      sample.forecast = await withDeadline(signal => weather.getHourly({
        point: { system: "WGS84", latitude: wgs84.lat, longitude: wgs84.lon },
        localDate: context.localDate, timezone: context.timezone,
        windowUtc: { start: context.nightStartUtc, end: context.nightEndUtc }, signal,
      }), remaining);
    } catch {
      // Retain independent successful cells; no failed cell becomes clear sky.
    }
    return sample;
  }));
}

export function mapCloudForecastEnds(samples: readonly MapCloudSample[], now: number) {
  return samples.flatMap(sample => sample.forecast?.value?.map(row => Date.parse(row.at) + 3_600_000) ?? [])
    .filter(end => Number.isFinite(end) && end > now);
}

export function projectMapCloudLayer(samples: readonly MapCloudSample[], atUtc: string, now = Date.now()): MapLayerData {
  const selected = Date.parse(atUtc);
  const available = samples.flatMap(sample => {
    const forecast = sample.forecast;
    if (!forecast?.value || forecast.state === "UNAVAILABLE" || forecast.state === "EXPIRED") return [];
    const row = forecast.value.find(hour => {
      const start = Date.parse(hour.at), end = start + 3_600_000;
      return start <= selected && selected < end && end > now;
    });
    if (!row || row.cloudPercent === null || !Number.isFinite(row.cloudPercent) || row.cloudPercent < 0 || row.cloudPercent > 100) return [];
    return [{ sample, forecast, value: row.cloudPercent, weatherAt: row.at }];
  });
  const source = available[0]?.forecast.source ?? null;
  const version = createHash("sha256").update(JSON.stringify(available.map(entry => [entry.sample.id, entry.forecast.source.id, entry.weatherAt, entry.value]))).digest("hex").slice(0, 24);
  return {
    kind: "CLOUD", cloudLayer: "TOTAL", validAt: atUtc,
    datasetVersion: source ? `map-cloud-query-v1:${version}` : "weather-unavailable",
    precision: "当前中心附近的真实预报采样，以约1公里查询单元显示；未查询或缺测处不填色，不是连续云图。",
    state: available.length ? available.length === samples.length && available.every(entry => entry.forecast.source.state === "FRESH") ? "FRESH" : "PARTIAL" : "UNAVAILABLE",
    source,
    legend: [
      { label: "少云", color: "#4E8E9B", range: "0–30%" },
      { label: "中等", color: "#76AAB2", range: "31–65%" },
      { label: "多云", color: "#A9C9CE", range: "66–100%" },
    ],
    polygons: available.map(({ sample, forecast, value, weatherAt }) => {
      const { latitude, longitude } = sample.center;
      const base = value <= 30 ? "#4E8E9B" : value <= 65 ? "#76AAB2" : "#A9C9CE";
      const color = `${base}${Math.round(0x6b + value / 100 * (0xbf - 0x6b)).toString(16).padStart(2, "0").toUpperCase()}`;
      return { id: sample.id,
        points: [
          { latitude: latitude - 0.005, longitude: longitude - 0.005 },
          { latitude: latitude - 0.005, longitude: longitude + 0.005 },
          { latitude: latitude + 0.005, longitude: longitude + 0.005 },
          { latitude: latitude + 0.005, longitude: longitude - 0.005 },
        ],
        fillColor: color, strokeColor: color, strokeWidth: 1, value, weatherAt,
        label: `总云量 ${Math.round(value)}%`,
        state: forecast.source.state === "FRESH" ? "FRESH" as const : "PARTIAL" as const,
      };
    }),
  };
}
