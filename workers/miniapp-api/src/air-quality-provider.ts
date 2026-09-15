import type { AirQualityHour, AirQualityIndex, AirQualityPollutant, AirQualitySegment, AirQualitySnapshot, SourceSummary, SpotAirQualityData, Wgs84Point } from "@starward/miniapp-contracts";
import { ComputationCache } from "./computation-cache.ts";
import { fetchJson, qweatherJwt, qweatherRequestPoint } from "./qweather-client.ts";
import { waitForCaller } from "./provider-deadline.ts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";

export interface AirQualityPort {
  getAirQuality(input: { point: Wgs84Point; signal?: AbortSignal }): Promise<Omit<SpotAirQualityData, "spotId">>;
}
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

/** Keep supplier standard/display and concentration units; never derive AQI or seeing. */
export function parseAirQualitySnapshot(payload: unknown): AirQualitySnapshot {
  const body = record(payload);
  const indexes: AirQualityIndex[] = list(body.indexes).flatMap(item => {
    const row = record(item), value = number(row.aqi);
    if (!text(row.code) || !text(row.name) || !text(row.aqiDisplay) || value === null) return [];
    return [{ code: text(row.code), name: text(row.name), value, display: text(row.aqiDisplay),
      category: text(row.category) || null, primaryPollutant: text(record(row.primaryPollutant).name) || null }];
  });
  const pollutants: AirQualityPollutant[] = list(body.pollutants).flatMap(item => {
    const row = record(item), concentration = record(row.concentration), value = number(concentration.value);
    if (!text(row.code) || !text(row.name) || !text(concentration.unit) || value === null) return [];
    return [{ code: text(row.code), name: text(row.name), value, unit: text(concentration.unit) }];
  });
  // Conflicting duplicate identities are unavailable, not last-row-wins facts.
  return { indexes: indexes.filter(row => indexes.filter(other => other.code === row.code).length === 1),
    pollutants: pollutants.filter(row => pollutants.filter(other => other.code === row.code).length === 1) };
}
const hasData = (value: AirQualitySnapshot) => value.indexes.length > 0 || value.pollutants.length > 0;
const rawCount = (value: Record<string, unknown>) => list(value.indexes).length + list(value.pollutants).length;
const parsedCount = (value: AirQualitySnapshot) => value.indexes.length + value.pollutants.length;
const instant = (value: unknown): string | null => {
  const raw = text(value);
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-](\d{2}):(\d{2}))$/u.exec(raw);
  if (!match || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4] ?? 0) > 59 ||
    Number(match[5] ?? 0) > 23 || Number(match[6] ?? 0) > 59) return null;
  const calendar = Date.parse(`${match[1]}T00:00:00Z`);
  if (!Number.isFinite(calendar) || new Date(calendar).toISOString().slice(0, 10) !== match[1]) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
};
function source(kind: "current" | "hourly", now: number, state: SourceSummary["state"], attributions: string[], hours: readonly AirQualityHour[] = []): SourceSummary {
  return { id: `qweather:air:${kind}:${now}`, kind: kind === "current" ? "OFFICIAL_REFERENCE" : "THIRD_PARTY_FORECAST",
    provider: "和风天气", title: kind === "current" ? "当前空气质量" : "逐小时空气质量预报",
    sourceUrl: `https://dev.qweather.com/docs/api/air-quality/air-${kind === "current" ? "current" : "hourly-forecast"}/`,
    license: "和风天气开发者许可", licenseUrl: "https://dev.qweather.com/docs/terms/", publishedAt: null,
    retrievedAt: new Date(now).toISOString(), validFrom: hours[0]?.at ?? null,
    validTo: hours.length ? new Date(Date.parse(hours.at(-1)!.at) + 3_600_000).toISOString() : null,
    state, confidence: null, precision: "区域空气质量参考；不代表点位实测或天文透明度、视宁度",
    limitations: ["获取时间不是观测时间；接口未提供发布时间时不推定", "各AQI标准不同，保留原标准名称与单位；中国地区预报不提供详细污染物", ...new Set(attributions)] };
}

export class QWeatherAirQualityAdapter implements AirQualityPort {
  private readonly current: ComputationCache<AirQualitySegment<AirQualitySnapshot>>;
  private readonly forecast: ComputationCache<AirQualitySegment<readonly AirQualityHour[]>>;
  constructor(private readonly config: MiniappRuntimeConfig, private readonly transport: typeof fetch = fetch,
    private readonly now: () => number = Date.now) {
    this.current = new ComputationCache(256, now);
    this.forecast = new ComputationCache(256, now);
  }
  async getAirQuality(input: { point: Wgs84Point; signal?: AbortSignal }) {
    input.signal?.throwIfAborted();
    const point = qweatherRequestPoint(input);
    const key = `${point.latitude.toFixed(2)}/${point.longitude.toFixed(2)}`;
    const expiry = (segment: AirQualitySegment<unknown>, age: number) => {
      const ttl = Date.parse(segment.source.retrievedAt) + (segment.state === "UNAVAILABLE" ? 30_000 : segment.state === "PARTIAL" ? 60_000 : age);
      return segment.source.validTo ? Math.min(ttl, Date.parse(segment.source.validTo)) : ttl;
    };
    const result = Promise.all([
      this.current.get(key, () => this.request("current", key) as Promise<AirQualitySegment<AirQualitySnapshot>>, value => expiry(value, 3_600_000)),
      this.forecast.get(key, () => this.request("hourly", key) as Promise<AirQualitySegment<readonly AirQualityHour[]>>, value => expiry(value, 6 * 3_600_000)),
    ]).then(([current, forecast]) => {
      // A sibling request can cross the validity boundary after a cache hit.
      // Project at delivery as well as parsing; never mutate retained cache values.
      const deliveredAt = this.now();
      const unavailable = <T>(segment: AirQualitySegment<T>): AirQualitySegment<T> => ({
        ...segment, value: null, state: "UNAVAILABLE", unavailableReason: "REQUEST_FAILED",
        source: { ...segment.source, state: "UNAVAILABLE", validFrom: null, validTo: null },
      });
      if (current.value && deliveredAt >= Date.parse(current.source.retrievedAt) + 3_600_000) current = unavailable(current);
      if (forecast.value) {
        const retained = forecast.value.filter(hour => Date.parse(hour.at) + 3_600_000 > deliveredAt);
        if (!retained.length) forecast = unavailable(forecast);
        else if (retained.length !== forecast.value.length) forecast = { ...forecast, value: retained, state: "PARTIAL",
          source: { ...forecast.source, state: "PARTIAL", validFrom: retained[0]!.at,
            validTo: new Date(Date.parse(retained.at(-1)!.at) + 3_600_000).toISOString() } };
      }
      return { current, forecast };
    });
    return waitForCaller(result, input.signal);
  }
  private async request(kind: "current" | "hourly", point: string): Promise<AirQualitySegment<AirQualitySnapshot | readonly AirQualityHour[]>> {
    const fetchedAt = this.now();
    let attributions: string[] = [];
    try {
      const host = this.config.qweather.apiHost?.replace(/^https?:\/\//u, "").replace(/\/$/u, "");
      if (!host) throw new Error("qweather_host_missing");
      const url = new URL(`https://${host}/airquality/v1/${kind}/${point}?lang=zh`);
      const body = record(await fetchJson<unknown>(url, { headers: { accept: "application/json", authorization: `Bearer ${qweatherJwt(this.config)}` } }, this.transport, 6_000));
      attributions = list(record(body.metadata).attributions).flatMap(value => text(value) ? [text(value)] : []);
      if (body.code === "404") throw new Error("air_no_data");
      if (body.code && body.code !== "200") throw new Error("air_invalid_response");
      let value: AirQualitySnapshot | readonly AirQualityHour[];
      let partial = false;
      if (kind === "current") {
        if (!Array.isArray(body.indexes) && !Array.isArray(body.pollutants)) throw new Error("air_invalid_response");
        value = parseAirQualitySnapshot(body);
        if (!hasData(value)) throw new Error(rawCount(body) ? "air_invalid_response" : "air_no_data");
        partial = parsedCount(value) !== rawCount(body);
      } else {
        if (!Array.isArray(body.hours)) throw new Error("air_invalid_response");
        const hours = body.hours.flatMap(item => {
          const row = record(item), at = instant(row.forecastTime), parsed = parseAirQualitySnapshot(row);
          if (parsedCount(parsed) !== rawCount(row)) partial = true;
          return at && Date.parse(at) + 3_600_000 > this.now() && hasData(parsed) ? [{ at, ...parsed }] : [];
        });
        value = hours.filter(row => hours.filter(other => other.at === row.at).length === 1).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
        if (!value.length) throw new Error(body.hours.length ? "air_invalid_response" : "air_no_data");
        partial ||= value.length !== body.hours.length;
      }
      const state = partial ? "PARTIAL" : "FRESH";
      return { value, state, unavailableReason: null, source: source(kind, fetchedAt, state, attributions, Array.isArray(value) ? value : []) };
    } catch (error) {
      const noData = error instanceof Error && ["air_no_data", "provider_http_404"].includes(error.message);
      return { value: null, state: "UNAVAILABLE", unavailableReason: noData ? "NO_DATA" : "REQUEST_FAILED", source: source(kind, fetchedAt, "UNAVAILABLE", attributions) };
    }
  }
}
