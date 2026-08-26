import { createHash, createPrivateKey, sign } from "node:crypto";
import { wgs84ToGcj02 } from "@starward/coordinate-system";
import type { DataState, SourceSummary } from "@starward/miniapp-contracts";
import type {
  CanonicalWeatherAlert,
  CanonicalWeatherHour,
  ProviderResult,
  WeatherEvidenceResult,
  WeatherModelRunSummary,
  WeatherPort,
} from "./ports.ts";
import type {
  MiniappRuntimeConfig,
  OpenMeteoEvidenceMode,
} from "./runtime-config.ts";

type JsonRecord = Record<string, unknown>;

const OPEN_METEO_MODEL_SPECS = Object.freeze([
  {
    key: "best_match",
    title: "Open-Meteo Best Match",
    spatialKm: null,
    temporalMinutes: 60,
    interpolatedVariables: [] as string[],
  },
  {
    key: "icon_seamless",
    title: "DWD ICON Global",
    spatialKm: 11,
    temporalMinutes: 60,
    interpolatedVariables: [] as string[],
  },
  {
    key: "gfs_seamless",
    title: "NOAA GFS Global",
    spatialKm: 13,
    temporalMinutes: 60,
    interpolatedVariables: [] as string[],
  },
  {
    key: "ecmwf_ifs025",
    title: "ECMWF IFS 0.25°",
    spatialKm: 25,
    temporalMinutes: 180,
    interpolatedVariables: ["逐时输出由原生 3 小时间隔插值"],
  },
  {
    key: "ecmwf_aifs025_single",
    title: "ECMWF AIFS 0.25° Single",
    spatialKm: 28,
    temporalMinutes: 360,
    interpolatedVariables: ["逐时输出由原生 6 小时间隔插值"],
  },
] as const);

const COMPARISON_MODEL_KEYS = OPEN_METEO_MODEL_SPECS.slice(1).map(
  (entry) => entry.key,
);

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function percent(value: unknown): number | null {
  const parsed = numberOrNull(value);
  return parsed === null ? null : Math.max(0, Math.min(100, parsed));
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function instantOrNull(value: unknown): string | null {
  const selected = textOrNull(value);
  if (!selected || !Number.isFinite(Date.parse(selected))) return null;
  return new Date(selected).toISOString();
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
      "不可用期间不会用示例数据替代真实来源",
    ],
  };
}

function unavailableWeatherResult(
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
    alerts: [],
    timelineRole: "UNAVAILABLE",
    modelRuns: [],
    warnings: [
      "逐时天气当前不可用；不会用示例天气替代。",
      "官方预警当前不可用；正式点出行建议必须保持数据不足。",
    ],
  };
}

async function fetchJson<T>(
  url: URL,
  init: RequestInit,
  transport: typeof fetch,
): Promise<T> {
  const response = await transport(url, init);
  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) throw new Error("provider_non_json_response");
  return (await response.json()) as T;
}

function normalizedAt(value: string): string {
  const selected = /(?:Z|[+-]\d\d:\d\d)$/u.test(value) ? value : `${value}Z`;
  const parsed = new Date(selected);
  if (!Number.isFinite(parsed.getTime())) throw new Error("weather_time_invalid");
  return parsed.toISOString();
}

function nextLocalDate(localDate: string): string {
  const next = new Date(`${localDate}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

function stateFromRows(rows: readonly CanonicalWeatherHour[]): DataState {
  if (!rows.length) return "UNAVAILABLE";
  return rows.some(
    (row) =>
      row.cloudPercent === null ||
      row.lowCloudPercent === null ||
      row.midCloudPercent === null ||
      row.highCloudPercent === null ||
      row.modelConsistency === null,
  )
    ? "PARTIAL"
    : "FRESH";
}

function modelConsistency(values: readonly number[]): {
  score: number | null;
  label: CanonicalWeatherHour["modelConsistencyLabel"];
  spread: number | null;
} {
  if (values.length < 2)
    return { score: null, label: "UNAVAILABLE", spread: null };
  const spread = Math.max(...values) - Math.min(...values);
  const score = Number(Math.max(0, 1 - spread / 100).toFixed(3));
  return {
    score,
    label: score >= 0.8 ? "HIGH" : score >= 0.6 ? "MEDIUM" : "LOW",
    spread: Number(spread.toFixed(1)),
  };
}

interface OpenMeteoPayload {
  latitude: number;
  longitude: number;
  utc_offset_seconds: number;
  hourly: Record<string, unknown[]> & { time: string[] };
}

interface OpenMeteoEvidenceResult extends WeatherEvidenceResult {
  modelSourceByKey: Readonly<Record<string, SourceSummary>>;
}

function openMeteoHourlyValue(
  hourly: OpenMeteoPayload["hourly"],
  variable: string,
  model: string,
  index: number,
): unknown {
  return hourly[`${variable}_${model}`]?.[index] ?? hourly[variable]?.[index];
}

export class OpenMeteoWeatherAdapter implements WeatherPort {
  readonly key: string;
  private readonly endpoint: URL;

  constructor(
    private readonly config: MiniappRuntimeConfig,
    private readonly transport: typeof fetch = fetch,
    private readonly mode: OpenMeteoEvidenceMode = config.openMeteoEvidenceMode,
  ) {
    const commercial = mode === "OPEN_METEO_COMMERCIAL";
    this.key = commercial
      ? "open-meteo-commercial-multi-model"
      : "open-meteo-noncommercial-poc-multi-model";
    this.endpoint = new URL(
      commercial
        ? "https://customer-api.open-meteo.com/v1/forecast"
        : "https://api.open-meteo.com/v1/forecast",
    );
  }

  async getHourly(
    input: Parameters<WeatherPort["getHourly"]>[0],
  ): Promise<OpenMeteoEvidenceResult> {
    const url = new URL(this.endpoint);
    const fetchedAt = new Date().toISOString();
    url.search = new URLSearchParams({
      latitude: input.point.latitude.toFixed(5),
      longitude: input.point.longitude.toFixed(5),
      hourly: [
        "temperature_2m",
        "relative_humidity_2m",
        "dew_point_2m",
        "weather_code",
        "cloud_cover",
        "cloud_cover_low",
        "cloud_cover_mid",
        "cloud_cover_high",
        "visibility",
        "wind_speed_10m",
        "wind_gusts_10m",
        "wind_direction_10m",
        "precipitation",
        "precipitation_probability",
      ].join(","),
      models: OPEN_METEO_MODEL_SPECS.map((entry) => entry.key).join(","),
      timezone: "GMT",
      wind_speed_unit: "kmh",
      start_date: input.localDate,
      end_date: nextLocalDate(input.localDate),
      cell_selection: "land",
      ...(this.config.openMeteoApiKey
        ? { apikey: this.config.openMeteoApiKey }
        : {}),
    }).toString();
    try {
      const payload = await fetchJson<OpenMeteoPayload>(
        url,
        {
          headers: { accept: "application/json" },
          ...(input.signal ? { signal: input.signal } : {}),
        },
        this.transport,
      );
      if (payload.utc_offset_seconds !== 0)
        throw new Error("open_meteo_not_utc");
      if (!payload.hourly.time.length)
        throw new Error("open_meteo_empty_hourly");

      const modelSourceByKey: Record<string, SourceSummary> = {};
      const modelRuns: WeatherModelRunSummary[] = [];
      for (const spec of OPEN_METEO_MODEL_SPECS) {
        const available = payload.hourly.time.some(
          (_, index) =>
            percent(
              openMeteoHourlyValue(
                payload.hourly,
                "cloud_cover",
                spec.key,
                index,
              ),
            ) !== null,
        );
        const state: DataState = available ? "FRESH" : "UNAVAILABLE";
        const sourceId = `weather:open-meteo:${spec.key}:${digest({
          point: input.point,
          time: payload.hourly.time,
          totalCloud: payload.hourly[`cloud_cover_${spec.key}`] ??
            payload.hourly.cloud_cover,
          lowCloud: payload.hourly[`cloud_cover_low_${spec.key}`] ??
            payload.hourly.cloud_cover_low,
          midCloud: payload.hourly[`cloud_cover_mid_${spec.key}`] ??
            payload.hourly.cloud_cover_mid,
          highCloud: payload.hourly[`cloud_cover_high_${spec.key}`] ??
            payload.hourly.cloud_cover_high,
        })}`;
        const item = forecastSource({
          id: sourceId,
          provider: "Open-Meteo",
          title: `${spec.title} 总云与分层云预报`,
          sourceUrl: "https://open-meteo.com/",
          license: "CC BY 4.0",
          licenseUrl: "https://open-meteo.com/en/license",
          retrievedAt: fetchedAt,
          validFrom: available ? normalizedAt(payload.hourly.time[0]!) : null,
          validTo: available
            ? normalizedAt(payload.hourly.time.at(-1)!)
            : null,
          state,
          precision:
            spec.key === "best_match"
              ? "按坐标选择模型的推荐预报；具体底层模型会随位置和可用性变化"
              : `原生空间分辨率约 ${spec.spatialKm ?? "未知"} km；输出对齐为逐时`,
          limitations: [
            this.mode === "OPEN_METEO_NONCOMMERCIAL"
              ? "当前仅限所有者个人非商业试用，不允许商业发布"
              : "商业端点仍受当前合同、配额与模型覆盖边界约束",
            "数值模式预报不是现场观测；模型差异只改变置信度和解释",
            ...spec.interpolatedVariables,
          ],
        });
        modelSourceByKey[spec.key] = item;
        modelRuns.push({
          provider: "Open-Meteo",
          modelKey: spec.key,
          modelRunAt: null,
          fetchedAt,
          validFrom: item.validFrom,
          validTo: item.validTo,
          nativeSpatialResolutionKm: spec.spatialKm,
          nativeTemporalResolutionMinutes: spec.temporalMinutes,
          outputTemporalResolutionMinutes: 60,
          interpolatedVariables: spec.interpolatedVariables,
          state,
          sourceId,
        });
      }

      const rows: CanonicalWeatherHour[] = payload.hourly.time.map(
        (time, index) => {
          const modelCloudValues = COMPARISON_MODEL_KEYS.map((model) =>
            percent(
              openMeteoHourlyValue(
                payload.hourly,
                "cloud_cover",
                model,
                index,
              ),
            ),
          ).filter((value): value is number => value !== null);
          const consistency = modelConsistency(modelCloudValues);
          const precipitationMm = numberOrNull(
            openMeteoHourlyValue(
              payload.hourly,
              "precipitation",
              "best_match",
              index,
            ),
          );
          const windKph = numberOrNull(
            openMeteoHourlyValue(
              payload.hourly,
              "wind_speed_10m",
              "best_match",
              index,
            ),
          );
          const windGustKph = numberOrNull(
            openMeteoHourlyValue(
              payload.hourly,
              "wind_gusts_10m",
              "best_match",
              index,
            ),
          );
          const visibilityM = numberOrNull(
            openMeteoHourlyValue(
              payload.hourly,
              "visibility",
              "best_match",
              index,
            ),
          );
          const weatherCode = numberOrNull(
            openMeteoHourlyValue(
              payload.hourly,
              "weather_code",
              "best_match",
              index,
            ),
          );
          const evidenceSourceIds = unique([
            modelSourceByKey.best_match!.id,
            ...COMPARISON_MODEL_KEYS.filter(
              (model) =>
                percent(
                  openMeteoHourlyValue(
                    payload.hourly,
                    "cloud_cover",
                    model,
                    index,
                  ),
                ) !== null,
            ).map((model) => modelSourceByKey[model]!.id),
          ]);
          return {
            at: normalizedAt(time),
            cloudPercent: percent(
              openMeteoHourlyValue(
                payload.hourly,
                "cloud_cover",
                "best_match",
                index,
              ),
            ),
            lowCloudPercent: percent(
              openMeteoHourlyValue(
                payload.hourly,
                "cloud_cover_low",
                "best_match",
                index,
              ),
            ),
            midCloudPercent: percent(
              openMeteoHourlyValue(
                payload.hourly,
                "cloud_cover_mid",
                "best_match",
                index,
              ),
            ),
            highCloudPercent: percent(
              openMeteoHourlyValue(
                payload.hourly,
                "cloud_cover_high",
                "best_match",
                index,
              ),
            ),
            modelConsistency: consistency.score,
            modelConsistencyLabel: consistency.label,
            modelSpreadPercent: consistency.spread,
            precipitationMm,
            precipitationProbabilityPercent: percent(
              openMeteoHourlyValue(
                payload.hourly,
                "precipitation_probability",
                "best_match",
                index,
              ),
            ),
            windKph,
            windGustKph,
            windDirectionDeg: numberOrNull(
              openMeteoHourlyValue(
                payload.hourly,
                "wind_direction_10m",
                "best_match",
                index,
              ),
            ),
            temperatureC: numberOrNull(
              openMeteoHourlyValue(
                payload.hourly,
                "temperature_2m",
                "best_match",
                index,
              ),
            ),
            relativeHumidityPercent: percent(
              openMeteoHourlyValue(
                payload.hourly,
                "relative_humidity_2m",
                "best_match",
                index,
              ),
            ),
            dewPointC: numberOrNull(
              openMeteoHourlyValue(
                payload.hourly,
                "dew_point_2m",
                "best_match",
                index,
              ),
            ),
            visibilityKm: visibilityM === null ? null : visibilityM / 1_000,
            thunderstorm: weatherCode !== null && weatherCode >= 95,
            severeRain: precipitationMm !== null && precipitationMm >= 10,
            severeWind:
              (windKph !== null && windKph >= 50) ||
              (windGustKph !== null && windGustKph >= 50),
            officialSevereAlert: false,
            officialAlertIds: [],
            evidenceSourceIds,
          };
        },
      );
      const state = stateFromRows(rows);
      const warningUnavailable = unavailableSource({
        provider: "和风天气官方预警",
        title: "当前天气配置未提供官方预警",
        kind: "OFFICIAL_REFERENCE",
        errorCode: "warning_feed_not_selected",
      });
      const sources = [
        ...OPEN_METEO_MODEL_SPECS.map((spec) => modelSourceByKey[spec.key]!),
        warningUnavailable,
      ];
      return {
        value: rows,
        state: state === "FRESH" ? "PARTIAL" : state,
        source: modelSourceByKey.best_match!,
        sources,
        errorCode: null,
        warningState: "UNAVAILABLE",
        alerts: [],
        timelineRole: "PRIMARY",
        modelRuns,
        warnings: [
          "当前配置没有独立官方预警源；天空数据可读，但正式点出行建议必须保持数据不足。",
        ],
        modelSourceByKey,
      };
    } catch (error) {
      if (input.signal?.aborted) throw error;
      const result = unavailableWeatherResult(
        "Open-Meteo",
        error instanceof Error ? error.message : "open_meteo_unknown_failure",
      );
      return { ...result, modelSourceByKey: {} };
    }
  }
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

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function qweatherJwt(config: MiniappRuntimeConfig) {
  const { credentialId, projectId, privateKeyPem } = config.qweather;
  if (!credentialId || !projectId || !privateKeyPem)
    throw new Error("qweather_credentials_required");
  const now = Math.floor(Date.now() / 1_000) - 30;
  const header = base64UrlJson({ alg: "EdDSA", kid: credentialId });
  const body = base64UrlJson({ sub: projectId, iat: now, exp: now + 900 });
  const unsigned = `${header}.${body}`;
  const signature = sign(
    null,
    Buffer.from(unsigned),
    createPrivateKey(privateKeyPem),
  ).toString("base64url");
  return `${unsigned}.${signature}`;
}

function qweatherRequestPoint(input: Parameters<WeatherPort["getHourly"]>[0]) {
  const converted = wgs84ToGcj02({
    lat: input.point.latitude,
    lon: input.point.longitude,
    system: "WGS84",
  });
  return { latitude: converted.lat, longitude: converted.lon };
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

export class QWeatherForecastAdapter {
  readonly key: string;

  constructor(
    private readonly config: MiniappRuntimeConfig,
    private readonly transport: typeof fetch = fetch,
  ) {
    this.key = `qweather-weather-v1-hourly-${config.qweather.forecastHours}h`;
  }

  async getHourly(
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
      );
      if (!payload.hours?.length)
        throw new Error("qweather_rejected:empty");
      const fetchedAt = new Date().toISOString();
      const sourceId = `weather:qweather-weather-v1-hourly:${digest({
        point,
        forecastHours,
        metadataTag: payload.metadata?.tag,
        hours: payload.hours,
      })}`;
      const rows: CanonicalWeatherHour[] = payload.hours.map((hour) => {
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
          at: normalizedAt(String(hour.forecastTime)),
          cloudPercent: qweatherFractionPercent(hour.cloudCover),
          lowCloudPercent: null,
          midCloudPercent: null,
          highCloudPercent: null,
          modelConsistency: null,
          modelConsistencyLabel: "UNAVAILABLE",
          modelSpreadPercent: null,
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
          officialSevereAlert: false,
          officialAlertIds: [],
          evidenceSourceIds: [sourceId],
        };
      });
      const partial = rows.some(
        (row) =>
          row.cloudPercent === null ||
          row.precipitationMm === null ||
          row.windKph === null ||
          row.temperatureC === null,
      );
      const dataSource = forecastSource({
        id: sourceId,
        provider: "和风天气",
        title: `指定坐标 ${forecastHours} 小时逐小时天气主时间线`,
        sourceUrl:
          "https://dev.qweather.com/docs/api/weather/weather-hourly-forecast/",
        license: "和风天气开发者许可；按响应 metadata.attributions 展示归因",
        licenseUrl: "https://dev.qweather.com/docs/terms/",
        retrievedAt: fetchedAt,
        validFrom: rows[0]!.at,
        validTo: rows.at(-1)!.at,
        state: partial ? "PARTIAL" : "FRESH",
        precision:
          "中国大陆查询前由 WGS84 转为 GCJ-02，并按供应商要求保留到 0.01°；Weather API v1 空间分辨率约 1 km",
        limitations: [
          `当前环境明确请求 ${forecastHours} 小时预报；超出该窗口的主时间线保持不可用`,
          "Weather API v1 只承担主时间线；低/中/高云与模型差异来自独立 Open-Meteo 证据",
          "官方预警来自独立预警接口，主预报不能证明无预警",
          ...(payload.metadata?.attributions?.filter(Boolean) ?? []),
        ],
      });
      return {
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
          validTo: rows.at(-1)!.at,
          nativeSpatialResolutionKm: 1,
          nativeTemporalResolutionMinutes: 60,
          outputTemporalResolutionMinutes: 60,
          interpolatedVariables: [],
          state: dataSource.state,
          sourceId,
        },
      };
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

  constructor(
    private readonly config: MiniappRuntimeConfig,
    private readonly transport: typeof fetch = fetch,
  ) {}

  async getAlerts(
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
      );
      if (!payload.metadata)
        throw new Error("qweather_alert_metadata_missing");
      const fetchedAt = new Date().toISOString();
      const sourceId = `weather:qweather-alert:${payload.metadata.tag ?? digest(payload.alerts ?? [])}`;
      const now = Date.parse(fetchedAt);
      const alerts = (payload.alerts ?? []).map((entry, index) => {
        const messageType = textOrNull(entry.messageType?.code)?.toLowerCase() ?? null;
        const expiresAt = instantOrNull(entry.expireTime);
        const status = alertStatus({ messageType, expiresAt, now });
        const severity = textOrNull(entry.severity) ?? "unknown";
        const urgency = textOrNull(entry.urgency);
        const certainty = textOrNull(entry.certainty);
        const alert: CanonicalWeatherAlert = {
          id: textOrNull(entry.id) ?? `qweather-alert-${index}`,
          headline: textOrNull(entry.headline) ?? "官方天气预警",
          description: textOrNull(entry.description) ?? "发布机构未提供详情",
          instruction: textOrNull(entry.instruction),
          eventName: textOrNull(entry.eventType?.name) ?? "未分类天气事件",
          eventCode: textOrNull(entry.eventType?.code) ?? "unknown",
          severity,
          urgency,
          certainty,
          issuedAt: instantOrNull(entry.issuedTime) ?? fetchedAt,
          effectiveAt:
            instantOrNull(entry.effectiveTime) ?? instantOrNull(entry.onsetTime),
          expiresAt,
          status,
          material: materialAlert({ status, severity, urgency, certainty }),
          sourceId,
        };
        return alert;
      });
      if (payload.metadata.zeroResult === false && !alerts.length)
        throw new Error("qweather_alert_rows_missing");
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
        id: sourceId,
        retrievedAt: fetchedAt,
        validFrom: earliestIssuedAt,
        validTo:
          alerts
            .map((alert) => alert.expiresAt)
            .filter((value): value is string => value !== null)
            .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ??
          new Date(now + 20 * 60 * 1_000).toISOString(),
        state: "FRESH",
        limitations: [
          ...(payload.metadata.attributions?.filter(Boolean) ?? []),
          "预警接口按 20 分钟理想刷新；用户出发前仍应查看发布机构的最新通知",
        ],
      });
      return {
        value: alerts,
        state: "FRESH",
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

function nearestWeather(
  rows: readonly CanonicalWeatherHour[],
  at: string,
): CanonicalWeatherHour | null {
  const target = Date.parse(at);
  const nearest = rows.reduce<CanonicalWeatherHour | null>(
    (current, row) =>
      current === null ||
      Math.abs(Date.parse(row.at) - target) <
        Math.abs(Date.parse(current.at) - target)
        ? row
        : current,
    null,
  );
  return nearest && Math.abs(Date.parse(nearest.at) - target) <= 45 * 60 * 1_000
    ? nearest
    : null;
}

function alertAppliesAt(alert: CanonicalWeatherAlert, at: string): boolean {
  if (!alert.material || alert.status !== "ACTIVE") return false;
  const target = Date.parse(at);
  const start = Date.parse(alert.effectiveAt ?? alert.issuedAt);
  const end = alert.expiresAt ? Date.parse(alert.expiresAt) : Number.POSITIVE_INFINITY;
  return target >= start && target < end;
}

function alertRisk(alert: CanonicalWeatherAlert): {
  thunderstorm: boolean;
  severeRain: boolean;
  severeWind: boolean;
} {
  const value = `${alert.eventName} ${alert.headline} ${alert.eventCode}`.toLowerCase();
  return {
    thunderstorm: /thunder|lightning|雷暴|雷电|强对流|雷雨/u.test(value),
    severeRain: /rain|precip|暴雨|强降水|强降雨|短时强降水/u.test(value),
    severeWind: /wind|gale|typhoon|tornado|大风|强风|台风|龙卷/u.test(value),
  };
}

function combineStates(input: {
  timeline: DataState;
  warning: DataState;
  evidence: DataState;
  fallback: boolean;
}): DataState {
  if (input.timeline === "UNAVAILABLE" || input.timeline === "EXPIRED")
    return "UNAVAILABLE";
  if (
    input.fallback ||
    input.warning !== "FRESH" ||
    input.evidence !== "FRESH" ||
    input.timeline === "PARTIAL"
  )
    return "PARTIAL";
  return input.timeline;
}

export class QWeatherCompositeAdapter implements WeatherPort {
  readonly key = "qweather-weather-v1-alert-open-meteo-evidence";
  private readonly forecast: QWeatherForecastAdapter;
  private readonly alerts: QWeatherAlertAdapter;
  private readonly evidence: OpenMeteoWeatherAdapter;

  constructor(
    config: MiniappRuntimeConfig,
    transport: typeof fetch = fetch,
  ) {
    this.forecast = new QWeatherForecastAdapter(config, transport);
    this.alerts = new QWeatherAlertAdapter(config, transport);
    this.evidence = new OpenMeteoWeatherAdapter(
      config,
      transport,
      config.openMeteoEvidenceMode,
    );
  }

  async getHourly(
    input: Parameters<WeatherPort["getHourly"]>[0],
  ): Promise<WeatherEvidenceResult> {
    const [primary, warning, evidence] = await Promise.all([
      this.forecast.getHourly(input),
      this.alerts.getAlerts(input),
      this.evidence.getHourly(input),
    ]);
    const primaryRows = primary.value ?? [];
    const evidenceRows = evidence.value ?? [];
    const fallback = !primaryRows.length && evidenceRows.length > 0;
    if (!primaryRows.length && !evidenceRows.length)
      return unavailableWeatherResult("天气组合", "all_weather_timelines_unavailable", [
        primary.source,
        warning.source,
        ...evidence.sources,
      ]);

    const activeAlerts = warning.value ?? [];
    const baseRows = fallback ? evidenceRows : primaryRows;
    const rows: CanonicalWeatherHour[] = baseRows.map((base) => {
      const supplement = fallback ? base : nearestWeather(evidenceRows, base.at);
      const applicableAlerts = activeAlerts.filter((alert) => alertAppliesAt(alert, base.at));
      const risks = applicableAlerts.map(alertRisk);
      return {
        ...base,
        cloudPercent: base.cloudPercent ?? supplement?.cloudPercent ?? null,
        lowCloudPercent: supplement?.lowCloudPercent ?? base.lowCloudPercent,
        midCloudPercent: supplement?.midCloudPercent ?? base.midCloudPercent,
        highCloudPercent: supplement?.highCloudPercent ?? base.highCloudPercent,
        modelConsistency:
          supplement?.modelConsistency ?? base.modelConsistency,
        modelConsistencyLabel:
          supplement?.modelConsistencyLabel ?? base.modelConsistencyLabel,
        modelSpreadPercent:
          supplement?.modelSpreadPercent ?? base.modelSpreadPercent,
        precipitationMm:
          base.precipitationMm ?? supplement?.precipitationMm ?? null,
        precipitationProbabilityPercent:
          base.precipitationProbabilityPercent ??
          supplement?.precipitationProbabilityPercent ??
          null,
        windKph: base.windKph ?? supplement?.windKph ?? null,
        windGustKph: base.windGustKph ?? supplement?.windGustKph ?? null,
        windDirectionDeg:
          base.windDirectionDeg ?? supplement?.windDirectionDeg ?? null,
        temperatureC: base.temperatureC ?? supplement?.temperatureC ?? null,
        relativeHumidityPercent:
          base.relativeHumidityPercent ??
          supplement?.relativeHumidityPercent ??
          null,
        dewPointC: base.dewPointC ?? supplement?.dewPointC ?? null,
        visibilityKm: base.visibilityKm ?? supplement?.visibilityKm ?? null,
        thunderstorm:
          base.thunderstorm ||
          (supplement?.thunderstorm ?? false) ||
          risks.some((risk) => risk.thunderstorm),
        severeRain:
          base.severeRain ||
          (supplement?.severeRain ?? false) ||
          risks.some((risk) => risk.severeRain),
        severeWind:
          base.severeWind ||
          (supplement?.severeWind ?? false) ||
          risks.some((risk) => risk.severeWind),
        officialSevereAlert: applicableAlerts.length > 0,
        officialAlertIds: applicableAlerts.map((alert) => alert.id),
        evidenceSourceIds: unique([
          ...base.evidenceSourceIds,
          ...(supplement?.evidenceSourceIds ?? []),
          ...applicableAlerts.map((alert) => alert.sourceId),
        ]),
      };
    });
    const evidenceState = evidence.value ? stateFromRows(evidenceRows) : "UNAVAILABLE";
    const timelineState = fallback ? evidence.state : primary.state;
    const state = combineStates({
      timeline: timelineState,
      warning: warning.state,
      evidence: evidenceState,
      fallback,
    });
    const sources = unique([
      primary.source,
      warning.source,
      ...evidence.sources,
    ]);
    const warnings = [
      ...(fallback
        ? ["和风天气主时间线不可用；当前明确使用 Open-Meteo Best Match 备源。"]
        : []),
      ...(warning.state !== "FRESH"
        ? ["官方预警当前不可用；正式点出行建议必须保持数据不足。"]
        : []),
      ...(evidenceState !== "FRESH"
        ? ["分层云或多模型证据不完整；缺失字段不会显示为 0。"]
        : []),
    ];
    return {
      value: rows,
      state,
      source: fallback ? evidence.source : primary.source,
      sources,
      errorCode: null,
      warningState: warning.state,
      alerts: activeAlerts,
      timelineRole: fallback ? "PRIMARY_FALLBACK" : "PRIMARY",
      modelRuns: [
        ...(primary.modelRun ? [primary.modelRun] : []),
        ...evidence.modelRuns,
      ],
      warnings,
    };
  }
}

export function createWeatherPort(config: MiniappRuntimeConfig): WeatherPort {
  return config.weatherProvider === "QWEATHER"
    ? new QWeatherCompositeAdapter(config)
    : new OpenMeteoWeatherAdapter(config, fetch, config.openMeteoEvidenceMode);
}
