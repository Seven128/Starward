import {
  PLAN_NOTES_MAX_LENGTH,
  parsePlanEventOccurrenceIds,
  parsePlanReminders,
  parsePlanTravel,
  normalizeAccountNickname,
  type AccountAvatarSaveRequest,
  type AccountNicknameSaveRequest,
} from "@starward/miniapp-contracts";
import { createHash, randomUUID } from "node:crypto";
import { openPlanShare, sealPlanShare } from "./plan-share-token.ts";
import { observationFrameTimes } from "./observation-time-axis.ts";
import {
  type AccountDataExportData,
  type AccountDeletionRequest,
  EMPTY_FILTER_STATE,
  FILTER_GROUPS,
  viewportRadiusKm,
  type ApiEnvelope,
  type ContributionDraftRequest,
  type ContributionFormalSubmitRequest,
  type ContributionFormalUploadIntentRequest,
  type ContributionFormalUploadSessionRequest,
  type ContributionFormalUploadCompleteRequest,
  type ContributionId,
  type ContributionUpdateRequest,
  type ContributionUploadCompleteRequest,
  type ContributionUploadId,
  type ContributionUploadSessionRequest,
  type DataState,
  type DarkSkyCandidateRef,
  type FilterGroupKey,
  type FilterState,
  type FormalSpotPopulation,
  type ImportDraft,
  type ImportDraftId,
  type ImportStage,
  type MapLayerData,
  type MapLayerKind,
  type MapSceneData,
  type MapSceneTimeFrame,
  type MapSpotEvaluation,
  type MapSpotTimeSignal,
  type ObservationContext,
  type ObservationContextResolveRequest,
  type ObservationContextUpdateRequest,
  type ObservationPlan,
  type PlanPublicShareData,
  type SpotPublicShareData,
  type PlatformKind,
  type PreferenceRankingDisclosure,
  type ProfileLink,
  type ProfileLinkId,
  type RouteEstimateRequest,
  type SearchData,
  type SourceSummary,
  type SpotDetail,
  type SpotFilterEvidence,
  type SpotId,
  type SpotRankingPreferences,
  type SpotSummary,
  type TerrainOverlayData,
  type TerrainOverlayRequest,
  type UserId,
  type UserPreferences,
  type Wgs84Point,
  type WechatLoginRequest,
} from "@starward/miniapp-contracts";
import {
  distanceMeters,
  gcj02ToWgs84,
  wgs84ToGcj02,
} from "@starward/coordinate-system";
import { CelestialObjectInformationService } from "./celestial-object-information.ts";
import { DeepSkyImageryService } from "./deep-sky-imagery.ts";
import { AstronomyService, type AstronomyDecisionReport } from "./astronomy-service.ts";
import type { SkyCatalogProvider } from "./sky-scene-catalog.ts";
import { AuthService } from "./auth-service.ts";
import { MemoryCache, RedisCache } from "./cache.ts";
import { resolvePlanTiming } from "./plan-timing.ts";
import {
  ObservationContextService,
  zonedLocalToUtc,
} from "./observation-context-service.ts";
import type {
  CachePort,
  DarkSkyGridCellRecord,
  MediaObjectStorePort,
  MiniappRepositoryPort,
  PlaceSearchPort,
  RoutePort,
  TelemetryPort,
  WeatherPort,
} from "./ports.ts";
import { ContributionService } from "./contribution-service.ts";
import {
  createMediaObjectStore,
  DisabledMediaObjectStore,
  sanitizeAccountAvatarImage,
} from "./media-object-store.ts";
import { decodeContributionBase64 } from "./contribution-validation.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { PostgresReminderSubscriptionStore } from "./postgres-reminder-subscription-store.ts";
import { validateReminderSubscriptionChallengeId } from "./reminder-subscription-binding.ts";
import type { ReminderSubscriptionPrepareRequest, ReminderSubscriptionPrepareData,
  ReminderSubscriptionReportRequest, ReminderSubscriptionReportData } from "@starward/miniapp-contracts";
import { MemoryOutbox, MemoryTelemetry } from "./runtime.ts";
import { createVendorUsageTransport, MINIAPP_VENDOR_BUDGET_CNY } from "./vendor-usage.ts";
import { PostgresVendorUsageStore, readVendorUsageBudget } from "./postgres-vendor-usage.ts";
import { createRoutePort } from "./route-provider.ts";
import { createPlaceSearchPort } from "./place-provider.ts";
import {
  evaluateSpotFilterEvidence,
  passesActiveFilters,
  summarizeFilterCoverage,
} from "./filter-evaluation.ts";
import {
  loadRuntimeConfig,
  type MiniappRuntimeConfig,
} from "./runtime-config.ts";
import {
  AUTO_IMPORT_POLICY,
  parserGate,
  validateExternalUrl,
} from "./security.ts";
import { createWeatherPort } from "./weather-provider.ts";
import { QWeatherRecentWeatherAdapter, type RecentWeatherPort } from "./recent-weather-provider.ts";
import { QWeatherAirQualityAdapter, type AirQualityPort } from "./air-quality-provider.ts";
import { SpotEnvironmentService } from "./spot-environment-service.ts";
import { derivePlanReminderSchedules, publicReminderStatus } from "./plan-reminder-schedule.ts";
import { readFile } from "node:fs/promises";
import { terrainImageUrl, terrainPublication, terrainPublicationSource, terrainRequestIsCovered, terrainUnavailable, validateTerrainAsset } from "./terrain-publication.ts";
import { WEATHER_DEADLINES } from "./provider-deadline.ts";
import {
  AstronomicalEventCatalogOwner,
  eventCatalogSourceFor,
} from "./astronomical-event-catalog-owner.ts";
import { PostgresAstronomicalEventCatalogStore } from "./postgres-astronomical-event-catalog-store.ts";
import {
  projectEclipseAtLocation,
  projectMeteorShowerAtLocation,
} from "./astronomy-engine-adapter.ts";

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function envelope<T>(
  data: T,
  state: DataState,
  sources: readonly SourceSummary[],
  warnings: readonly string[] = [],
  binding?: { validAt?: string | null; contextRevision?: number },
): ApiEnvelope<T> {
  const generatedAt = new Date().toISOString();
  // Mandatory credit is part of the delivered representation even when the
  // measurements do not change. Retrieval timestamps are not credit content.
  const attributions = sources.flatMap((source) => source.attribution ? [{
    name: source.attribution.name,
    url: source.attribution.url,
    statements: source.attribution.statements,
  }] : []);
  return {
    apiVersion: "v2",
    data,
    dataState: state,
    generatedAt,
    validAt: binding?.validAt ?? generatedAt,
    etag: "W/\"" + hash({ data, state, ...(attributions.length ? { attributions } : {}) }).slice(0, 24) + "\"",
    sources,
    warnings,
    requestId: "request:" + randomUUID(),
    ...(binding?.contextRevision === undefined
      ? {}
      : { contextRevision: binding.contextRevision }),
  };
}

function assertIdempotencyKey(value: string) {
  if (!/^[a-zA-Z0-9:_-]{12,128}$/u.test(value))
    throw new Error("invalid_idempotency_key");
}

const ALLOWED_STAGE_TRANSITIONS: Readonly<
  Record<ImportStage, readonly ImportStage[]>
> = Object.freeze({
  SOURCE: ["EDIT_DRAFT"],
  EDIT_DRAFT: ["SOURCE", "ASSOCIATE_SPOT"],
  ASSOCIATE_SPOT: ["EDIT_DRAFT", "PREVIEW"],
  PREVIEW: ["ASSOCIATE_SPOT", "SUBMIT"],
  SUBMIT: ["PREVIEW"],
});

const FILTER_GROUP_KEYS: readonly FilterGroupKey[] = FILTER_GROUPS.map(
  ({ key }) => key,
);
const FILTER_GROUP_LABELS = Object.freeze(
  Object.fromEntries(FILTER_GROUPS.map(({ key, title }) => [key, title])),
) as Readonly<Record<FilterGroupKey, string>>;

function uniqueSources(sources: readonly SourceSummary[]) {
  return [...new Map(sources.map((source) => [source.id, source])).values()];
}

function browsingTimezoneSources(context: ObservationContext): readonly SourceSummary[] {
  return context.location.kind === "MAP_POINT" && context.timezoneSource
    ? [context.timezoneSource] : [];
}

function rankSpotsByPreferences(
  spots: readonly SpotSummary[],
  preferences?: SpotRankingPreferences,
): {
  spots: SpotSummary[];
  disclosure: PreferenceRankingDisclosure;
} {
  if (!preferences)
    return {
      spots: [...spots],
      disclosure: {
        applied: [],
        deferred: ["尚未传入选点偏好，保留正式点策展顺序"],
        requiredFacilities: [],
        summary: "当前按正式点策展顺序展示；偏好不会改写来源事实。",
        changesFacts: false,
      },
    };
  const place = preferences.defaultPlace.trim().toLowerCase();
  const scored = spots.map((spot, index) => {
    const availableFacilities = new Set(
      spot.facilities
        .filter((facility) => facility.status === "AVAILABLE")
        .map((facility) => facility.type),
    );
    const placeMatch =
      place.length > 0 &&
      (spot.name + spot.region + spot.address).toLowerCase().includes(place);
    const facilityMatches = preferences.requiredFacilities.filter((facility) =>
      availableFacilities.has(facility),
    ).length;
    const beginnerAccess =
      preferences.experience === "BEGINNER" &&
      (spot.accessTags.includes("DRIVE_TO") ||
        spot.accessTags.includes("NO_HIKE"));
    return {
      spot,
      index,
      score:
        (placeMatch ? 8 : 0) + facilityMatches * 3 + (beginnerAccess ? 1 : 0),
    };
  });
  scored.sort(
    (left, right) => right.score - left.score || left.index - right.index,
  );
  const applied = [
    ...(place ? ["默认地点“" + preferences.defaultPlace.trim() + "”"] : []),
    ...(preferences.requiredFacilities.length
      ? [
          String(preferences.requiredFacilities.length) +
            " 项必须设施的已核验可用状态",
        ]
      : []),
    ...(preferences.experience === "BEGINNER" ? ["入门者低步行负担"] : []),
  ];
  return {
    spots: scored.map((item) => item.spot),
    disclosure: {
      applied,
      deferred: [
        "驾车时长只在路线供应商给出真实结果时参与排序",
        "设备和拍摄偏好只影响目标解释，不改写点位事实",
      ],
      requiredFacilities: preferences.requiredFacilities,
      summary: applied.length
        ? "已按" + applied.join("、") + "调整浏览顺序。"
        : "按观星点默认顺序展示。",
      changesFacts: false,
    },
  };
}

function assertUserPreferences(
  value: UserPreferences,
  notificationsEnabled: boolean,
) {
  const facilities = new Set([
    "PARKING",
    "TOILET",
    "PLATFORM",
    "CHARGING",
    "CAMPING",
    "ROAD",
    "WALKING",
    "SIGNAL",
  ]);
  if (
    !value ||
    typeof value.defaultPlace !== "string" ||
    value.defaultPlace.length > 80 ||
    !["ASK_ONCE", "MANUAL_ONLY"].includes(value.locationPreference) ||
    !["BEGINNER", "ADVANCED"].includes(value.experience) ||
    !Number.isInteger(value.maxDriveMinutes) ||
    value.maxDriveMinutes < 30 ||
    value.maxDriveMinutes > 360 ||
    !Array.isArray(value.requiredFacilities) ||
    value.requiredFacilities.length > 8 ||
    new Set(value.requiredFacilities).size !== value.requiredFacilities.length ||
    value.requiredFacilities.some((facility) => !facilities.has(facility)) ||
    typeof value.equipment !== "string" ||
    value.equipment.length > 120 ||
    typeof value.capturePreference !== "string" ||
    value.capturePreference.length > 120 ||
    !["DAY", "NIGHT", "OBSERVATION"].includes(value.displayMode) ||
    typeof value.notificationEnabled !== "boolean" ||
    typeof value.departureConditionReminder !== "boolean" ||
    typeof value.contributionStatusReminder !== "boolean" ||
    typeof value.largeText !== "boolean" ||
    typeof value.reducedMotion !== "boolean"
  )
    throw new Error("user_preferences_invalid");
  if (value.notificationEnabled && !notificationsEnabled)
    throw new Error("notification_capability_disabled");
}

function windowMinutes(
  window: { durationMinutes: number } | null,
): number | null {
  return window?.durationMinutes ?? null;
}

function exactHourly(report: AstronomyDecisionReport, selectedAt: string) {
  const selected = Date.parse(selectedAt);
  return report.hourly.find(row => Date.parse(row.at) === selected) ?? null;
}

function projectionState(state: DataState): MapSpotTimeSignal["state"] {
  if (state === "FRESH") return "FRESH";
  if (state === "STALE_USABLE") return "STALE_USABLE";
  if (state === "EXPIRED" || state === "UNAVAILABLE") return "UNAVAILABLE";
  return "PARTIAL";
}

function selectedTimeOpportunityLabel(
  row: ReturnType<typeof exactHourly>,
) {
  if (!row || row.opportunityScore === null) return "当前时段数据不足";
  if (row.opportunityBlockers.length) return "当前时段有明确风险";
  if (row.opportunityEligible)
    return `当前时段可观测 · ${row.opportunityScore} 分`;
  return `当前时段未达窗口门槛 · ${row.opportunityScore} 分`;
}

function timeSignalFor(
  spotId: SpotId,
  report: AstronomyDecisionReport,
  selectedAtUtc: string,
): MapSpotTimeSignal {
  const row = exactHourly(report, selectedAtUtc);
  return {
    spotId,
    weatherAt: row?.weatherAt ?? null,
    cloudPercent: row?.cloudPercent ?? null,
    moonImpact: moonImpact(row),
    opportunityScore: row?.opportunityScore ?? null,
    opportunityConfidence: row?.opportunityConfidence ?? null,
    opportunityEligible: row?.opportunityEligible ?? false,
    opportunityLabel: selectedTimeOpportunityLabel(row),
    state: row ? projectionState(row.state) : "UNAVAILABLE",
  };
}

function moonImpact(
  row: ReturnType<typeof exactHourly>,
): MapSpotEvaluation["moonImpact"] {
  if (
    !row ||
    row.moonAltitudeDeg === null ||
    row.moonIllumination === null
  )
    return "UNKNOWN";
  if (row.moonAltitudeDeg <= 0 || row.moonIllumination < 0.25) return "LOW";
  if (row.moonAltitudeDeg >= 25 && row.moonIllumination >= 0.65) return "HIGH";
  return "MEDIUM";
}

function activeFilter(filters: FilterState, group: FilterGroupKey) {
  return filters[group].length > 0;
}

function cell(
  spot: SpotSummary,
  input: {
    id: string;
    color: string;
    value: number | null;
    label: string;
    state: MapLayerData["state"];
  },
) {
  const { latitude, longitude } = spot.gcj02;
  const delta = 0.035;
  return {
    id: input.id,
    points: [
      { latitude: latitude - delta, longitude: longitude - delta },
      { latitude: latitude - delta, longitude: longitude + delta },
      { latitude: latitude + delta, longitude: longitude + delta },
      { latitude: latitude + delta, longitude: longitude - delta },
    ],
    fillColor: input.color,
    strokeColor: input.color,
    strokeWidth: 1,
    value: input.value,
    label: input.label,
    state: input.state,
  };
}

function dynamicLayerColor(baseColor: string, value: number | null) {
  const normalized = value === null ? 0.4 : Math.max(0, Math.min(100, value)) / 100;
  const alpha = Math.round(0x6b + normalized * (0xbf - 0x6b));
  return `${baseColor}${alpha.toString(16).padStart(2, "0").toUpperCase()}`;
}

function layerFor(input: {
  kind: MapLayerKind;
  cloudLayer: ObservationContext["weatherView"]["cloudLayer"];
  selectedAtUtc: string;
  spots: readonly SpotSummary[];
  reports: Readonly<Record<string, ApiEnvelope<AstronomyDecisionReport>>>;
  evaluations: Readonly<Record<string, MapSpotEvaluation>>;
  config: MiniappRuntimeConfig;
  darkSkyCells: readonly DarkSkyGridCellRecord[];
}): MapLayerData {
  if (input.kind === "NORMAL")
    return {
      kind: "NORMAL",
      cloudLayer: null,
      polygons: [],
      legend: [],
      validAt: input.selectedAtUtc,
      datasetVersion: "base-map-provider",
      precision: "普通地图底图；不表达天空条件",
      state: "FRESH",
      source: null,
    };
  if (input.kind === "LIGHT_POLLUTION") {
    if (input.darkSkyCells.length) {
      const colors: Record<DarkSkyGridCellRecord["productBand"], string> = {
        VERY_LOW: "#87714A66",
        LOW: "#A1845266",
        MODERATE: "#BE9B6166",
        HIGH: "#D1B57766",
        VERY_HIGH: "#E0C99866",
      };
      const source = input.darkSkyCells[0]!.source;
      return {
        kind: input.kind,
        cloudLayer: null,
        polygons: input.darkSkyCells.map((gridCell) => {
          const { west, south, east, north } = gridCell.boundsWgs84;
          const points = [
            { lat: south, lon: west },
            { lat: south, lon: east },
            { lat: north, lon: east },
            { lat: north, lon: west },
          ].map((point) => {
            const converted = wgs84ToGcj02({ ...point, system: "WGS84" });
            return { latitude: converted.lat, longitude: converted.lon };
          });
          return {
            id: `light:${gridCell.cellId}`,
            points,
            fillColor: colors[gridCell.productBand],
            strokeColor: colors[gridCell.productBand],
            strokeWidth: 1,
            value: gridCell.radiance.median,
            label: gridCell.label,
            state: "PARTIAL" as const,
          };
        }),
        legend: [
          { label: "相对较低", color: "#87714A", range: "试点区夜光低值" },
          { label: "相对中等", color: "#BE9B61", range: "试点区夜光中值" },
          { label: "相对较高", color: "#E0C998", range: "试点区夜光高值" },
        ],
        validAt: source.validFrom,
        datasetVersion: input.darkSkyCells[0]!.datasetVersion,
        precision:
          "已发布 EOG 年度夜光粗网格；等级只在同一试点区和同一数据集内相对比较，不是 Bortle、SQM 或现场实测",
        state: "PARTIAL",
        source,
      };
    }
    return {
      kind: input.kind,
      cloudLayer: null,
      polygons: [],
      legend: [],
      validAt: null,
      datasetVersion: input.config.darkSkyDatasetVersion,
      precision: "当前视野没有可用的已发布卫星夜光网格",
      state: "UNAVAILABLE",
      source: null,
    };
  }
  const reportEntries = input.spots
    .map((spot) => ({
      spot,
      report: input.reports[spot.spotId],
      evaluation: input.evaluations[spot.spotId],
    }))
    .filter(
      (
        entry,
      ): entry is {
        spot: SpotSummary;
        report: ApiEnvelope<AstronomyDecisionReport>;
        evaluation: MapSpotEvaluation;
      } => Boolean(entry.report && entry.evaluation),
    );
  if (input.kind === "CLOUD") {
    const cloudValue = (report: AstronomyDecisionReport) => {
      const row = exactHourly(report, input.selectedAtUtc);
      if (!row) return null;
      return row.cloudPercent;
    };
    const available = reportEntries
      .map((entry) => ({ ...entry, value: cloudValue(entry.report.data) }))
      .filter(
        (entry): entry is typeof entry & { value: number } =>
          entry.value !== null,
      );
    const source =
      available
        .flatMap((entry) => entry.report.sources)
        .find((item) => item.kind === "THIRD_PARTY_FORECAST") ?? null;
    return {
      kind: input.kind,
      cloudLayer: input.cloudLayer,
      polygons: available.map((entry) =>
        cell(entry.spot, {
          id: "cloud:" + entry.spot.spotId,
          color:
            entry.value <= 30
              ? dynamicLayerColor("#4E8E9B", entry.value)
              : entry.value <= 65
                ? dynamicLayerColor("#76AAB2", entry.value)
                : dynamicLayerColor("#A9C9CE", entry.value),
          value: entry.value,
          label:
            input.cloudLayer + " 云量 " + String(Math.round(entry.value)) + "%",
          state: entry.report.dataState === "FRESH" ? "FRESH" : "PARTIAL",
        }),
      ),
      legend: [
        { label: "少云", color: "#4E8E9B", range: "0–30%" },
        { label: "中等", color: "#76AAB2", range: "31–65%" },
        { label: "多云", color: "#A9C9CE", range: "66–100%" },
      ],
      validAt: input.selectedAtUtc,
      datasetVersion: source?.id ?? "weather-unavailable",
      precision:
        "按正式点真实预报样本绘制有界单元；未接入连续气象栅格时不插值填空",
      state: available.length
        ? available.length === reportEntries.length
          ? "FRESH"
          : "PARTIAL"
        : "UNAVAILABLE",
      source,
    };
  }
  const source =
    reportEntries
      .flatMap((entry) => entry.report.sources)
      .find((item) => item.kind === "PRODUCT_CALCULATION") ?? null;
  const projected = reportEntries.map((entry) => ({
    ...entry,
    row: exactHourly(entry.report.data, input.selectedAtUtc),
  }));
  const available = projected.filter(
    (entry) => entry.row?.opportunityScore !== null && entry.row !== null,
  );
  return {
    kind: "OPPORTUNITY",
    cloudLayer: null,
    polygons: projected.map((entry) => {
      const value = entry.row?.opportunityScore ?? null;
      const color =
        value === null || entry.row === null
          ? dynamicLayerColor("#77717F", null)
          : entry.row.opportunityBlockers.length
            ? dynamicLayerColor("#77717F", value)
            : entry.row.opportunityEligible && value >= 80
              ? dynamicLayerColor("#7760A8", value)
              : entry.row.opportunityEligible
                ? dynamicLayerColor("#9480BA", value)
                : value >= 45
                  ? dynamicLayerColor("#B0A3C8", value)
                  : dynamicLayerColor("#8B819B", value);
      return cell(entry.spot, {
        id: "opportunity:" + entry.spot.spotId,
        color,
        value,
        label: selectedTimeOpportunityLabel(entry.row),
        state: entry.row ? projectionState(entry.row.state) : "UNAVAILABLE",
      });
    }),
    legend: [
      {
        label: "当前可观测",
        color: "#7760A8",
        range: "逐时机会达到窗口门槛",
      },
      {
        label: "边缘机会",
        color: "#B0A3C8",
        range: "有分数但未达到窗口门槛",
      },
      { label: "条件偏弱", color: "#8B819B", range: "逐时机会分数较低" },
      {
        label: "风险或不足",
        color: "#77717F",
        range: "明确风险或无法判断",
      },
    ],
    validAt: input.selectedAtUtc,
    datasetVersion: input.config.opportunityRuleVersion,
    precision: "正式点逐点计算，不对点间区域作无证据插值",
    state: available.length
      ? projected.some((entry) => entry.row?.state !== "FRESH")
        ? "PARTIAL"
        : "FRESH"
      : "UNAVAILABLE",
    source,
  };
}

export class MiniappService {
  readonly repository: MiniappRepositoryPort;
  readonly astronomy: AstronomyService;
  readonly celestialObjects: CelestialObjectInformationService;
  readonly deepSkyImages: DeepSkyImageryService;
  readonly telemetry: TelemetryPort;
  readonly cache: CachePort;
  readonly config: MiniappRuntimeConfig;
  readonly auth: AuthService;
  readonly observationContexts: ObservationContextService;
  readonly contributions: ContributionService;
  readonly eventCatalog: AstronomicalEventCatalogOwner;
  readonly route: RoutePort;
  readonly placeSearch: PlaceSearchPort;
  readonly spotEnvironment: SpotEnvironmentService;
  readonly outbox = new MemoryOutbox();
  private readonly usageStore: PostgresVendorUsageStore | undefined;
  private readonly reminderSubscriptions: PostgresReminderSubscriptionStore | null;

  constructor(input: {
    repository: MiniappRepositoryPort;
    config: MiniappRuntimeConfig;
    weather: WeatherPort;
    recentWeather?: RecentWeatherPort;
    airQuality?: AirQualityPort;
    route: RoutePort;
    placeSearch?: PlaceSearchPort;
    telemetry?: TelemetryPort;
    cache?: CachePort;
    mediaStore?: MediaObjectStorePort;
    skyCatalog?: SkyCatalogProvider;
    eventCatalog?: AstronomicalEventCatalogOwner;
    deepSkyImages?: DeepSkyImageryService;
    usageStore?: PostgresVendorUsageStore;
  }) {
    this.repository = input.repository;
    this.config = input.config;
    this.reminderSubscriptions = input.repository instanceof PostgresMiniappRepository
      ? new PostgresReminderSubscriptionStore(input.repository.pool) : null;
    this.spotEnvironment = new SpotEnvironmentService(input.repository,
      input.recentWeather ?? new QWeatherRecentWeatherAdapter(input.config),
      input.airQuality ?? new QWeatherAirQualityAdapter(input.config));
    this.deepSkyImages = input.deepSkyImages ?? new DeepSkyImageryService();
    this.celestialObjects = new CelestialObjectInformationService(this.deepSkyImages);
    this.usageStore = input.usageStore;
    this.route = input.route;
    this.placeSearch = input.placeSearch ?? createPlaceSearchPort(input.config);
    this.telemetry = input.telemetry ?? new MemoryTelemetry();
    this.cache = input.cache ?? new MemoryCache();
    this.eventCatalog = input.eventCatalog ?? new AstronomicalEventCatalogOwner();
    this.astronomy = new AstronomyService(
      input.weather,
      this.repository,
      this.config,
      input.skyCatalog,
      Date.now,
      this.eventCatalog,
    );
    this.auth = new AuthService(this.repository, this.config);
    this.observationContexts = new ObservationContextService(
      this.repository,
      this.cache,
      this.config,
      this.eventCatalog,
    );
    this.contributions = new ContributionService(
      this.repository,
      input.mediaStore ?? new DisabledMediaObjectStore(),
      this.config,
    );
  }

  static async createFromEnvironment() {
    const config = loadRuntimeConfig();
    const developmentFixtureMode =
      process.env.MINIAPP_DEVELOPMENT_FIXTURE_MODE === "1";
    const repository =
      config.storageMode === "MEMORY_TEST"
        ? new (
            await import("./test-fixtures/in-memory-repository.ts")
          ).InMemoryTestRepository()
        : await new PostgresMiniappRepository(config.databaseUrl!).initialize({
            migrate: config.autoMigrate,
          });
    const cache = config.redisUrl
      ? await new RedisCache(
          config.redisUrl,
          config.cachePrefix,
        ).initialize()
      : new MemoryCache();
    const eventCatalog = await new AstronomicalEventCatalogOwner(
      repository instanceof PostgresMiniappRepository
        ? new PostgresAstronomicalEventCatalogStore(repository.pool)
        : undefined,
    ).initialize();
    const usageStore = repository instanceof PostgresMiniappRepository ? new PostgresVendorUsageStore(config.databaseUrl!) : undefined;
    const transport = usageStore ? createVendorUsageTransport(usageStore) : fetch;
    return new MiniappService({
      repository,
      cache,
      config,
      weather: developmentFixtureMode
        ? new (
            await import("./test-fixtures/deterministic-weather-adapter.ts")
          ).DeterministicWeatherTestAdapter()
        : createWeatherPort(config, transport),
      route: createRoutePort(config, transport),
      recentWeather: developmentFixtureMode
        ? new (await import("./test-fixtures/deterministic-recent-weather-adapter.ts")).DeterministicRecentWeatherAdapter()
        : new QWeatherRecentWeatherAdapter(config, transport),
      airQuality: new QWeatherAirQualityAdapter(config, transport),
      placeSearch: createPlaceSearchPort(config, transport),
      deepSkyImages: new DeepSkyImageryService(),
      ...(usageStore ? { usageStore } : {}),
      mediaStore: createMediaObjectStore(config),
      eventCatalog,
    });
  }

  async onModuleDestroy() {
    await this.usageStore?.close();
    await this.repository.close();
    this.astronomy.clearCaches();
    await this.cache.close();
    await this.contributions.mediaStore.close();
  }

  async readinessSnapshot() {
    const dependency = async (
      name: "database" | "cache",
      operation: () => Promise<Readonly<Record<string, unknown>>>,
    ) => {
      try {
        const detail = await operation();
        return {
          name,
          ready: detail.ready === true,
          ...detail,
        };
      } catch {
        return { name, ready: false, state: "unavailable" };
      }
    };
    const dependencies = await Promise.all([
      dependency("database", () => this.repository.readinessSnapshot()),
      dependency("cache", () => this.cache.readinessSnapshot()),
    ]);
    return {
      ready: dependencies.every((item) => item.ready),
      dependencies,
    };
  }

  async resetAcceptanceState() {
    if (
      process.env.MINIAPP_ACCEPTANCE_MODE !== "1" ||
      this.repository.kind !== "memory" ||
      typeof (this.repository as { resetForAcceptance?: unknown })
        .resetForAcceptance !== "function" ||
      !(this.telemetry instanceof MemoryTelemetry)
    )
      throw new Error("acceptance_reset_requires_explicit_memory_mode");
    (
      this.repository as MiniappRepositoryPort & {
        resetForAcceptance(): void;
      }
    ).resetForAcceptance();
    this.telemetry.resetForAcceptance();
    this.outbox.resetForAcceptance();
    if (this.contributions.mediaStore.kind === "memory")
      await this.contributions.mediaStore.close();
    this.astronomy.clearCaches();
    await this.cache.deleteByPrefix("");
  }

  login(input: WechatLoginRequest) {
    return this.auth.login(input);
  }

  async resolveObservationContext(input: ObservationContextResolveRequest) {
    const context = await this.observationContexts.resolve(input);
    return envelope(context, "FRESH", browsingTimezoneSources(context), [], {
      validAt: context.selectedAtUtc,
      contextRevision: context.revision,
    });
  }

  async getObservationContext(contextId: string) {
    const context = await this.observationContexts.get(contextId);
    return envelope(context, "FRESH", browsingTimezoneSources(context), [], {
      validAt: context.selectedAtUtc,
      contextRevision: context.revision,
    });
  }

  async updateObservationContext(
    contextId: string,
    input: ObservationContextUpdateRequest,
  ) {
    const context = await this.observationContexts.update(contextId, input);
    await this.cache.deleteByPrefix(
      "map:" + context.contextFingerprint.slice(0, 16),
    );
    return envelope(context, "FRESH", browsingTimezoneSources(context), [], {
      validAt: context.selectedAtUtc,
      contextRevision: context.revision,
    });
  }

  getCapabilities() {
    const routeEnabled = false;
    const placeSearchEnabled = false;
    const realWeatherEnabled = this.config.features.REAL_WEATHER_ENABLED;
    return envelope(
      {
        flags: this.config.features,
        parser: AUTO_IMPORT_POLICY,
        externalOpen: {
          enabled: false,
          copyFallback: true as const,
          reason: "仅在微信业务域名和第三方深链白名单核验后开放",
        },
        routeProvider: {
          enabled: routeEnabled,
          externalMapFallback: true as const,
          reason: routeEnabled
            ? "已配置路线供应商；具体结果仍以每次响应状态为准"
            : "手动安排出行，通过微信地图确认路线",
        },
        placeSearch: {
          enabled: placeSearchEnabled,
          reason: placeSearchEnabled
            ? "已配置普通地点搜索；结果只用于移动地图和查找附近正式观星点"
            : "搜索自有正式观星点；普通地点通过微信平台选点",
        },
        weatherProvider: {
          enabled: realWeatherEnabled,
          cachedFallback: Boolean(this.config.redisUrl),
          reason: realWeatherEnabled
            ? "正式请求使用已配置天气适配器；来源与适用时间随响应返回"
            : "没有可用的真实天气供应商",
        },
        mediaUpload: {
          enabled: this.contributions.mediaStore.enabled,
          manualTextDraft: true as const,
          reason: this.contributions.mediaStore.enabled
            ? "现场反馈图片使用有时效的上传会话，并在入库前校验类型、大小和清除位置元数据"
            : "未配置当前环境可用的私有媒体存储；文字现场反馈仍可提交",
        },
      },
      "FRESH",
      [],
      routeEnabled ? [] : ["路线能力不可用时只提供明确的外部地图回退。"],
    );
  }

  getAstronomicalEvents() {
    const catalog = this.eventCatalog.snapshot();
    const sources = catalog.sources;
    return envelope(
      {
        catalogVersion: catalog.catalogVersion,
        coverage: catalog.coverage,
        events: catalog.events.map(({ article: _article, ...event }) => event),
        sources,
      },
      "FRESH",
      sources,
      [catalog.coverage === "ANNUAL_METEOR_REFERENCES_AND_ECLIPSES"
        ? "当前目录包含常年流星雨监测参考与计算的日月食；常年参考不预测当年精确极大或特殊爆发。"
        : "当前目录包含来源已核对的年度事件与计算的日月食，不代表全部天象。"],
    );
  }

  async getAstronomicalEvent(occurrenceId: string, contextId?: string) {
    const catalog = this.eventCatalog.snapshot();
    const event = catalog.events.find(event => event.occurrenceId === occurrenceId);
    if (!event) throw new Error("astronomical_event_not_found");
    const source = eventCatalogSourceFor(catalog, event);
    const articleSource = event.article ? catalog.sources.find(source => source.id === event.article!.sourceId) : undefined;
    let localVisibility: import("@starward/miniapp-contracts").AstronomicalEventLocalVisibility = {
      state: "UNAVAILABLE",
      reason: "尚未选择可用的观测地点与日期；目录事件不代表用户所在地可见。",
    };
    let context: ObservationContext | null = null;
    if (contextId) {
      context = await this.observationContexts.get(contextId);
      const spot = context.location.kind === "FORMAL_SPOT"
        ? await this.repository.getSpot(context.location.spotId)
        : null;
      if (context.location.kind === "FORMAL_SPOT" && !spot)
        throw new Error("formal_spot_not_found");
      const wgs84 = context.location.kind === "FORMAL_SPOT"
        ? spot!.wgs84
        : context.location.wgs84;
      const projectionInput = {
        latitude: wgs84.latitude,
        longitude: wgs84.longitude,
        elevationM: context.location.kind === "FORMAL_SPOT" ? (spot!.altitudeM ?? 0) : 0,
        timezone: context.timezone,
        localDate: context.localDate,
        nightStartUtc: context.nightStartUtc,
        nightEndUtc: context.nightEndUtc,
        locationName: context.location.kind === "FORMAL_SPOT" ? spot!.name : context.location.displayName,
      };
      localVisibility = event.kind === "METEOR_SHOWER"
        ? projectMeteorShowerAtLocation(event, projectionInput)
        : projectEclipseAtLocation(event, projectionInput);
    }
    return envelope(
      {
        catalogVersion: catalog.catalogVersion,
        event,
        localVisibility,
        source,
        ...(articleSource ? { articleSource } : {}),
      },
      source.state,
      [source, ...(articleSource ? [articleSource] : [])],
      event.kind === "METEOR_SHOWER"
        ? [event.annualReference ? "常年参考不是当年极大预报；方向仅在历史资料覆盖时段内提供，缺失流量不估算可见数量。" : "年度峰值和流量是来源参考资料，不是用户所在地的可见数量。"]
        : ["食甚时刻和地点投影是锁定算法计算结果；天气与真实地平遮挡仍需另行判断。"],
      context ? { validAt: context.selectedAtUtc, contextRevision: context.revision } : undefined,
    );
  }

  async getTerrainOverlay(input: TerrainOverlayRequest): Promise<ApiEnvelope<TerrainOverlayData>> {
    const centerWgs84 = gcj02ToWgs84({
      lat: input.center.latitude,
      lon: input.center.longitude,
      system: "GCJ-02",
    });
    const [terrainRead, lightRead] = await Promise.allSettled([
      terrainPublication(),
      this.repository.kind === "postgres" && this.config.darkSkyDatasetVersion !== "UNAVAILABLE"
      ? this.repository.listDarkSkyGridCells({
          datasetVersion: this.config.darkSkyDatasetVersion,
          center: { system: "WGS84", latitude: centerWgs84.lat, longitude: centerWgs84.lon },
          radiusKm: input.radiusKm,
        })
      : Promise.resolve([]),
    ]);
    const publication = terrainRead.status === "fulfilled" ? terrainRead.value : null;
    const terrainCovered = publication !== null && terrainRequestIsCovered(publication, input);
    const terrainSource = terrainCovered ? terrainPublicationSource(publication) : null;
    const darkSkyCells = lightRead.status === "fulfilled" ? lightRead.value : [];
    const colors: Record<DarkSkyGridCellRecord["productBand"], string> = {
      VERY_LOW: "#87714A99", LOW: "#A1845299", MODERATE: "#BE9B6199", HIGH: "#D1B57799", VERY_HIGH: "#E0C99899",
    };
    const lightCells = darkSkyCells.map((cell) => {
      const southWest = wgs84ToGcj02({ lat: cell.boundsWgs84.south, lon: cell.boundsWgs84.west, system: "WGS84" });
      const northEast = wgs84ToGcj02({ lat: cell.boundsWgs84.north, lon: cell.boundsWgs84.east, system: "WGS84" });
      return {
        id: cell.cellId,
        boundsGcj02: { west: southWest.lon, south: southWest.lat, east: northEast.lon, north: northEast.lat },
        color: colors[cell.productBand],
        label: cell.label,
        radiance: cell.radiance.median,
        unit: cell.radiance.unit,
      };
    });
    const source = darkSkyCells[0]?.source ?? null;
    const data: TerrainOverlayData = {
      ...(terrainCovered ? {
      state: publication.validPixelPercent < 99.9 ? "PARTIAL" : "AVAILABLE",
      purpose: input.purpose,
      requestedRadiusKm: input.radiusKm,
      effectiveRadiusKm: input.radiusKm,
      centerGcj02: input.center,
      publicationId: publication.publicationId,
      datasetVersion: publication.dataset,
      sourceProvider: publication.sourceProvider,
      sourceResolution: publication.sourceResolution,
      derivedResolutionM: publication.derivedResolutionM,
      derivedAt: publication.derivedAt,
      coordinateTransformVersion: publication.transformVersion,
      imageUrl: `/v2/terrain/assets/${encodeURIComponent(publication.image.file)}`,
      imageBoundsGcj02: publication.boundsGcj02,
      elevationM: publication.elevationM,
      coverageLabel: `已发布中心周边 ${publication.maximumRadiusKm.toFixed(0)} km，当前查看 ${input.radiusKm.toFixed(1)} km。`,
      limitations: publication.limitations,
      source: terrainSource,
      } : terrainUnavailable(input, publication ? "当前地区暂无已发布的地形数据。" : "地形数据读取失败，请重试。")),
      ...(terrainRead.status === "rejected" ? { failureCode: "TERRAIN_READ_FAILED" as const } : {}),
      lightPollution: {
        state: lightCells.length ? "PARTIAL" : "UNAVAILABLE",
        ...(lightRead.status === "rejected" ? { failureCode: "LIGHT_READ_FAILED" as const } : {}),
        datasetVersion: lightCells.length ? darkSkyCells[0]!.datasetVersion : this.config.darkSkyDatasetVersion,
        cells: lightCells,
        legend: lightCells.length ? [
          { label: "相对较低", color: "#87714A" },
          { label: "相对中等", color: "#BE9B61" },
          { label: "相对较高", color: "#E0C998" },
        ] : [],
        source,
        coverageLabel: lightCells.length ? "年度卫星夜光粗网格，仅作同数据集内相对比较。" : lightRead.status === "rejected" ? "光污染数据读取失败，请重试。" : "当前范围没有已发布的年度卫星夜光网格。",
      },
    };
    return envelope(data, data.state === "UNAVAILABLE" && lightCells.length === 0 ? "UNAVAILABLE" : "PARTIAL", [terrainSource, source].filter((item): item is SourceSummary => item !== null),
      [...data.limitations, ...(lightRead.status === "rejected" ? [data.lightPollution.coverageLabel] : [])]);
  }

  async getTerrainAsset(file: string) {
    const publication = await terrainPublication();
    if (file !== publication.image.file) throw new Error("terrain_asset_not_found");
    const bytes = await readFile(terrainImageUrl(file));
    return { bytes: validateTerrainAsset(bytes, publication), publicationId: publication.publicationId };
  }

  async getMapScene(input: {
    contextId: string;
    filters?: FilterState;
    query?: string;
    layer?: MapLayerKind;
    cloudLayer?: ObservationContext["weatherView"]["cloudLayer"];
    viewport?: {
      center: { latitude: number; longitude: number };
      zoom: number;
    };
    preferences?: SpotRankingPreferences;
    userId?: UserId | null;
  }, weatherDeadlineAt = Date.now() + WEATHER_DEADLINES.mapBudgetMs): Promise<ApiEnvelope<MapSceneData>> {
    const startedAt = Date.now();
    const context = await this.observationContexts.get(input.contextId);
    const filters = input.filters ?? EMPTY_FILTER_STATE;
    const layerKind = input.layer ?? "NORMAL";
    const cloudLayer = "TOTAL" as const;
    let cacheKey =
      "map:" +
      context.contextFingerprint.slice(0, 16) +
      ":" +
      context.contextId +
      ":" +
      hash({
        revision: context.revision,
        filters,
        query: input.query ?? "",
        viewport: input.viewport ?? null,
        preferences: input.preferences ?? null,
        layerKind,
        cloudLayer,
        userId: input.userId ?? null,
      });

    const radiusKm = input.viewport
      ? viewportRadiusKm(input.viewport.zoom)
      : null;
    let candidates: readonly SpotSummary[];
    let viewportCenterWgs84: Wgs84Point | null = null;
    if (input.viewport) {
      const converted = gcj02ToWgs84({
        lat: input.viewport.center.latitude,
        lon: input.viewport.center.longitude,
        system: "GCJ-02",
      });
      viewportCenterWgs84 = {
        system: "WGS84",
        latitude: converted.lat,
        longitude: converted.lon,
      };
      candidates = await this.repository.listSpotsInRadius(viewportCenterWgs84, radiusKm!);
    } else {
      candidates = await this.repository.listSpots();
    }
    const viewportSpots = candidates.filter((spot) =>
      (spot.status === "PUBLISHED" || spot.status === "TEMPORARILY_CLOSED") &&
      (this.repository.kind === "memory" || spot.source.kind !== "TEST_FIXTURE"),
    );
    const allCandidates = input.viewport
      ? (await this.repository.listSpotPopulation()).filter((spot) =>
        this.repository.kind === "memory" || spot.source.kind !== "TEST_FIXTURE")
      : viewportSpots;

    const query = (input.query ?? "").trim().toLocaleLowerCase("zh-CN");
    const queryMatched = query
      ? viewportSpots.filter((spot) =>
          (spot.name + spot.region + spot.address)
            .toLocaleLowerCase("zh-CN")
            .includes(query),
        )
      : viewportSpots;
    const reports: Record<string, ApiEnvelope<AstronomyDecisionReport>> = {};
    const evaluations: Record<string, MapSpotEvaluation> = {};
    const filterEvidence: Record<string, SpotFilterEvidence> = {};
    const evaluatedAtMs = Date.now();
    const routeOrigin =
      context.location.kind === "MAP_POINT"
        ? context.location.wgs84
        : context.routeOrigin?.wgs84 ?? null;
    for (let start = 0; start < queryMatched.length; start += 4) {
      const batch = queryMatched.slice(start, start + 4);
      await Promise.all(
        batch.map(async (spot) => {
          const spotContext =
            context.location.kind === "FORMAL_SPOT" &&
            spot.spotId === context.location.spotId
              ? context
              : await this.observationContexts.resolve({
                location: { kind: "FORMAL_SPOT", spotId: spot.spotId },
                  routeOriginContextId:
                    context.location.kind === "MAP_POINT"
                      ? context.contextId
                      : context.routeOrigin?.contextId ?? null,
                  localDate: context.localDate,
                  selectedAt: context.selectedAtUtc,
                  eventInstanceId: context.eventInstanceId,
                  targetProfile: context.targetProfile,
                });
          const detail = await this.repository.getDetail(spot.spotId);
          const report = await this.astronomy.computeDecision(spotContext, detail ?? undefined, undefined, weatherDeadlineAt);
          reports[spot.spotId] = report;
          const timeSignal = timeSignalFor(
            spot.spotId,
            report.data,
            context.selectedAtUtc,
          );
          const straightDistanceKm = routeOrigin
            ? distanceMeters(
                { lat: routeOrigin.latitude, lon: routeOrigin.longitude },
                {
                  lat: spot.wgs84.latitude,
                  lon: spot.wgs84.longitude,
                },
              ) / 1_000
            : null;
          const spotEvaluation: MapSpotEvaluation = {
            ...timeSignal,
            spotId: spot.spotId,
            lunarFacts: report.data.lunarFacts,
            recommendation: report.data.decision.recommendation,
            bestWindowMinutes: windowMinutes(
              report.data.decision.skyOpportunity.primaryWindow,
            ),
            activeEventIds: report.data.targets
              .filter(
                (target) =>
                  target.type === "METEOR_SHOWER" ||
                  target.type === "CONJUNCTION",
              )
              .map((target) => target.targetId),
            distanceKm: straightDistanceKm,
            driveMinutes: null,
            distanceKind: straightDistanceKm === null
                ? "UNAVAILABLE"
                : "STRAIGHT_LINE",
            state: projectionState(report.dataState),
          };
          evaluations[spot.spotId] = spotEvaluation;
          filterEvidence[spot.spotId] = evaluateSpotFilterEvidence({
            spot,
            detail,
            evaluation: spotEvaluation,
            filters,
            eventCoverageKnown: Boolean(report.data.context.eventCatalogVersion.trim()),
            evaluatedAtMs,
          });
        }),
      );
    }

    // Excluded candidates can become UNKNOWN when their hourly evidence expires.
    // Carry that boundary even when there are no visible rows or polygons.
    const forecastEnds = Object.values(evaluations)
      .map((evaluation) => Date.parse(evaluation.weatherAt ?? "") + 3_600_000)
      .filter(Number.isFinite);
    const forecastValidUntil = forecastEnds.length
      ? new Date(Math.min(...forecastEnds)).toISOString() : null;
    const deliveryBoundary = Math.min(...Object.values(reports).flatMap(report => [
      ...report.data.hourly.map(row => Date.parse(row.weatherAt ?? "") + 3_600_000),
      ...report.sources.map(source => Date.parse(source.validTo ?? "")),
      ...report.data.weatherEvidence.alerts.filter(alert => alert.status === "ACTIVE")
        .map(alert => Date.parse(alert.expiresAt ?? "")),
    ]).filter(instant => Number.isFinite(instant) && instant > startedAt));
    const filtered = queryMatched.filter((spot) =>
      passesActiveFilters(filterEvidence[spot.spotId]!, filters),
    );
    const ranked = rankSpotsByPreferences(filtered, input.preferences);
    const favoriteSpotIds = input.userId
      ? await this.repository.listFavoriteIds(input.userId)
      : null;
    // Validate current publication facts and weather before reusing the map
    // representation. Context UUID alone cannot establish evidence freshness.
    cacheKey += ":evidence:" + hash({ spots: queryMatched, population: allCandidates, favoriteSpotIds, evaluations, filterEvidence,
      revisions: Object.values(reports).map((report) => report.data.context.dataRevision) });
    const cached = await this.cache.get<ApiEnvelope<MapSceneData>>(cacheKey);
    if (cached) return Date.now() >= deliveryBoundary ? this.getMapScene(input, weatherDeadlineAt) : cached;
    const routeCapability = { state: "UNAVAILABLE" as const, reason: "道路距离与行程时长未接入；距离仅供直线参考", recovery: "NONE" as const };
    const allFilterEvidence = queryMatched.map((spot) => filterEvidence[spot.spotId]!);
    const byGroup = Object.fromEntries(
      FILTER_GROUP_KEYS.map((group) => {
        return [group, summarizeFilterCoverage(allFilterEvidence, group)];
      }),
    ) as MapSceneData["filterCapabilities"]["byGroup"];
    const population: FormalSpotPopulation = {
      key: this.config.trialRegion,
      eligibleCount: allCandidates.length,
      excludedCount: 0,
      stableIds: allCandidates.map((spot) => spot.spotId),
      regionPolicy: "当前试点区域内通过正式发布状态门禁的完整集合",
      source:
        this.repository.kind === "postgres"
          ? "PostGIS published formal spots"
          : "explicit test fixture repository",
    };
    const darkSkyCells =
      layerKind === "LIGHT_POLLUTION" && this.repository.kind === "postgres"
        ? await this.repository.listDarkSkyGridCells({
            datasetVersion: this.config.darkSkyDatasetVersion,
            ...(viewportCenterWgs84 && radiusKm
              ? { center: viewportCenterWgs84, radiusKm }
              : {}),
          })
        : [];
    const layer = layerFor({
      kind: layerKind,
      cloudLayer,
      selectedAtUtc: context.selectedAtUtc,
      spots: ranked.spots,
      reports,
      evaluations,
      config: this.config,
      darkSkyCells,
    });
    const visibleEvaluations = Object.fromEntries(
      ranked.spots.flatMap((spot) => {
        const evaluation = evaluations[spot.spotId];
        return evaluation ? [[spot.spotId, evaluation] as const] : [];
      }),
    );
    const visibleFilterEvidence = Object.fromEntries(
      ranked.spots.flatMap((spot) => {
        const evidence = filterEvidence[spot.spotId];
        return evidence ? [[spot.spotId, evidence] as const] : [];
      }),
    );
    const timeFrames: MapSceneTimeFrame[] = observationFrameTimes(context).map(
      (atUtc) => {
        const lunarRow = Object.values(reports)
          .map((report) => exactHourly(report.data, atUtc))
          .find((row) => row?.moonPhase != null);
        const moonPhase = lunarRow?.moonPhase ?? null;
        const spotSignals = Object.fromEntries(
          ranked.spots.flatMap((spot) => {
            const report = reports[spot.spotId];
            return report
              ? [[spot.spotId, timeSignalFor(spot.spotId, report.data, atUtc)] as const]
              : [];
          }),
        );
        if (layerKind !== "CLOUD" && layerKind !== "OPPORTUNITY")
          return { atUtc, moonPhase, spotSignals, dynamicLayer: null };
        const frameLayer = layerFor({
          kind: layerKind,
          cloudLayer,
          selectedAtUtc: atUtc,
          spots: ranked.spots,
          reports,
          evaluations,
          config: this.config,
          darkSkyCells: [],
        });
        return {
          atUtc,
          moonPhase,
          spotSignals,
          dynamicLayer: {
            kind: layerKind,
            polygons: frameLayer.polygons,
            state: frameLayer.state,
          },
        };
      },
    );
    const activeUnavailable = FILTER_GROUP_KEYS.filter(
      (group) =>
        activeFilter(filters, group) && byGroup[group].state === "UNAVAILABLE",
    );
    const sources = uniqueSources([
      ...browsingTimezoneSources(context),
      ...allCandidates.map((spot) => spot.source),
      ...Object.values(reports).flatMap((report) => report.sources),
      ...(layer.source ? [layer.source] : []),
    ]);
    const result = envelope<MapSceneData>(
      {
        context,
        spots: ranked.spots,
        forecastValidUntil,
        evaluations: visibleEvaluations,
        filterEvidence: visibleFilterEvidence,
        favoriteSpotIds,
        preferenceRanking: ranked.disclosure,
        filterCapabilities: {
          driveTime: routeCapability,
          byGroup,
        },
        population,
        viewportMode: input.viewport
          ? "BOUNDED_VIEWPORT_PLUS_20_PERCENT_BUFFER"
          : "TRIAL_REGION_COMPLETE_POPULATION",
        viewport: input.viewport
          ? {
              coordinateSystem: "GCJ02",
              center: input.viewport.center,
              zoom: input.viewport.zoom,
              radiusKm: radiusKm!,
              eligibleInViewport: viewportSpots.length,
              excludedOutsideViewport:
                allCandidates.length - viewportSpots.length,
            }
          : null,
        clusterBelowZoom: 9,
        debounceMs: 250,
        requestCancellation: "AbortController",
        layer,
        timeFrames,
      },
      Object.values(reports).every((report) => report.dataState === "FRESH") &&
        activeUnavailable.length === 0
        ? "FRESH"
        : "PARTIAL",
      sources,
      [
        ranked.spots.length === 0
          ? "当前区域的观星点仍在核验道路、停车和夜间安全，完成后会在这里显示。"
          : ranked.disclosure.summary,
        ...activeUnavailable.map(
          (group) =>
            "筛选“" + FILTER_GROUP_LABELS[group] + "”当前不可用：" + byGroup[group].reason,
        ),
      ],
      {
        validAt: context.selectedAtUtc,
        contextRevision: context.revision,
      },
    );
    this.telemetry.event("map_scene_loaded", {
      formalSpotCount: ranked.spots.length,
      populationCount: population.eligibleCount,
      filterCount: Object.values(filters).flat().length,
      contextId: context.contextId,
      layer: layerKind,
    });
    await this.cache.set(cacheKey, result, 120);
    // Repository/cache waits are part of delivery too. A re-projection shares
    // the original weather budget; it must not silently buy another deadline.
    return Date.now() >= deliveryBoundary ? this.getMapScene(input, weatherDeadlineAt) : result;
  }

  async search(
    query: string,
    history: readonly string[] = [],
    region = "",
  ) {
    const normalized = query.trim();
    if (normalized.length > 80) throw new Error("place_query_invalid");
    const all = (await this.repository.listSpots()).filter(
      (spot) =>
        spot.status === "PUBLISHED" ||
        spot.status === "TEMPORARILY_CLOSED",
    );
    const formalSpots = normalized
      ? all.filter((spot) =>
          (spot.name + spot.region + spot.address)
            .toLocaleLowerCase("zh-CN")
            .includes(normalized.toLocaleLowerCase("zh-CN")),
        )
      : [];
    const candidateSpots = normalized ? await this.repository.searchSpotCandidates(normalized) : [];
    const candidates: DarkSkyCandidateRef[] = candidateSpots.map((spot) => ({
      candidateId: "candidate:" + hash(spot.spotId).slice(0, 20),
      label: spot.name,
      address: spot.address,
      region: spot.region,
      kind: "DARK_SKY_CANDIDATE",
      location: spot.gcj02,
      actions: ["MOVE_MAP", "FIND_NEARBY_FORMAL_SPOTS"],
      spotId: null,
      nightSkyAllowed: false,
      dataState: "PARTIAL",
      source: spot.source,
    }));
    const ordinaryPlaces: SearchData["ordinaryPlaces"] = [];
    const sources = uniqueSources([
      ...formalSpots.map((spot) => spot.source),
      ...candidates.map((candidate) => candidate.source),
    ]);
    const data: SearchData = {
      formalSpots,
      candidates,
      ordinaryPlaces,
      history: [...new Set(history.map((label) => label.trim()).filter(Boolean))]
        .slice(0, 10)
        .map((label) => ({ label, clearable: true as const })),
    };
    return envelope(
      data,
      "FRESH",
      sources,
      [],
    );
  }

  async getSpotOverview(spotId: string, contextId: string) {
    const context = await this.observationContexts.get(contextId);
    if (
      context.location.kind !== "FORMAL_SPOT" ||
      context.location.spotId !== spotId
    )
      throw new Error("spot_context_mismatch");
    const detail = await this.repository.getDetail(spotId as SpotId);
    if (!detail || detail.spot.status === "DATA_INSUFFICIENT")
      throw new Error("formal_spot_not_found");
    const sky = await this.astronomy.computeDecision(context, detail);
    const straightDistanceKm = context.routeOrigin
      ? Math.round(
          (distanceMeters(
            {
              lat: context.routeOrigin.wgs84.latitude,
              lon: context.routeOrigin.wgs84.longitude,
            },
            {
              lat: detail.spot.wgs84.latitude,
              lon: detail.spot.wgs84.longitude,
            },
          ) /
            1_000) *
            10,
        ) / 10
      : null;
    const route: SpotDetail["route"] = {
      kind: straightDistanceKm === null ? "UNAVAILABLE" : "STRAIGHT_LINE_ONLY",
      travelMode: null,
      originLabel: context.routeOrigin?.displayName ?? null,
      distanceKm: straightDistanceKm,
      durationMinutes: null,
      driveMinutes: null,
      walkingMinutes: null,
      lastRoad: detail.route.lastRoad,
      parkingGuidance: detail.route.parkingGuidance,
      state: straightDistanceKm === null ? "UNAVAILABLE" : "PARTIAL",
      source: detail.route.source,
    };
    const sources = uniqueSources([
      ...detail.dataDisclosure,
      ...sky.sources,
    ]);
    const hydrated: SpotDetail = {
      ...detail,
      route,
      decision: sky.data.decision,
      guides: [],
      dataDisclosure: sources,
    };
    const result = envelope(
      hydrated,
      sky.dataState,
      sources,
      [
        ...sky.warnings,
        context.routeOrigin
          ? "当前显示直线距离；点击“去这里”通过微信地图确认到达方式。"
          : "当前详情没有地图起点，无法计算距离或路线；请从地图点位气泡进入。",
        "攻略和场地信息将在你打开对应栏目时加载。",
      ],
      {
        validAt: context.selectedAtUtc,
        contextRevision: context.revision,
      },
    );
    this.telemetry.event("spot_detail_loaded", {
      spotId,
      contextId,
      state: result.dataState,
    });
    return result;
  }

  async estimateRoute(input: RouteEstimateRequest) {
    const context = await this.observationContexts.get(input.contextId);
    if (
      context.location.kind !== "FORMAL_SPOT" ||
      context.location.spotId !== input.spotId
    )
      throw new Error("spot_context_mismatch");
    if (!context.routeOrigin) throw new Error("route_origin_required");
    const detail = await this.repository.getDetail(input.spotId);
    if (!detail || detail.spot.status === "DATA_INSUFFICIENT")
      throw new Error("formal_spot_not_found");
    const result = await createRoutePort(this.config).estimate({ origin: context.routeOrigin.wgs84, destination: detail.spot.wgs84 });
    const route: SpotDetail["route"] = {
      ...(result.value ?? detail.route),
      originLabel: context.routeOrigin.displayName,
      lastRoad:
        (input.travelMode ?? "DRIVING") === "DRIVING"
          ? detail.route.lastRoad
          : result.value?.lastRoad ?? detail.route.lastRoad,
      parkingGuidance:
        (input.travelMode ?? "DRIVING") === "DRIVING"
          ? detail.route.parkingGuidance
          : result.value?.parkingGuidance ?? detail.route.parkingGuidance,
    };
    const sources = uniqueSources([detail.route.source, result.source]);
    return envelope(
      route,
      result.state,
      sources,
      result.state === "FRESH"
        ? []
        : ["路线供应方暂未返回可验证结果；请使用微信外部地图继续确认。"],
      { validAt: context.selectedAtUtc, contextRevision: context.revision },
    );
  }

  async getSpotGuides(spotId: string) {
    const detail = await this.repository.getDetail(spotId as SpotId);
    if (!detail) throw new Error("formal_spot_not_found");
    return envelope(
      { spotId: detail.spot.spotId, guides: detail.guides },
      detail.guides.length ? "FRESH" : "PARTIAL",
      uniqueSources(detail.guides.map((guide) => guide.source)),
      detail.guides.length
        ? []
        : ["当前点位没有通过来源白名单和结构化内容门禁的攻略。"],
    );
  }

  async getSpotRecentWeather(spotId: string) {
    const result = await this.spotEnvironment.recent(spotId);
    return envelope(result.data, result.state, result.sources, result.warnings);
  }

  async getSpotAirQuality(spotId: string) {
    const result = await this.spotEnvironment.air(spotId);
    return envelope(result.data, result.state, result.sources, result.warnings);
  }

  async getSpotSite(spotId: string) {
    const detail = await this.repository.getDetail(spotId as SpotId);
    if (!detail) throw new Error("formal_spot_not_found");
    const incomplete = detail.spot.facilities.some(
      (facility) => facility.status === "UNKNOWN",
    ) ||
      detail.accessAndSafety.openness === "UNKNOWN" ||
      detail.accessAndSafety.legalAccess === "UNKNOWN" ||
      detail.accessAndSafety.nightSafety === "UNKNOWN" ||
      detail.accessAndSafety.explicitDanger === null ||
      detail.siteMediaState === "UNKNOWN";
    return envelope(
      {
        spotId: detail.spot.spotId,
        media: detail.spot.media,
        facilities: detail.spot.facilities,
        accessAndSafety: detail.accessAndSafety,
        siteMediaState: detail.siteMediaState,
        arrival: { lastRoad: detail.route.lastRoad, parkingGuidance: detail.route.parkingGuidance, source: detail.route.source },
        evidence: detail.evidence,
        sources: detail.dataDisclosure,
      },
      incomplete ? "PARTIAL" : "FRESH",
      detail.dataDisclosure,
      incomplete
        ? ["设施或现场事实不足时保留“未知”，不替换为 0 或肯定状态。"]
        : [],
    );
  }

  async getContributionFormalBaseline(spotId: string) {
    const id = spotId as SpotId;
    const [baseline, spot] = await Promise.all([
      this.repository.getContributionFormalBaseline(id),
      this.repository.getSpot(id),
    ]);
    if (!baseline || !spot) throw new Error("formal_spot_not_found");
    return envelope(
      baseline,
      "FRESH",
      [spot.source],
      ["该快照只用于本次反馈差异与并发核对；正式资料在审核合并前不会改变。"],
    );
  }

  async getSky(spotId: string, contextId: string, userId?: UserId | null) {
    const context = await this.observationContexts.get(contextId);
    if (spotId.startsWith("contribution:")) {
      if (!userId) throw new Error("authentication_required");
      const submission = await this.contributions.getForOwner(userId, spotId as ContributionId);
      if (
        submission.kind !== "NEW_SPOT_PROPOSAL" ||
        !["PENDING_REVIEW", "ACCEPTED"].includes(submission.submissionState) ||
        submission.publicationImpact === "SPOT_PUBLISHED" ||
        !submission.preciseLocationConsent ||
        !submission.candidateLocation ||
        context.location.kind !== "MAP_POINT"
      ) throw new Error("proposal_sky_context_invalid");
      const expected = submission.candidateLocation.wgs84;
      if (Math.abs(context.location.wgs84.latitude - expected.latitude) > 0.000001 ||
          Math.abs(context.location.wgs84.longitude - expected.longitude) > 0.000001)
        throw new Error("proposal_sky_context_mismatch");
      return this.astronomy.computeCandidate(
        context,
        this.#candidateSkyDetail(submission, context.timezone),
        submission.submissionId,
      );
    }
    if (!spotId.startsWith("spot:")) throw new Error("night_location_identity_invalid");
    if (
      context.location.kind !== "FORMAL_SPOT" ||
      context.location.spotId !== spotId
    )
      throw new Error("spot_context_mismatch");
    return this.astronomy.compute(context);
  }

  #candidateSkyDetail(submission: import("@starward/miniapp-contracts").ContributionSubmission, timezone: string): SpotDetail {
    if (!submission.candidateLocation) throw new Error("proposal_location_required");
    const now = new Date().toISOString();
    const fields = submission.candidateProfile?.fields ?? {};
    const source: SourceSummary = {
      id: `proposal-source:${submission.submissionId}`,
      kind: "USER_FIELD_REPORT",
      provider: "账号私有审核中提案",
      title: "尚未审核的用户提交资料",
      sourceUrl: "",
      license: "Private pending submission",
      licenseUrl: "",
      publishedAt: null,
      retrievedAt: now,
      validFrom: null,
      validTo: null,
      state: "PARTIAL",
      confidence: null,
      precision: "用户选定坐标；场地事实未审核",
      limitations: ["仅供提交者查看", "不构成正式点或出行事实"],
    };
    const point = submission.candidateLocation.wgs84;
    const converted = wgs84ToGcj02({ lat: point.latitude, lon: point.longitude, system: "WGS84" });
    const facility = (type: import("@starward/miniapp-contracts").FacilityType, raw: string | undefined, summary = "") => ({
      type,
      status: raw === "有" ? "AVAILABLE" as const : raw === "没有" ? "UNAVAILABLE" as const : raw === "季节性开放" ? "SEASONAL" as const : "UNKNOWN" as const,
      summary,
      detail: summary,
      distanceM: null,
      openingHours: null,
      usageCondition: null,
      verifiedAt: null,
      confidence: null,
      source,
    });
    const openness = fields.openness === "开放" ? "OPEN" as const : fields.openness === "有条件开放" ? "CONDITIONAL" as const : fields.openness === "不开放" ? "CLOSED" as const : "UNKNOWN" as const;
    const legalAccess = fields.access === "允许进入" ? "PERMITTED" as const : fields.access === "需预约或其他条件" ? "CONDITIONAL" as const : fields.access === "禁止进入" ? "PROHIBITED" as const : "UNKNOWN" as const;
    const spot: SpotSummary = {
      spotId: submission.submissionId as unknown as SpotId,
      name: fields.name?.trim() || submission.candidateLocation.displayName,
      region: submission.candidateLocation.region,
      address: fields.address?.trim() || submission.candidateLocation.region,
      timezone: timezone === "Asia/Hong_Kong" || timezone === "Asia/Macau" ? timezone : "Asia/Shanghai",
      wgs84: { ...point },
      gcj02: { system: "GCJ02", latitude: converted.lat, longitude: converted.lon, derivedFrom: "WGS84", transformVersion: "gcj02-standard-v1" },
      altitudeM: null,
      status: "PUBLISHED",
      visibilityPolicy: "HIDDEN",
      source,
      lastVerifiedAt: null,
      lightPollution: { levelAtMost: null, productBand: null, radiance: null, minimumCloudFreeObservations: null,
        calibratedSkyClass: false, label: "暂无数据", method: "not-evaluated", datasetVersion: "unavailable",
        dataDate: "", precision: "未对审核中点位生成正式夜光事实", state: "UNAVAILABLE", source },
      obstructionPercent: null,
      clearDirections: [],
      accessTags: [],
      facilities: [
        facility("PARKING", fields.parking, fields.parkingNote),
        facility("TOILET", fields.toilet, fields.toiletNote),
        facility("PLATFORM", fields.platform),
        facility("SIGNAL", fields.signal),
        facility("CAMPING", fields.camping),
      ],
      media: [],
    };
    const unknownFactor = { code: "pending-proposal-unverified", label: "场地事实尚未审核", severity: "BLOCKER" as const,
      detail: "仅计算天体与动态天气；开放、合法进入和夜间安全仍未知。", sourceIds: [source.id] };
    return {
      spot,
      route: { kind: "UNAVAILABLE", travelMode: null, originLabel: null, distanceKm: null, durationMinutes: null,
        driveMinutes: null, walkingMinutes: null, lastRoad: fields.road ?? "", parkingGuidance: fields.parkingNote ?? "", state: "UNAVAILABLE", source },
      decision: { recommendation: "DATA_INSUFFICIENT", label: "场地事实尚未审核",
        skyOpportunity: { status: "INSUFFICIENT_DATA", label: "场地事实尚未审核", primaryWindow: null, backupWindow: null,
          windows: [], suitableFor: [], factors: [unknownFactor], confidence: null, freshness: "PARTIAL", ruleVersion: "pending-proposal-v1", inputDigest: submission.submissionId },
        factors: [unknownFactor], confidence: null, freshness: "PARTIAL", ruleVersion: "pending-proposal-v1", inputDigest: submission.submissionId },
      guides: [],
      accessAndSafety: { openness, legalAccess, nightSafety: "UNKNOWN", explicitDanger: null,
        restrictions: [], guidance: [fields.accessNote, fields.safety].filter((item): item is string => Boolean(item?.trim())) },
      siteMediaState: "UNKNOWN",
      evidence: [],
      dataDisclosure: [source],
      formalFacts: fields,
      formalMedia: submission.candidateProfile?.media ?? {},
    };
  }

  getCelestialObject(reference: string, locale = "zh-CN") {
    return this.celestialObjects.get(reference, locale);
  }

  getDeepSkyImage(reference: string, level = "MEDIUM", publicationHash?: string) {
    return this.deepSkyImages.get(reference, level, publicationHash);
  }

  async getFavorites(userId: UserId) {
    const ids = new Set(await this.repository.listFavoriteIds(userId));
    const favorites = (await this.repository.listSpots()).filter((spot) =>
      ids.has(spot.spotId),
    );
    return envelope(
      {
        favorites,
        sortOptions: ["FAVORITED_AT", "DISTANCE", "RECENT_CONDITION"],
        canonicalDetailRoute: "/pages/map/index",
      },
      "FRESH",
      uniqueSources(favorites.map((spot) => spot.source)),
      [],
    );
  }

  private async planSpotLabels(plans: readonly ObservationPlan[]) {
    return (await Promise.all([...new Set(plans.map(plan => plan.spotId))].map(spotId => this.repository.getSpot(spotId))))
      .flatMap(spot => spot ? [{ spotId: spot.spotId, name: spot.name }] : []);
  }

  async getUserLibrary(userId: UserId) {
    const [favorites, plans, profileLinks, preferences, imports] =
      await Promise.all([
        this.getFavorites(userId),
        this.repository.listPlans(userId),
        this.repository.listProfileLinks(userId),
        this.repository.getPreferences(userId),
        this.repository.listImportDrafts(userId),
      ]);
    const planSpots = await this.planSpotLabels(plans);
    return envelope(
      {
        planSpots,
        favoriteSpots: favorites.data.favorites,
        plans,
        profileLinks,
        preferences,
        latestImportDraft: imports[0] ?? null,
      },
      favorites.dataState,
      favorites.sources,
      ["动态摘要失败不会删除或隐藏收藏关系。"],
    );
  }

  async getAccountProfile(userId: UserId) {
    return envelope(await this.repository.getAccountProfile(userId), "FRESH", []);
  }

  async saveAccountNickname(userId: UserId, input: AccountNicknameSaveRequest, idempotencyKey: string) {
    assertIdempotencyKey(idempotencyKey);
    const nickname = normalizeAccountNickname(input?.nickname);
    if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1) throw new Error("account_profile_revision_invalid");
    return envelope(await this.repository.saveAccountNickname(userId, nickname, input.expectedRevision, "account.nickname:" + idempotencyKey), "FRESH", []);
  }

  async getAccountAvatar(userId: UserId) {
    const avatar = await this.repository.getAccountAvatarObject(userId);
    if (!avatar) throw new Error("account_avatar_not_found");
    const bytes = await this.contributions.mediaStore.read(avatar.objectKey);
    if (!bytes) throw new Error("account_avatar_object_missing");
    return envelope({ version: avatar.version, mimeType: avatar.mimeType, zoom: avatar.zoom, dataBase64: Buffer.from(bytes).toString("base64") }, "FRESH", []);
  }

  async saveAccountAvatar(userId: UserId, input: AccountAvatarSaveRequest, idempotencyKey: string) {
    assertIdempotencyKey(idempotencyKey);
    if (!this.contributions.mediaStore.enabled) throw new Error("media_upload_capability_disabled");
    if (!input || !["image/jpeg", "image/png", "image/webp"].includes(input.mimeType)) throw new Error("account_avatar_mime_invalid");
    if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1) throw new Error("account_profile_revision_invalid");
    if (!Number.isFinite(input.zoom) || input.zoom < 1 || input.zoom > 2.5) throw new Error("account_avatar_zoom_invalid");
    if (!Number.isSafeInteger(input.declaredByteSize) || input.declaredByteSize < 1 || input.declaredByteSize > 10_000_000) throw new Error("account_avatar_size_invalid");
    const raw = decodeContributionBase64(input.dataBase64, 10_000_000);
    if (raw.length !== input.declaredByteSize) throw new Error("account_avatar_size_mismatch");
    const sanitized = sanitizeAccountAvatarImage(raw, input.mimeType);
    const sha256 = createHash("sha256").update(sanitized).digest("hex");
    const scope = createHash("sha256").update(userId).digest("hex").slice(0, 24);
    const objectId = createHash("sha256").update("account.avatar:" + idempotencyKey).digest("hex").slice(0, 32);
    const extension = input.mimeType === "image/jpeg" ? "jpg" : input.mimeType === "image/png" ? "png" : "webp";
    const objectKey = `profiles/${scope}/${objectId}.${extension}`;
    let wrote = false;
    const existing = await this.contributions.mediaStore.read(objectKey);
    if (existing) {
      const existingHash = createHash("sha256").update(existing).digest("hex");
      if (existingHash !== sha256) throw new Error("account_profile_idempotency_conflict");
    } else {
      await this.contributions.mediaStore.put({ objectKey, bytes: sanitized, mimeType: input.mimeType });
      wrote = true;
    }
    try {
      const saved = await this.repository.saveAccountAvatar(userId, { objectKey, version: sha256, mimeType: input.mimeType, zoom: Math.round(input.zoom * 100) / 100, byteSize: sanitized.length, sha256 }, input.expectedRevision, "account.avatar:" + idempotencyKey);
      if (saved.previousObjectKey && saved.previousObjectKey !== objectKey) await this.contributions.mediaStore.delete(saved.previousObjectKey);
      return envelope(saved.profile, "FRESH", []);
    } catch (error) {
      if (wrote) await this.contributions.mediaStore.delete(objectKey);
      throw error;
    }
  }

  async getPreferences(userId: UserId) {
    return envelope(await this.repository.getPreferences(userId), "FRESH", []);
  }

  async savePreferences(
    userId: UserId,
    input: { preferences: UserPreferences; expectedRevision: number },
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);
    assertUserPreferences(
      input.preferences,
      this.config.features.EVENT_SUBSCRIPTION_ENABLED,
    );
    if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 1)
      throw new Error("preferences_revision_invalid");
    return envelope(
      await this.repository.savePreferences(
        userId,
        input.preferences,
        input.expectedRevision,
        idempotencyKey,
      ),
      "FRESH",
      [],
      ["偏好只参与排序与解释，不能改写来源事实或安全硬阻断。"],
    );
  }

  async exportAccountData(userId: UserId) {
    const [
      preferences,
      favoriteSpotIds,
      plans,
      profileLinks,
      imports,
      contributions,
    ] = await Promise.all([
      this.repository.getPreferences(userId),
      this.repository.listFavoriteIds(userId),
      this.repository.listPlans(userId),
      this.repository.listProfileLinks(userId),
      this.repository.listImportDrafts(userId),
      this.repository.listContributions(userId),
    ]);
    const generatedAt = new Date().toISOString();
    const data: AccountDataExportData = {
      schemaVersion: "starward-account-data-export-v1",
      generatedAt,
      account: { userId },
      profile: await this.repository.getAccountProfile(userId),
      preferences,
      favoriteSpotIds,
      plans,
      profileLinks,
      imports,
      contributions,
      excluded: [
        "SESSION_CREDENTIALS",
        "WECHAT_IDENTITY_DIGEST",
        "INTERNAL_MEDIA_OBJECT_KEYS",
        "RAW_MEDIA_BYTES",
      ],
    };
    return envelope(data, "FRESH", [], [
      "导出包含当前账户的结构化记录，不包含会话凭证、内部对象键或原始媒体字节。",
    ]);
  }

  async deleteAccount(
    userId: UserId,
    input: AccountDeletionRequest,
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);
    if (input.confirmation !== "DELETE_ACCOUNT")
      throw new Error("account_deletion_confirmation_invalid");
    return envelope(
      await this.repository.deleteAccount(userId, idempotencyKey),
      "FRESH",
      [],
      [
        "微信身份映射和会话已撤销；去身份化审核、合并、发布与审计证据按完整性要求保留。",
      ],
    );
  }

  async setFavorite(
    userId: UserId,
    spotId: string,
    favorite: boolean,
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);
    await this.repository.setFavorite(
      userId,
      spotId as SpotId,
      favorite,
      idempotencyKey,
    );
    if (this.repository.kind === "memory")
      this.outbox.enqueue("DECISION", "favorite-audit:" + idempotencyKey, {
        userId: hash(userId).slice(0, 16),
        spotId,
        favorite,
      });
    await this.cache.deleteByPrefix("map:");
    return this.getFavorites(userId);
  }

  private reminderSubscriptionBinding() {
    const { appId, subscriptionTemplateId, deliveryIdentityKey } = this.config.wechat;
    return this.config.authMode === "WECHAT" && appId && subscriptionTemplateId && deliveryIdentityKey && this.reminderSubscriptions
      ? { appId, templateId: subscriptionTemplateId } : null;
  }

  async prepareReminderSubscription(userId: UserId, planId: string, input: ReminderSubscriptionPrepareRequest): Promise<ApiEnvelope<ReminderSubscriptionPrepareData>> {
    if (!input || typeof input.reminderId !== "string" || !/^[A-Za-z0-9:_-]{1,128}$/u.test(input.reminderId))
      throw new Error("reminder_subscription_request_invalid");
    const binding = this.reminderSubscriptionBinding();
    if (!binding) return envelope({ state: "UNAVAILABLE", reason: "NOT_CONFIGURED" }, "FRESH", []);
    const challenge = await this.reminderSubscriptions!.prepare(userId, planId, input.reminderId, binding);
    return envelope(challenge ? { state: "READY", ...challenge } : { state: "UNAVAILABLE", reason: "REMINDER_NOT_ELIGIBLE" }, "FRESH", []);
  }

  async reportReminderSubscription(userId: UserId, challengeId: string, input: ReminderSubscriptionReportRequest): Promise<ApiEnvelope<ReminderSubscriptionReportData>> {
    validateReminderSubscriptionChallengeId(challengeId);
    if (!input || !["accept", "reject", "ban", "filter"].includes(input.choice)) throw new Error("reminder_subscription_choice_invalid");
    const binding = this.reminderSubscriptionBinding();
    const recorded = binding ? await this.reminderSubscriptions!.record(userId, challengeId, input.choice, binding) : false;
    if (recorded) await this.cache.deleteByPrefix("plans:" + hash(userId).slice(0, 24));
    return envelope({ recorded }, "FRESH", []);
  }

  async getPlans(userId: UserId) {
    const cacheKey = "plans:" + hash(userId).slice(0, 24);
    const cached =
      await this.cache.get<ApiEnvelope<import("@starward/miniapp-contracts").PlansData>>(
        cacheKey,
      );
    if (cached) return cached;
    const plans = await this.repository.listPlans(userId);
    const storedSchedules = await this.repository.listPlanReminderSchedules(userId);
    const schedules = plans.flatMap(plan => {
      const derived = derivePlanReminderSchedules(userId, plan);
      return derived.map(row => storedSchedules.find(stored => stored.planId === row.planId && stored.reminderId === row.reminderId && stored.scheduleVersion === row.scheduleVersion) ?? row);
    });
    const result = envelope(
      {
        plans,
        planSpots: await this.planSpotLabels(plans),
        // Optional encrypted recipient registration is not subscription authorization.
        // The approved template, authorization flow and sender are still unavailable.
        reminderNotifications: schedules.map(row => publicReminderStatus(row, false)),
      },
      "FRESH",
      [],
    );
    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  private async publicShareSpot(spotId: SpotId) {
    const detail = await this.repository.getDetail(spotId);
    if (!detail || !["PUBLISHED", "TEMPORARILY_CLOSED"].includes(detail.spot.status)) throw new Error("share_not_found");
    return detail;
  }

  async createPlanShare(userId: UserId, planId: string) {
    const plan = (await this.repository.listPlans(userId)).find(item => item.planId === planId);
    if (!plan || !plan.timing) throw new Error("share_not_found");
    await this.publicShareSpot(plan.spotId);
    const expiresAt = Date.now() + 7 * 86_400_000;
    return envelope({ token: sealPlanShare({ userId, planId, revision: plan.revision, expiresAt }, this.config.wechat.sessionSecret),
      expiresAt: new Date(expiresAt).toISOString() }, "FRESH", []);
  }

  async getSharedPlan(token: string): Promise<ApiEnvelope<PlanPublicShareData>> {
    const binding = openPlanShare(token, this.config.wechat.sessionSecret);
    if (!binding) throw new Error("share_not_found");
    const plan = (await this.repository.listPlans(binding.userId as UserId)).find(item => item.planId === binding.planId);
    if (!plan || !plan.timing || plan.revision !== binding.revision) throw new Error("share_not_found");
    const detail = await this.publicShareSpot(plan.spotId);
    return envelope({ kind: "PLAN", spotId: detail.spot.spotId, spotGcj02: detail.spot.gcj02, spotName: detail.spot.name,
      spotRegion: detail.spot.region, spotStatus: detail.spot.status as NonNullable<PlanPublicShareData["spotStatus"]>,
      spotSource: detail.spot.source,
      localDate: plan.localDate, localTime: plan.localTime,
      endLocalDate: plan.timing.endLocalDate, endLocalTime: plan.timing.endLocalTime,
      departureLocalDate: plan.timing.departureLocalDate, departureLocalTime: plan.timing.departureLocalTime,
      timezone: plan.contextSnapshot.timezone,
      events: (plan.eventOccurrenceIds ?? []).map(occurrenceId => {
        const event = this.eventCatalog.find(occurrenceId);
        return { occurrenceId, displayName: event?.displayName ?? "天象资料暂不可用", kind: event?.kind ?? null,
          source: event ? this.eventCatalog.sourceFor(event) : null };
      }), expiresAt: new Date(binding.expiresAt).toISOString() }, "FRESH", []);
  }

  async getSharedSpot(spotId: SpotId): Promise<ApiEnvelope<SpotPublicShareData>> {
    const detail = await this.publicShareSpot(spotId);
    const facts = detail.formalFacts;
    return envelope({ kind: "SPOT", spotId: detail.spot.spotId, spotGcj02: detail.spot.gcj02, name: detail.spot.name,
      region: detail.spot.region, address: detail.spot.address,
      status: detail.spot.status as SpotPublicShareData["status"],
      opening: facts?.hours ?? null, access: facts?.accessNote ?? facts?.access ?? null,
      safety: facts?.safety ?? null, parking: facts?.parkingNote ?? facts?.parking ?? null,
      horizon: facts?.horizon ?? null, source: detail.spot.source }, "FRESH", []);
  }

  async savePlan(
    userId: UserId,
    input: Omit<
      ObservationPlan,
      "revision" | "updatedAt" | "contextSnapshot"
    > & {
      expectedRevision: number | null;
      observationContextId: ObservationContext["contextId"];
    },
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);
    const receipt = await this.repository.getPlanSaveReceipt(userId, input.planId, idempotencyKey);
    if (receipt) return envelope(receipt, "FRESH", [], ["已返回这次计划保存的原始结果；当前计划可重新回读。"]);
    if (
      !/^\d{4}-\d{2}-\d{2}$/u.test(input.localDate) ||
      !/^\d{2}:\d{2}$/u.test(input.localTime)
    )
      throw new Error("invalid_local_observation_time");
    if (typeof input.notes !== "string" || input.notes.length > PLAN_NOTES_MAX_LENGTH) throw new Error("invalid_plan_notes");
    const spot = await this.repository.getSpot(input.spotId);
    if (!spot || spot.status === "DATA_INSUFFICIENT")
      throw new Error("formal_spot_not_found");
    const selectedAt = zonedLocalToUtc({
      localDate: input.localDate,
      localTime: input.localTime,
      timezone: spot.timezone,
    });
    const existingPlan = (await this.repository.listPlans(userId)).find(plan => plan.planId === input.planId);
    let eventOccurrenceIds: string[] | undefined;
    try {
      if (input.eventOccurrenceIds !== undefined)
        eventOccurrenceIds = parsePlanEventOccurrenceIds(input.eventOccurrenceIds);
    } catch { throw new Error("plan_event_occurrence_invalid"); }
    if (eventOccurrenceIds?.some(id => !this.eventCatalog.find(id)))
      throw new Error("plan_event_occurrence_invalid");
    if (eventOccurrenceIds && eventOccurrenceIds.length > 1 &&
        JSON.stringify(eventOccurrenceIds) !== JSON.stringify(existingPlan?.eventOccurrenceIds ?? []))
      throw new Error("plan_event_occurrence_single_selection_required");
    if (eventOccurrenceIds === undefined && existingPlan?.eventOccurrenceIds?.length)
      throw new Error("plan_event_occurrences_required");
    if (input.timing !== undefined) {
      resolvePlanTiming({ ...input, timezone: spot.timezone, timing: input.timing });
    } else if (existingPlan?.timing) {
      // An older editor must not silently erase an interval it cannot represent.
      throw new Error("plan_timing_required");
    }
    const reminders = input.reminders === undefined ? undefined : parsePlanReminders(input.reminders);
    if (reminders === undefined && existingPlan?.reminders?.length) throw new Error("plan_reminders_required");
    let travel = input.travel === undefined ? undefined : parsePlanTravel(input.travel);
    if (travel === undefined && existingPlan?.travel) throw new Error("plan_travel_required");
    // Legacy editors may change mode/notes without knowing this field. Preserve the
    // saved point only while the origin text remains identical; explicit null clears it.
    if (travel && travel.originLocation === undefined && existingPlan?.travel?.originLocation !== undefined) {
      travel = { ...travel, originLocation: travel.origin === existingPlan.travel.origin
        ? existingPlan.travel.originLocation : null };
    }
    const sourceContext = await this.observationContexts.get(
      input.observationContextId,
    );
    let routeOriginContextId =
      sourceContext.location.kind === "MAP_POINT"
        ? sourceContext.contextId
        : sourceContext.routeOrigin?.contextId ?? null;
    // Explicit plan origins belong to the private plan, not a public browsing
    // Context or its regional/timezone coverage. Avoid duplicating their coordinates.
    if (travel?.originLocation !== undefined) routeOriginContextId = null;
    const context = await this.observationContexts.resolve({
      location: { kind: "FORMAL_SPOT", spotId: input.spotId },
      routeOriginContextId,
      localDate: input.localDate,
      selectedAt,
      targetProfile: "DAILY",
    });
    if (context.location.kind !== "FORMAL_SPOT")
      throw new Error("formal_spot_context_required");
    const {
      expectedRevision,
      observationContextId: _observationContextId,
      ...planInput
    } = input;
    const plan = await this.repository.savePlan(
      userId,
      {
        ...planInput,
        ...(reminders === undefined ? {} : { reminders }),
        ...(travel === undefined ? {} : { travel }),
        ...(eventOccurrenceIds === undefined ? {} : { eventOccurrenceIds }),
        contextSnapshot: {
          schemaVersion: "observation-context-snapshot-v2",
          contextId: context.contextId,
          contextFingerprint: context.contextFingerprint,
          contextRevision: context.revision,
          spotId: context.location.spotId,
          timezone: context.timezone,
          localDate: context.localDate,
          selectedAtUtc: context.selectedAtUtc,
          eventInstanceId: context.eventInstanceId,
          routeOrigin: context.routeOrigin
            ? {
                displayName: context.routeOrigin.displayName,
                wgs84: { ...context.routeOrigin.wgs84 },
                source: context.routeOrigin.source,
              }
            : null,
          algorithmVersions: context.algorithmVersions,
          capturedAt: new Date().toISOString(),
        },
        revision: 0,
        updatedAt: new Date().toISOString(),
      },
      expectedRevision,
      idempotencyKey,
    );
    await this.cache.deleteByPrefix(
      "plans:" + hash(userId).slice(0, 24),
    );
    return envelope(plan, "FRESH", []);
  }

  async setPlanChecklistCompletion(
    userId: UserId, planId: string,
    input: import("@starward/miniapp-contracts").PlanChecklistCompletionRequest,
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);
    if (!input || typeof input.completed !== "boolean" || !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1 ||
      ![input.reminderId, input.itemId].every(value => typeof value === "string" && /^[A-Za-z0-9:_-]{1,128}$/u.test(value))) throw new Error("plan_checklist_input_invalid");
    // Idempotency belongs to this account, plan and item, independently of full-plan saves.
    const key = `plan.checklist:${hash([planId, input.reminderId, input.itemId]).slice(0, 32)}:${idempotencyKey}`;
    const validateReceipt = (receipt: ObservationPlan) => {
      const item = receipt.reminders?.find(group => group.reminderId === input.reminderId)?.items.find(value => value.itemId === input.itemId);
      if (item?.completed !== input.completed || receipt.revision !== input.expectedRevision + 1) throw new Error("idempotency_conflict");
      return receipt;
    };
    const receipt = await this.repository.getPlanSaveReceipt(userId, planId, key);
    if (receipt) {
      validateReceipt(receipt);
      await this.cache.deleteByPrefix("plans:" + hash(userId).slice(0, 24));
      return envelope(receipt, "FRESH", []);
    }
    const current = (await this.repository.listPlans(userId)).find(plan => plan.planId === planId);
    if (!current) throw new Error("plan_not_found");
    if (current.revision !== input.expectedRevision) throw new Error("plan_revision_conflict");
    if (!current.reminders?.some(group => group.reminderId === input.reminderId && group.items.some(item => item.itemId === input.itemId))) throw new Error("plan_checklist_item_not_found");
    const reminders = current.reminders.map(group => group.reminderId === input.reminderId
      ? { ...group, items: group.items.map(item => item.itemId === input.itemId ? { ...item, completed: input.completed } : item) } : group);
    const saved = validateReceipt(await this.repository.savePlan(userId, { ...current, reminders }, input.expectedRevision, key));
    await this.cache.deleteByPrefix("plans:" + hash(userId).slice(0, 24));
    return envelope(saved, "FRESH", []);
  }

  async deletePlan(
    userId: UserId,
    planId: string,
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);
    await this.repository.deletePlan(userId, planId, idempotencyKey);
    await this.cache.deleteByPrefix(
      "plans:" + hash(userId).slice(0, 24),
    );
    return this.getPlans(userId);
  }

  async listProfileLinks(userId: UserId) {
    return envelope(
      {
        links: await this.repository.listProfileLinks(userId),
        tryOpenEnabled: false,
        copyFallback: true as const,
      },
      "FRESH",
      [],
      ["打开外部主页受微信业务域名和深链门禁控制；复制链接可用。"],
    );
  }

  async saveProfileLink(
    userId: UserId,
    input: {
      profileLinkId?: string;
      platform: PlatformKind;
      displayName: string;
      url: string;
      visibility: "PRIVATE" | "PUBLIC";
      sortOrder: number;
    },
    idempotencyKey: string,
  ) {
    if (!this.config.features.PROFILE_LINKS_ENABLED)
      throw new Error("profile_links_capability_disabled");
    assertIdempotencyKey(idempotencyKey);
    const validation = validateExternalUrl(input.url);
    if (!validation.ok || !validation.normalizedUrl)
      throw new Error("profile_link_invalid:" + validation.code);
    if (!input.displayName.trim() || input.displayName.length > 80)
      throw new Error("profile_link_label_invalid");
    const now = new Date().toISOString();
    const link: ProfileLink = {
      profileLinkId: (input.profileLinkId ??
        "profile-link:" + randomUUID()) as ProfileLinkId,
      platform: input.platform,
      displayName: input.displayName.trim(),
      url: validation.normalizedUrl,
      visibility: input.visibility,
      sortOrder: input.sortOrder,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    return envelope(
      await this.repository.saveProfileLink(userId, link, idempotencyKey),
      "FRESH",
      [],
      ["保存链接不表示第三方隶属、API、抓取或深链授权。"],
    );
  }

  async deleteProfileLink(
    userId: UserId,
    id: string,
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);
    await this.repository.deleteProfileLink(userId, id, idempotencyKey);
    return this.listProfileLinks(userId);
  }

  async createImportDraft(
    userId: UserId,
    input: {
      platform: PlatformKind;
      originalUrl: string;
      rightsConfirmed: boolean;
    },
    idempotencyKey: string,
  ) {
    if (!this.config.features.OWN_POST_IMPORT_ENABLED)
      throw new Error("post_import_capability_disabled");
    assertIdempotencyKey(idempotencyKey);
    const gate = parserGate(input.platform, input.originalUrl);
    if (!gate.validation.ok || !gate.validation.normalizedUrl)
      throw new Error("import_source_invalid:" + gate.validation.code);
    const draft: ImportDraft = {
      importDraftId: ("import:" + randomUUID()) as ImportDraftId,
      stage: "SOURCE",
      platform: input.platform,
      originalUrl: gate.validation.normalizedUrl,
      rightsConfirmed: input.rightsConfirmed,
      importedAt: new Date().toISOString(),
      parseState: gate.allowed ? "NOT_REQUESTED" : "GATED",
      parseReason: gate.reason,
      title: { value: "", revision: 0, editedByUser: false },
      body: { value: "", revision: 0, editedByUser: false },
      sourceNote: {
        value: "手动导入；原平台与原链接持续保留",
        revision: 0,
        editedByUser: false,
      },
      visibility: { value: "PRIVATE", revision: 0, editedByUser: false },
      spotId: null,
      spotProposalId: null,
      moderationState: "DRAFT",
      proposalReviewState: "NOT_APPLICABLE",
      revision: 0,
    };
    return envelope(
      await this.repository.saveImportDraft(
        userId,
        draft,
        null,
        idempotencyKey,
      ),
      "FRESH",
      [],
      [
        gate.allowed
          ? "自动解析可请求。"
          : "自动解析未获许可或未配置；手动导入保持可用。",
      ],
    );
  }

  async getImportDraft(userId: UserId, id: string) {
    const draft = await this.repository.getImportDraft(userId, id);
    if (!draft) throw new Error("import_draft_not_found");
    return envelope(
      draft,
      "FRESH",
      [],
      ["来源沿袭、字段修订和两条独立审核状态从持久化草稿回读。"],
    );
  }

  async listImportDrafts(userId: UserId) {
    return envelope(
      { imports: await this.repository.listImportDrafts(userId) },
      "FRESH",
      [],
      ["列表只返回当前身份隔离范围内的自有草稿与审核状态。"],
    );
  }

  async updateImportDraft(
    userId: UserId,
    id: string,
    input: {
      expectedRevision: number;
      rightsConfirmed?: boolean;
      stage?: ImportStage;
      title?: string;
      body?: string;
      sourceNote?: string;
      visibility?: "PRIVATE" | "PUBLIC";
      spotId?: string | null;
      createProposal?: boolean;
    },
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);


    const receipt = await this.repository.getImportSaveReceipt(userId, id, idempotencyKey);
    if (receipt) return envelope(receipt, "FRESH", [], ["已返回这次保存的原始结果；当前草稿可重新回读。"]);
    const current = await this.repository.getImportDraft(userId, id);
    if (!current) throw new Error("import_draft_not_found");
    const next = structuredClone(current);
    if (input.rightsConfirmed !== undefined)
      next.rightsConfirmed = input.rightsConfirmed;
    for (const key of ["title", "body", "sourceNote"] as const)
      if (input[key] !== undefined && input[key] !== next[key].value)
        next[key] = {
          value: input[key]!,
          revision: next[key].revision + 1,
          editedByUser: true,
        };
    if (input.visibility && input.visibility !== next.visibility.value)
      next.visibility = {
        value: input.visibility,
        revision: next.visibility.revision + 1,
        editedByUser: true,
      };
    if (input.spotId !== undefined) {
      if (input.spotId !== null) {
        const selectedSpot = await this.repository.getSpot(
          input.spotId as SpotId,
        );
        if (
          !selectedSpot ||
          !["PUBLISHED", "TEMPORARILY_CLOSED"].includes(selectedSpot.status)
        )
          throw new Error("formal_spot_not_found");
      }
      next.spotId = input.spotId as SpotId | null;
      next.spotProposalId = null;
      next.proposalReviewState = "NOT_APPLICABLE";
    }
    if (input.createProposal) {
      next.spotId = null;
      next.spotProposalId =
        current.spotProposalId ??
        (("spot-proposal:" + randomUUID()) as ImportDraft["spotProposalId"]);
      next.proposalReviewState = current.spotProposalId
        ? current.proposalReviewState
        : "DRAFT";
    }
    if (input.stage && input.stage !== current.stage) {
      if (!ALLOWED_STAGE_TRANSITIONS[current.stage].includes(input.stage))
        throw new Error("import_stage_transition_invalid");
      if (input.stage === "EDIT_DRAFT" && !next.rightsConfirmed)
        throw new Error("rights_attestation_required");
      if (input.stage === "PREVIEW" && !next.spotId && !next.spotProposalId)
        throw new Error("spot_or_proposal_required");
      if (
        input.stage === "SUBMIT" &&
        (!next.rightsConfirmed ||
          !next.title.value.trim() ||
          !next.body.value.trim())
      )
        throw new Error("import_submission_incomplete");
      next.stage = input.stage;
      if (input.stage === "SUBMIT") {
        next.moderationState = "PENDING";
        if (next.spotProposalId) next.proposalReviewState = "PENDING";
      }
    }
    const saved = await this.repository.saveImportDraft(
      userId,
      next,
      input.expectedRevision,
      idempotencyKey,
    );
    if (saved.stage === "SUBMIT" && this.repository.kind === "memory")
      this.outbox.enqueue(
        "MEDIA",
        "moderation:" + saved.importDraftId + ":" + String(saved.revision),
        {
          importDraftId: saved.importDraftId,
          mediaPolicy: "private-scan-strip-exif-quarantine",
        },
      );
    return envelope(
      saved,
      "FRESH",
      [],
      [
        "来源平台、原链接、导入时间、解析方式、权利确认与两条独立审核状态持续保留。",
      ],
    );
  }

  async listContributions(userId: UserId) {
    return envelope(
      { submissions: await this.contributions.list(userId) },
      "FRESH",
      [],
      ["投稿只显示当前身份自己的草稿与审核状态；审核通过也不会直接发布正式点事实。"],
    );
  }

  async getContributionMedia(userId: UserId, submissionId: ContributionId, uploadId: ContributionUploadId) {
    return envelope(await this.contributions.readForOwner(userId, submissionId, uploadId), "FRESH", []);
  }

  async getSpotContributionMedia(spotId: SpotId, uploadId: ContributionUploadId) {
    return envelope(await this.contributions.readForPublishedSpot(spotId, uploadId), "FRESH", []);
  }

  async createContributionDraft(
    userId: UserId,
    input: ContributionDraftRequest,
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);
    return envelope(
      await this.contributions.createDraft(userId, input, idempotencyKey),
      "FRESH",
      [],
      ["草稿尚未进入审核，也不会改变正式观星点。"],
    );
  }

  async submitFormalContribution(userId: UserId, input: ContributionFormalSubmitRequest, idempotencyKey: string) {
    assertIdempotencyKey(idempotencyKey);
    return envelope(await this.contributions.submitFormal(userId, input, idempotencyKey), "FRESH", []);
  }
  async createFormalUploadIntent(userId: UserId, input: ContributionFormalUploadIntentRequest, idempotencyKey: string) { assertIdempotencyKey(idempotencyKey); return envelope(await this.contributions.createFormalUploadIntent(userId,input,idempotencyKey),"FRESH",[]); }
  async createFormalUpload(userId: UserId, intentId: string, input: ContributionFormalUploadSessionRequest, idempotencyKey: string) { assertIdempotencyKey(idempotencyKey); return envelope(await this.contributions.createFormalUpload(userId,intentId,input,idempotencyKey),"FRESH",[]); }
  async completeFormalUpload(userId: UserId, intentId: string, uploadId: ContributionUploadId, input: ContributionFormalUploadCompleteRequest, idempotencyKey: string) { assertIdempotencyKey(idempotencyKey); return envelope(await this.contributions.completeFormalUpload(userId,intentId,uploadId,input,idempotencyKey),"FRESH",[]); }
  async removeFormalUpload(userId: UserId, intentId: string, uploadId: ContributionUploadId, expectedRevision: number, idempotencyKey: string) { assertIdempotencyKey(idempotencyKey); return envelope(await this.contributions.removeFormalUpload(userId,intentId,uploadId,expectedRevision,idempotencyKey),"FRESH",[]); }

  async updateContributionDraft(
    userId: UserId,
    submissionId: ContributionId,
    input: ContributionUpdateRequest,
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);
    return envelope(
      await this.contributions.updateDraft(
        userId,
        submissionId,
        input,
        idempotencyKey,
      ),
      "FRESH",
      [],
      ["已保存当前身份的草稿；提交前仍可修改。"],
    );
  }

  async withdrawContributionDraft(
    userId: UserId,
    submissionId: ContributionId,
    expectedRevision: number,
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 1)
      throw new Error("contribution_revision_invalid");
    return envelope(
      await this.contributions.withdrawDraft(
        userId,
        submissionId,
        expectedRevision,
        idempotencyKey,
      ),
      "FRESH",
      [],
      ["草稿已撤回，不会进入审核；未提交媒体已安排清理。"],
    );
  }

  async createContributionUpload(
    userId: UserId,
    submissionId: ContributionId,
    input: ContributionUploadSessionRequest,
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);
    return envelope(
      await this.contributions.createUpload(
        userId,
        submissionId,
        input,
        idempotencyKey,
      ),
      "FRESH",
      [],
      ["上传会话 20 分钟后过期；仅接受受限大小的 JPEG 或 PNG。"],
    );
  }

  async removeContributionUpload(userId: UserId, submissionId: ContributionId, uploadId: ContributionUploadId, expectedRevision: number, idempotencyKey: string) {
    assertIdempotencyKey(idempotencyKey);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 1) throw new Error("contribution_revision_invalid");
    return envelope(await this.contributions.removeUpload(userId, submissionId, uploadId, expectedRevision, idempotencyKey), "FRESH", []);
  }

  async completeContributionUpload(
    userId: UserId,
    submissionId: ContributionId,
    uploadId: ContributionUploadId,
    input: ContributionUploadCompleteRequest,
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);
    return envelope(
      await this.contributions.completeUpload(
        userId,
        submissionId,
        uploadId,
        input,
        idempotencyKey,
      ),
      "FRESH",
      [],
      ["服务端已校验图片签名并移除 EXIF、文本和时间等可识别元数据。"],
    );
  }

  async submitContribution(
    userId: UserId,
    submissionId: ContributionId,
    expectedRevision: number,
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);
    return envelope(
      await this.contributions.submit(
        userId,
        submissionId,
        expectedRevision,
        idempotencyKey,
      ),
      "FRESH",
      [],
      ["已进入管理员审核；只有合并进正式事实并重新通过完整度检查后才会影响地图。"],
    );
  }

  async budgetSnapshot() {
    return this.repository instanceof PostgresMiniappRepository
      ? readVendorUsageBudget(this.repository.pool)
      : { product: "MINIAPP", currency: "CNY", hardMonthlyMax: MINIAPP_VENDOR_BUDGET_CNY, state: "UNASSESSED", projectedMonthlyCny: null, coverage: "MEMORY_TEST_NOT_METERED" };
  }

  async operationsSnapshot() {
    return envelope(
      {
        capabilities: this.getCapabilities().data,
        budget: await this.budgetSnapshot(),
        repository: await this.repository.operationsSnapshot(),
        cache: await this.cache.operationsSnapshot(),
        outbox:
          this.repository.kind === "memory"
            ? this.outbox.snapshot()
            : { state: "transactional_postgres_outbox" },
        telemetry: this.telemetry.snapshot(),
        jobs: [
          "WEATHER",
          "ASTRONOMY",
          "DECISION",
          "LIGHT",
          "MEDIA",
          "FRESHNESS",
          "PROVIDER_HEALTH",
          "COST",
          "NOTIFICATION",
          "BACKUP",
        ],
      },
      "FRESH",
      [],
    );
  }
}
