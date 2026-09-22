import { fetchJson, qweatherAttribution, qweatherInstant, qweatherJwt, qweatherRequestPoint } from "./qweather-client.ts";
import { createHash } from "node:crypto";
import { observationNightBounds } from "@starward/miniapp-contracts";
import type { DataState, SourceSummary } from "@starward/miniapp-contracts";
import type {
  CanonicalWeatherAlert,
  CanonicalWeatherHour,
  ProviderResult,
  WeatherEvidenceResult,
  WeatherModelRunSummary,
  WeatherPort,
} from "./ports.ts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";
import { WEATHER_DEADLINES, waitForCaller } from "./provider-deadline.ts";
import { ComputationCache } from "./computation-cache.ts";

type JsonRecord = Record<string, unknown>;

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}


function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}


function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function digest(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 24);
}

function forecastSource(input: {
  attribution: NonNullable<SourceSummary["attribution"]>;
  id: string;
  provider: string;
  title: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  retrievedAt: string;
  validFrom: string | null;
  validTo: string | null;
  state: DataState;
  precision: string;
  limitations: readonly string[];
}): SourceSummary {
  return {
    ...input,
    kind: "THIRD_PARTY_FORECAST",
    publishedAt: null,
    confidence: null,
  };
}

function alertSource(input: {
  attribution: NonNullable<SourceSummary["attribution"]>;
  id: string;
  retrievedAt: string;
  validFrom: string | null;
  validTo: string | null;
  state: DataState;
  limitations: readonly string[];
}): SourceSummary {
  return {
    ...input,
    kind: "OFFICIAL_REFERENCE",
    provider: "和风天气官方预警",
    title: "指定坐标的官方天气预警",
    sourceUrl: "https://dev.qweather.com/docs/api/warning/weather-alert/",
    license: "和风天气开发者许可；预警事实来自相应政府发布机构",
    licenseUrl: "https://dev.qweather.com/docs/terms/",
    publishedAt: null,
    confidence: null,
    precision: "按指定坐标查询；无结果只表示本次接口没有返回预警，不证明绝对安全",
  };
}

function unavailableSource(input: {
  provider: string;
  title: string;
  kind?: SourceSummary["kind"];
  errorCode: string;
}): SourceSummary {
  const now = new Date().toISOString();
  return {
    id: `unavailable:${input.provider}:${input.errorCode}:${now}`,
    kind: input.kind ?? "THIRD_PARTY_FORECAST",
    provider: input.provider,
    title: input.title,
    sourceUrl: "",
    license: "当前请求没有可复用的来源事实",
    licenseUrl: "",
    publishedAt: null,
    retrievedAt: now,
    validFrom: null,
    validTo: null,
    state: "UNAVAILABLE",
    confidence: null,
    precision: "当前请求未返回可验证结果",
    limitations: [
      "具体技术原因已记录用于诊断",
      "当前暂无可用天气资料，请稍后重试",
    ],
  };
}

export function unavailableWeatherResult(
  provider: string,
  errorCode: string,
  extraSources: readonly SourceSummary[] = [],
): WeatherEvidenceResult {
  const primary = unavailableSource({
    provider,
    title: "天气数据暂不可用",
    errorCode,
  });
  const warning = unavailableSource({
    provider: "和风天气官方预警",
    title: "官方天气预警暂不可用",
    kind: "OFFICIAL_REFERENCE",
    errorCode: "warning_feed_unavailable",
  });
  return {
    value: null,
    state: "UNAVAILABLE",
    source: primary,
    sources: [primary, ...extraSources, warning],
    errorCode,
    warningState: "UNAVAILABLE",
    warningSource: warning,
    alerts: [],
    timelineRole: "UNAVAILABLE",
    modelRuns: [],
    warnings: [
      "逐时天气当前不可用。",
      "官方预警当前不可用；正式点出行建议必须保持数据不足。",
    ],
  };
}

function weatherWindow(input: Parameters<WeatherPort["getHourly"]>[0]) {
  const night = observationNightBounds(input);
  const start = Date.parse(input.windowUtc?.start ?? night.nightStartUtc);
  const end = Date.parse(input.windowUtc?.end ?? night.nightEndUtc);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end)
    throw new Error("weather_window_invalid");
  return { start, end };
}

interface QWeatherForecastPayload {
  metadata?: {
    tag?: string;
    attributions?: string[];
  };
  hours?: Array<
    JsonRecord & {
      forecastTime?: string;
      condition?: { text?: string; code?: string };
      temperature?: { value?: number; unit?: string };
      humidity?: number;
      wind?: {
        direction?: { degree?: number; compass?: string };
        speed?: { value?: number; unit?: string };
        scale?: number;
      };
      windGust?: { value?: number; unit?: string };
      precipitation?: {
        amount?: { value?: number; unit?: string };
        intensity?: { value?: number; unit?: string };
        probability?: number;
        type?: string;
      };
      visibility?: { value?: number; unit?: string };
      dewPoint?: { value?: number; unit?: string };
      cloudCover?: number;
    }
  >;
}

interface QWeatherAlertPayload {
  metadata?: {
    tag?: string;
    zeroResult?: boolean;
    attributions?: string[];
  };
  alerts?: Array<
    JsonRecord & {
      id?: string;
      issuedTime?: string;
      messageType?: { code?: string; supersedes?: string[] | null };
      eventType?: { name?: string; code?: string };
      urgency?: string;
      severity?: string;
      certainty?: string;
      effectiveTime?: string;
      onsetTime?: string;
      expireTime?: string;
      headline?: string;
      description?: string;
      instruction?: string;
    }
  >;
}

function qweatherMetricValue(
  measure: { value?: number; unit?: string } | undefined,
  unit: string,
): number | null {
  return measure?.unit === unit ? numberOrNull(measure.value) : null;
}

function qweatherFractionPercent(value: unknown): number | null {
  const parsed = numberOrNull(value);
  return parsed === null || parsed < 0 || parsed > 1 ? null : parsed * 100;
}

interface QWeatherForecastResult
  extends ProviderResult<readonly CanonicalWeatherHour[]> {
  modelRun: WeatherModelRunSummary | null;
}

// Re-evaluate interval validity when delivering cached data and after waiting on
// independent alerts. This projection must never mutate retained source rows.
function currentForecast(result: QWeatherForecastResult, now: number): QWeatherForecastResult {
  if (!result.value) return result;
  const rows = result.value.filter(row => Date.parse(row.at) + 3_600_000 > now);
  if (rows.length === result.value.length) return result;
  const state = rows.length ? "PARTIAL" : "EXPIRED";
  const validFrom = rows[0]?.at ?? result.source.validFrom;
  return { ...result, value: rows.length ? rows : null, state,
    errorCode: rows.length ? result.errorCode : "qweather_forecast_expired",
    source: { ...result.source, state, validFrom },
    modelRun: result.modelRun ? { ...result.modelRun, state, validFrom: validFrom! } : null };
}

const QWEATHER_CACHE = Object.freeze({ entries: 128, forecastMs: 30 * 60_000, alertMs: 5 * 60_000, partialMs: 60_000, failureMs: 5_000 });

// Dates/windows do not change either current QWeather endpoint's upstream
// request. Identity follows its actual rounded GCJ-02 point and configuration.
function qweatherSourceKey(config: MiniappRuntimeConfig, input: Parameters<WeatherPort["getHourly"]>[0]): string {
  const point = qweatherRequestPoint(input);
  return digest([config.qweather, point.latitude.toFixed(2), point.longitude.toFixed(2)]);
}

function qweatherSourceExpiry(result: ProviderResult<unknown>, now: number, ttlMs: number): number {
  if (result.state === "UNAVAILABLE" || result.state === "EXPIRED") return now + QWEATHER_CACHE.failureMs;
  const retrievedAt = Date.parse(result.source.retrievedAt ?? "");
  if (!Number.isFinite(retrievedAt)) return now;
  const validTo = Date.parse(result.source.validTo ?? "");
  return Math.min(retrievedAt + (result.state === "PARTIAL" ? QWEATHER_CACHE.partialMs : ttlMs),
    Number.isFinite(validTo) ? validTo : now);
}

export class QWeatherForecastAdapter {
  readonly key: string;
  private readonly cache: ComputationCache<QWeatherForecastResult>;

  constructor(
    private readonly config: MiniappRuntimeConfig,
    private readonly transport: typeof fetch = fetch,
    private readonly deadlineMs: number = WEATHER_DEADLINES.requestMs,
    private readonly now: () => number = Date.now,
  ) {
    this.key = `qweather-weather-v1-hourly-${config.qweather.forecastHours}h`;
    this.cache = new ComputationCache(QWEATHER_CACHE.entries, now);
  }

  async getHourly(
    input: Parameters<WeatherPort["getHourly"]>[0],
  ): Promise<QWeatherForecastResult> {
    input.signal?.throwIfAborted();
    const { signal, ...sharedInput } = input;
    return waitForCaller(this.cache.get(qweatherSourceKey(this.config, input),
      () => this.fetchHourly(sharedInput),
      result => qweatherSourceExpiry(result, this.now(), QWEATHER_CACHE.forecastMs)).then(result => currentForecast(result, this.now())), signal);
  }

  private async fetchHourly(
    input: Parameters<WeatherPort["getHourly"]>[0],
  ): Promise<QWeatherForecastResult> {
    const host = this.config.qweather.apiHost;
    if (!host) {
      const source = unavailableSource({
        provider: "和风天气",
        title: "逐小时天气暂不可用",
        errorCode: "qweather_host_missing",
      });
      return {
        value: null,
        state: "UNAVAILABLE",
        source,
        errorCode: "qweather_host_missing",
        modelRun: null,
      };
    }
    const point = qweatherRequestPoint(input);
    const forecastHours = this.config.qweather.forecastHours;
    const url = new URL(
      `https://${host.replace(/^https?:\/\//u, "").replace(/\/$/u, "")}/weather/v1/hourly/${point.latitude.toFixed(2)}/${point.longitude.toFixed(2)}`,
    );
    url.search = new URLSearchParams({
      hours: String(forecastHours),
      localTime: "false",
      lang: "zh",
    }).toString();
    try {
      const payload = await fetchJson<QWeatherForecastPayload>(
        url,
        {
          headers: {
            accept: "application/json",
            authorization: `Bearer ${qweatherJwt(this.config)}`,
          },
          ...(input.signal ? { signal: input.signal } : {}),
        },
        this.transport,
        this.deadlineMs,
      );
      if (!Array.isArray(payload.hours) || !payload.hours.length)
        throw new Error("qweather_rejected:empty");
      const fetchedAt = new Date(this.now()).toISOString();
      const sourceId = `weather:qweather-weather-v1-hourly:${digest({
        point,
        forecastHours,
        metadataTag: payload.metadata?.tag,
        hours: payload.hours,
      })}`;
      const identities = payload.hours.flatMap(hour => {
        const at = qweatherInstant(hour?.forecastTime);
        return at ? [{ hour, at }] : [];
      });
      const counts = new Map<string, number>();
      for (const row of identities) counts.set(row.at, (counts.get(row.at) ?? 0) + 1);
      const rows: CanonicalWeatherHour[] = identities.filter(row => counts.get(row.at) === 1).map(({ hour, at }) => {
        const precipitationMm = qweatherMetricValue(
          hour.precipitation?.amount,
          "mm",
        );
        const windMs = qweatherMetricValue(hour.wind?.speed, "m/s");
        const windGustMs = qweatherMetricValue(hour.windGust, "m/s");
        const windKph = windMs === null ? null : windMs * 3.6;
        const windGustKph = windGustMs === null ? null : windGustMs * 3.6;
        const visibilityM = qweatherMetricValue(hour.visibility, "m");
        const weatherCode = numberOrNull(hour.condition?.code);
        return {
          at,
          cloudPercent: qweatherFractionPercent(hour.cloudCover),
          precipitationMm,
          precipitationProbabilityPercent: qweatherFractionPercent(
            hour.precipitation?.probability,
          ),
          windKph,
          windGustKph,
          windDirectionDeg: numberOrNull(hour.wind?.direction?.degree),
          temperatureC: qweatherMetricValue(hour.temperature, "°C"),
          relativeHumidityPercent: qweatherFractionPercent(hour.humidity),
          dewPointC: qweatherMetricValue(hour.dewPoint, "°C"),
          visibilityKm: visibilityM === null ? null : visibilityM / 1_000,
          thunderstorm:
            weatherCode !== null && weatherCode >= 302 && weatherCode <= 304,
          severeRain: precipitationMm !== null && precipitationMm >= 10,
          severeWind:
            (windKph !== null && windKph >= 50) ||
            (windGustKph !== null && windGustKph >= 50),
          evidenceSourceIds: [sourceId],
        };
      });
      if (!rows.length) throw new Error("qweather_rejected:invalid_hours");
      rows.sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
      const coverageEnd = new Date(Date.parse(rows.at(-1)!.at) + 3_600_000).toISOString();
      const partial = rows.length !== payload.hours.length || rows.some(
        (row) =>
          row.cloudPercent === null ||
          row.precipitationMm === null ||
          row.windKph === null ||
          row.temperatureC === null,
      );
      const dataSource = forecastSource({
        attribution: qweatherAttribution(payload.metadata?.attributions),
        id: sourceId,
        provider: "和风天气",
        title: `指定坐标 ${forecastHours} 小时逐小时天气主时间线`,
        sourceUrl:
          "https://dev.qweather.com/docs/api/weather/weather-hourly-forecast/",
        license: "和风天气开发者许可；按响应 metadata.attributions 展示归因",
        licenseUrl: "https://dev.qweather.com/docs/terms/",
        retrievedAt: fetchedAt,
        validFrom: rows[0]!.at,
        validTo: coverageEnd,
        state: partial ? "PARTIAL" : "FRESH",
        precision:
          "中国大陆查询前由 WGS84 转为 GCJ-02，并按供应商要求保留到 0.01°；Weather API v1 空间分辨率约 1 km",
        limitations: [
          `当前环境明确请求 ${forecastHours} 小时预报；超出该窗口的主时间线保持不可用`,
          "只提供总云量，不提供分层云或多模型比较；缺失小时不从其他供应商补齐",
          "官方预警来自独立预警接口，主预报不能证明无预警",
          ...(payload.metadata?.attributions?.filter(Boolean) ?? []),
        ],
      });
      return currentForecast({
        value: rows,
        state: dataSource.state,
        source: dataSource,
        errorCode: null,
        modelRun: {
          provider: "和风天气",
          modelKey: this.key,
          modelRunAt: null,
          fetchedAt,
          validFrom: rows[0]!.at,
          validTo: coverageEnd,
          nativeSpatialResolutionKm: 1,
          nativeTemporalResolutionMinutes: 60,
          outputTemporalResolutionMinutes: 60,
          interpolatedVariables: [],
          state: dataSource.state,
          sourceId,
        },
      }, this.now());
    } catch (error) {
      if (input.signal?.aborted) throw error;
      const errorCode =
        error instanceof Error ? error.message : "qweather_unknown_failure";
      const source = unavailableSource({
        provider: "和风天气",
        title: "逐小时天气暂不可用",
        errorCode,
      });
      return {
        value: null,
        state: "UNAVAILABLE",
        source,
        errorCode,
        modelRun: null,
      };
    }
  }
}

function alertStatus(input: {
  messageType: string | null;
  expiresAt: string | null;
  now: number;
}): CanonicalWeatherAlert["status"] {
  if (input.messageType === "cancel") return "CANCELLED";
  if (input.expiresAt && Date.parse(input.expiresAt) <= input.now)
    return "EXPIRED";
  if (input.messageType === "alert" || input.messageType === "update")
    return "ACTIVE";
  return "UNKNOWN";
}

function materialAlert(input: {
  status: CanonicalWeatherAlert["status"];
  severity: string;
  urgency: string | null;
  certainty: string | null;
}): boolean {
  if (input.status !== "ACTIVE") return false;
  const severity = input.severity.toLowerCase();
  if (["extreme", "severe", "moderate"].includes(severity)) return true;
  if (severity === "minor") return false;
  return (
    ["immediate", "expected"].includes(input.urgency?.toLowerCase() ?? "") &&
    ["observed", "likely"].includes(input.certainty?.toLowerCase() ?? "")
  );
}

export class QWeatherAlertAdapter {
  readonly key = "qweather-current-official-alert";
  private readonly cache: ComputationCache<ProviderResult<readonly CanonicalWeatherAlert[]>>;

  constructor(
    private readonly config: MiniappRuntimeConfig,
    private readonly transport: typeof fetch = fetch,
    private readonly deadlineMs: number = WEATHER_DEADLINES.requestMs,
    private readonly now: () => number = Date.now,
  ) {
    this.cache = new ComputationCache(QWEATHER_CACHE.entries, now);
  }

  async getAlerts(
    input: Parameters<WeatherPort["getHourly"]>[0],
  ): Promise<ProviderResult<readonly CanonicalWeatherAlert[]>> {
    input.signal?.throwIfAborted();
    const { signal, ...sharedInput } = input;
    return waitForCaller(this.cache.get(qweatherSourceKey(this.config, input),
      () => this.fetchAlerts(sharedInput),
      result => qweatherSourceExpiry(result, this.now(), QWEATHER_CACHE.alertMs)), signal);
  }

  private async fetchAlerts(
    input: Parameters<WeatherPort["getHourly"]>[0],
  ): Promise<ProviderResult<readonly CanonicalWeatherAlert[]>> {
    const host = this.config.qweather.apiHost;
    if (!host) {
      const source = unavailableSource({
        provider: "和风天气官方预警",
        title: "官方天气预警暂不可用",
        kind: "OFFICIAL_REFERENCE",
        errorCode: "qweather_host_missing",
      });
      return {
        value: null,
        state: "UNAVAILABLE",
        source,
        errorCode: "qweather_host_missing",
      };
    }
    const point = qweatherRequestPoint(input);
    const url = new URL(
      `https://${host.replace(/^https?:\/\//u, "").replace(/\/$/u, "")}/weatheralert/v1/current/${point.latitude.toFixed(2)}/${point.longitude.toFixed(2)}`,
    );
    url.search = new URLSearchParams({ localTime: "false", lang: "zh" }).toString();
    try {
      const payload = await fetchJson<QWeatherAlertPayload>(
        url,
        {
          headers: {
            accept: "application/json",
            authorization: `Bearer ${qweatherJwt(this.config)}`,
          },
          ...(input.signal ? { signal: input.signal } : {}),
        },
        this.transport,
        this.deadlineMs,
      );
      if (!payload.metadata)
        throw new Error("qweather_alert_metadata_missing");
      const entries = Array.isArray(payload.alerts) ? payload.alerts : [];
      if (!entries.length && payload.metadata.zeroResult !== true)
        throw new Error("qweather_alert_rows_missing");
      if (payload.metadata.zeroResult === true && entries.length)
        throw new Error("qweather_alert_zero_result_conflict");
      const validEntries = entries.filter(entry => entry && textOrNull(entry.id) &&
        qweatherInstant(entry.issuedTime) && ["alert", "update", "cancel"].includes(entry.messageType?.code ?? "") &&
        (!entry.effectiveTime || qweatherInstant(entry.effectiveTime)) &&
        (!entry.onsetTime || qweatherInstant(entry.onsetTime)) &&
        (!entry.expireTime || qweatherInstant(entry.expireTime)));
      if (entries.length && !validEntries.length)
        throw new Error("qweather_alert_rows_invalid");
      const fetchedAt = new Date(this.now()).toISOString();
      const sourceId = `weather:qweather-alert:${payload.metadata.tag ?? digest(payload.alerts ?? [])}`;
      const now = Date.parse(fetchedAt);
      const alerts = validEntries.map((entry) => {
        const messageType = textOrNull(entry.messageType?.code)?.toLowerCase() ?? null;
        const expiresAt = qweatherInstant(entry.expireTime);
        const status = alertStatus({ messageType, expiresAt, now });
        const rawSeverity = textOrNull(entry.severity)?.toLowerCase() ?? "unknown";
        const severity = ["minor", "moderate", "severe", "extreme"].includes(rawSeverity) ? rawSeverity : "unknown";
        const urgency = textOrNull(entry.urgency);
        const certainty = textOrNull(entry.certainty);
        const alert: CanonicalWeatherAlert = {
          senderName: typeof entry.senderName === "string" && entry.senderName.trim() ? entry.senderName : null,
          id: textOrNull(entry.id)!,
          headline: textOrNull(entry.headline) ?? "官方天气预警",
          description: textOrNull(entry.description) ?? "发布机构未提供详情",
          instruction: textOrNull(entry.instruction),
          eventName: textOrNull(entry.eventType?.name) ?? "未分类天气事件",
          eventCode: textOrNull(entry.eventType?.code) ?? "unknown",
          severity,
          urgency,
          certainty,
          issuedAt: qweatherInstant(entry.issuedTime)!,
          effectiveAt:
            qweatherInstant(entry.effectiveTime) ?? qweatherInstant(entry.onsetTime),
          expiresAt,
          status,
          material: materialAlert({ status, severity, urgency, certainty }),
          sourceId,
        };
        return alert;
      });
      const partial = validEntries.length !== entries.length || alerts.some(alert =>
        alert.severity === "unknown" && !alert.material);
      const earliestIssuedAt = alerts.length
        ? alerts.reduce(
            (earliest, alert) =>
              Date.parse(alert.issuedAt) < Date.parse(earliest)
                ? alert.issuedAt
                : earliest,
            alerts[0]!.issuedAt,
          )
        : fetchedAt;
      const dataSource = alertSource({
        attribution: qweatherAttribution(payload.metadata.attributions),
        id: sourceId,
        retrievedAt: fetchedAt,
        validFrom: earliestIssuedAt,
        // Feed freshness is independent from an individual alert's lifetime.
        // Force another read at the earliest future expiry so cached ACTIVE
        // status cannot survive that transition; past alerts do not loop reads.
        validTo: new Date(Math.min(now + QWEATHER_CACHE.alertMs, ...alerts
          .map(alert => Date.parse(alert.expiresAt ?? ""))
          .filter(expiry => Number.isFinite(expiry) && expiry > now))).toISOString(),
        state: partial ? "PARTIAL" : "FRESH",
        limitations: [
          ...(partial ? ["部分预警记录缺失或无法判定，保留已验证记录；不能据此判断没有其他预警"] : []),
          ...(payload.metadata.attributions?.filter(Boolean) ?? []),
          "预警接口最多缓存 5 分钟并在预警到期时提前刷新；用户出发前仍应查看发布机构的最新通知",
        ],
      });
      return {
        value: alerts,
        state: dataSource.state,
        source: dataSource,
        errorCode: null,
      };
    } catch (error) {
      if (input.signal?.aborted) throw error;
      const errorCode =
        error instanceof Error ? error.message : "qweather_alert_unknown_failure";
      const source = unavailableSource({
        provider: "和风天气官方预警",
        title: "官方天气预警暂不可用",
        kind: "OFFICIAL_REFERENCE",
        errorCode,
      });
      return {
        value: null,
        state: "UNAVAILABLE",
        source,
        errorCode,
      };
    }
  }
}

export class QWeatherCompositeAdapter implements WeatherPort {
  readonly key = "qweather-weather-v1-official-alerts";
  private readonly forecast: QWeatherForecastAdapter;
  private readonly alerts: QWeatherAlertAdapter;

  constructor(config: MiniappRuntimeConfig, transport: typeof fetch = fetch,
    deadlineMs: number = WEATHER_DEADLINES.requestMs) {
    this.forecast = new QWeatherForecastAdapter(config, transport, deadlineMs);
    this.alerts = new QWeatherAlertAdapter(config, transport, deadlineMs);
  }

  async getHourly(input: Parameters<WeatherPort["getHourly"]>[0]): Promise<WeatherEvidenceResult> {
    const window = weatherWindow(input);
    const [forecast, warning] = await Promise.all([
      this.forecast.getHourly(input), this.alerts.getAlerts(input),
    ]);
    const primary = currentForecast(forecast, Date.now());
    const activeAlerts = warning.value ?? [];
    const rows = (primary.value ?? [])
      .filter(row => Date.parse(row.at) >= window.start && Date.parse(row.at) < window.end)
      .sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
    // Coverage is about actual delivered hours, independently of forecast field
    // completeness and alert availability. Never extend it with another source.
    const coveredHours = new Set(rows.map(row => Date.parse(row.at)));
    let missingHours = false;
    for (let at = Math.ceil(window.start / 3_600_000) * 3_600_000; at < window.end; at += 3_600_000) {
      if (!coveredHours.has(at)) { missingHours = true; break; }
    }
    const warnings = [
      ...(missingHours ? ["仅展示和风天气实际提供的小时；所选范围内其余时段暂无天气数据。"] : []),
      ...(warning.state !== "FRESH" ? ["官方预警当前不可用；不能据此判断没有预警。"] : []),
    ];
    return {
      value: rows.length ? rows : null,
      state: !rows.length ? "UNAVAILABLE" : primary.state !== "FRESH" || missingHours || warning.state !== "FRESH" ? "PARTIAL" : "FRESH",
      source: primary.source,
      sources: [primary.source, warning.source],
      errorCode: rows.length ? null : primary.errorCode ?? "weather_window_unavailable",
      warningState: warning.state,
      warningSource: warning.source,
      alerts: activeAlerts,
      timelineRole: rows.length ? "PRIMARY" : "UNAVAILABLE",
      modelRuns: primary.modelRun ? [primary.modelRun] : [],
      warnings,
    };
  }
}

export function createWeatherPort(config: MiniappRuntimeConfig, transport: typeof fetch = fetch): WeatherPort {
  return new QWeatherCompositeAdapter(config, transport);
}
