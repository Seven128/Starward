import { createHash, randomUUID } from "node:crypto";
import {
  DEMO_FEATURE_FLAGS,
  DEMO_POPULATION_DISCLOSURE,
  EMPTY_FILTER_STATE,
  filterSpots,
  viewportRadiusKm,
  type ApiEnvelope,
  type DataState,
  type FilterState,
  type ImportDraft,
  type ImportDraftId,
  type ImportStage,
  type ObservationPlan,
  type PlatformKind,
  type PreferenceRankingDisclosure,
  type ProfileLink,
  type ProfileLinkId,
  type SkyReport,
  type SourceSummary,
  type SpotDetail,
  type SpotId,
  type SpotRankingPreferences,
  type SpotSummary,
  type UserPreferences,
} from "@starward/miniapp-contracts";
import { gcj02ToWgs84 } from "@starward/coordinate-system";
import { AstronomyService } from "./astronomy-service.ts";
import { MemoryCache, RedisCache } from "./cache.ts";
import type {
  CachePort,
  MiniappRepositoryPort,
  TelemetryPort,
} from "./ports.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { InMemoryDemoRepository } from "./repository.ts";
import {
  AUTO_IMPORT_POLICY,
  parserGate,
  validateExternalUrl,
} from "./security.ts";
import { DemoOutbox, MemoryTelemetry, ProviderRuntime } from "./runtime.ts";

function hash(value: unknown) {
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
    etag: `W/\"${hash({ data, state }).slice(0, 24)}\"`,
    sources,
    warnings,
  };
}

function assertIdempotencyKey(value: string) {
  if (!/^[a-zA-Z0-9:_-]{12,128}$/u.test(value))
    throw new Error("invalid_idempotency_key");
}

function currentLocalDate(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
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
        deferred: ["尚未传入用户选点偏好，保留策展顺序"],
        requiredFacilities: [],
        summary: "当前按试点策展顺序展示；事实字段未被偏好改写。",
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
      `${spot.name}${spot.region}${spot.address}`.toLowerCase().includes(place);
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
      score: (placeMatch ? 8 : 0) + facilityMatches * 3 + (beginnerAccess ? 1 : 0),
    };
  });
  scored.sort((left, right) => right.score - left.score || left.index - right.index);
  const applied = [
    ...(place ? [`默认地点“${preferences.defaultPlace.trim()}”`] : []),
    ...(preferences.requiredFacilities.length
      ? [`${preferences.requiredFacilities.length} 项必须设施的已核验可用状态`]
      : []),
    ...(preferences.experience === "BEGINNER" ? ["入门者低步行负担"] : []),
  ];
  const deferred = [
    `最长驾车 ${preferences.maxDriveMinutes} 分钟：路线供应商关闭时不参与排序`,
    `设备/拍摄偏好：进入点位夜空后用于目标解释，不改写点位事实`,
  ];
  return {
    spots: scored.map((item) => item.spot),
    disclosure: {
      applied,
      deferred,
      requiredFacilities: preferences.requiredFacilities,
      summary: applied.length
        ? `已按${applied.join("、")}调整候选顺序；没有隐藏或改写来源事实。`
        : "未设置可用于地图排序的偏好；保留策展顺序。",
      changesFacts: false,
    },
  };
}

function assertUserPreferences(value: UserPreferences) {
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
  if (value.notificationEnabled && !DEMO_FEATURE_FLAGS.NOTIFICATION_ENABLED)
    throw new Error("notification_capability_disabled");
}

export class MiniappService {
  readonly repository: MiniappRepositoryPort;
  readonly astronomy: AstronomyService;
  readonly telemetry: TelemetryPort;
  readonly cache: CachePort;
  readonly providers = new ProviderRuntime();
  readonly outbox = new DemoOutbox();

  constructor(
    input: {
      repository?: MiniappRepositoryPort;
      telemetry?: TelemetryPort;
      cache?: CachePort;
    } = {},
  ) {
    this.repository = input.repository ?? new InMemoryDemoRepository();
    this.astronomy = new AstronomyService();
    this.telemetry = input.telemetry ?? new MemoryTelemetry();
    this.cache = input.cache ?? new MemoryCache();
  }

  static async createFromEnvironment() {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    const storageMode =
      process.env.MINIAPP_STORAGE_MODE?.trim().toLowerCase() ??
      (databaseUrl ? "postgres" : "memory");
    if (storageMode === "memory") {
      if (process.env.NODE_ENV === "production")
        throw new Error("production_requires_postgres_storage");
      return new MiniappService();
    }
    if (storageMode !== "postgres")
      throw new Error(`unsupported_storage_mode:${storageMode}`);
    if (!databaseUrl) throw new Error("postgres_database_url_required");
    const repository = await new PostgresMiniappRepository(databaseUrl).initialize(
      { migrate: process.env.MINIAPP_AUTO_MIGRATE === "1" },
    );
    const redisUrl = process.env.REDIS_URL?.trim();
    const cache = redisUrl
      ? await new RedisCache(
          redisUrl,
          process.env.MINIAPP_CACHE_PREFIX ?? "starward:miniapp:v1:",
        ).initialize()
      : new MemoryCache();
    return new MiniappService({ repository, cache });
  }

  async onModuleDestroy() {
    await this.repository.close();
    await this.cache.close();
  }

  async resetAcceptanceState() {
    if (
      process.env.MINIAPP_ACCEPTANCE_MODE !== "1" ||
      !(this.repository instanceof InMemoryDemoRepository) ||
      !(this.telemetry instanceof MemoryTelemetry)
    )
      throw new Error("acceptance_reset_requires_explicit_memory_mode");
    this.repository.resetForAcceptance();
    this.telemetry.resetForAcceptance();
    this.outbox.resetForAcceptance();
    await this.cache.deleteByPrefix("");
  }

  getCapabilities() {
    return envelope(
      {
        flags: DEMO_FEATURE_FLAGS,
        parser: AUTO_IMPORT_POLICY,
        externalOpen: {
          enabled: false,
          copyFallback: true,
          reason: "微信业务域名与第三方深链白名单未核验",
        },
        routeProvider: {
          enabled: false,
          externalMapFallback: true,
          reason: "未配置具备当前许可和密钥的路线供应商",
        },
        weatherProvider: {
          enabled: false,
          cachedFallback: false,
          reason: "未配置具备当前许可和密钥的天气供应商",
        },
        mediaUpload: {
          enabled: false,
          manualTextDraft: true,
          reason: "未配置私有对象存储与审核回调",
        },
      },
      "FRESH",
      [],
      ["能力关闭是可审计 Demo 状态，不表示平台授权已经获得。"],
    );
  }

  async getMapScene(input: {
    filters?: FilterState;
    query?: string;
    viewport?: { center: { latitude: number; longitude: number }; zoom: number };
    preferences?: SpotRankingPreferences;
  }) {
    const filters = input.filters ?? EMPTY_FILTER_STATE;
    const cacheKey = `map:${hash({
      filters,
      query: input.query ?? "",
      viewport: input.viewport ?? null,
      preferences: input.preferences ?? null,
    })}`;
    const cached = await this.cache.get<
      ApiEnvelope<{
        spots: SpotSummary[];
        favoriteSpotIds: readonly SpotId[];
        preferenceRanking: PreferenceRankingDisclosure;
        filterCapabilities: {
          driveTime: {
            state: "UNAVAILABLE";
            reason: string;
            recovery: "REMOVE_DRIVE_TIME_FILTER";
          };
        };
        population: typeof DEMO_POPULATION_DISCLOSURE;
        viewportMode: string;
        viewport: {
          coordinateSystem: "GCJ02";
          center: { latitude: number; longitude: number };
          zoom: number;
          radiusKm: number;
          eligibleInViewport: number;
          excludedOutsideViewport: number;
        } | null;
        clusterBelowZoom: number;
        debounceMs: number;
        requestCancellation: string;
        lightLayer: {
          state: "ESTIMATED";
          legend: string;
          dataDate: string;
          source: string;
          boundedGeometry: boolean;
        };
      }>
    >(cacheKey);
    if (cached) return cached;
    const all = await this.repository.listSpots();
    const radiusKm = input.viewport
      ? viewportRadiusKm(input.viewport.zoom)
      : null;
    let viewportSpots = all;
    if (input.viewport) {
      const converted = gcj02ToWgs84({
        lat: input.viewport.center.latitude,
        lon: input.viewport.center.longitude,
        system: "GCJ-02",
      });
      viewportSpots = await this.repository.listSpotsInRadius(
        {
          system: "WGS84",
          latitude: converted.lat,
          longitude: converted.lon,
        },
        radiusKm!,
      );
    }
    const routeFilterUnavailable = filters.DRIVE_TIME.length > 0;
    const filteredByKnownFacts = filterSpots(viewportSpots, filters).filter(
      (spot) =>
        !input.query ||
        `${spot.name}${spot.region}${spot.address}`
          .toLowerCase()
          .includes(input.query.toLowerCase()),
    );
    const filtered = routeFilterUnavailable ? [] : filteredByKnownFacts;
    const ranked = rankSpotsByPreferences(filtered, input.preferences);
    const favoriteSpotIds = await this.repository.listFavoriteIds();
    this.telemetry.event("map_scene_loaded", {
      formalSpotCount: ranked.spots.length,
      filterCount: Object.values(filters).flat().length,
      region: "shenzhen-3h-v1",
    });
    const result = envelope(
      {
        spots: ranked.spots,
        favoriteSpotIds,
        preferenceRanking: ranked.disclosure,
        filterCapabilities: {
          driveTime: {
            state: "UNAVAILABLE" as const,
            reason:
              "未配置具备当前许可的驾车路线供应商；不把直线距离或设计示例冒充驾车时间",
            recovery: "REMOVE_DRIVE_TIME_FILTER" as const,
          },
        },
        population: DEMO_POPULATION_DISCLOSURE,
        viewportMode: input.viewport
          ? "BOUNDED_VIEWPORT_PLUS_20_PERCENT_BUFFER"
          : "TRIAL_REGION_COMPLETE_POPULATION",
        viewport: input.viewport
          ? {
              coordinateSystem: "GCJ02" as const,
              center: input.viewport.center,
              zoom: input.viewport.zoom,
              radiusKm: radiusKm!,
              eligibleInViewport: viewportSpots.length,
              excludedOutsideViewport: all.length - viewportSpots.length,
            }
          : null,
        clusterBelowZoom: 9,
        debounceMs: 250,
        requestCancellation: "AbortController",
        lightLayer: {
          state: "ESTIMATED",
          legend: "约 3–6 级以下候选（粗估）",
          dataDate: "2026-08-06",
          source: "Demo radial fallback; no VIIRS raster connected",
          boundedGeometry: true,
        },
      },
      ranked.spots.length ? "PARTIAL" : "PARTIAL",
      [...new Map(all.map((spot) => [spot.source.id, spot.source])).values()],
      ranked.spots.length
        ? [
            "点位身份可追溯；设施、光害与当前开放均需进一步核验。",
            ranked.disclosure.summary,
          ]
        : routeFilterUnavailable
          ? [
              "驾车时间筛选需要按需路线计算；当前能力门禁关闭，因此不返回伪匹配。请移除驾车时间筛选或进入点位详情使用外部地图回退。",
            ]
          : ["当前筛选无结果；地图与筛选上下文保持。"],
    );
    await this.cache.set(cacheKey, result, 120);
    return result;
  }

  async search(query: string, history: readonly string[] = []) {
    const normalized = query.trim();
    const all = await this.repository.listSpots();
    const formalSpots = normalized
      ? all.filter((spot) =>
            `${spot.name}${spot.region}${spot.address}`
              .toLowerCase()
              .includes(normalized.toLowerCase()),
          )
      : [];
    const ordinaryPlaces =
      normalized && formalSpots.length === 0
        ? [
            {
              placeId: `ordinary:${hash(normalized).slice(0, 10)}`,
              label: normalized,
              kind: "ORDINARY_PLACE",
              actions: [
                "RECENTER_WITH_PROVIDER",
                "FIND_NEARBY_FORMAL_SPOTS",
                "CREATE_SPOT_PROPOSAL",
              ],
              spotId: null,
              nightSkyAllowed: false,
              dataState: "UNAVAILABLE",
            },
          ]
        : [];
    return envelope(
      {
        formalSpots,
        ordinaryPlaces,
        history: history.map((label) => ({ label, clearable: true })),
      },
      formalSpots.length || ordinaryPlaces.length ? "PARTIAL" : "FRESH",
      formalSpots.map((spot) => spot.source),
      ["普通地点不创建 spot_id，也不能进入夜空。"],
    );
  }

  async getSpotDetail(spotId: string) {
    const detail = await this.repository.getDetail(spotId as SpotId);
    if (!detail) throw new Error("formal_spot_not_found");
    const sky = await this.astronomy.compute({
      spotId: detail.spot.spotId,
      localDate: currentLocalDate(detail.spot.timezone),
      at: null,
      targetProfile: "BEGINNER",
    });
    const sources = [
      ...detail.dataDisclosure,
      ...sky.sources,
    ].filter(
      (source, index, all) =>
        all.findIndex((candidate) => candidate.id === source.id) === index,
    );
    const hydrated = { ...detail, decision: sky.data.decision, dataDisclosure: sources };
    this.telemetry.event("spot_detail_loaded", {
      spotId,
      state: hydrated.decision.freshness,
    });
    return envelope(hydrated, "SAMPLE_DATA", sources, [
      "静态身份与代表媒体可用；天气结论为明确标注的 Demo 情景，开放和设施事实仍需核验。",
    ]);
  }

  async getSpotOverview(spotId: string) {
    const cacheKey = `spot-overview:${spotId}`;
    const cached = await this.cache.get<ApiEnvelope<SpotDetail>>(cacheKey);
    if (cached) return cached;
    const full = await this.getSpotDetail(spotId);
    const result = envelope(
      { ...full.data, guides: [] },
      full.dataState,
      full.sources,
      [
        ...full.warnings,
        "首屏只返回头部与概览；攻略、场地和夜空按分段首次进入加载。",
      ],
    );
    await this.cache.set(cacheKey, result, 600);
    return result;
  }

  async getSpotGuides(spotId: string) {
    const detail = await this.repository.getDetail(spotId as SpotId);
    if (!detail) throw new Error("formal_spot_not_found");
    return envelope(
      { spotId: detail.spot.spotId, guides: detail.guides },
      "STALE_USABLE",
      detail.guides.map((guide) => guide.source),
      ["Demo 仅含官方/白名单结构化攻略；不执行任意 HTML。"],
    );
  }

  async getSpotSite(spotId: string) {
    const detail = await this.repository.getDetail(spotId as SpotId);
    if (!detail) throw new Error("formal_spot_not_found");
    return envelope(
      {
        spotId: detail.spot.spotId,
        facilities: detail.spot.facilities,
        siteSafety: detail.siteSafety,
        sources: detail.dataDisclosure,
      },
      "PARTIAL",
      detail.dataDisclosure,
      ["设施与现场事实不足时显示 UNKNOWN，不替换为 0 或肯定状态。"],
    );
  }

  async getSky(input: {
    spotId: string;
    localDate: string;
    at?: string | null;
    targetProfile?: "BEGINNER" | "PHOTOGRAPHER" | "ADVANCED";
  }) {
    if (!input.spotId.startsWith("spot:"))
      throw new Error("night_requires_formal_spot_id");
    const cacheKey = `sky:${hash(input)}`;
    const cached = await this.cache.get<ApiEnvelope<SkyReport>>(cacheKey);
    if (cached) return cached;
    const result = await this.astronomy.compute({
      spotId: input.spotId as SpotId,
      localDate: input.localDate,
      at: input.at ?? null,
      targetProfile: input.targetProfile ?? "BEGINNER",
    });
    await this.cache.set(cacheKey, result, 86_400);
    return result;
  }

  async getFavorites() {
    const ids = new Set(await this.repository.listFavoriteIds());
    const favorites = (await this.repository.listSpots()).filter((spot) =>
      ids.has(spot.spotId),
    );
    return envelope(
      {
        favorites,
        sortOptions: ["FAVORITED_AT", "DISTANCE", "RECENT_CONDITION"],
        canonicalDetailRoute: "/spot/detail/index",
      },
      favorites.length ? "STALE_USABLE" : "FRESH",
      favorites.map((spot) => spot.source),
      ["收藏关系为本地静态事实；动态摘要不可用时仍保留。"],
    );
  }

  async getUserLibrary() {
    const [favorites, plans, profileLinks, preferences, imports] = await Promise.all([
      this.getFavorites(),
      this.repository.listPlans(),
      this.repository.listProfileLinks(),
      this.repository.getPreferences(),
      this.repository.listImportDrafts(),
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
      [
        ...favorites.warnings,
        "这是“我的”首屏唯一聚合业务读取；分项编辑仍使用独立幂等写端点。",
      ],
    );
  }

  async getPreferences() {
    return envelope(await this.repository.getPreferences(), "FRESH", []);
  }

  async savePreferences(
    input: { preferences: UserPreferences; expectedRevision: number },
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);
    assertUserPreferences(input.preferences);
    if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 1)
      throw new Error("preferences_revision_invalid");
    return envelope(
      await this.repository.savePreferences(
        input.preferences,
        input.expectedRevision,
        idempotencyKey,
      ),
      "FRESH",
      [],
      ["偏好只参与排序与解释，不能改写来源事实或安全硬阻断。"],
    );
  }

  async setFavorite(spotId: string, favorite: boolean, idempotencyKey: string) {
    assertIdempotencyKey(idempotencyKey);
    await this.repository.setFavorite(
      spotId as SpotId,
      favorite,
      idempotencyKey,
    );
    if (this.repository.kind === "memory")
      this.outbox.enqueue("DECISION", `favorite-audit:${idempotencyKey}`, {
        spotId,
        favorite,
      });
    await this.cache.deleteByPrefix("favorites:");
    await this.cache.deleteByPrefix("map:");
    return await this.getFavorites();
  }

  async getPlans() {
    const cacheKey = "plans:demo-user";
    const cached = await this.cache.get<
      ApiEnvelope<{ plans: readonly ObservationPlan[] }>
    >(cacheKey);
    if (cached) return cached;
    const result = envelope(
      { plans: await this.repository.listPlans() },
      "FRESH",
      [],
    );
    await this.cache.set(cacheKey, result, 300);
    return result;
  }
  async savePlan(
    input: Omit<ObservationPlan, "revision" | "updatedAt"> & {
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
    const { expectedRevision, ...planInput } = input;
    const plan = await this.repository.savePlan(
      { ...planInput, revision: 0, updatedAt: new Date().toISOString() },
      expectedRevision,
      idempotencyKey,
    );
    await this.cache.deleteByPrefix("plans:");
    return envelope(plan, "FRESH", []);
  }
  async deletePlan(planId: string, idempotencyKey: string) {
    assertIdempotencyKey(idempotencyKey);
    await this.repository.deletePlan(planId, idempotencyKey);
    await this.cache.deleteByPrefix("plans:");
    return await this.getPlans();
  }

  async listProfileLinks() {
    return envelope(
      {
        links: await this.repository.listProfileLinks(),
        tryOpenEnabled: false,
        copyFallback: true,
      },
      "FRESH",
      [],
      ["Try Open 受业务域名与深链能力门禁控制；复制链接始终可用。"],
    );
  }
  async saveProfileLink(
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
    assertIdempotencyKey(idempotencyKey);
    const validation = validateExternalUrl(input.url);
    if (!validation.ok || !validation.normalizedUrl)
      throw new Error(`profile_link_invalid:${validation.code}`);
    if (!input.displayName.trim() || input.displayName.length > 80)
      throw new Error("profile_link_label_invalid");
    if (
      (await this.repository.listProfileLinks()).some(
          (link) =>
            link.url === validation.normalizedUrl &&
            link.profileLinkId !== input.profileLinkId,
        )
    )
      throw new Error("profile_link_duplicate");
    const now = new Date().toISOString();
    const link: ProfileLink = {
      profileLinkId: (input.profileLinkId ??
        `profile-link:${randomUUID()}`) as ProfileLinkId,
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
      await this.repository.saveProfileLink(link, idempotencyKey),
      "FRESH",
      [],
      ["保存链接不表示第三方隶属、API、抓取或深链授权。"],
    );
  }

  async deleteProfileLink(id: string, idempotencyKey: string) {
    assertIdempotencyKey(idempotencyKey);
    await this.repository.deleteProfileLink(id, idempotencyKey);
    return await this.listProfileLinks();
  }

  async createImportDraft(
    input: {
      platform: PlatformKind;
      originalUrl: string;
      rightsConfirmed: boolean;
    },
    idempotencyKey: string,
  ) {
    assertIdempotencyKey(idempotencyKey);
    const gate = parserGate(input.platform, input.originalUrl);
    if (!gate.validation.ok || !gate.validation.normalizedUrl)
      throw new Error(`import_source_invalid:${gate.validation.code}`);
    const draft: ImportDraft = {
      importDraftId: `import:${randomUUID()}` as ImportDraftId,
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
      await this.repository.saveImportDraft(draft, null, idempotencyKey),
      "FRESH",
      [],
      [
        gate.allowed
          ? "自动解析可请求。"
          : "自动解析未获许可或未配置；手动导入保持可用。",
      ],
    );
  }

  async getImportDraft(id: string) {
    const draft = await this.repository.getImportDraft(id);
    if (!draft) throw new Error("import_draft_not_found");
    return envelope(draft, "FRESH", [], [
      "来源沿袭、字段修订和两条独立审核状态从持久化草稿回读。",
    ]);
  }

  async listImportDrafts() {
    return envelope(
      { imports: await this.repository.listImportDrafts() },
      "FRESH",
      [],
      ["列表只返回当前 Demo 用户的自有草稿与审核状态。"],
    );
  }

  async updateImportDraft(
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
    const current = await this.repository.getImportDraft(id);
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
        `spot-proposal:${randomUUID()}` as ImportDraft["spotProposalId"];
      next.proposalReviewState = "DRAFT";
    }
    if (input.stage && input.stage !== current.stage) {
      if (!ALLOWED_STAGE_TRANSITIONS[current.stage].includes(input.stage))
        throw new Error("import_stage_transition_invalid");
      if (input.stage === "EDIT_DRAFT" && !next.rightsConfirmed)
        throw new Error("rights_attestation_required");
      if (
        input.stage === "PREVIEW" &&
        !next.spotId &&
        !next.spotProposalId
      )
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
      next,
      input.expectedRevision,
      idempotencyKey,
    );
    if (saved.stage === "SUBMIT" && this.repository.kind === "memory")
      this.outbox.enqueue(
        "MEDIA",
        `moderation:${saved.importDraftId}:${saved.revision}`,
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
