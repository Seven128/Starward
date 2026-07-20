import { calculateNightSky, type NightSkyCalculation, type SkySample } from "../../../../../packages/astronomy-core/src/index";
import type {
  AstronomyTimelineEvidence,
  ForecastBundle,
  ForecastDataStatus,
  ForecastLayerDescriptor,
  ForecastModelComparison,
  ForecastModelSeries,
  ForecastQuery,
  ForecastRunDescriptor,
  ForecastTrendDay,
  ProfessionalForecastHour,
} from "../../../../../packages/contracts/src/forecast";
import { describeAtmosphere, intersectNightWindows } from "../../../../../packages/domain/src/forecast/index";
import type { NormalizedWeatherHour, NormalizedWeatherRun } from "../../../../../packages/weather-schema/src/index";

export interface ForecastRunSource {
  load(input: { latitude: number; longitude: number; runId: string; issuedAt: string; expiresAt: string }): Promise<NormalizedWeatherRun>;
}

export interface ForecastQueryServiceOptions {
  primary: ForecastRunSource;
  comparison?: ForecastRunSource;
  now?: () => Date;
  cacheTtlMs?: number;
}

interface CacheEntry { expiresAt: number; bundle: ForecastBundle }

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
const average = (values: Array<number | null>) => {
  const present = values.filter((value): value is number => value !== null);
  return present.length ? round(present.reduce((sum, value) => sum + value, 0) / present.length) : null;
};
const sum = (values: Array<number | null>) => {
  const present = values.filter((value): value is number => value !== null);
  return present.length ? round(present.reduce((total, value) => total + value, 0)) : null;
};

function statusForRun(run: NormalizedWeatherRun, now: Date): ForecastDataStatus {
  if (Date.parse(run.expiresAt) <= now.getTime()) return "stale";
  return run.status === "complete" ? "fresh" : "partial";
}

function descriptor(run: NormalizedWeatherRun, now: Date): ForecastRunDescriptor {
  return {
    provider: run.provider,
    model: run.model,
    runId: run.runId,
    modelRunTimeUtc: run.modelRunTimeUtc,
    ingestedAt: run.ingestedAt,
    expiresAt: run.expiresAt,
    resolutionKm: run.resolutionKm,
    status: statusForRun(run, now),
    sourceLicense: run.sourceLicense,
    use: run.use,
    attribution: run.attribution.map(({ label, url, licenseId, licenseVersion, modified }) => ({ label, url, licenseId, licenseVersion, modified })),
    qualityFlags: [...run.qualityFlags],
  };
}

function nearestSample(samples: SkySample[], instant: string): SkySample | null {
  if (!samples.length) return null;
  const target = Date.parse(instant);
  return samples.reduce((best, sample) => Math.abs(Date.parse(sample.at) - target) < Math.abs(Date.parse(best.at) - target) ? sample : best);
}

function previousValue(hours: NormalizedWeatherHour[], index: number, key: "pressureHpa") {
  if (index === 0 || hours[index][key] === null || hours[index - 1][key] === null) return null;
  return round(hours[index][key]! - hours[index - 1][key]!);
}

function professionalHour(hour: NormalizedWeatherHour, index: number, run: NormalizedWeatherRun, sky: NightSkyCalculation, now: Date): ProfessionalForecastHour {
  const sample = nearestSample(sky.samples, hour.validTimeUtc);
  const atmosphere = describeAtmosphere({
    providerSeeing: null,
    calibrated: false,
    cloud: hour.totalCloudPct === null ? null : hour.totalCloudPct / 100,
    windMps: hour.windSpeedMps,
    humidity: hour.relativeHumidityPct === null ? null : hour.relativeHumidityPct / 100,
  });
  const dewPointSpreadC = hour.temperatureC === null || hour.dewPointC === null ? null : round(hour.temperatureC - hour.dewPointC);
  return {
    validTimeUtc: hour.validTimeUtc,
    conditionText: hour.conditionText,
    temperatureC: hour.temperatureC,
    apparentTemperatureC: hour.apparentTemperatureC,
    relativeHumidityPct: hour.relativeHumidityPct,
    dewPointC: hour.dewPointC,
    dewPointSpreadC,
    pressureHpa: hour.pressureHpa,
    pressureChangeHpa: previousValue(run.hours, index, "pressureHpa"),
    totalCloudPct: hour.totalCloudPct,
    lowCloudPct: hour.lowCloudPct,
    midCloudPct: hour.midCloudPct,
    highCloudPct: hour.highCloudPct,
    visibilityM: hour.visibilityM,
    windSpeedMps: hour.windSpeedMps,
    windGustMps: hour.windGustMps,
    windDirectionDeg: hour.windDirectionDeg,
    precipitationMm: hour.precipitationMm,
    precipitationProbabilityPct: hour.precipitationProbabilityPct,
    fogProbabilityPct: hour.fogProbabilityPct,
    aqi: hour.aqi,
    aqiScale: hour.aqiScale,
    pm25UgM3: hour.pm25UgM3,
    pm10UgM3: hour.pm10UgM3,
    aerosolOpticalDepth: hour.aerosolOpticalDepth,
    moonIlluminationPct: sample ? round(sample.moonIllumination * 100) : null,
    moonAltitudeDeg: sample?.moonAltitudeDeg ?? null,
    moonAzimuthDeg: sample ? calculateMoonAzimuth(sky, sample.at) : null,
    targetAltitudeDeg: sample?.targetAltitudeDeg ?? null,
    targetAzimuthDeg: sample?.targetAzimuthDeg ?? null,
    atmosphere,
    quality: hour.quality === "missing" ? "missing" : statusForRun(run, now),
    missingFields: [...hour.missingFields],
  };
}

// The astronomy sample contract currently exposes lunar altitude but not azimuth.
// Keep the value unavailable instead of manufacturing a direction.
function calculateMoonAzimuth(_sky: NightSkyCalculation, _instant: string): null { return null; }

function series(run: NormalizedWeatherRun, sky: NightSkyCalculation, now: Date): ForecastModelSeries {
  return { run: descriptor(run, now), hours: run.hours.map((hour, index) => professionalHour(hour, index, run, sky, now)) };
}

function contiguousWindow(samples: SkySample[], predicate: (sample: SkySample) => boolean) {
  const selected = samples.filter(predicate);
  if (!selected.length) return null;
  const cadence = samples.length > 1 ? Date.parse(samples[1].at) - Date.parse(samples[0].at) : 30 * 60_000;
  let bestStart = selected[0];
  let bestEnd = selected[0];
  let currentStart = selected[0];
  let previous = selected[0];
  for (const sample of selected.slice(1)) {
    if (Date.parse(sample.at) - Date.parse(previous.at) > cadence * 1.5) currentStart = sample;
    if (Date.parse(sample.at) - Date.parse(currentStart.at) > Date.parse(bestEnd.at) - Date.parse(bestStart.at)) {
      bestStart = currentStart;
      bestEnd = sample;
    }
    previous = sample;
  }
  const end = new Date(Date.parse(bestEnd.at) + cadence);
  return { startUtc: bestStart.at, endUtc: end.toISOString(), durationMinutes: Math.round((end.getTime() - Date.parse(bestStart.at)) / 60_000) };
}

function astronomyEvidence(sky: NightSkyCalculation): AstronomyTimelineEvidence {
  const dark = sky.astronomicalDusk && sky.astronomicalDawn
    ? intersectNightWindows({ startUtc: sky.astronomicalDusk, endUtc: sky.astronomicalDawn }) : null;
  const moonless = contiguousWindow(sky.samples, (sample) => sample.sunAltitudeDeg <= -18 && sample.moonAltitudeDeg < 0);
  const target = contiguousWindow(sky.samples, (sample) => sample.sunAltitudeDeg <= -18 && sample.targetAltitudeDeg >= 20);
  const bestIntersection = dark && moonless && target ? intersectNightWindows(dark, moonless, target) : null;
  return {
    algorithmVersion: sky.algorithmVersion,
    coordinateSystem: sky.coordinateSystem,
    timezone: sky.timezone,
    nightDate: sky.nightDate,
    observer: sky.observer,
    civilDusk: sky.civilDusk,
    nauticalDusk: sky.nauticalDusk,
    astronomicalDusk: sky.astronomicalDusk,
    astronomicalDawn: sky.astronomicalDawn,
    nauticalDawn: sky.nauticalDawn,
    civilDawn: sky.civilDawn,
    moonRise: sky.moonRise,
    moonSet: sky.moonSet,
    astronomicalDarkWindow: dark,
    moonlessWindow: moonless,
    targetWindow: target,
    bestIntersection,
    limitations: [...sky.limitations],
  };
}

function localDate(instant: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant));
}

function trends(run: NormalizedWeatherRun, query: ForecastQuery): ForecastTrendDay[] {
  const grouped = new Map<string, NormalizedWeatherHour[]>();
  for (const hour of run.hours) {
    const date = localDate(hour.validTimeUtc, query.timezone);
    grouped.set(date, [...(grouped.get(date) ?? []), hour]);
  }
  return [...grouped.entries()].slice(0, 15).map(([date, hours], index) => {
    const nightSky = calculateNightSky({ ...query, elevationM: 0, nightDate: date, cadenceMinutes: 30 });
    const darkSamples = nightSky.samples.filter((sample) => sample.sunAltitudeDeg <= -18);
    const moonless = darkSamples.filter((sample) => sample.moonAltitudeDeg < 0);
    const target = darkSamples.filter((sample) => sample.targetAltitudeDeg >= 20);
    const temperatures = hours.map((hour) => hour.temperatureC).filter((value): value is number => value !== null);
    const confidence = Math.max(0.22, round(0.84 - index * 0.035));
    return {
      date,
      status: hours.some((hour) => hour.quality === "missing" || hour.missingFields.length > 0) ? "partial" : "fresh",
      confidence,
      conditionText: hours.find((hour) => hour.conditionText)?.conditionText ?? null,
      lowTemperatureC: temperatures.length ? Math.min(...temperatures) : null,
      highTemperatureC: temperatures.length ? Math.max(...temperatures) : null,
      averageTotalCloudPct: average(hours.map((hour) => hour.totalCloudPct)),
      precipitationMm: sum(hours.map((hour) => hour.precipitationMm)),
      precipitationProbabilityPct: hours.reduce<number | null>((maximum, hour) => hour.precipitationProbabilityPct === null ? maximum : Math.max(maximum ?? 0, hour.precipitationProbabilityPct), null),
      moonIlluminationPct: average(darkSamples.map((sample) => round(sample.moonIllumination * 100))),
      astronomicalDarkMinutes: darkSamples.length * 30,
      moonlessDarkMinutes: moonless.length * 30,
      targetVisibleMinutes: target.length * 30,
      planningOnly: true,
    };
  });
}

function compare(primary: ForecastModelSeries, secondary: ForecastModelSeries | null): ForecastModelComparison {
  if (!secondary) return { status: "missing", confidence: 0.45, explanation: "没有已授权的对比模型；当前仅展示主模型。", consensusStartUtc: null, consensusEndUtc: null, disagreementStartUtc: null, disagreementEndUtc: null, comparedFields: [] };
  const secondaryByTime = new Map(secondary.hours.map((hour) => [hour.validTimeUtc, hour]));
  const points = primary.hours.map((hour) => ({ primary: hour, secondary: secondaryByTime.get(hour.validTimeUtc) })).filter((point) => point.secondary);
  const disagreements = points.filter(({ primary: a, secondary: b }) => Math.abs((a.totalCloudPct ?? 0) - (b!.totalCloudPct ?? 0)) >= 25 || Math.abs((a.precipitationProbabilityPct ?? 0) - (b!.precipitationProbabilityPct ?? 0)) >= 30);
  const consensus = points.filter((point) => !disagreements.includes(point));
  return {
    status: disagreements.length ? "partial" : "fresh",
    confidence: points.length ? round(Math.max(0.35, 0.82 - disagreements.length / points.length * 0.35)) : 0.35,
    explanation: disagreements.length ? `${disagreements.length} 个小时的云量或降水概率存在显著分歧，临行前需要刷新。` : "两个模型在可比较时段未出现显著分歧。",
    consensusStartUtc: consensus[0]?.primary.validTimeUtc ?? null,
    consensusEndUtc: consensus.at(-1)?.primary.validTimeUtc ?? null,
    disagreementStartUtc: disagreements[0]?.primary.validTimeUtc ?? null,
    disagreementEndUtc: disagreements.at(-1)?.primary.validTimeUtc ?? null,
    comparedFields: ["totalCloudPct", "precipitationProbabilityPct"],
  };
}

function layers(run: NormalizedWeatherRun, now: Date): ForecastLayerDescriptor[] {
  return ["totalCloudPct", "lowCloudPct", "midCloudPct", "highCloudPct"].map((id, index) => ({
    id,
    name: ["总云量", "低云", "中云", "高云"][index],
    status: statusForRun(run, now),
    provider: run.provider,
    model: run.model,
    runId: run.runId,
    generatedAt: run.modelRunTimeUtc,
    nextUpdateAt: run.expiresAt,
    opacity: 0.65,
    legend: [{ from: 0, to: 20, label: "少云", color: "#132346" }, { from: 20, to: 60, label: "间云", color: "#54709A" }, { from: 60, to: 100, label: "多云", color: "#D7E1ED" }],
    valueUnit: "%",
    timeUtc: run.hours[0]?.validTimeUtc ?? run.issuedAt,
    tileUrl: null,
    limitation: "当前供应商仅提供点位小时值；未取得栅格瓦片许可，因此不伪造天气覆盖层。",
    attribution: descriptor(run, now).attribution,
  }));
}

export class ForecastQueryService {
  private readonly now: () => Date;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<ForecastBundle>>();

  constructor(private readonly options: ForecastQueryServiceOptions) {
    this.now = options.now ?? (() => new Date());
  }

  async get(query: ForecastQuery): Promise<ForecastBundle> {
    const key = `${query.latitude.toFixed(4)}:${query.longitude.toFixed(4)}:${query.timezone}:${query.nightDate}:${query.target}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > this.now().getTime()) return { ...cached.bundle, status: "cached" };
    const pending = this.inFlight.get(key);
    if (pending) return pending;
    const task = this.load(query).finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, task);
    return task;
  }

  private async load(query: ForecastQuery): Promise<ForecastBundle> {
    const now = this.now();
    const issuedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + (this.options.cacheTtlMs ?? 30 * 60_000)).toISOString();
    const runBase = `${query.latitude.toFixed(4)}-${query.longitude.toFixed(4)}-${issuedAt.slice(0, 13)}`;
    const [primaryRun, comparisonResult] = await Promise.all([
      this.options.primary.load({ latitude: query.latitude, longitude: query.longitude, runId: `primary-${runBase}`, issuedAt, expiresAt }),
      this.options.comparison?.load({ latitude: query.latitude, longitude: query.longitude, runId: `comparison-${runBase}`, issuedAt, expiresAt }).catch(() => null) ?? Promise.resolve(null),
    ]);
    const sky = calculateNightSky({ ...query, elevationM: 0, cadenceMinutes: 30 });
    const primary = series(primaryRun, sky, now);
    const comparison = comparisonResult ? series(comparisonResult, sky, now) : null;
    const modelComparison = compare(primary, comparison);
    const status: ForecastDataStatus = primary.run.status === "fresh" && modelComparison.status !== "failed" ? (primaryRun.status === "complete" ? "fresh" : "partial") : primary.run.status;
    const bundle: ForecastBundle = {
      schemaVersion: "starward-forecast-bundle-v1",
      status,
      runtimeMode: primaryRun.use,
      generatedAt: issuedAt,
      expiresAt,
      context: { ...query, coordinateSystem: "WGS84" },
      primary,
      comparison,
      modelComparison,
      trends: trends(primaryRun, query),
      astronomy: astronomyEvidence(sky),
      layers: layers(primaryRun, now),
      warnings: [
        ...(primaryRun.use === "noncommercial-poc" ? ["当前数据链路仅用于非商业 POC，生产发布前必须切换已批准商业端点。"] : []),
        ...(comparison ? [] : ["对比模型不可用；主模型仍可独立使用。"]),
        ...primaryRun.qualityFlags,
      ],
    };
    this.cache.set(`${query.latitude.toFixed(4)}:${query.longitude.toFixed(4)}:${query.timezone}:${query.nightDate}:${query.target}`, { expiresAt: now.getTime() + (this.options.cacheTtlMs ?? 30 * 60_000), bundle });
    return bundle;
  }
}
