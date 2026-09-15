import { createHash } from "node:crypto";
import { localParts, type RecentWeatherDay, type SourceSummary, type SpotRecentWeatherData, type Wgs84Point } from "@starward/miniapp-contracts";
import type { ProviderResult } from "./ports.ts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";
import { ComputationCache } from "./computation-cache.ts";
import { fetchJson, qweatherJwt, qweatherRequestPoint } from "./qweather-client.ts";
import { waitForCaller } from "./provider-deadline.ts";

type Region = NonNullable<SpotRecentWeatherData["region"]>;
type RecentWeather = Omit<SpotRecentWeatherData, "spotId">;
type RecordValue = Record<string, unknown>;
type Sourced<T> = { value: T; attributions: readonly string[]; retrievedAt: number };
export interface RecentWeatherPort {
  getRecent(input: { point: Wgs84Point; signal?: AbortSignal }): Promise<ProviderResult<RecentWeather>>;
}

const DOC = "https://dev.qweather.com/docs/api/time-machine/time-machine-weather/";
function record(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
}
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function attributions(payload: unknown): string[] {
  const refer = record(record(payload).refer);
  return [refer.sources, refer.license].flatMap(value => Array.isArray(value) ? value.flatMap(item => text(item) ? [text(item)] : []) : []);
}
function numeric(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" && typeof value !== "string" || value === "" || typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}
function localDate(now: number, timezone: string) {
  const parts = localParts(new Date(now), timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
function previousDates(date: string) {
  const noon = Date.parse(`${date}T12:00:00Z`);
  return [2, 1].map(offset => new Date(noon - offset * 86_400_000).toISOString().slice(0, 10));
}
function source(now: number, state: SourceSummary["state"], region: Region | null, attribution: readonly string[] = []): SourceSummary {
  return {
    id: `qweather:recent:${region?.locationId ?? "unavailable"}:${now}`, kind: "HISTORICAL_RECORD",
    provider: "和风天气", title: "近两日地区历史再分析", sourceUrl: DOC,
    license: "和风天气开发者许可", licenseUrl: "https://dev.qweather.com/docs/terms/",
    publishedAt: null, retrievedAt: new Date(now).toISOString(), validFrom: null, validTo: null,
    state, confidence: null, precision: "邻近地区历史再分析；按地区自然日，不含今天，不是点位实测",
    limitations: ["天气记录不证明现场道路、积水、结冰或开放状态；实际情况需核验", ...new Set(attribution)],
  };
}

/** Validates the requested day before interpreting any measurements. */
export function parseRecentWeatherDay(payload: unknown, date: string): RecentWeatherDay {
  const body = record(payload);
  if (body.code === "404") throw new Error("qweather_history_no_data");
  if (body.code !== "200") throw new Error("qweather_history_response_unavailable");
  const daily = record(body.weatherDaily);
  if (daily.date !== date) throw new Error("qweather_history_date_mismatch");
  const precipitationMm = numeric(daily.precip, 0, 10_000);
  let temperatureMinC = numeric(daily.tempMin, -100, 80);
  let temperatureMaxC = numeric(daily.tempMax, -100, 80);
  if (temperatureMinC !== null && temperatureMaxC !== null && temperatureMinC > temperatureMaxC) {
    temperatureMinC = null; temperatureMaxC = null;
  }
  const hours = Array.isArray(body.weatherHourly) ? body.weatherHourly : [];
  const validHours = hours.map(record).filter(hour => text(hour.time).startsWith(`${date} `) && /^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d$/u.test(text(hour.time)));
  const windSamples = validHours.flatMap(hour => {
    const speed = numeric(hour.windSpeed, 0, 500);
    return speed === null ? [] : [{ hour: text(hour.time).slice(0, 13), speed }];
  });
  const sampledWindMaxKph = windSamples.length ? Math.max(...windSamples.map(sample => sample.speed)) : null;
  const sampledWindHours = new Set(windSamples.map(sample => sample.hour)).size;
  const conditions = [...new Set(validHours.flatMap(value => {
    const hour = record(value);
    return text(hour.text) ? [text(hour.text).slice(0, 40)] : [];
  }))];
  if (precipitationMm === null && temperatureMinC === null && temperatureMaxC === null && sampledWindMaxKph === null && !conditions.length)
    throw new Error("qweather_history_measurements_missing");
  return { localDate: date, precipitationMm, temperatureMinC, temperatureMaxC, sampledWindMaxKph, sampledWindHours, conditions };
}

export class QWeatherRecentWeatherAdapter implements RecentWeatherPort {
  private readonly regions: ComputationCache<Sourced<Region>>;
  private readonly days: ComputationCache<Sourced<RecentWeatherDay>>;
  private readonly results: ComputationCache<ProviderResult<RecentWeather>>;
  constructor(private readonly config: MiniappRuntimeConfig, private readonly transport: typeof fetch = fetch,
    private readonly now: () => number = Date.now, private readonly requestDeadlineMs = 3_000) {
    this.regions = new ComputationCache(256, now);
    this.days = new ComputationCache(512, now);
    this.results = new ComputationCache(128, now);
  }

  private async request(path: string, query: Record<string, string>) {
    if (!this.config.qweather.apiHost) throw new Error("qweather_host_missing");
    const host = this.config.qweather.apiHost.replace(/^https?:\/\//u, "").replace(/\/$/u, "");
    const url = new URL(`https://${host}${path}`);
    url.search = new URLSearchParams({ ...query, lang: "zh" }).toString();
    // Geo then parallel days: two 3-second phases fit the client's 10-second request.
    return fetchJson<unknown>(url, { headers: { accept: "application/json", authorization: `Bearer ${qweatherJwt(this.config)}` } }, this.transport, this.requestDeadlineMs);
  }

  async getRecent(input: { point: Wgs84Point; signal?: AbortSignal }): Promise<ProviderResult<RecentWeather>> {
    input.signal?.throwIfAborted();
    const point = qweatherRequestPoint(input);
    const coordinate = `${point.longitude.toFixed(2)},${point.latitude.toFixed(2)}`;
    // Minute identity prevents yesterday's date set surviving regional midnight.
    const key = createHash("sha256").update(`${coordinate}:${Math.floor(this.now() / 60_000)}`).digest("hex");
    return waitForCaller(this.results.get(key, () => this.fetchRecent(coordinate), result =>
      this.now() + (result.state === "UNAVAILABLE" ? 5_000 : 60_000)), input.signal);
  }

  private async fetchRecent(coordinate: string): Promise<ProviderResult<RecentWeather>> {
    let region: Region | null = null;
    let dates: string[] = [];
    let asOfLocalDate: string | null = null;
    try {
      const regionResult = await this.regions.get(coordinate, async () => {
        const payload = record(await this.request("/geo/v2/city/lookup", { location: coordinate, number: "1" }));
        if (payload.code === "404") throw new Error("qweather_history_no_data");
        const row = record(Array.isArray(payload.location) ? payload.location[0] : null);
        if (payload.code !== "200" || !text(row.id) || !text(row.name) || !text(row.tz))
          throw new Error("qweather_history_region_unavailable");
        new Intl.DateTimeFormat("en", { timeZone: text(row.tz) }).format(this.now());
        return { value: { locationId: text(row.id), name: [...new Set([text(row.adm1), text(row.adm2), text(row.name)].filter(Boolean))].join(" · "), timezone: text(row.tz) }, attributions: attributions(payload), retrievedAt: this.now() };
      }, () => this.now() + 7 * 86_400_000);
      region = regionResult.value;
      asOfLocalDate = localDate(this.now(), region.timezone);
      dates = previousDates(asOfLocalDate);
      const selectedRegion = region;
      const rows = await Promise.allSettled(dates.map(date => this.days.get(`${selectedRegion.locationId}:${date}`, async () => {
        const payload = await this.request("/v7/historical/weather", { location: selectedRegion.locationId, date: date.replaceAll("-", ""), unit: "m" });
        return { value: parseRecentWeatherDay(payload, date), attributions: attributions(payload), retrievedAt: this.now() };
      }, result => this.now() + ([result.value.precipitationMm, result.value.temperatureMinC, result.value.temperatureMaxC].some(value => value === null) ? 60_000 : 6 * 60 * 60_000))));
      const found = rows.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
      const days = found.map(result => result.value);
      const missingDates = dates.filter(date => !days.some(day => day.localDate === date));
      const complete = days.length === 2 && days.every(day => day.precipitationMm !== null && day.temperatureMinC !== null && day.temperatureMaxC !== null);
      const state = !days.length ? "UNAVAILABLE" : complete ? "FRESH" : "PARTIAL";
      const requestFailed = rows.some(result => result.status === "rejected" && !(result.reason instanceof Error && result.reason.message === "qweather_history_no_data"));
      const unavailableReason = requestFailed ? "REQUEST_FAILED" : missingDates.length ? "NO_DATA" : null;
      return { value: { region, requestedDates: dates, days, missingDates, asOfLocalDate, unavailableReason }, state,
        source: source(found.length ? Math.min(...found.map(result => result.retrievedAt)) : this.now(), state, region, [...regionResult.attributions, ...found.flatMap(result => result.attributions)]),
        errorCode: requestFailed ? "qweather_history_dates_unavailable" : null };
    } catch (error) {
      const noData = error instanceof Error && error.message === "qweather_history_no_data";
      return { value: { region, requestedDates: dates, days: [], missingDates: dates, asOfLocalDate, unavailableReason: noData ? "NO_DATA" : "REQUEST_FAILED" }, state: "UNAVAILABLE",
        source: source(this.now(), "UNAVAILABLE", region), errorCode: noData ? null : "qweather_history_unavailable" };
    }
  }
}
