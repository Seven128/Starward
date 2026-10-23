import { createHash } from "node:crypto";
import { gcj02ToWgs84 } from "@starward/coordinate-system";
import { mapCloudCellId, type MapCloudSnapshot, type MapLayerData, type ObservationContext, type SourceSummary, type TerrainBounds } from "@starward/miniapp-contracts";
import type { CanonicalWeatherHour, ProviderResult, WeatherForecastResult, WeatherPort } from "./ports.ts";
import { WEATHER_DEADLINES, withDeadline } from "./provider-deadline.ts";

export interface MapCloudSample {
  id: string;
  center: { latitude: number; longitude: number };
  forecast: (ProviderResult<readonly CanonicalWeatherHour[]> & Partial<Pick<WeatherForecastResult, "acquisition">>
    & { sources?: readonly SourceSummary[] }) | null;
  readStartedAt: string;
  readEndedAt: string;
  pureForecast: boolean;
}

export const MAP_CLOUD_MAX_AGE_MS = 30 * 60_000;

export function mapCloudQueryPoints(center: MapCloudSample["center"], bounds?: TerrainBounds) {
  const lat = Math.round(center.latitude * 100), lon = Math.round(center.longitude * 100);
  if (!bounds) return [-1, 0, 1].flatMap(y => [-1, 0, 1].map(x => ({ latitude: (lat + y) / 100, longitude: (lon + x) / 100 })))
    .filter(point => Math.abs(point.latitude) < 90 && Math.abs(point.longitude) < 180);
  if (![bounds.west, bounds.south, bounds.east, bounds.north].every(Number.isFinite) || bounds.west < -180 || bounds.east > 180
    || bounds.south <= -90 || bounds.north >= 90 || bounds.west >= bounds.east || bounds.south >= bounds.north
    || center.latitude < bounds.south || center.latitude > bounds.north || center.longitude < bounds.west || center.longitude > bounds.east)
    throw new Error("map_viewport_invalid");
  const axis = (low: number, high: number) => [...new Set([0.25, 0.5, 0.75].map(fraction => Math.round((low + (high - low) * fraction) * 100) / 100))];
  return axis(bounds.south, bounds.north).flatMap(latitude => axis(bounds.west, bounds.east).map(longitude => ({ latitude, longitude })));
}

/** Read the actual nearby query cells even when the formal-place catalogue is
 * empty. QWeather accepts two decimal coordinates at nominal 1 km resolution.
 * Nine actual 0.01° query cells bound work. Wide views spread those queries,
 * leaving gaps unpainted instead of stretching the cells into a cloud field. */
export async function readMapCloudForecast(
  weather: WeatherPort,
  center: MapCloudSample["center"],
  context: ObservationContext,
  deadlineAt: number,
  bounds?: TerrainBounds,
  signal?: AbortSignal,
): Promise<readonly MapCloudSample[]> {
  signal?.throwIfAborted();
  const cells = mapCloudQueryPoints(center, bounds);
  return Promise.all(cells.map(async point => {
    const startedAt = new Date().toISOString();
    const sample: MapCloudSample = { id: mapCloudCellId(point), center: point, forecast: null,
      readStartedAt: startedAt, readEndedAt: startedAt, pureForecast: Boolean(weather.getForecastHourly) };
    const remaining = Math.min(WEATHER_DEADLINES.overallMs, deadlineAt - Date.now());
    if (remaining <= 0) return sample;
    const wgs84 = gcj02ToWgs84({ lat: point.latitude, lon: point.longitude, system: "GCJ-02" });
    try {
      sample.forecast = await withDeadline<MapCloudSample["forecast"]>(signal => (weather.getForecastHourly?.bind(weather) ?? weather.getHourly.bind(weather))({
        point: { system: "WGS84", latitude: wgs84.lat, longitude: wgs84.lon },
        localDate: context.localDate, timezone: context.timezone,
        windowUtc: { start: context.nightStartUtc, end: context.nightEndUtc }, signal,
      }), remaining, signal);
    } catch {
      signal?.throwIfAborted();
      // Retain independent successful cells; no failed cell becomes clear sky.
    } finally { sample.readEndedAt = new Date().toISOString(); }
    return sample;
  }));
}

export function mapCloudForecastEnds(samples: readonly MapCloudSample[], now: number) {
  return samples.flatMap(sample => [...(sample.forecast?.value?.map(row => Date.parse(row.at) + 3_600_000) ?? []),
    Date.parse(sample.forecast?.source.retrievedAt ?? "") + MAP_CLOUD_MAX_AGE_MS])
    .filter(end => Number.isFinite(end) && end > now);
}

function sourceAgeIsValid(sample: MapCloudSample, now: number) {
  const at = Date.parse(sample.forecast?.source.retrievedAt ?? "");
  return Number.isFinite(at) && at <= now && now - at < MAP_CLOUD_MAX_AGE_MS;
}

/** Stable evidence identity excludes per-consumer cache hits and request times. */
export function mapCloudEvidence(samples: readonly MapCloudSample[]) {
  return samples.map(sample => [sample.id, sample.forecast?.source ?? null, sample.forecast?.value ?? null,
    sample.forecast?.state ?? null, sample.forecast?.errorCode ?? null,
    sample.forecast?.acquisition?.providerTag ?? null, sample.forecast?.acquisition?.sourceRequestId ?? null]);
}

export function mapCloudSnapshot(samples: readonly MapCloudSample[], bounds: TerrainBounds | null = null, now = Date.now()): MapCloudSnapshot | null {
  if (!samples.length) return null;
  const acquisitionsKnown = samples.every(sample => sample.forecast?.acquisition);
  const times = samples.map(sample => sample.forecast?.source.retrievedAt).filter((at): at is string => Boolean(at));
  const snapshot: MapCloudSnapshot = { schemaVersion: "map-cloud-snapshot-v1", snapshotId: "",
    samplingPolicy: bounds ? "viewport-nine-query-cells-v2" : "center-nine-query-cells-v1", collectionWindow: {
      startedAt: samples.map(sample => sample.readStartedAt).sort()[0]!, endedAt: samples.map(sample => sample.readEndedAt).sort().at(-1)!,
    }, requestedBoundsGcj02: bounds, queryCellDegrees: 0.01, maximumSourceAgeSeconds: 1800, maximumSamples: 9,
    mixedRetrievalTimes: new Set(times).size > 1,
    requestBudget: { hourlyRequestAttempts: acquisitionsKnown ? samples.reduce((total, sample) => total + sample.forecast!.acquisition!.upstreamRequestAttempts, 0) : null,
      reusedHourlyResponses: acquisitionsKnown ? samples.filter(sample => sample.forecast!.acquisition!.cache !== "MISS").length : null,
      category: "QWEATHER_WEATHER_HOURLY", alertRequests: samples.every(sample => sample.pureForecast) ? 0 : null, reuseUnit: "FULL_HOURLY_RESPONSE" },
    cells: samples.map(sample => {
      const forecast = sample.forecast, rows = forecast?.value ?? [];
      const quality = forecast?.state === "EXPIRED" || (rows.length && !sourceAgeIsValid(sample, now)) ? "STALE" as const
        : !forecast || forecast.state === "UNAVAILABLE" && forecast.errorCode !== "weather_window_unavailable" ? "READ_FAILED" as const
        : rows.some(row => row.cloudPercent !== null && Number.isFinite(row.cloudPercent) && row.cloudPercent >= 0 && row.cloudPercent <= 100) ? "AVAILABLE" as const : "MISSING" as const;
      return { id: sample.id, requestedGcj02: forecast?.acquisition?.requestedGcj02 ?? sample.center,
        sourceId: forecast?.source.id ?? null, providerTag: forecast?.acquisition?.providerTag ?? null,
        sourceRequestId: forecast?.acquisition?.sourceRequestId ?? null, retrievedAt: forecast?.source.retrievedAt ?? null,
        sourceState: forecast?.source.state ?? "UNAVAILABLE", quality, hours: rows.map(row => ({ at: row.at,
          cloudPercent: row.cloudPercent !== null && Number.isFinite(row.cloudPercent) && row.cloudPercent >= 0 && row.cloudPercent <= 100 ? row.cloudPercent : null })) };
    }),
  };
  snapshot.snapshotId = `map-cloud:${createHash("sha256").update(JSON.stringify(snapshot)).digest("hex")}`;
  return snapshot;
}

export function projectMapCloudLayer(samples: readonly MapCloudSample[], atUtc: string, now = Date.now()): MapLayerData {
  const selected = Date.parse(atUtc);
  const candidates = samples.flatMap(sample => {
    const forecast = sample.forecast;
    if (!forecast?.value || forecast.state === "UNAVAILABLE" || forecast.state === "EXPIRED" || !sourceAgeIsValid(sample, now)) return [];
    const row = forecast.value.find(hour => {
      const start = Date.parse(hour.at), end = start + 3_600_000;
      return start <= selected && selected < end && end > now;
    });
    if (!row || row.cloudPercent === null || !Number.isFinite(row.cloudPercent) || row.cloudPercent < 0 || row.cloudPercent > 100) return [];
    const center = forecast.acquisition?.requestedGcj02 ?? sample.center;
    return [{ id: mapCloudCellId(center), center, forecast, value: row.cloudPercent, weatherAt: row.at }];
  });
  // Conversion/rounding can alias planned points at the coordinate boundary.
  // Paint each actual query cell once, keeping the newest valid selected hour.
  // The acquisition snapshot retains every read for truthful attempt/reuse costs.
  const byCell = new Map<string, (typeof candidates)[number]>();
  for (const entry of candidates) {
    const previous = byCell.get(entry.id);
    if (!previous || Date.parse(entry.forecast.source.retrievedAt!) > Date.parse(previous.forecast.source.retrievedAt!)) byCell.set(entry.id, entry);
  }
  const available = [...byCell.values()];
  const primary = available[0]?.forecast.source ?? null;
  const sources = [...new Map(samples.flatMap(sample => sample.forecast ? [[sample.forecast.source.id, sample.forecast.source] as const] : [])).values()];
  const version = createHash("sha256").update(JSON.stringify(available.map(entry => [entry.id, entry.forecast.source.id, entry.weatherAt, entry.value]))).digest("hex").slice(0, 24);
  const complete = available.length === samples.length && available.every(entry => entry.forecast.source.state === "FRESH");
  const source: SourceSummary | null = primary ? { ...primary, id: `source:map-cloud:${version}`, title: "当前地图总云量预报采样",
    retrievedAt: available.map(entry => entry.forecast.source.retrievedAt).filter((at): at is string => Boolean(at)).sort()[0] ?? null,
    state: complete ? "FRESH" : "PARTIAL",
    ...(primary.attribution ? { attribution: { ...primary.attribution, statements: [...new Set(sources.flatMap(source => source.attribution?.statements ?? []))] } } : {}),
    limitations: [...new Set(sources.flatMap(source => source.limitations)),
      "各采样点的资料取得时间可能不同；这里显示最早有效采样点的取得时间，不代表预报起报时间。",
      "最多九个实际点预报查询单元；未查询或缺测处不填色，不是连续格点云场。"],
  } : null;
  return {
    kind: "CLOUD", cloudLayer: "TOTAL", validAt: atUtc,
    datasetVersion: source ? `map-cloud-query-v2:${version}` : "weather-unavailable",
    precision: "当前视野的真实点预报采样，最多九个约1公里查询单元；未查询或缺测处不填色，不是连续云图。",
    state: available.length ? complete ? "FRESH" : "PARTIAL" : "UNAVAILABLE",
    source,
    legend: [
      { label: "少云", color: "#4E8E9B", range: "0–30%" },
      { label: "中等", color: "#76AAB2", range: "31–65%" },
      { label: "多云", color: "#A9C9CE", range: "66–100%" },
    ],
    polygons: available.map(({ id, center, forecast, value, weatherAt }) => {
      const { latitude, longitude } = center;
      const base = value <= 30 ? "#4E8E9B" : value <= 65 ? "#76AAB2" : "#A9C9CE";
      const color = `${base}${Math.round(0x6b + value / 100 * (0xbf - 0x6b)).toString(16).padStart(2, "0").toUpperCase()}`;
      return { id,
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
