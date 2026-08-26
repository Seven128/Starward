import { createHash, randomUUID } from "node:crypto";
import {
  EMPTY_FILTER_STATE,
  FILTER_GROUPS,
  viewportRadiusKm,
  type ApiEnvelope,
  type ContributionDraftRequest,
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
  type PlatformKind,
  type PreferenceRankingDisclosure,
  type ProfileLink,
  type ProfileLinkId,
  type RouteEstimateRequest,
  type SearchData,
  type SkyReport,
  type SourceSummary,
  type SpotDetail,
  type SpotId,
  type SpotRankingPreferences,
  type SpotSummary,
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
import { AstronomyService } from "./astronomy-service.ts";
import { AuthService } from "./auth-service.ts";
import { MemoryCache, RedisCache } from "./cache.ts";
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
} from "./media-object-store.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { MemoryOutbox, MemoryTelemetry, ProviderRuntime } from "./runtime.ts";
import { createRoutePort } from "./route-provider.ts";
import { createPlaceSearchPort } from "./place-provider.ts";
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
  return {
    apiVersion: "v2",
    data,
    dataState: state,
    generatedAt,
    validAt: binding?.validAt ?? generatedAt,
    etag: "W/\"" + hash({ data, state }).slice(0, 24) + "\"",
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

function nearestHourly(report: SkyReport, selectedAt: string) {
  const selected = Date.parse(selectedAt);
  return report.hourly.reduce<(typeof report.hourly)[number] | null>(
    (nearest, row) =>
      nearest === null ||
      Math.abs(Date.parse(row.at) - selected) <
        Math.abs(Date.parse(nearest.at) - selected)
        ? row
        : nearest,
    null,
  );
}

function projectionState(state: DataState): MapSpotTimeSignal["state"] {
  if (state === "FRESH") return "FRESH";
  if (state === "STALE_USABLE") return "STALE_USABLE";
  if (state === "EXPIRED" || state === "UNAVAILABLE") return "UNAVAILABLE";
  return "PARTIAL";
}

function selectedTimeOpportunityLabel(
  row: ReturnType<typeof nearestHourly>,
) {
  if (!row || row.opportunityScore === null) return "当前时段数据不足";
  if (row.opportunityBlockers.length) return "当前时段有明确风险";
  if (row.opportunityEligible)
    return `当前时段可观测 · ${row.opportunityScore} 分`;
  return `当前时段未达窗口门槛 · ${row.opportunityScore} 分`;
}

function timeSignalFor(
  spotId: SpotId,
  report: SkyReport,
  selectedAtUtc: string,
): MapSpotTimeSignal {
  const row = nearestHourly(report, selectedAtUtc);
  return {
    spotId,
    cloudPercent: row?.cloudPercent ?? null,
    lowCloudPercent: row?.lowCloudPercent ?? null,
    midCloudPercent: row?.midCloudPercent ?? null,
    highCloudPercent: row?.highCloudPercent ?? null,
    moonImpact: moonImpact(row),
    opportunityScore: row?.opportunityScore ?? null,
    opportunityConfidence: row?.opportunityConfidence ?? null,
    opportunityEligible: row?.opportunityEligible ?? false,
    opportunityLabel: selectedTimeOpportunityLabel(row),
    state: row ? projectionState(row.state) : "UNAVAILABLE",
  };
}

const MAP_FRAME_CADENCE_MS = 30 * 60 * 1_000;
const MAX_MAP_TIME_FRAMES = 49;

function mapFrameTimes(context: ObservationContext) {
  const start = Date.parse(context.nightStartUtc);
  const end = Date.parse(context.nightEndUtc);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw new Error("map_time_axis_invalid");
  const count = Math.ceil((end - start) / MAP_FRAME_CADENCE_MS);
  if (count > MAX_MAP_TIME_FRAMES)
    throw new Error("map_time_frame_limit_exceeded");
  return Array.from({ length: count }, (_, index) =>
    new Date(start + index * MAP_FRAME_CADENCE_MS).toISOString(),
  );
}

function moonImpact(
  row: ReturnType<typeof nearestHourly>,
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

function hasFacility(spot: SpotSummary, type: string) {
  return spot.facilities.some(
    (facility) => facility.type === type && facility.status === "AVAILABLE",
  );
}

function activeFilter(filters: FilterState, group: FilterGroupKey) {
  return filters[group].length > 0;
}

function matchesFilters(input: {
  spot: SpotSummary;
  evaluation: MapSpotEvaluation;
  filters: FilterState;
  preferences?: SpotRankingPreferences;
}) {
  const { spot, evaluation, filters } = input;
  const recentBoundary = Date.now() - 180 * 24 * 60 * 60 * 1_000;
  const predicates: Readonly<Record<FilterGroupKey, boolean>> = {
    TONIGHT_RECOMMENDED: evaluation.recommendation === "RECOMMENDED",
    BEST_WINDOW_DURATION:
      evaluation.bestWindowMinutes !== null &&
      evaluation.bestWindowMinutes >= 120,
    DISTANCE_DRIVE_TIME:
      evaluation.driveMinutes !== null &&
      evaluation.driveMinutes <= (input.preferences?.maxDriveMinutes ?? 180),
    LIGHT_POLLUTION:
      spot.lightPollution.productBand === "VERY_LOW" ||
      spot.lightPollution.productBand === "LOW",
    LESS_CLOUD:
      evaluation.cloudPercent !== null && evaluation.cloudPercent <= 45,
    PARKING: hasFacility(spot, "PARKING"),
    RESTROOM: hasFacility(spot, "TOILET"),
    DRIVE_UP_ACCESS: spot.accessTags.includes("DRIVE_TO"),
    PHOTO_FOREGROUND: spot.media.some((media) => media.isSiteSpecific),
    CAMPING_OVERNIGHT_PARKING: hasFacility(spot, "CAMPING"),
    SPECIFIC_CELESTIAL_EVENT: evaluation.activeEventIds.length > 0,
    LOW_CLOUD_THRESHOLD:
      evaluation.lowCloudPercent !== null &&
      evaluation.lowCloudPercent <= 30,
    MOON_IMPACT: evaluation.moonImpact === "LOW",
    HIKING_DIFFICULTY: spot.accessTags.includes("NO_HIKE"),
    SIGNAL: hasFacility(spot, "SIGNAL"),
    CHARGING: hasFacility(spot, "CHARGING"),
    OPEN_SKY_DIRECTION: spot.clearDirections.length > 0,
    LAST_VERIFIED_AT:
      spot.lastVerifiedAt !== null &&
      Date.parse(spot.lastVerifiedAt) >= recentBoundary,
  };
  return FILTER_GROUP_KEYS.every(
    (group) => !activeFilter(filters, group) || predicates[group],
  );
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
  reports: Readonly<Record<string, ApiEnvelope<SkyReport>>>;
  evaluations: Readonly<Record<string, MapSpotEvaluation>>;
  config: MiniappRuntimeConfig;
  darkSkyCells: readonly DarkSkyGridCellRecord[];
  allowTestSpotCellFallback: boolean;
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
        VERY_LOW: "#87714ACC",
        LOW: "#A18452CC",
        MODERATE: "#BE9B61CC",
        HIGH: "#D1B577CC",
        VERY_HIGH: "#E0C998CC",
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
    if (!input.allowTestSpotCellFallback)
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
    const eligible = input.spots.filter(
      (spot) =>
        spot.lightPollution.state !== "UNAVAILABLE" &&
        spot.lightPollution.productBand !== null &&
        spot.lightPollution.radiance !== null,
    );
    const source = eligible[0]?.lightPollution.source ?? null;
    return {
      kind: input.kind,
      cloudLayer: null,
      polygons: eligible.map((spot) => {
        const band = spot.lightPollution.productBand!;
        const colors: Record<typeof band, string> = {
          VERY_LOW: "#87714ACC",
          LOW: "#A18452CC",
          MODERATE: "#BE9B61CC",
          HIGH: "#D1B577CC",
          VERY_HIGH: "#E0C998CC",
        };
        return cell(spot, {
          id: "light:" + spot.spotId,
          color: colors[band],
          value: spot.lightPollution.radiance!.median,
          label: spot.lightPollution.label,
          state: "PARTIAL",
        });
      }),
      legend: [
        { label: "相对较低", color: "#87714A", range: "试点区夜光低值" },
        { label: "相对中等", color: "#BE9B61", range: "试点区夜光中值" },
        { label: "相对较高", color: "#E0C998", range: "试点区夜光高值" },
      ],
      validAt: source?.validFrom ?? null,
      datasetVersion:
        source === null
          ? input.config.darkSkyDatasetVersion
          : eligible[0]!.lightPollution.datasetVersion,
      precision:
        source === null
          ? "当前区域没有可用的已发布光害数据"
          : "按正式点有来源的卫星夜光相对区间绘制有界单元；不是 Bortle、SQM 或现场实测",
      state: eligible.length ? "PARTIAL" : "UNAVAILABLE",
      source,
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
        report: ApiEnvelope<SkyReport>;
        evaluation: MapSpotEvaluation;
      } => Boolean(entry.report && entry.evaluation),
    );
  if (input.kind === "CLOUD") {
    const cloudValue = (report: SkyReport) => {
      const row = nearestHourly(report, input.selectedAtUtc);
      if (!row) return null;
      if (input.cloudLayer === "LOW") return row.lowCloudPercent;
      if (input.cloudLayer === "MID") return row.midCloudPercent;
      if (input.cloudLayer === "HIGH") return row.highCloudPercent;
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
    row: nearestHourly(entry.report.data, input.selectedAtUtc),
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
  readonly telemetry: TelemetryPort;
  readonly cache: CachePort;
  readonly config: MiniappRuntimeConfig;
  readonly auth: AuthService;
  readonly observationContexts: ObservationContextService;
  readonly contributions: ContributionService;
  readonly route: RoutePort;
  readonly placeSearch: PlaceSearchPort;
  readonly providers = new ProviderRuntime();
  readonly outbox = new MemoryOutbox();

  constructor(input: {
    repository: MiniappRepositoryPort;
    config: MiniappRuntimeConfig;
    weather: WeatherPort;
    route: RoutePort;
    placeSearch?: PlaceSearchPort;
    telemetry?: TelemetryPort;
    cache?: CachePort;
    mediaStore?: MediaObjectStorePort;
  }) {
    this.repository = input.repository;
    this.config = input.config;
    this.route = input.route;
    this.placeSearch = input.placeSearch ?? createPlaceSearchPort(input.config);
    this.telemetry = input.telemetry ?? new MemoryTelemetry();
    this.cache = input.cache ?? new MemoryCache();
    this.astronomy = new AstronomyService(
      input.weather,
      this.repository,
      this.config,
    );
    this.auth = new AuthService(this.repository, this.config);
    this.observationContexts = new ObservationContextService(
      this.repository,
      this.cache,
      this.config,
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
    return new MiniappService({
      repository,
      cache,
      config,
      weather: developmentFixtureMode
        ? new (
            await import("./test-fixtures/deterministic-weather-adapter.ts")
          ).DeterministicWeatherTestAdapter()
        : createWeatherPort(config),
      route: createRoutePort(config),
      placeSearch: createPlaceSearchPort(config),
      mediaStore: createMediaObjectStore(config),
    });
  }

  async onModuleDestroy() {
    await this.repository.close();
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
    await this.cache.deleteByPrefix("");
  }

  login(input: WechatLoginRequest) {
    return this.auth.login(input);
  }

  async resolveObservationContext(input: ObservationContextResolveRequest) {
    const context = await this.observationContexts.resolve(input);
    return envelope(context, "FRESH", [], [], {
      validAt: context.selectedAtUtc,
      contextRevision: context.revision,
    });
  }

  async getObservationContext(contextId: string) {
    const context = await this.observationContexts.get(contextId);
    return envelope(context, "FRESH", [], [], {
      validAt: context.selectedAtUtc,
      contextRevision: context.revision,
    });
  }

  async #routeEstimate(origin: Wgs84Point, destination: Wgs84Point) {
    const cacheKey =
      "route:" +
      hash({
        provider: this.route.key,
        origin: [origin.latitude.toFixed(5), origin.longitude.toFixed(5)],
        destination: [
          destination.latitude.toFixed(5),
          destination.longitude.toFixed(5),
        ],
      });
    const cached = await this.cache.get<
      Awaited<ReturnType<RoutePort["estimate"]>>
    >(cacheKey);
    if (cached) return cached;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort("route_provider_timeout"),
      8_000,
    );
    try {
      const result = await this.route.estimate({
        origin,
        destination,
        signal: controller.signal,
      });
      await this.cache.set(
        cacheKey,
        result,
        result.state === "FRESH" ? 30 * 60 : 60,
      );
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }

  async updateObservationContext(
    contextId: string,
    input: ObservationContextUpdateRequest,
  ) {
    const context = await this.observationContexts.update(contextId, input);
    await this.cache.deleteByPrefix(
      "map:" + context.contextFingerprint.slice(0, 16),
    );
    return envelope(context, "FRESH", [], [], {
      validAt: context.selectedAtUtc,
      contextRevision: context.revision,
    });
  }

  getCapabilities() {
    const routeEnabled = this.config.routeProvider === "AMAP";
    const placeSearchEnabled = this.config.placeSearchProvider === "AMAP";
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
            : "未配置具备当前许可和密钥的路线供应商",
        },
        placeSearch: {
          enabled: placeSearchEnabled,
          reason: placeSearchEnabled
            ? "已配置普通地点搜索；结果只用于移动地图和查找附近正式观星点"
            : "未配置具备当前许可、配额和密钥的普通地点搜索供应商",
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
  }): Promise<ApiEnvelope<MapSceneData>> {
    const context = await this.observationContexts.get(input.contextId);
    const filters = input.filters ?? EMPTY_FILTER_STATE;
    const layerKind = input.layer ?? "NORMAL";
    const cloudLayer = input.cloudLayer ?? context.weatherView.cloudLayer;
    const cacheKey =
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
    const cached = await this.cache.get<ApiEnvelope<MapSceneData>>(cacheKey);
    if (cached) return cached;

    const allCandidates = (await this.repository.listSpots()).filter(
      (spot) =>
        (spot.status === "PUBLISHED" ||
          spot.status === "TEMPORARILY_CLOSED") &&
        (this.repository.kind === "memory" ||
          spot.source.kind !== "TEST_FIXTURE"),
    );
    const radiusKm = input.viewport
      ? viewportRadiusKm(input.viewport.zoom)
      : null;
    let viewportSpots = allCandidates;
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
      const ids = new Set(
        (
          await this.repository.listSpotsInRadius(
            viewportCenterWgs84,
            radiusKm!,
          )
        ).map((spot) => spot.spotId),
      );
      viewportSpots = allCandidates.filter((spot) => ids.has(spot.spotId));
    }

    const query = (input.query ?? "").trim().toLocaleLowerCase("zh-CN");
    const queryMatched = query
      ? viewportSpots.filter((spot) =>
          (spot.name + spot.region + spot.address)
            .toLocaleLowerCase("zh-CN")
            .includes(query),
        )
      : viewportSpots;
    const reports: Record<string, ApiEnvelope<SkyReport>> = {};
    const evaluations: Record<string, MapSpotEvaluation> = {};
    const routeSources: SourceSummary[] = [];
    const routeOrigin =
      context.location.kind === "MAP_POINT"
        ? context.location.wgs84
        : context.routeOrigin?.wgs84 ?? null;
    const routeExplicitlyRequested =
      filters.DISTANCE_DRIVE_TIME.length > 0;
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
          const report = await this.astronomy.compute(spotContext);
          reports[spot.spotId] = report;
          const timeSignal = timeSignalFor(
            spot.spotId,
            report.data,
            context.selectedAtUtc,
          );
          const routeResult =
            routeExplicitlyRequested &&
            routeOrigin &&
            this.config.routeProvider === "AMAP"
              ? await this.#routeEstimate(routeOrigin, spot.wgs84)
              : null;
          if (routeResult) routeSources.push(routeResult.source);
          const straightDistanceKm = routeOrigin
            ? distanceMeters(
                { lat: routeOrigin.latitude, lon: routeOrigin.longitude },
                {
                  lat: spot.wgs84.latitude,
                  lon: spot.wgs84.longitude,
                },
              ) / 1_000
            : null;
          const route =
            routeResult?.state === "FRESH" &&
            routeResult.value?.kind === "ROUTE_ESTIMATE"
              ? routeResult.value
              : null;
          evaluations[spot.spotId] = {
            ...timeSignal,
            spotId: spot.spotId,
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
            distanceKm: route?.distanceKm ?? straightDistanceKm,
            driveMinutes: route?.driveMinutes ?? null,
            distanceKind: route
              ? "ROUTE"
              : straightDistanceKm === null
                ? "UNAVAILABLE"
                : "STRAIGHT_LINE",
            state: projectionState(report.dataState),
          };
        }),
      );
    }

    const filtered = queryMatched.filter((spot) =>
      matchesFilters({
        spot,
        evaluation: evaluations[spot.spotId]!,
        filters,
        ...(input.preferences ? { preferences: input.preferences } : {}),
      }),
    );
    const ranked = rankSpotsByPreferences(filtered, input.preferences);
    const favoriteSpotIds = input.userId
      ? await this.repository.listFavoriteIds(input.userId)
      : null;
    const anyWeather = Object.values(evaluations).some(
      (evaluation) => evaluation.cloudPercent !== null,
    );
    const anyEvents = Object.values(evaluations).some(
      (evaluation) => evaluation.activeEventIds.length > 0,
    );
    const routeCount = Object.values(evaluations).filter(
      (evaluation) => evaluation.driveMinutes !== null,
    ).length;
    const routeCapability = !routeExplicitlyRequested
      ? {
          state:
            routeOrigin && this.config.routeProvider === "AMAP"
              ? ("AVAILABLE" as const)
              : ("UNAVAILABLE" as const),
          reason:
            routeOrigin && this.config.routeProvider === "AMAP"
              ? "选择距离/驾车时间筛选后，才会按当前起点请求真实路线"
              : "当前没有可用路线起点或已配置的路线供应商",
          recovery:
            routeOrigin && this.config.routeProvider === "AMAP"
              ? ("NONE" as const)
              : ("REMOVE_DRIVE_TIME_FILTER" as const),
        }
      : {
          state:
            routeCount === 0
              ? ("UNAVAILABLE" as const)
              : routeCount === queryMatched.length
                ? ("AVAILABLE" as const)
                : ("PARTIAL" as const),
          reason:
            routeCount === 0
              ? "当前请求没有真实路线结果；直线距离会明确标注且不参与驾车时间筛选"
              : routeCount === queryMatched.length
                ? "基于当前地图起点和高德路线规划结果"
                : `当前 ${queryMatched.length} 个结果中有 ${routeCount} 个具备真实驾车路线`,
          recovery:
            routeCount === 0
              ? ("REMOVE_DRIVE_TIME_FILTER" as const)
              : ("NONE" as const),
        };
    const byGroup = Object.fromEntries(
      FILTER_GROUP_KEYS.map((group) => {
        if (group === "DISTANCE_DRIVE_TIME")
          return [
            group,
            {
              state: routeCapability.state,
              reason: routeCapability.reason,
            },
          ];
        if (
          [
            "TONIGHT_RECOMMENDED",
            "BEST_WINDOW_DURATION",
            "LESS_CLOUD",
            "LOW_CLOUD_THRESHOLD",
          ].includes(group)
        )
          return [
            group,
            {
              state: anyWeather ? ("AVAILABLE" as const) : ("UNAVAILABLE" as const),
              reason: anyWeather
                ? "基于当前 Observation Context 的真实预报与计算结果"
                : "当前没有可用的真实天气数据",
            },
          ];
        if (group === "SPECIFIC_CELESTIAL_EVENT")
          return [
            group,
            {
              state: anyEvents ? ("AVAILABLE" as const) : ("UNAVAILABLE" as const),
              reason: anyEvents
                ? "当前观测夜存在已加载事件"
                : "当前事件目录没有适用事件，不能假造匹配",
            },
          ];
        return [
          group,
          {
            state: "AVAILABLE" as const,
            reason: "基于正式点已发布且可追溯的字段",
          },
        ];
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
      allowTestSpotCellFallback: this.repository.kind === "memory",
    });
    const visibleEvaluations = Object.fromEntries(
      ranked.spots.flatMap((spot) => {
        const evaluation = evaluations[spot.spotId];
        return evaluation ? [[spot.spotId, evaluation] as const] : [];
      }),
    );
    const timeFrames: MapSceneTimeFrame[] = mapFrameTimes(context).map(
      (atUtc) => {
        const spotSignals = Object.fromEntries(
          ranked.spots.flatMap((spot) => {
            const report = reports[spot.spotId];
            return report
              ? [[spot.spotId, timeSignalFor(spot.spotId, report.data, atUtc)] as const]
              : [];
          }),
        );
        if (layerKind !== "CLOUD" && layerKind !== "OPPORTUNITY")
          return { atUtc, spotSignals, dynamicLayer: null };
        const frameLayer = layerFor({
          kind: layerKind,
          cloudLayer,
          selectedAtUtc: atUtc,
          spots: ranked.spots,
          reports,
          evaluations,
          config: this.config,
          darkSkyCells: [],
          allowTestSpotCellFallback: false,
        });
        return {
          atUtc,
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
      ...allCandidates.map((spot) => spot.source),
      ...Object.values(reports).flatMap((report) => report.sources),
      ...routeSources,
      ...(layer.source ? [layer.source] : []),
    ]);
    const result = envelope<MapSceneData>(
      {
        context,
        spots: ranked.spots,
        evaluations: visibleEvaluations,
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
    return result;
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
    const [candidateSpots, ordinaryResult] = normalized
      ? await Promise.all([
          this.repository.searchSpotCandidates(normalized),
          this.placeSearch.search({
            query: normalized,
            ...(region.trim() ? { region: region.trim().slice(0, 80) } : {}),
          }),
        ])
      : [
          [] as readonly SpotSummary[],
          null,
        ];
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
    const ordinaryPlaces = ordinaryResult?.value ?? [];
    const providerUnavailable = ordinaryResult?.state === "UNAVAILABLE";
    const sources = uniqueSources([
      ...formalSpots.map((spot) => spot.source),
      ...candidates.map((candidate) => candidate.source),
      ...(ordinaryResult ? [ordinaryResult.source] : []),
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
      providerUnavailable ? "PARTIAL" : "FRESH",
      sources,
      providerUnavailable
        ? ["普通地点搜索当前不可用；没有生成伪地点。正式观星点与待核验地点结果仍保持独立。"]
        : [],
    );
  }

  async getSpotOverview(spotId: string, contextId: string) {
    const context = await this.observationContexts.get(contextId);
    if (
      context.location.kind !== "FORMAL_SPOT" ||
      context.location.spotId !== spotId
    )
      throw new Error("spot_context_mismatch");
    const cacheKey =
      "spot-overview:" +
      spotId +
      ":" +
      context.contextFingerprint +
      ":" +
      String(context.revision);
    const cached = await this.cache.get<ApiEnvelope<SpotDetail>>(cacheKey);
    if (cached) return cached;
    const detail = await this.repository.getDetail(spotId as SpotId);
    if (!detail || detail.spot.status === "DATA_INSUFFICIENT")
      throw new Error("formal_spot_not_found");
    const sky = await this.astronomy.compute(context);
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
      originLabel: context.routeOrigin?.displayName ?? null,
      distanceKm: straightDistanceKm,
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
          ? "当前先显示直线距离；仅在你点击“去这里”时请求真实路线。"
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
    await this.cache.set(cacheKey, result, 300);
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
    const result = await this.#routeEstimate(
      context.routeOrigin.wgs84,
      detail.spot.wgs84,
    );
    const route: SpotDetail["route"] = {
      ...(result.value ?? detail.route),
      originLabel: context.routeOrigin.displayName,
      lastRoad: detail.route.lastRoad,
      parkingGuidance: detail.route.parkingGuidance,
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
        facilities: detail.spot.facilities,
        accessAndSafety: detail.accessAndSafety,
        siteMediaState: detail.siteMediaState,
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

  async getSky(spotId: string, contextId: string) {
    if (!spotId.startsWith("spot:"))
      throw new Error("night_requires_formal_spot_id");
    const context = await this.observationContexts.get(contextId);
    if (
      context.location.kind !== "FORMAL_SPOT" ||
      context.location.spotId !== spotId
    )
      throw new Error("spot_context_mismatch");
    const cacheKey =
      "sky:" +
      context.contextFingerprint +
      ":" +
      context.contextId +
      ":" +
      String(context.revision);
    const cached = await this.cache.get<ApiEnvelope<SkyReport>>(cacheKey);
    if (cached) return cached;
    const result = await this.astronomy.compute(context);
    await this.cache.set(cacheKey, result, 30 * 60);
    return result;
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
        canonicalDetailRoute: "/spot/detail/index",
      },
      "FRESH",
      uniqueSources(favorites.map((spot) => spot.source)),
      [],
    );
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
    return envelope(
      {
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

  async getPlans(userId: UserId) {
    const cacheKey = "plans:" + hash(userId).slice(0, 24);
    const cached =
      await this.cache.get<ApiEnvelope<{ plans: readonly ObservationPlan[] }>>(
        cacheKey,
      );
    if (cached) return cached;
    const result = envelope(
      { plans: await this.repository.listPlans(userId) },
      "FRESH",
      [],
    );
    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async savePlan(
    userId: UserId,
    input: Omit<
      ObservationPlan,
      "revision" | "updatedAt" | "contextSnapshot"
    > & {
      expectedRevision: number | null;
    },
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);
    if (
      !/^\d{4}-\d{2}-\d{2}$/u.test(input.localDate) ||
      !/^\d{2}:\d{2}$/u.test(input.localTime)
    )
      throw new Error("invalid_local_observation_time");
    const spot = await this.repository.getSpot(input.spotId);
    if (!spot || spot.status === "DATA_INSUFFICIENT")
      throw new Error("formal_spot_not_found");
    const selectedAt = zonedLocalToUtc({
      localDate: input.localDate,
      localTime: input.localTime,
      timezone: spot.timezone,
    });
    const context = await this.observationContexts.resolve({
      location: { kind: "FORMAL_SPOT", spotId: input.spotId },
      localDate: input.localDate,
      selectedAt,
      targetProfile: "DAILY",
    });
    if (context.location.kind !== "FORMAL_SPOT")
      throw new Error("formal_spot_context_required");
    const { expectedRevision, ...planInput } = input;
    const plan = await this.repository.savePlan(
      userId,
      {
        ...planInput,
        contextSnapshot: {
          schemaVersion: "observation-context-snapshot-v1",
          contextId: context.contextId,
          contextFingerprint: context.contextFingerprint,
          contextRevision: context.revision,
          spotId: context.location.spotId,
          timezone: context.timezone,
          localDate: context.localDate,
          selectedAtUtc: context.selectedAtUtc,
          eventInstanceId: context.eventInstanceId,
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
    if (
      (await this.repository.listProfileLinks(userId)).some(
        (link) =>
          link.url === validation.normalizedUrl &&
          link.profileLinkId !== input.profileLinkId,
      )
    )
      throw new Error("profile_link_duplicate");
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
      if (
        input.spotId !== null &&
        !(await this.repository.getSpot(input.spotId as SpotId))
      )
        throw new Error("formal_spot_not_found");
      next.spotId = input.spotId as SpotId | null;
      next.spotProposalId = null;
      next.proposalReviewState = "NOT_APPLICABLE";
    }
    if (input.createProposal) {
      next.spotId = null;
      next.spotProposalId =
        ("spot-proposal:" + randomUUID()) as ImportDraft["spotProposalId"];
      next.proposalReviewState = "DRAFT";
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

  async operationsSnapshot() {
    return envelope(
      {
        capabilities: this.getCapabilities().data,
        budget: this.providers.budget.snapshot(),
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
