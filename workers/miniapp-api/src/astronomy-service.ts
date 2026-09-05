import { createHash, randomUUID } from "node:crypto";
import type {
  ApiEnvelope,
  DataState,
  HourlySkyRow,
  ObservationContext,
  SkyReport,
  SpotSummary,
  SkyTarget,
  SkyTargetFrame,
  SourceSummary,
} from "@starward/miniapp-contracts";
import { assertSkyTargetFrames } from "@starward/miniapp-contracts";
import {
  calculateEquatorialHorizontalAt,
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
  createGaiaDr3SkyCatalogProvider,
  type SkyCatalogProvider,
} from "./sky-scene-catalog.ts";
import { TripDecisionEngine } from "./trip-decision-engine.ts";
import type {
  AstronomyApplicationPort,
  CanonicalWeatherHour,
  MiniappRepositoryPort,
  WeatherPort,
} from "./ports.ts";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";

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

function nearestWeather(
  rows: readonly CanonicalWeatherHour[],
  at: string,
): CanonicalWeatherHour | null {
  const target = Date.parse(at);
  const nearest = rows.reduce<CanonicalWeatherHour | null>(
    (current, row) =>
      current === null ||
      Math.abs(Date.parse(row.at) - target) < Math.abs(Date.parse(current.at) - target)
        ? row
        : current,
    null,
  );
  return nearest && Math.abs(Date.parse(nearest.at) - target) <= 35 * 60 * 1_000
    ? nearest
    : null;
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

  constructor(
    readonly weather: WeatherPort,
    private readonly repository: MiniappRepositoryPort,
    private readonly config: MiniappRuntimeConfig,
    skyCatalog: SkyCatalogProvider = createGaiaDr3SkyCatalogProvider(),
  ) {
    this.skyCatalog = skyCatalog;
  }

  /** Included in the BFF cache identity so a catalog replacement cannot
   * serve a report projected from a previous catalog or time-axis contract. */
  catalogCacheKey(): string {
    return `${SKY_REPORT_TIME_AXIS_CACHE_VERSION}:${this.skyCatalog.cacheKey()}`;
  }

  async compute(context: ObservationContext): Promise<ApiEnvelope<SkyReport>> {
    if (context.location.kind !== "FORMAL_SPOT")
      throw new Error("formal_spot_context_required");
    const spot = await this.repository.getSpot(context.location.spotId);
    const detail = await this.repository.getDetail(context.location.spotId);
    if (!spot || !detail || spot.status === "DATA_INSUFFICIENT")
      throw new Error("formal_spot_not_found");
    const requests = ["jupiter", "venus", "milky-way-core"] as const;
    const calculations = requests.map((target) =>
      calculateMiniappNightSky({
        latitude: spot.wgs84.latitude,
        longitude: spot.wgs84.longitude,
        elevationM: spot.altitudeM ?? 0,
        timezone: spot.timezone,
        nightDate: context.localDate,
        target,
        cadenceMinutes: 30,
        additionalTimes: [context.selectedAtUtc],
      }),
    );
    const selectedEvent = context.eventInstanceId
      ? meteorEventByOccurrenceId(context.eventInstanceId)
      : null;
    if (context.eventInstanceId && !selectedEvent)
      throw new Error("observation_event_not_found");
    const activeEvents = activeMeteorEvents(context.localDate);
    if (
      selectedEvent &&
      !activeEvents.some(
        (event) => event.occurrenceId === selectedEvent.occurrenceId,
      )
    )
      throw new Error("observation_event_not_active");
    const eventCatalogSource = meteorCatalogSource(context.localDate);
    const astronomySource = calculationSource(context, this.config);
    const weather = await this.weather.getHourly({
      point: spot.wgs84,
      localDate: context.localDate,
      timezone: spot.timezone,
    });
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
          Date.parse(sample.at) >= Date.parse(context.nightStartUtc) &&
          Date.parse(sample.at) < Date.parse(context.nightEndUtc),
      )
      .map((sample) => {
        const matchingWeather = nearestWeather(weatherRows, sample.at);
        return {
          at: sample.at,
          cloudPercent: matchingWeather?.cloudPercent ?? null,
          lowCloudPercent: matchingWeather?.lowCloudPercent ?? null,
          midCloudPercent: matchingWeather?.midCloudPercent ?? null,
          highCloudPercent: matchingWeather?.highCloudPercent ?? null,
          modelConsistency: matchingWeather?.modelConsistency ?? null,
          modelConsistencyLabel:
            matchingWeather?.modelConsistencyLabel ?? "UNAVAILABLE",
          modelSpreadPercent: matchingWeather?.modelSpreadPercent ?? null,
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
          darkness:
            sample.sunAltitudeDeg <= -18
              ? "ASTRONOMICAL_NIGHT"
              : sample.sunAltitudeDeg < 0
                ? "TWILIGHT"
                : "DAY",
          state: weather.state,
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
            .filter((event) => event.nominalPeakZhr >= 5)
            .sort(
              (left, right) => right.nominalPeakZhr - left.nominalPeakZhr,
            )
            .slice(0, 3)
    ).flatMap((event) => {
      const samples = nightSamplesFor(base).map((sample) =>
        calculateEquatorialHorizontalAt({
          latitude: spot.wgs84.latitude,
          longitude: spot.wgs84.longitude,
          elevationM: spot.altitudeM ?? 0,
          at: sample.at,
          rightAscensionDeg: event.radiantRightAscensionDeg,
          declinationDeg: event.radiantDeclinationDeg,
        }),
      );
      const visible = samples.filter((sample) => sample.altitudeDeg > 0);
      if (!visible.length) return [];
      const best = visible.reduce((highest, sample) =>
        sample.altitudeDeg > highest.altitudeDeg ? sample : highest,
      );
      return [
        {
          event,
          targetId: event.occurrenceId,
          displayName: event.displayName,
          window: {
            start: localTime(visible[0]!.at, spot.timezone),
            end: localTime(visible.at(-1)!.at, spot.timezone),
          },
          bestAltitudeDeg: best.altitudeDeg,
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
      const current = calculateEquatorialHorizontalAt({
        latitude: spot.wgs84.latitude,
        longitude: spot.wgs84.longitude,
        elevationM: spot.altitudeM ?? 0,
        at: instant.toISOString(),
        rightAscensionDeg: descriptor.event.radiantRightAscensionDeg,
        declinationDeg: descriptor.event.radiantDeclinationDeg,
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
          `本夜最高约 ${Math.round(descriptor.bestAltitudeDeg)}°。` +
          `IMO 参考峰值日期为 ${descriptor.event.peakDate.slice(5)}，` +
          `参考 ZHR ${descriptor.event.nominalPeakZhr} 只描述理想条件，不是预计可见数量。` +
          (activity
            ? `当前历史拟合相对活动为 ${Math.round(activity.relativeActivity * 100)}%，类型为历史拟合而非实时观测。`
            : "当前事件没有已审阅的活动曲线，不能推算相对峰值活动。"),
        source: eventCatalogSource,
        confidence: activity ? 0.8 : 0.7,
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
        ? activeEvents
            .filter((event) =>
              meteorActivityAt(
                event.occurrenceId,
                calculateSolarLongitudeJ2000(selectedAtIso),
                context.localDate,
              ),
            )
            .sort((left, right) => right.nominalPeakZhr - left.nominalPeakZhr)[0] ??
          null
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
      const matchingWeather = nearestWeather(weatherRows, row.at);
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
      if (scoringEvent) {
        const radiant = calculateEquatorialHorizontalAt({
          latitude: spot.wgs84.latitude,
          longitude: spot.wgs84.longitude,
          elevationM: spot.altitudeM ?? 0,
          at: row.at,
          rightAscensionDeg: scoringEvent.radiantRightAscensionDeg,
          declinationDeg: scoringEvent.radiantDeclinationDeg,
        });
        const activity = meteorActivityAt(
          scoringEvent.occurrenceId,
          calculateSolarLongitudeJ2000(row.at),
          context.localDate,
        );
        targetVisibility = clamp01(radiant.altitudeDeg / 60);
        eventActivity = activity?.relativeActivity ?? null;
        targetEvidenceConfidence = activity ? 0.85 : 0.65;
      }
      const hardBlockers = [
        ...(weather.state === "UNAVAILABLE"
          ? ["CRITICAL_WEATHER_DATA_UNAVAILABLE"]
          : weather.state === "EXPIRED"
            ? ["CRITICAL_WEATHER_DATA_EXPIRED"]
            : []),
        ...(!matchingWeather ? ["CRITICAL_WEATHER_DATA_UNAVAILABLE"] : []),
        ...(matchingWeather?.thunderstorm ? ["THUNDERSTORM"] : []),
        ...(matchingWeather?.severeRain ? ["SEVERE_RAIN"] : []),
        ...(matchingWeather?.severeWind ? ["SEVERE_WIND"] : []),
        ...(matchingWeather?.officialSevereAlert
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
        modelConsistency:
          matchingWeather?.modelConsistency ??
          Math.min(0.5, stateConfidence(weather.state) * 0.5),
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
    const targetFrames: SkyTargetFrame[] = hourly.map((row) => ({
      at: row.at,
      targets: buildTargetsAt(row.at),
    }));
    assertSkyTargetFrames(
      targetFrames,
      hourly.map((row) => row.at),
    );
    const skyScene = buildSkyScene({
      provider: this.skyCatalog,
      hourlyAt: hourly.map((row) => row.at),
      spot,
    });
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
      Date.now() - verifiedAt > 30 * 24 * 60 * 60 * 1_000;
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
      officialSevereAlert: weatherRows.some(
        (row) => row.officialSevereAlert,
      ),
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
    const baseReportState = stateFor(
      weather.state,
      spotState,
      spot.lightPollution.state,
    );
    const reportState =
      baseReportState === "FRESH" && skyScene.state === "UNAVAILABLE"
        ? "PARTIAL"
        : baseReportState;
    const report: SkyReport = {
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
          catalog: skyScene.catalog
            ? {
                version: skyScene.catalog.catalogVersion,
                hash: skyScene.catalog.catalogHash,
              }
            : catalogCacheKey,
          events: eventTargets.map((target) => target.targetId),
          eventCatalog: eventCatalogSource.id,
          activityProfiles: eventTargets
            .map((target) => target.activity?.profileVersion ?? null)
            .filter(Boolean),
          light: spot.lightPollution.datasetVersion,
        }).slice(0, 24),
        algorithmVersion: this.config.astronomyAlgorithmVersion,
        catalogVersion: skyScene.catalog?.catalogVersion ?? "UNAVAILABLE",
        eventCatalogVersion: this.config.eventCatalogVersion,
      },
      decision,
      targets,
      targetFrames,
      hourly,
      milkyWayDirection:
        targets.find((target) => target.type === "MILKY_WAY")?.direction ??
        "本观测夜低于几何地平线或无计算窗口",
      moonSummary:
        base.moonIlluminationAtMidpoint === null
          ? "月亮信息不足"
          : `观测夜中段月面照明约 ${Math.round(base.moonIlluminationAtMidpoint * 100)}%`,
      compass: { state: "UNAVAILABLE", manualOffsetDeg: 0 },
      precachedHours:
        skyScene.state === "AVAILABLE"
          ? Math.min(8, Math.ceil(hourly.length / 2))
          : 0,
      offlineReady: hourly.length > 0 && skyScene.state === "AVAILABLE",
      weatherEvidence: {
        timelineRole: weather.timelineRole,
        warningState: weather.warningState,
        alerts: weather.alerts,
        modelRuns: weather.modelRuns,
      },
      skyScene,
      sources: [
        astronomySource,
        ...(skyScene.catalog ? [skyScene.catalog.source] : []),
        ...(eventTargets.length ? [eventCatalogSource] : []),
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
        ? ["天气来源当前不可用；不会用示例天气替代真实预报。"]
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
      ...(skyScene.state === "UNAVAILABLE"
        ? [
            "真实星场目录或场景当前不可用；不会使用图片、随机星点、代表性坐标或采样装饰替代。",
          ]
        : []),
    ];
    return envelope(report, reportState, report.sources, warnings);
  }
}
