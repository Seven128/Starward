import { createHash } from "node:crypto";
import {
  findDemoSpot,
  type ApiEnvelope,
  type DataState,
  type HourlySkyRow,
  type SkyReport,
  type SkyTarget,
  type SourceSummary,
  type SpotId,
} from "@starward/miniapp-contracts";
import {
  calculateMiniappNightSky,
  MINIAPP_ASTRONOMY_ALGORITHM,
} from "./astronomy-engine-adapter.ts";
import { decideTonight } from "./decision-engine.ts";
import type { AstronomyApplicationPort } from "./ports.ts";
import type { WeatherPort } from "./ports.ts";
import { SampleWeatherAdapter } from "./sample-weather-adapter.ts";

const CATALOG_VERSION = "starward-bright-targets-v1";

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function envelope<T>(
  data: T,
  state: DataState,
  sources: readonly SourceSummary[],
  warnings: readonly string[] = [],
): ApiEnvelope<T> {
  const generatedAt = new Date().toISOString();
  return {
    apiVersion: "v1",
    data,
    dataState: state,
    generatedAt,
    etag: `W/\"${digest({ data, state }).slice(0, 24)}\"`,
    sources,
    warnings,
  };
}

function calculationSource(localDate: string): SourceSummary {
  return {
    id: `source-astronomy-${MINIAPP_ASTRONOMY_ALGORITHM}-${localDate}`,
    kind: "PRODUCT_CALCULATION",
    provider: "Astronomy Engine",
    title: "本地点日期的日月与天体几何计算",
    sourceUrl: "https://github.com/cosinekitty/astronomy",
    license: "MIT",
    licenseUrl: "https://github.com/cosinekitty/astronomy/blob/master/LICENSE",
    publishedAt: null,
    retrievedAt: new Date().toISOString(),
    validFrom: `${localDate}T00:00:00`,
    validTo: `${localDate}T23:59:59`,
    state: "FRESH",
    confidence: 0.9,
    precision: "版本化球面天文计算；不包含局部地平线、天气与肉眼可见性",
    limitations: [
      "不等同于天气或摄影可见性",
      "银河核心仅为 Sagittarius A* 附近方向代理",
      "地点海拔未知时使用 0m",
    ],
  };
}

function localTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export class AstronomyService implements AstronomyApplicationPort {
  constructor(readonly weather: WeatherPort = new SampleWeatherAdapter()) {}

  async compute(input: {
    spotId: SpotId;
    localDate: string;
    at: string | null;
    targetProfile: "BEGINNER" | "PHOTOGRAPHER" | "ADVANCED";
  }): Promise<ApiEnvelope<SkyReport>> {
    const spot = findDemoSpot(input.spotId);
    if (!spot) throw new Error("formal_spot_not_found");
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.localDate))
      throw new Error("local_date_invalid");
    const requests = ["jupiter", "venus", "milky-way-core"] as const;
    const calculations = requests.map((target) =>
      calculateMiniappNightSky({
        latitude: spot.wgs84.latitude,
        longitude: spot.wgs84.longitude,
        elevationM: spot.altitudeM ?? 0,
        timezone: spot.timezone,
        nightDate: input.localDate,
        target,
        cadenceMinutes: 30,
      }),
    );
    const source = calculationSource(input.localDate);
    const weather = await this.weather.getHourly({
      point: spot.wgs84,
      localDate: input.localDate,
      timezone: spot.timezone,
    });
    const weatherRows = weather.value ?? [];
    const weatherAt = (at: string) => {
      const target = new Date(at).getTime();
      const nearest = weatherRows.reduce<
        (typeof weatherRows)[number] | null
      >(
        (current, row) =>
          current === null ||
          Math.abs(new Date(row.at).getTime() - target) <
            Math.abs(new Date(current.at).getTime() - target)
            ? row
            : current,
        null,
      );
      return nearest &&
        Math.abs(new Date(nearest.at).getTime() - target) <= 30 * 60 * 1_000
        ? nearest
        : null;
    };
    const base = calculations[0]!;
    const hourly: HourlySkyRow[] = base.samples.map((sample) => {
      const matchingWeather = weatherAt(sample.at);
      return {
        at: sample.at,
        cloudPercent: matchingWeather?.cloudPercent ?? null,
        precipitationMm: matchingWeather?.precipitationMm ?? null,
        windKph: matchingWeather?.windKph ?? null,
        temperatureC: matchingWeather?.temperatureC ?? null,
        visibilityKm: matchingWeather?.visibilityKm ?? null,
        moonAltitudeDeg: sample.moonAltitudeDeg,
        moonIllumination: sample.moonIllumination,
        darkness:
          sample.sunAltitudeDeg <= -18
            ? "ASTRONOMICAL_NIGHT"
            : sample.sunAltitudeDeg < 0
              ? "TWILIGHT"
              : "DAY",
        state: weather.state,
      };
    });
    const targets: SkyTarget[] = calculations.flatMap((calculation) => {
      const best = calculation.samples.reduce<
        (typeof calculation.samples)[number] | null
      >(
        (current, sample) =>
          current === null ||
          sample.targetAltitudeDeg > current.targetAltitudeDeg
            ? sample
            : current,
        null,
      );
      if (!best || best.targetAltitudeDeg <= 0) return [];
      const names = {
        jupiter: "木星",
        venus: "金星",
        "milky-way-core": "银河核心方向",
      } as const;
      const types = {
        jupiter: "PLANET",
        venus: "PLANET",
        "milky-way-core": "MILKY_WAY",
      } as const;
      return [
        {
          targetId: `target:${calculation.target}`,
          displayName: names[calculation.target as keyof typeof names],
          type: types[calculation.target as keyof typeof types],
          window: {
            start: localTime(calculation.samples[0]!.at, spot.timezone),
            end: localTime(calculation.samples.at(-1)!.at, spot.timezone),
          },
          direction: `${Math.round(best.targetAzimuthDeg)}°`,
          altitudeDeg: Math.round(best.targetAltitudeDeg),
          reason: `本观测夜几何高度最高约 ${Math.round(best.targetAltitudeDeg)}°；仍需结合天气、遮挡和光害。`,
          source,
          confidence: 0.85,
        },
      ];
    });
    const darkRows = hourly.filter(
      (row) =>
        row.darkness === "ASTRONOMICAL_NIGHT" &&
        typeof row.cloudPercent === "number",
    );
    const best = darkRows.reduce<HourlySkyRow | null>(
      (current, row) =>
        current === null || row.cloudPercent! < current.cloudPercent!
          ? row
          : current,
      null,
    );
    const averageCloud =
      darkRows.length > 0
        ? darkRows.reduce((sum, row) => sum + row.cloudPercent!, 0) /
          darkRows.length
        : null;
    const decision = decideTonight({
      localDate: input.localDate,
      sourceRevision: `${source.id}:${weather.source.id}`,
      weatherState: weather.state,
      siteState: "SAMPLE_DATA",
      astronomyState: "FRESH",
      thunderstorm: weatherRows.some((row) => row.thunderstorm),
      severeRain: weatherRows.some((row) => row.severeRain),
      severeWind: weatherRows.some((row) => row.severeWind),
      closed: null,
      roadClosed: null,
      explicitDanger: null,
      illegalAccess: null,
      criticalConflict: false,
      scores: {
        sky: averageCloud === null ? null : 100 - averageCloud,
        darkness: spot.lightPollution.levelAtMost
          ? 100 - spot.lightPollution.levelAtMost * 10
          : null,
        site: 55,
        target: targets.length ? 70 : 40,
        access: 45,
      },
      bestWindow: best
        ? {
            start: localTime(best.at, spot.timezone),
            end: localTime(
              new Date(new Date(best.at).getTime() + 100 * 60 * 1_000).toISOString(),
              spot.timezone,
            ),
          }
        : null,
      suitableFor:
        targets.some((target) => target.type === "MILKY_WAY")
          ? ["NAKED_EYE", "PHONE", "MILKY_WAY"]
          : ["NAKED_EYE", "PHONE"],
    });
    const report: SkyReport = {
      context: {
        spotId: spot.spotId,
        localDate: input.localDate,
        at: input.at,
        timezone: spot.timezone,
        targetProfile: input.targetProfile,
        dataRevision: digest({
          spot: spot.source.id,
          date: input.localDate,
          weather: weather.source.id,
        }).slice(0, 16),
        algorithmVersion: MINIAPP_ASTRONOMY_ALGORITHM,
        catalogVersion: CATALOG_VERSION,
      },
      decision,
      targets,
      hourly,
      milkyWayDirection:
        targets.find((target) => target.type === "MILKY_WAY")?.direction ??
        "本观测夜低于几何地平线或无计算窗口",
      moonSummary:
        base.moonIlluminationAtMidpoint === null
          ? "月亮信息不足"
          : `观测夜中段月面照明约 ${Math.round(base.moonIlluminationAtMidpoint * 100)}%`,
      compass: { state: "UNAVAILABLE", manualOffsetDeg: 0 },
      precachedHours: Math.min(8, Math.ceil(hourly.length / 2)),
      offlineReady: true,
      sources: [source, weather.source, spot.lightPollution.source],
    };
    return envelope(report, "SAMPLE_DATA", report.sources, [
      "天气为明确标注的确定性 Demo 情景，不是实时预报；天文几何由 Astronomy Engine 实算。",
      "实际出行前必须接入获许可的实时天气/路线能力并重新判断。",
    ]);
  }
}
