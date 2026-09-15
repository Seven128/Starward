import { createHash, randomUUID } from "node:crypto";
import type {
  ApiEnvelope,
  DataState,
  HourlySkyRow,
  ObservationContext,
  SkyReport,
  SpotDetail,
  SpotSummary,
  SkyTarget,
  SourceSummary,
} from "@starward/miniapp-contracts";
import { assertSkyTargetFrames } from "@starward/miniapp-contracts";
import {
  calculateEquatorialHorizontalAt,
  calculateMeteorRadiantAt,
  calculateMiniappNightSky,
  calculateSolarLongitudeJ2000,
} from "./astronomy-engine-adapter.ts";
import {
  activeMeteorEvents,
  meteorActivityAt,
  meteorCatalogSource,
  meteorEventByOccurrenceId,
} from "./meteor-event-catalog.ts";
import {
  SkyOpportunityEngine,
  type OpportunitySliceInput,
} from "./sky-opportunity-engine.ts";
import {
  buildSkyScene,
  createBsc5pSkyCatalogProvider,
  type SkyCatalogProvider,
} from "./sky-scene-catalog.ts";
import { TripDecisionEngine } from "./trip-decision-engine.ts";
import { deepSkySceneCacheKey } from "./deep-sky-scene-provider.ts";
import type {
  AstronomyApplicationPort,
  CanonicalWeatherHour,
  MiniappRepositoryPort,
  WeatherPort,
  WeatherEvidenceResult,
} from "./ports.ts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";
import type { AstronomicalEventCatalogOwner } from "./astronomical-event-catalog-owner.ts";
import { ComputationCache } from "./computation-cache.ts";
import { WEATHER_DEADLINES, waitForCaller, withDeadline } from "./provider-deadline.ts";
import { unavailableWeatherResult } from "./weather-provider.ts";
import { materialAlertAt, weatherHourAt } from "./weather-hour.ts";
import { observationFrameTimes } from "./observation-time-axis.ts";

/** Map and overview consume decision evidence, not a star-scene rendering. */
export type AstronomyDecisionReport = Omit<
  SkyReport, "skyScene" | "targetFrames" | "precachedHours" | "offlineReady"
>;

type DecisionComputation = {
  report: ApiEnvelope<AstronomyDecisionReport>;
  targetsAt: (at: string) => SkyTarget[];
  targetFrames?: SkyReport["targetFrames"];
};

export const ASTRONOMY_CACHE_POLICY = Object.freeze({
  weatherTtlMs: 60_000,
  partialWeatherTtlMs: 5_000,
  computationTtlMs: 30 * 60_000,
  weatherEntries: 128,
  decisionEntries: 64,
  calculationEntries: 128,
  sceneEntries: 16,
  reportEntries: 16,
});

function weatherExpiry(weather: WeatherEvidenceResult, now: number): number {
  if (!weather.value || ["UNAVAILABLE", "EXPIRED"].includes(weather.state)) return now;
  const ttl = weather.state === "PARTIAL" || weather.warningState === "UNAVAILABLE"
    ? ASTRONOMY_CACHE_POLICY.partialWeatherTtlMs
    : ASTRONOMY_CACHE_POLICY.weatherTtlMs;
  const validity = [
    ...weather.sources.map((source) => source.validTo),
    ...weather.modelRuns.map((run) => run.validTo),
    ...weather.alerts.filter((alert) => alert.status === "ACTIVE").map((alert) => alert.expiresAt),
  ].map((value) => Date.parse(value ?? "")).filter(Number.isFinite);
  return Math.min(now + ttl, ...validity);
}

const SKY_REPORT_TIME_AXIS_CACHE_VERSION = "sky-report-time-axis-v1";

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
    apiVersion: "v2",
    data,
    dataState: state,
    generatedAt,
    validAt: data instanceof Object && "context" in data
      ? (data as { context?: { at?: string } }).context?.at ?? generatedAt
      : generatedAt,
    etag: `W/"${digest({ data, state }).slice(0, 24)}"`,
    sources,
    warnings,
    requestId: `sky:${randomUUID()}`,
    ...(data instanceof Object && "context" in data
      ? {
          contextRevision:
            (data as { context?: { contextRevision?: number } }).context
              ?.contextRevision ?? 1,
        }
      : {}),
  };
}

function calculationSource(
  context: ObservationContext,
  config: MiniappRuntimeConfig,
): SourceSummary {
  return {
    id: `astronomy:${config.astronomyAlgorithmVersion}:${context.contextFingerprint}`,
    kind: "PRODUCT_CALCULATION",
    provider: "Astronomy Engine",
    title: "当前观测夜的日月、行星与银河方向计算",
    sourceUrl: "https://github.com/cosinekitty/astronomy",
    license: "MIT",
    licenseUrl: "https://github.com/cosinekitty/astronomy/blob/master/LICENSE",
    publishedAt: null,
    retrievedAt: new Date().toISOString(),
    validFrom: context.nightStartUtc,
    validTo: context.nightEndUtc,
    state: "FRESH",
    confidence: 0.9,
    precision: "版本化球面天文计算；局部遮挡由点位地平线证据另行约束",
    limitations: [
      "不等同于天气或肉眼可见性",
      "银河核心使用 Sagittarius A* 附近方向代理",
      "点位海拔未知时使用 0m",
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

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function stateConfidence(state: DataState): number {
  return {
    FRESH: 1,
    STALE_USABLE: 0.76,
    PARTIAL: 0.68,
    EXPIRED: 0,
    UNAVAILABLE: 0,
    ESTIMATED: 0.78,
    SAMPLE_DATA: 0.45,
  }[state];
}

function weatherTransmission(row: CanonicalWeatherHour | null): number | null {
  if (
    !row ||
    row.cloudPercent === null ||
    row.precipitationMm === null ||
    row.windKph === null
  )
    return null;
  const cloud = 1 - clamp01(row.cloudPercent / 100);
  const precipitation = 1 - clamp01(row.precipitationMm / 1.5);
  const wind =
    row.windKph <= 12 ? 1 : 1 - clamp01((row.windKph - 12) / 33);
  if (cloud <= 0 || precipitation <= 0 || wind <= 0) return 0;
  return Math.exp(
    0.65 * Math.log(cloud) +
      0.2 * Math.log(precipitation) +
      0.15 * Math.log(wind),
  );
}

function lightPollutionFactor(
  band: NonNullable<SpotSummary["lightPollution"]["productBand"]>,
): number {
  return {
    VERY_LOW: 0.95,
    LOW: 0.8,
    MODERATE: 0.6,
    HIGH: 0.35,
    VERY_HIGH: 0.15,
  }[band];
}

function stateFor(
  weatherState: DataState,
  spotState: DataState,
  lightPollutionState: DataState,
): DataState {
  if (
    weatherState === "SAMPLE_DATA" ||
    spotState === "SAMPLE_DATA" ||
    lightPollutionState === "SAMPLE_DATA"
  )
    return "SAMPLE_DATA";
  if (weatherState === "UNAVAILABLE" || weatherState === "EXPIRED")
    return weatherState;
  if (
    weatherState !== "FRESH" ||
    spotState !== "FRESH" ||
    lightPollutionState !== "FRESH"
  )
    return "PARTIAL";
  return "FRESH";
}

export class AstronomyService implements AstronomyApplicationPort {
  private readonly skyCatalog: SkyCatalogProvider;
  private readonly weatherCache: ComputationCache<WeatherEvidenceResult>;
  private readonly decisionCache: ComputationCache<DecisionComputation>;
  private readonly sceneCache: ComputationCache<SkyReport["skyScene"]>;
  private readonly calculationCache: ComputationCache<ReturnType<typeof calculateMiniappNightSky>[]>;
  private readonly reportCache: ComputationCache<ApiEnvelope<SkyReport>>;
  private generation = 0;

  constructor(
    readonly weather: WeatherPort,
    private readonly repository: MiniappRepositoryPort,
    private readonly config: MiniappRuntimeConfig,
    skyCatalog: SkyCatalogProvider = createBsc5pSkyCatalogProvider(),
    private readonly now: () => number = Date.now,
    private readonly eventCatalog?: AstronomicalEventCatalogOwner,
  ) {
    this.skyCatalog = skyCatalog;
    this.weatherCache = new ComputationCache(ASTRONOMY_CACHE_POLICY.weatherEntries, now);
    this.decisionCache = new ComputationCache(ASTRONOMY_CACHE_POLICY.decisionEntries, now);
    this.sceneCache = new ComputationCache(ASTRONOMY_CACHE_POLICY.sceneEntries, now);
    this.calculationCache = new ComputationCache(ASTRONOMY_CACHE_POLICY.calculationEntries, now);
    this.reportCache = new ComputationCache(ASTRONOMY_CACHE_POLICY.reportEntries, now);
  }

  clearCaches() {
    this.generation++;
    this.weatherCache.clear();
    this.decisionCache.clear();
    this.sceneCache.clear();
    this.calculationCache.clear();
    this.reportCache.clear();
  }

  /** Included in the BFF cache identity so a catalog replacement cannot
   * serve a report projected from a previous catalog or time-axis contract. */
  catalogCacheKey(): string {
    return `${SKY_REPORT_TIME_AXIS_CACHE_VERSION}:${this.skyCatalog.cacheKey()}:${deepSkySceneCacheKey()}`;
  }

  private async prepare(context: ObservationContext, suppliedDetail?: SpotDetail, signal?: AbortSignal, weatherDeadlineAt?: number) {
    const generation = this.generation;
    signal?.throwIfAborted();
    if (context.location.kind !== "FORMAL_SPOT")
      throw new Error("formal_spot_context_required");
    // The detail read enforces the same current publication/assessment gate
    // as getSpot. Do not cache repository authorization or private origins.
    const detail = suppliedDetail ?? await this.repository.getDetail(context.location.spotId);
    const spot = detail?.spot;
    if (!spot || !detail || spot.spotId !== context.location.spotId ||
      !["PUBLISHED", "TEMPORARILY_CLOSED"].includes(spot.status))
      throw new Error("formal_spot_not_found");
    signal?.throwIfAborted();
    const weatherKey = digest({ provider: this.weather.key, point: spot.wgs84,
      localDate: context.localDate, timezone: spot.timezone });
    const readWeather = () => this.weatherCache.get(weatherKey,
      () => withDeadline((sharedSignal) => this.weather.getHourly({
        point: spot.wgs84, localDate: context.localDate, timezone: spot.timezone, signal: sharedSignal,
      }), WEATHER_DEADLINES.overallMs).catch((error: unknown) => unavailableWeatherResult(
        this.weather.key, error instanceof Error && error.message === "weather_deadline_exceeded"
          ? "weather_deadline_exceeded" : "weather_provider_failed")),
      (value) => weatherExpiry(value, this.now()));
    const remainingMs = weatherDeadlineAt === undefined ? WEATHER_DEADLINES.overallMs : weatherDeadlineAt - this.now();
    const weather = remainingMs <= 0
      ? unavailableWeatherResult(this.weather.key, "weather_deadline_exceeded")
      : await withDeadline((waiterSignal) => waitForCaller(readWeather(), waiterSignal), remainingMs, signal)
        .catch((error: unknown) => {
          signal?.throwIfAborted();
          return unavailableWeatherResult(this.weather.key,
            error instanceof Error && error.message === "weather_deadline_exceeded"
              ? "weather_deadline_exceeded" : "weather_provider_failed");
        });
    if (generation !== this.generation) throw new Error("astronomy_computation_invalidated");
    const effectiveInputs = {
      spot, accessAndSafety: detail.accessAndSafety, evidence: detail.evidence,
      route: detail.route, localDate: context.localDate,
      nightStartUtc: context.nightStartUtc, nightEndUtc: context.nightEndUtc,
      selectedAtUtc: context.selectedAtUtc, targetProfile: context.targetProfile,
      eventInstanceId: context.eventInstanceId, weather,
      algorithm: this.config.astronomyAlgorithmVersion,
      opportunity: this.config.opportunityRuleVersion,
      trip: this.config.tripDecisionRuleVersion,
      events: this.eventCatalog?.snapshot().catalogVersion ?? this.config.eventCatalogVersion, catalog: this.catalogCacheKey(),
      verificationExpired: this.now() - Date.parse(spot.lastVerifiedAt ?? "") > 30 * 86_400_000,
    };
    const key = digest(effectiveInputs);
    // Acquisition timestamps affect expiry/cache eligibility, but do not change
    // the revision of otherwise identical evidence and calculated positions.
    const semanticKey = digest({ ...effectiveInputs, weather: { ...weather,
      source: { ...weather.source, retrievedAt: null },
      sources: weather.sources.map((source) => ({ ...source, retrievedAt: null })),
      modelRuns: weather.modelRuns.map((run) => ({ ...run, fetchedAt: null })),
    } });
    // Cached work retains only public formal-spot facts and effective domain
    // inputs. A user's context UUID, origin and privacy class are never retained.
    const publicContext: ObservationContext = {
      ...context, contextId: "context:public-computation" as ObservationContext["contextId"],
      contextFingerprint: semanticKey, revision: 1, routeOrigin: null, privacyClass: "PUBLIC_REFERENCE",
    };
    const computation = await this.decisionCache.get(key,
      () => this.computeDecisionData(publicContext, detail, weather),
      () => Math.min(this.now() + ASTRONOMY_CACHE_POLICY.computationTtlMs,
        weatherExpiry(weather, this.now())));
    if (generation !== this.generation) throw new Error("astronomy_computation_invalidated");
    return { computation, spot, key, generation, expiresAt: weatherExpiry(weather, this.now()) };
  }

  private bindContext<T extends AstronomyDecisionReport>(data: T, context: ObservationContext): T {
    return { ...data, context: { ...data.context, contextId: context.contextId,
      contextFingerprint: context.contextFingerprint, contextRevision: context.revision } };
  }

  async computeDecision(context: ObservationContext, detail?: SpotDetail, signal?: AbortSignal, weatherDeadlineAt?: number): Promise<ApiEnvelope<AstronomyDecisionReport>> {
    const { computation } = await this.prepare(context, detail, signal, weatherDeadlineAt);
    const { report } = computation;
    return envelope(this.bindContext(structuredClone(report.data), context), report.dataState, structuredClone(report.sources), structuredClone(report.warnings));
  }

  async compute(context: ObservationContext, signal?: AbortSignal): Promise<ApiEnvelope<SkyReport>> {
    const { computation, spot, key, generation, expiresAt } = await this.prepare(context, undefined, signal);
    signal?.throwIfAborted();
    const representationKey = digest({ key, contextId: context.contextId,
      contextFingerprint: context.contextFingerprint, revision: context.revision });
    const result = await waitForCaller(this.reportCache.get(representationKey,
      () => {
        if (generation !== this.generation) throw new Error("astronomy_computation_invalidated");
        return this.projectReport(computation, spot, context);
      },
      (report) => report.data.skyScene.state === "AVAILABLE" ? expiresAt : this.now()), signal);
    return structuredClone(result);
  }

  /** Compute a private owner-authorized proposal at its submitted coordinate.
   * The projected detail is calculation input only and never enters the formal
   * spot repository or publication cache. The returned identity remains the
   * proposal id supplied by the caller. */
  async computeCandidate(context: ObservationContext, detail: SpotDetail, proposalId: string, signal?: AbortSignal): Promise<ApiEnvelope<SkyReport>> {
    const calculationContext: ObservationContext = {
      ...context,
      location: {
        kind: "FORMAL_SPOT",
        spotId: proposalId as SpotDetail["spot"]["spotId"],
        locationVersion: 1,
      },
    };
    const { computation, spot, key, generation, expiresAt } = await this.prepare(calculationContext, detail, signal);
    signal?.throwIfAborted();
    const representationKey = digest({ key, proposalId, contextId: context.contextId,
      contextFingerprint: context.contextFingerprint, revision: context.revision });
    const result = await waitForCaller(this.reportCache.get(representationKey,
      () => {
        if (generation !== this.generation) throw new Error("astronomy_computation_invalidated");
        return this.projectReport(computation, spot, calculationContext);
      },
      (report) => report.data.skyScene.state === "AVAILABLE" ? expiresAt : this.now()), signal);
    return structuredClone({
      ...result,
      data: {
        ...result.data,
        context: {
          ...result.data.context,
          contextId: context.contextId,
          contextFingerprint: context.contextFingerprint,
          contextRevision: context.revision,
          spotId: proposalId as SpotDetail["spot"]["spotId"],
        },
      },
      warnings: [
        ...result.warnings,
        "该结果只按账号可见的审核中提案坐标计算；场地事实尚未审核，不构成正式点发布或出行建议。",
      ],
    });
  }

  private async projectReport(computation: DecisionComputation, spot: SpotSummary,
    context: ObservationContext): Promise<ApiEnvelope<SkyReport>> {
    const { report } = computation;
    const hourlyAt = report.data.hourly.map((row) => row.at);
    const sceneKey = digest({ spot: { wgs84: spot.wgs84, altitudeM: spot.altitudeM }, hourlyAt, catalog: this.catalogCacheKey() });
    const skyScene = await this.sceneCache.get(sceneKey, async () => buildSkyScene({
      provider: this.skyCatalog, hourlyAt, spot,
    }), (scene) => scene.state === "AVAILABLE" ? this.now() + ASTRONOMY_CACHE_POLICY.computationTtlMs : this.now());
    if (!computation.targetFrames) {
      const frames = hourlyAt.map((at) => ({ at, targets: computation.targetsAt(at) }));
      assertSkyTargetFrames(frames, hourlyAt);
      computation.targetFrames = frames;
    }
    const targetFrames = structuredClone(computation.targetFrames);
    const sources = structuredClone([
      ...report.sources,
      ...(skyScene.catalog?.sources ?? []),
      ...(skyScene.deepSky?.catalog?.sources ?? []),
    ]);
    const data: SkyReport = this.bindContext({ ...structuredClone(report.data),
      context: { ...report.data.context, catalogVersion: skyScene.catalog?.catalogVersion ?? "UNAVAILABLE",
        dataRevision: digest({ evidence: report.data.context.dataRevision, sceneState: skyScene.state,
          catalog: skyScene.catalog ? { version: skyScene.catalog.catalogVersion, hash: skyScene.catalog.catalogHash } : null,
          deepSkyCatalog: skyScene.deepSky?.catalog ? {
            version: skyScene.deepSky.catalog.catalogVersion,
            hash: skyScene.deepSky.catalog.catalogHash,
          } : null }).slice(0, 24) },
      targetFrames, skyScene: structuredClone(skyScene), sources,
      precachedHours: skyScene.state === "AVAILABLE" ? Math.min(8, Math.ceil(hourlyAt.length / 2)) : 0,
      offlineReady: hourlyAt.length > 0 && skyScene.state === "AVAILABLE",
    }, context);
    return envelope(data, report.dataState === "FRESH" && skyScene.state === "UNAVAILABLE" ? "PARTIAL" : report.dataState,
      sources, [...report.warnings, ...(skyScene.state === "UNAVAILABLE" ? [
        "真实星场目录或场景当前不可用；不会使用图片、随机星点、代表性坐标或采样装饰替代。",
      ] : [])]);
  }

  private async computeDecisionData(context: ObservationContext, detail: SpotDetail,
    weather: WeatherEvidenceResult): Promise<DecisionComputation> {
    const spot = detail.spot;
    const requests = ["jupiter", "venus", "milky-way-core"] as const;
    const frameTimes = observationFrameTimes(context);
    const calculations = await this.calculationCache.get(digest({
      point: spot.wgs84, altitudeM: spot.altitudeM, timezone: spot.timezone,
      localDate: context.localDate, selectedAtUtc: context.selectedAtUtc,
      algorithm: this.config.astronomyAlgorithmVersion,
    }), async () => requests.map((target) =>
      calculateMiniappNightSky({
        latitude: spot.wgs84.latitude,
        longitude: spot.wgs84.longitude,
        elevationM: spot.altitudeM ?? 0,
        timezone: spot.timezone,
        nightDate: context.localDate,
        target,
        cadenceMinutes: 30,
        additionalTimes: frameTimes,
      }),
    ), () => this.now() + ASTRONOMY_CACHE_POLICY.computationTtlMs);
    const selectedCatalogOccurrence = context.eventInstanceId && this.eventCatalog
      ? this.eventCatalog.find(context.eventInstanceId)
      : null;
    const selectedEvent = context.eventInstanceId
      ? this.eventCatalog
        ? selectedCatalogOccurrence?.kind === "METEOR_SHOWER" ? selectedCatalogOccurrence : null
        : meteorEventByOccurrenceId(context.eventInstanceId)
      : null;
    if (context.eventInstanceId && !selectedEvent)
      throw new Error("observation_event_not_found");
    const activeEvents = this.eventCatalog
      ? this.eventCatalog.active(context.localDate)
          .filter((event): event is import("@starward/miniapp-contracts").MeteorShowerOccurrence => event.kind === "METEOR_SHOWER")
      : activeMeteorEvents(context.localDate);
    if (
      selectedEvent &&
      !activeEvents.some(
        (event) => event.occurrenceId === selectedEvent.occurrenceId,
      )
    )
      throw new Error("observation_event_not_active");
    const dynamicSourceEvent = this.eventCatalog
      ? (selectedCatalogOccurrence?.kind === "METEOR_SHOWER"
          ? selectedCatalogOccurrence
          : this.eventCatalog.active(context.localDate).find(event => event.kind === "METEOR_SHOWER"))
      : null;
    const eventCatalogSource = dynamicSourceEvent
      ? this.eventCatalog!.sourceFor(dynamicSourceEvent)
      : meteorCatalogSource(context.localDate);
    const astronomySource = calculationSource(context, this.config);
    const weatherRows = weather.value ?? [];
    const base = calculations[0]!;
    type HourlyBaseRow = Omit<
      HourlySkyRow,
      | "opportunityScore"
      | "opportunityConfidence"
      | "opportunityEligible"
      | "opportunityBlockers"
      | "opportunityInput"
    >;
    const hourlyBase: HourlyBaseRow[] = base.samples
      .filter(
        (sample) =>
          frameTimes.includes(sample.at),
      )
      .map((sample) => {
        const matchingWeather = weatherHourAt(weatherRows, sample.at);
        return {
          at: sample.at,
          weatherAt: matchingWeather?.at ?? null,
          cloudPercent: matchingWeather?.cloudPercent ?? null,
          precipitationMm: matchingWeather?.precipitationMm ?? null,
          precipitationProbabilityPercent:
            matchingWeather?.precipitationProbabilityPercent ?? null,
          windKph: matchingWeather?.windKph ?? null,
          windGustKph: matchingWeather?.windGustKph ?? null,
          windDirectionDeg: matchingWeather?.windDirectionDeg ?? null,
          temperatureC: matchingWeather?.temperatureC ?? null,
          relativeHumidityPercent:
            matchingWeather?.relativeHumidityPercent ?? null,
          dewPointC: matchingWeather?.dewPointC ?? null,
          visibilityKm: matchingWeather?.visibilityKm ?? null,
          moonAltitudeDeg: sample.moonAltitudeDeg,
          moonIllumination: sample.moonIllumination,
          moonPhase: sample.moonPhase,
          moonPhaseAngleDeg: sample.moonPhaseAngleDeg,
          darkness:
            sample.sunAltitudeDeg <= -18
              ? "ASTRONOMICAL_NIGHT"
              : sample.sunAltitudeDeg < 0
                ? "TWILIGHT"
                : "DAY",
          state: matchingWeather ? weather.state : "UNAVAILABLE",
        };
      });
    const selectedAt = new Date(context.selectedAtUtc);
    if (!Number.isFinite(selectedAt.getTime()))
      throw new Error("observation_selected_at_invalid");
    const selectedAtIso = selectedAt.toISOString();
    const nightStart = Date.parse(context.nightStartUtc);
    const nightEnd = Date.parse(context.nightEndUtc);
    const nightSamplesFor = (
      calculation: (typeof calculations)[number],
    ) => {
      const dusk = Date.parse(calculation.astronomicalDusk ?? "");
      const dawn = Date.parse(calculation.astronomicalDawn ?? "");
      return calculation.samples.filter((sample) => {
        const at = Date.parse(sample.at);
        return (
          Number.isFinite(at) &&
          at >= nightStart &&
          at < nightEnd &&
          Number.isFinite(dusk) &&
          Number.isFinite(dawn) &&
          at >= dusk &&
          at <= dawn
        );
      });
    };
    const exactSample = (
      calculation: (typeof calculations)[number],
      at: string,
    ) => {
      const instant = new Date(at);
      if (!Number.isFinite(instant.getTime()))
        throw new Error("sky_target_time_invalid");
      const iso = instant.toISOString();
      return calculation.samples.find((sample) => sample.at === iso) ?? null;
    };
    const everydayDescriptors = calculations.flatMap((calculation) => {
      const samples = nightSamplesFor(calculation);
      const best = samples.reduce<(typeof samples)[number] | null>(
        (current, sample) =>
          current === null || sample.targetAltitudeDeg > current.targetAltitudeDeg
            ? sample
            : current,
        null,
      );
      if (!best || best.targetAltitudeDeg <= 0) return [];
      const visible = samples.filter((sample) => sample.targetAltitudeDeg > 0);
      const names: Partial<Record<typeof calculation.target, string>> = {
        jupiter: "木星",
        venus: "金星",
        "milky-way-core": "银河核心方向",
      };
      const types: Partial<
        Record<typeof calculation.target, SkyTarget["type"]>
      > = {
        jupiter: "PLANET",
        venus: "PLANET",
        "milky-way-core": "MILKY_WAY",
      };
      const name = names[calculation.target];
      const type = types[calculation.target];
      if (!name || !type) return [];
      return [
        {
          calculation,
          targetId: `target:${calculation.target}`,
          displayName: name,
          type,
          window: {
            start: localTime(visible[0]!.at, spot.timezone),
            end: localTime(visible.at(-1)!.at, spot.timezone),
          },
          bestAltitudeDeg: best.targetAltitudeDeg,
        },
      ];
    });
    const buildEverydayTarget = (
      descriptor: (typeof everydayDescriptors)[number],
      at: string,
    ): SkyTarget => {
      const sample = exactSample(descriptor.calculation, at);
      if (!sample) throw new Error("sky_target_time_unavailable");
      return {
        targetId: descriptor.targetId,
        displayName: descriptor.displayName,
        type: descriptor.type,
        window: descriptor.window,
        direction: `${Math.round(sample.targetAzimuthDeg)}°`,
        altitudeDeg: Math.round(sample.targetAltitudeDeg),
        reason:
          `当前时刻 ${localTime(sample.at, spot.timezone)} 的方向由地点和时间计算；` +
          `本夜几何高度最高约 ${Math.round(descriptor.bestAltitudeDeg)}°。` +
          "仍需结合云、月光、局部遮挡和光害。",
        source: astronomySource,
        confidence: 0.85,
      };
    };
    const eventDescriptors = (
      selectedEvent
        ? [selectedEvent]
        : activeEvents
            .sort(
              (left, right) => Math.abs(Date.parse(left.peakDate) - Date.parse(context.localDate)) - Math.abs(Date.parse(right.peakDate) - Date.parse(context.localDate)) || left.occurrenceId.localeCompare(right.occurrenceId),
            )
            .slice(0, 3)
    ).flatMap((event) => {
      const samples = nightSamplesFor(base).flatMap((sample) => {
        const direction = calculateMeteorRadiantAt(event, sample.at);
        return direction ? [calculateEquatorialHorizontalAt({
          latitude: spot.wgs84.latitude,
          longitude: spot.wgs84.longitude,
          elevationM: spot.altitudeM ?? 0,
          at: sample.at,
          ...direction,
        })] : [];
      });
      const visible = samples.filter((sample) => sample.altitudeDeg > 0);
      const best = visible.reduce<(typeof visible)[number] | null>((highest, sample) =>
        !highest || sample.altitudeDeg > highest.altitudeDeg ? sample : highest, null);
      return [
        {
          event,
          targetId: event.occurrenceId,
          displayName: event.displayName,
          window: visible.length ? {
            start: localTime(visible[0]!.at, spot.timezone),
            end: localTime(visible.at(-1)!.at, spot.timezone),
          } : null,
          bestAltitudeDeg: best?.altitudeDeg ?? null,
        },
      ];
    });
    const buildEventTarget = (
      descriptor: (typeof eventDescriptors)[number],
      at: string,
    ): SkyTarget => {
      const instant = new Date(at);
      if (!Number.isFinite(instant.getTime()))
        throw new Error("sky_target_time_invalid");
      const direction = calculateMeteorRadiantAt(descriptor.event, instant.toISOString());
      const source = this.eventCatalog?.sourceFor(descriptor.event) ?? eventCatalogSource;
      if (!direction) return {
        targetId: descriptor.targetId, displayName: descriptor.displayName, type: "METEOR_SHOWER",
        window: descriptor.window, direction: "暂无数据", altitudeDeg: null,
        reason: "当前时刻的历史辐射方向暂无数据；常年事件参考仍可查看。", source, confidence: null, activity: null,
      };
      const current = calculateEquatorialHorizontalAt({
        latitude: spot.wgs84.latitude,
        longitude: spot.wgs84.longitude,
        elevationM: spot.altitudeM ?? 0,
        at: instant.toISOString(),
        ...direction,
      });
      const activity = meteorActivityAt(
        descriptor.event.occurrenceId,
        calculateSolarLongitudeJ2000(current.at),
        context.localDate,
      );
      return {
        targetId: descriptor.targetId,
        displayName: descriptor.displayName,
        type: "METEOR_SHOWER",
        window: descriptor.window,
        direction: `${Math.round(current.azimuthDeg)}°`,
        altitudeDeg: Math.round(current.altitudeDeg),
        reason:
          `当前时刻 ${localTime(current.at, spot.timezone)} 的辐射点方向由地点和时间计算；` +
          (descriptor.bestAltitudeDeg === null ? "本夜暂无可用几何观测窗口。" : `已计算时段最高约 ${Math.round(descriptor.bestAltitudeDeg)}°。`) +
          (descriptor.event.annualReference ? `常年参考日为 ${descriptor.event.peakDate.slice(5)}（UTC），不是当年极大预报。` : `年度参考峰值日期为 ${descriptor.event.peakDate.slice(5)}。`) +
          (descriptor.event.nominalPeakZhr === null ? "流量参考暂无数据。" : `参考 ZHR ${descriptor.event.nominalPeakZhr} 不代表预计可见数量。`) +
          (activity
            ? `当前历史拟合相对活动为 ${Math.round(activity.relativeActivity * 100)}%，类型为历史拟合而非实时观测。`
            : "当前事件没有已审阅的活动曲线，不能推算相对峰值活动。"),
        source,
        confidence: descriptor.event.annualReference ? source.confidence : activity ? 0.8 : 0.7,
        activity,
      };
    };
    const buildTargetsAt = (at: string): SkyTarget[] => [
      ...eventDescriptors.map((descriptor) => buildEventTarget(descriptor, at)),
      ...everydayDescriptors.map((descriptor) =>
        buildEverydayTarget(descriptor, at),
      ),
    ];
    const eventTargets = eventDescriptors.map((descriptor) =>
      buildEventTarget(descriptor, selectedAtIso),
    );
    const everydayTargets = everydayDescriptors.map((descriptor) =>
      buildEverydayTarget(descriptor, selectedAtIso),
    );
    const targets = [...eventTargets, ...everydayTargets];
    const catalogCacheKey = this.catalogCacheKey();
    const sourceRevision = `${astronomySource.id}:${weather.source.id}:${spot.source.id}:${spot.lightPollution.source.id}:${spot.lightPollution.datasetVersion}:catalog:${catalogCacheKey}`;
    const scoringEvent =
      selectedEvent ??
      (context.targetProfile === "METEOR"
        ? eventDescriptors[0]?.event ?? null
        : null);
    const calculationSamples = new Map(
      calculations.map((calculation) => [
        calculation.target,
        new Map(calculation.samples.map((sample) => [sample.at, sample])),
      ]),
    );
    const baseSamples = new Map(base.samples.map((sample) => [sample.at, sample]));
    const opportunitySlices: OpportunitySliceInput[] = hourlyBase.map((row) => {
      const skySample = baseSamples.get(row.at)!;
      const matchingWeather = weatherHourAt(weatherRows, row.at);
      const profileTargets =
        context.targetProfile === "MILKY_WAY"
          ? (["milky-way-core"] as const)
          : context.targetProfile === "PLANET"
            ? (["jupiter", "venus"] as const)
            : (["jupiter", "venus", "milky-way-core"] as const);
      let eventActivity: number | null = null;
      let targetVisibility = Math.max(
        ...profileTargets.map((target) =>
          clamp01(
            (calculationSamples.get(target)?.get(row.at)?.targetAltitudeDeg ??
              -90) / 60,
          ),
        ),
      );
      let targetEvidenceConfidence = 0.95;
      let missingMeteorDirection = context.targetProfile === "METEOR" && !scoringEvent;
      if (scoringEvent) {
        const direction = calculateMeteorRadiantAt(scoringEvent, row.at);
        const radiant = direction ? calculateEquatorialHorizontalAt({
          latitude: spot.wgs84.latitude,
          longitude: spot.wgs84.longitude,
          elevationM: spot.altitudeM ?? 0,
          at: row.at,
          ...direction,
        }) : null;
        const activity = meteorActivityAt(
          scoringEvent.occurrenceId,
          calculateSolarLongitudeJ2000(row.at),
          context.localDate,
        );
        missingMeteorDirection = radiant === null;
        targetVisibility = radiant ? clamp01(radiant.altitudeDeg / 60) : 0;
        eventActivity = activity?.relativeActivity ?? null;
        targetEvidenceConfidence = activity ? 0.85 : 0.65;
      }
      const hardBlockers = [
        ...(missingMeteorDirection ? ["METEOR_DIRECTION_DATA_UNAVAILABLE"] : []),
        ...((scoringEvent || context.targetProfile === "METEOR") && eventActivity === null ? ["METEOR_ACTIVITY_DATA_UNAVAILABLE"] : []),
        ...(weather.state === "UNAVAILABLE"
          ? ["CRITICAL_WEATHER_DATA_UNAVAILABLE"]
          : weather.state === "EXPIRED"
            ? ["CRITICAL_WEATHER_DATA_EXPIRED"]
            : []),
        ...(!matchingWeather ? ["CRITICAL_WEATHER_DATA_UNAVAILABLE"] : []),
        ...(matchingWeather?.thunderstorm ? ["THUNDERSTORM"] : []),
        ...(matchingWeather?.severeRain ? ["SEVERE_RAIN"] : []),
        ...(matchingWeather?.severeWind ? ["SEVERE_WIND"] : []),
        ...(weather.alerts.some(alert => materialAlertAt(alert, row.at))
          ? ["OFFICIAL_SEVERE_WEATHER_ALERT"]
          : []),
      ];
      return {
        at: row.at,
        eventActivity,
        targetVisibility,
        darkness: clamp01(-skySample.sunAltitudeDeg / 18),
        moonPenalty:
          skySample.moonAltitudeDeg <= 0
            ? 0
            : clamp01(skySample.moonIllumination) *
              clamp01((skySample.moonAltitudeDeg + 5) / 55),
        weatherTransmission: weatherTransmission(matchingWeather),
        lightPollution:
          spot.lightPollution.productBand === null
            ? null
            : lightPollutionFactor(spot.lightPollution.productBand),
        horizonSuitability:
          spot.obstructionPercent === null
            ? null
            : 1 - clamp01(spot.obstructionPercent / 100),
        dataConfidence:
          0.95 * stateConfidence(weather.state) * targetEvidenceConfidence,
        hardBlockers: [...new Set(hardBlockers)],
      };
    });
    const opportunityFreshness = stateFor(
      weather.state,
      "FRESH",
      spot.lightPollution.state,
    );
    const skyOpportunityResult = new SkyOpportunityEngine().compute({
      localDate: context.localDate,
      sourceRevision,
      ruleVersion: this.config.opportunityRuleVersion,
      freshness: opportunityFreshness,
      slices: opportunitySlices,
      suitableFor: targets.some((target) => target.type === "MILKY_WAY")
        ? ["NAKED_EYE", "PHONE", "MILKY_WAY"]
        : targets.length
          ? ["NAKED_EYE", "PHONE"]
          : [],
    });
    const hourly: HourlySkyRow[] = hourlyBase.map((row, index) => {
      const opportunity = skyOpportunityResult.slices[index]!;
      return {
        ...row,
        opportunityScore:
          opportunity.score === null
            ? null
            : Math.round(opportunity.score * 100),
        opportunityConfidence: opportunity.confidence,
        opportunityEligible: opportunity.eligible,
        opportunityBlockers: opportunity.hardBlockers,
        opportunityInput: opportunitySlices[index]!,
      };
    });
    const selectedLunarRow =
      hourly.find((row) => row.at === selectedAtIso) ??
      hourly.reduce<HourlySkyRow | null>((closest, row) =>
        !closest ||
        Math.abs(Date.parse(row.at) - selectedAt.getTime()) <
          Math.abs(Date.parse(closest.at) - selectedAt.getTime())
          ? row
          : closest, null);
    const knownFacilities = spot.facilities.filter(
      (facility) => facility.status !== "UNKNOWN",
    );
    const accessAndSafety = detail.accessAndSafety;
    const criticalEvidenceConflict = detail.evidence.some(
      (evidence) =>
        ["ACCESS", "SAFETY"].includes(evidence.subjectType) &&
        ["CONFLICTED", "EXPIRED"].includes(evidence.state),
    );
    const verifiedAt = spot.lastVerifiedAt
      ? Date.parse(spot.lastVerifiedAt)
      : Number.NaN;
    const verificationExpired =
      !Number.isFinite(verifiedAt) ||
      this.now() - verifiedAt > 30 * 24 * 60 * 60 * 1_000;
    const spotState: DataState =
      verificationExpired
        ? "EXPIRED"
        : (spot.status === "PUBLISHED" ||
            spot.status === "TEMPORARILY_CLOSED") &&
      knownFacilities.length === spot.facilities.length &&
      accessAndSafety.openness !== "UNKNOWN" &&
      accessAndSafety.legalAccess !== "UNKNOWN" &&
      accessAndSafety.nightSafety !== "UNKNOWN" &&
      accessAndSafety.explicitDanger !== null &&
      spot.lightPollution.state !== "UNAVAILABLE"
          ? "FRESH"
          : "PARTIAL";
    const roadUnavailable =
      spot.facilities.find((facility) => facility.type === "ROAD")?.status ===
      "UNAVAILABLE";
    const roadClosureReported = accessAndSafety.restrictions.some((entry) =>
      /道路.*(?:封闭|中断)|road\s+closed/i.test(entry),
    );
    const decision = new TripDecisionEngine().compute({
      localDate: context.localDate,
      sourceRevision,
      ruleVersion: this.config.tripDecisionRuleVersion,
      skyOpportunity: skyOpportunityResult.opportunity,
      siteState: spotState,
      routeState: detail.route.state,
      warningState: weather.warningState,
      officialSevereAlert: weather.alerts.some(alert => alert.material && alert.status === "ACTIVE" &&
        Date.parse(alert.effectiveAt ?? alert.issuedAt) < Date.parse(context.nightEndUtc) &&
        (!alert.expiresAt || Date.parse(alert.expiresAt) > Date.parse(context.nightStartUtc))),
      thunderstorm: weatherRows.some((row) => row.thunderstorm),
      severeRain: weatherRows.some((row) => row.severeRain),
      severeWind: weatherRows.some((row) => row.severeWind),
      closed:
        spot.status === "TEMPORARILY_CLOSED" ||
        accessAndSafety.openness === "CLOSED",
      roadClosed: roadUnavailable && roadClosureReported,
      explicitDanger:
        accessAndSafety.nightSafety === "DANGER"
          ? true
          : accessAndSafety.explicitDanger,
      illegalAccess:
        accessAndSafety.legalAccess === "PROHIBITED"
          ? true
          : accessAndSafety.legalAccess === "UNKNOWN"
            ? null
            : false,
      criticalConflict: criticalEvidenceConflict,
    });
    const reportState = stateFor(
      weather.state,
      spotState,
      spot.lightPollution.state,
    );
    const report: AstronomyDecisionReport = {
      context: {
        contextId: context.contextId,
        contextFingerprint: context.contextFingerprint,
        contextRevision: context.revision,
        spotId: spot.spotId,
        localDate: context.localDate,
        at: selectedAtIso,
        timezone: spot.timezone,
        targetProfile:
          context.targetProfile === "MILKY_WAY"
            ? "PHOTOGRAPHER"
            : context.targetProfile === "CUSTOM"
              ? "ADVANCED"
              : "BEGINNER",
        dataRevision: digest({
          context: context.contextFingerprint,
          spot: spot.source.id,
          weather: weather.sources.map((source) => source.id),
          astronomy: astronomySource.id,
          catalog: catalogCacheKey,
          events: eventTargets.map((target) => target.targetId),
          eventCatalog: eventCatalogSource.id,
          activityProfiles: eventTargets
            .map((target) => target.activity?.profileVersion ?? null)
            .filter(Boolean),
          light: spot.lightPollution.datasetVersion,
        }).slice(0, 24),
        algorithmVersion: this.config.astronomyAlgorithmVersion,
        catalogVersion: catalogCacheKey,
        eventCatalogVersion: this.eventCatalog?.snapshot().catalogVersion ?? this.config.eventCatalogVersion,
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
      lunarFacts: {
        phase: selectedLunarRow?.moonPhase ?? null,
        phaseAngleDeg: selectedLunarRow?.moonPhaseAngleDeg ?? null,
        illumination: selectedLunarRow?.moonIllumination ?? null,
        altitudeDeg: selectedLunarRow?.moonAltitudeDeg ?? null,
        moonriseAt: base.moonRise,
        moonsetAt: base.moonSet,
        source: astronomySource,
      },
      compass: { state: "UNAVAILABLE", manualOffsetDeg: 0 },
      weatherEvidence: {
        timelineRole: weather.timelineRole,
        warningState: weather.warningState,
        ...(weather.warningSource ? { warningSource: weather.warningSource } : {}),
        alerts: weather.alerts,
        modelRuns: weather.modelRuns,
      },
      sources: [
        astronomySource,
        ...eventTargets.map(target => target.source),
        ...eventTargets.flatMap((target) =>
          target.activity ? [target.activity.source] : [],
        ),
        ...weather.sources,
        spot.source,
        spot.lightPollution.source,
      ].filter(
        (item, index, all) =>
          all.findIndex((candidate) => candidate.id === item.id) === index,
      ),
    };
    const warnings = [
      ...weather.warnings,
      ...(weather.errorCode
        ? ["天气来源当前不可用。"]
        : []),
      ...(spotState === "PARTIAL"
        ? ["点位核验字段不完整，出行结论已降低或阻断。"]
        : []),
      ...(spot.lightPollution.state === "UNAVAILABLE"
        ? ["没有已发布的真实光害数据，不能生成肯定的出行结论。"]
        : spot.lightPollution.state === "ESTIMATED"
          ? ["光害为卫星夜光产品估算，不是现场 SQM 或精确 Bortle。"]
          : []),
      ...(skyOpportunityResult.opportunity.primaryWindow
        ? []
        : ["没有找到满足回滞阈值与最短时长的连续观测窗口。"]),
    ];
    return { report: envelope(report, reportState, report.sources, warnings), targetsAt: buildTargetsAt };
  }
}
