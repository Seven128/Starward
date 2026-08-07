import Taro from "@tarojs/taro";
import {
  DEMO_POPULATION_DISCLOSURE,
  DEMO_SPOTS,
  MINIAPP_API_OPERATIONS,
  buildDemoSpotDetail,
  filterSpots,
  type ApiEnvelope,
  type ApiError,
  type DataState,
  type FilterState,
  type ImportDraft,
  type ImportStage,
  type MiniappApiOperationId,
  type MiniappApiRequest,
  type MiniappApiResponse,
  type ObservationPlan,
  type PlatformKind,
  type PreferenceRankingDisclosure,
  type ProfileLink,
  type SkyReport,
  type SourceSummary,
  type SpotDetail,
  type SpotRankingPreferences,
  type SpotSummary,
  type UserPreferences,
  type UserPreferencesRecord,
} from "@starward/miniapp-contracts";
import {
  invalidationPolicy,
  responseCacheKey,
  type MiniappMutationKind,
} from "./cache-policy";
import { recordAcceptanceDiagnostic } from "./acceptance-diagnostics";
import { miniappQueryClient } from "./query-client";
import {
  LatestRequestRegistry,
  MiniappRequestCancelled,
  isMiniappRequestCancelled,
  type RequestCancellationReason,
  usesNativeRequestTaskCancellation,
} from "./request-lifecycle";

const requests = new LatestRequestRegistry();
const responseCache = new Map<string, ApiEnvelope<unknown>>();

type RequestMethod = "GET" | "POST" | "PUT" | "DELETE";

export class MiniappApiError extends Error {
  readonly code: ApiError["code"];
  readonly retryable: boolean;
  readonly recovery: readonly string[];
  readonly requestId: string;
  readonly statusCode: number;

  constructor(error: ApiError, statusCode: number) {
    super(error.message || error.code);
    this.name = "MiniappApiError";
    this.code = error.code;
    this.retryable = error.retryable;
    this.recovery = error.recovery;
    this.requestId = error.requestId;
    this.statusCode = statusCode;
  }
}

function abortTask(task: unknown) {
  if (
    typeof task === "object" &&
    task !== null &&
    "abort" in task &&
    typeof (task as { abort?: unknown }).abort === "function"
  ) {
    (task as { abort: () => void }).abort();
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof MiniappApiError) {
    const labels: Record<ApiError["code"], string> = {
      INVALID_INPUT: "输入不符合服务端约束",
      NOT_FOUND: "目标不存在或已失效",
      PERMISSION_DENIED: "当前账号没有操作权限",
      CAPABILITY_DISABLED: "当前能力尚未开放",
      PROVIDER_UNAVAILABLE: "服务暂时不可用",
      STALE_REJECTED: "缓存已过期且不能继续使用",
      BUDGET_EXCEEDED: "外部能力预算已触发保护",
      CONFLICT: "数据已被其他修改更新",
      RATE_LIMITED: "请求过于频繁",
    };
    return `${labels[error.code]}（请求 ${error.requestId.slice(0, 8)}）`;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return String(error);
}

function etag(data: unknown) {
  const text = JSON.stringify(data);
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1)
    value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  return `W/\"local-${(value >>> 0).toString(16)}\"`;
}

function localEnvelope<T>(
  data: T,
  dataState: DataState,
  sources: readonly SourceSummary[],
  warnings: readonly string[],
): ApiEnvelope<T> {
  return {
    apiVersion: "v1",
    data,
    dataState,
    generatedAt: new Date().toISOString(),
    etag: etag(data),
    sources,
    warnings,
  };
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "requestId" in value &&
    "recovery" in value
  );
}

function idempotencyKey(prefix: string) {
  return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 12)}`;
}

async function request<T>(
  key: string,
  path: string,
  options: {
    method?: RequestMethod;
    body?: unknown;
    idempotencyKey?: string;
    signal?: AbortSignal;
  } = {},
): Promise<ApiEnvelope<T>> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let task: unknown;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let release = () => {};
    // Taro's native RequestTask is cancelled by the latest-request registry.
    // Consuming TanStack's browser-style signal in WeChat can leave a cancelled
    // query pending on the legacy Mini Program bridge, so only browser-like
    // runtimes bind that signal directly.
    const signal = usesNativeRequestTaskCancellation(Taro.getEnv())
      ? undefined
      : options.signal;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      if (watchdog) clearTimeout(watchdog);
      signal?.removeEventListener("abort", onSignalAbort);
      release();
      callback();
    };
    const cancel = (reason: RequestCancellationReason) => {
      recordAcceptanceDiagnostic(key, "cancel", reason);
      abortTask(task);
      finish(() => reject(new MiniappRequestCancelled(reason)));
    };
    const onSignalAbort = () => cancel("query_signal");

    release = requests.register(key, cancel);
    if (signal?.aborted) {
      cancel("query_signal");
      return;
    }
    signal?.addEventListener("abort", onSignalAbort, { once: true });
    recordAcceptanceDiagnostic(key, "start", Taro.getEnv());
    watchdog = setTimeout(() => {
      recordAcceptanceDiagnostic(key, "timeout", "watchdog");
      abortTask(task);
      finish(() => reject(new Error("bff_request_timeout")));
    }, 4_000);
    const method = options.method ?? "GET";
    const cacheKey = responseCacheKey(key, path);
    const cached =
      method === "GET"
        ? (responseCache.get(cacheKey) as ApiEnvelope<T> | undefined)
        : undefined;
    const header: Record<string, string> = { Accept: "application/json" };
    if (cached) header["If-None-Match"] = cached.etag;
    if (options.idempotencyKey)
      header["Idempotency-Key"] = options.idempotencyKey;
    try {
      task = Taro.request<ApiEnvelope<T> | ApiError>({
        url: `${__MINIAPP_API_BASE__}${path}`,
        method,
        timeout: 3500,
        header,
        ...(options.body === undefined ? {} : { data: options.body }),
        success(response) {
          finish(() => {
            if (response.statusCode === 304 && cached) {
              recordAcceptanceDiagnostic(key, "success", "not_modified");
              resolve(cached);
              return;
            }
            if (response.statusCode >= 200 && response.statusCode < 300) {
              const envelope = response.data as ApiEnvelope<T>;
              if (method === "GET") responseCache.set(cacheKey, envelope);
              recordAcceptanceDiagnostic(key, "success", String(response.statusCode));
              resolve(envelope);
              return;
            }
            if (isApiError(response.data)) {
              reject(new MiniappApiError(response.data, response.statusCode));
              return;
            }
            reject(new Error(`bff_http_${response.statusCode}`));
          });
        },
        fail(error) {
          const message = error.errMsg || "bff_request_failed";
          recordAcceptanceDiagnostic(
            key,
            "failure",
            /abort/iu.test(message) ? "transport_abort" : "transport_failure",
          );
          finish(() =>
            reject(
              /abort/iu.test(message)
                ? new MiniappRequestCancelled("transport_abort")
                : new Error(message),
            ),
          );
        },
      });
      if (settled) abortTask(task);
    } catch (error) {
      finish(() => reject(error));
    }
  });
}

export function invalidateApiCache(prefix = "") {
  for (const key of responseCache.keys())
    if (!prefix || key.startsWith(prefix)) responseCache.delete(key);
}

export function resetApiClientForAcceptance() {
  if (!__MINIAPP_ACCEPTANCE_DIAGNOSTICS__)
    throw new Error("acceptance_api_reset_unavailable");
  const cancelled = requests.cancelAll("manual");
  responseCache.clear();
  return cancelled;
}

async function invalidateAfter(mutation: MiniappMutationKind) {
  const policy = invalidationPolicy(mutation);
  for (const prefix of policy.responsePrefixes)
    invalidateApiCache(prefix);
  await Promise.all(
    policy.queryRoots.map((root) =>
      miniappQueryClient.invalidateQueries({ queryKey: [root] }),
    ),
  );
}

type OperationData<K extends MiniappApiOperationId> =
  MiniappApiResponse<K>["data"];

function operationPath(
  operationId: MiniappApiOperationId,
  pathParams: Readonly<Record<string, string>> = {},
  query = "",
) {
  let value: string = MINIAPP_API_OPERATIONS[operationId].path;
  for (const [key, replacement] of Object.entries(pathParams))
    value = value.replace(`{${key}}`, encodeURIComponent(replacement));
  if (/\{[^}]+\}/u.test(value))
    throw new Error(`miniapp_sdk_path_parameter_missing:${operationId}`);
  return query ? `${value}?${query}` : value;
}

async function requestOperation<K extends MiniappApiOperationId>(
  key: string,
  operationId: K,
  options?: {
    pathParams?: Readonly<Record<string, string>>;
    query?: string;
    body?: MiniappApiRequest<K>;
    idempotencyKey?: string;
    signal?: AbortSignal;
  },
): Promise<MiniappApiResponse<K>> {
  return request<OperationData<K>>(
    key,
    operationPath(operationId, options?.pathParams, options?.query),
    {
      method: MINIAPP_API_OPERATIONS[operationId].method,
      ...(options?.body === undefined ? {} : { body: options.body }),
      ...(options?.idempotencyKey
        ? { idempotencyKey: options.idempotencyKey }
        : {}),
      ...(options?.signal ? { signal: options.signal } : {}),
    },
  ) as Promise<MiniappApiResponse<K>>;
}

export async function getMapScene(
  filters: FilterState,
  query = "",
  viewport?: {
    center: { latitude: number; longitude: number };
    zoom: number;
  },
  preferences?: SpotRankingPreferences,
  signal?: AbortSignal,
) {
  try {
    const params = [
      `filters=${encodeURIComponent(JSON.stringify(filters))}`,
      ...(query ? [`q=${encodeURIComponent(query)}`] : []),
      ...(viewport
        ? [
            `centerLat=${viewport.center.latitude.toFixed(6)}`,
            `centerLng=${viewport.center.longitude.toFixed(6)}`,
            `zoom=${viewport.zoom}`,
          ]
        : []),
      ...(preferences
        ? [`preferences=${encodeURIComponent(JSON.stringify(preferences))}`]
        : []),
    ].join("&");
    return await requestOperation("map-scene", "mapSceneGet", {
      query: params,
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (isMiniappRequestCancelled(error)) throw error;
    const spots = filterSpots(DEMO_SPOTS, filters).filter(
      (spot) =>
        !query || `${spot.name}${spot.region}${spot.address}`.includes(query),
    );
    return localEnvelope(
      {
        spots,
        favoriteSpotIds: null,
        preferenceRanking: {
          applied: [],
          deferred: ["服务端排序不可用，保留本地策展顺序"],
          requiredFacilities: preferences?.requiredFacilities ?? [],
          summary: "离线快照未重写点位事实；联网后可按偏好刷新排序。",
          changesFacts: false,
        },
        filterCapabilities: {
          driveTime: {
            state: "UNAVAILABLE",
            reason: "离线快照不提供驾车时间推算",
            recovery: "REMOVE_DRIVE_TIME_FILTER",
          },
        },
        population: DEMO_POPULATION_DISCLOSURE,
        viewportMode: "OFFLINE_TRIAL_SNAPSHOT",
        viewport: null,
        clusterBelowZoom: 9,
        debounceMs: 250,
        requestCancellation: "RequestTask.abort",
        lightLayer: {
          state: "ESTIMATED",
          source: "Demo radial fallback",
          dataDate: "2026-08-06",
        },
      },
      "STALE_USABLE",
      [
        ...new Map(
          DEMO_SPOTS.map((spot) => [spot.source.id, spot.source]),
        ).values(),
      ],
      [
        `本地 BFF 不可用：${errorMessage(error)}。已使用可追溯点位快照；当前动态事实不可用。`,
      ],
    );
  }
}

export async function getSpotDetail(
  spotId: string,
  signal?: AbortSignal,
): Promise<ApiEnvelope<SpotDetail>> {
  try {
    return await requestOperation(
      `spot-detail:${spotId}`,
      "spotDetailGet",
      { pathParams: { spotId }, ...(signal ? { signal } : {}) },
    );
  } catch (error) {
    if (isMiniappRequestCancelled(error)) throw error;
    const detail = buildDemoSpotDetail(spotId);
    if (!detail) throw new Error("formal_spot_not_found");
    return localEnvelope(detail, "STALE_USABLE", detail.dataDisclosure, [
      `本地 BFF 不可用：${errorMessage(error)}。仅展示静态身份、代表媒体和明确的数据不足状态。`,
    ]);
  }
}

export async function getSpotOverview(
  spotId: string,
  signal?: AbortSignal,
): Promise<ApiEnvelope<SpotDetail>> {
  try {
    return await requestOperation(
      `spot-overview:${spotId}`,
      "spotOverviewGet",
      { pathParams: { spotId }, ...(signal ? { signal } : {}) },
    );
  } catch (error) {
    if (isMiniappRequestCancelled(error)) throw error;
    const detail = buildDemoSpotDetail(spotId);
    if (!detail) throw new Error("formal_spot_not_found");
    return localEnvelope(
      { ...detail, guides: [] },
      "STALE_USABLE",
      detail.dataDisclosure,
      [
        `本地 BFF 不可用：${errorMessage(error)}。概览使用离线静态快照。`,
      ],
    );
  }
}

export async function getSpotGuides(spotId: string, signal?: AbortSignal) {
  try {
    return await requestOperation(
      `spot-guides:${spotId}`,
      "spotGuidesGet",
      { pathParams: { spotId }, ...(signal ? { signal } : {}) },
    );
  } catch (error) {
    if (isMiniappRequestCancelled(error)) throw error;
    const detail = buildDemoSpotDetail(spotId);
    if (!detail) throw new Error("formal_spot_not_found");
    return localEnvelope(
      { spotId, guides: detail.guides },
      "STALE_USABLE",
      detail.guides.map((guide) => guide.source),
      [
        `攻略使用离线结构化 Demo 内容：${errorMessage(error)}`,
      ],
    );
  }
}

export async function getSpotSite(spotId: string, signal?: AbortSignal) {
  try {
    return await requestOperation(`spot-site:${spotId}`, "spotSiteGet", {
      pathParams: { spotId },
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (isMiniappRequestCancelled(error)) throw error;
    const detail = buildDemoSpotDetail(spotId);
    if (!detail) throw new Error("formal_spot_not_found");
    return localEnvelope(
      {
        spotId,
        facilities: detail.spot.facilities,
        siteSafety: detail.siteSafety,
        sources: detail.dataDisclosure,
      },
      "PARTIAL",
      detail.dataDisclosure,
      [
        `场地事实不足：${errorMessage(error)}。UNKNOWN 保持可见。`,
      ],
    );
  }
}

function offlineSky(spotId: string, localDate: string): SkyReport {
  const spot = DEMO_SPOTS.find((item) => item.spotId === spotId);
  if (!spot) throw new Error("formal_spot_not_found");
  const source: SourceSummary = {
    id: `offline-sky-${spotId}-${localDate}`,
    kind: "DEMO_FIXTURE",
    provider: "离线能力门禁",
    title: "天文 BFF 未运行",
    sourceUrl: "",
    license: "No runtime fact",
    licenseUrl: "",
    publishedAt: null,
    retrievedAt: new Date().toISOString(),
    validFrom: null,
    validTo: null,
    state: "UNAVAILABLE",
    confidence: null,
    precision: "不生成天体位置、天气或最佳窗口",
    limitations: ["启动本地模块化 BFF 后才进行版本化 Astronomy Engine 计算"],
  };
  return {
    context: {
      spotId: spot.spotId,
      localDate,
      at: null,
      timezone: spot.timezone,
      targetProfile: "BEGINNER",
      dataRevision: "offline-unavailable",
      algorithmVersion: "capability-gated",
      catalogVersion: "bright-objects-v1",
    },
    decision: {
      recommendation: "DATA_INSUFFICIENT",
      label: "数据不足，暂不能判断",
      bestWindow: null,
      suitableFor: [],
      factors: [
        {
          code: "ASTRONOMY_BFF_UNAVAILABLE",
          label: "计算服务不可用",
          severity: "BLOCKER",
          detail: "没有把设计示例或缓存硬写成当前天文事实。",
          sourceIds: [source.id],
        },
      ],
      confidence: null,
      freshness: "UNAVAILABLE",
      algorithmVersion: "starward-tonight-decision-v1-hard-blocker-first",
      inputDigest: `offline:${spotId}:${localDate}`,
    },
    targets: [],
    hourly: [],
    milkyWayDirection: "暂无当前计算",
    moonSummary: "暂无当前计算",
    compass: { state: "UNAVAILABLE", manualOffsetDeg: 0 },
    precachedHours: 0,
    offlineReady: false,
    sources: [source],
  };
}

export async function getSkyReport(
  spotId: string,
  localDate: string,
  signal?: AbortSignal,
): Promise<ApiEnvelope<SkyReport>> {
  if (!spotId.startsWith("spot:"))
    throw new Error("night_requires_formal_spot_id");
  try {
    return await requestOperation(
      `spot-sky:${spotId}:${localDate}`,
      "spotSkyGet",
      {
        pathParams: { spotId },
        query: `localDate=${encodeURIComponent(localDate)}`,
        ...(signal ? { signal } : {}),
      },
    );
  } catch (error) {
    if (isMiniappRequestCancelled(error)) throw error;
    const data = offlineSky(spotId, localDate);
    return localEnvelope(data, "UNAVAILABLE", data.sources, [
      `本地 BFF 不可用：${errorMessage(error)}。已保留点位/日期上下文和重试路径。`,
    ]);
  }
}

export async function getFavorites(signal?: AbortSignal) {
  return requestOperation("favorites", "favoritesGet", signal ? { signal } : undefined);
}

export async function getUserLibrary(signal?: AbortSignal) {
  return requestOperation("user-library", "libraryGet", signal ? { signal } : undefined);
}

export async function getPreferences(signal?: AbortSignal) {
  return requestOperation("preferences", "preferencesGet", signal ? { signal } : undefined);
}

export async function savePreferences(
  preferences: UserPreferences,
  expectedRevision: number,
) {
  const result = await requestOperation(
    "preferences-mutation",
    "preferencesPut",
    {
      body: { preferences, expectedRevision },
      idempotencyKey: idempotencyKey("preferences"),
    },
  );
  await invalidateAfter("PREFERENCES");
  return result;
}

export async function setFavoriteRelation(spotId: string, favorite: boolean) {
  const result = await requestOperation(`favorite-mutation:${spotId}`, "favoritePut", {
    pathParams: { spotId },
    body: { favorite },
    idempotencyKey: idempotencyKey("favorite"),
  });
  await invalidateAfter("FAVORITE");
  return result;
}

export async function getPlans(signal?: AbortSignal) {
  return requestOperation("plans", "plansGet", signal ? { signal } : undefined);
}

export async function saveObservationPlan(
  plan: Omit<ObservationPlan, "revision" | "updatedAt">,
  expectedRevision: number | null,
) {
  const result = await requestOperation(
    `plan-mutation:${plan.planId}`,
    "planPut",
    {
      pathParams: { planId: plan.planId },
      body: {
        spotId: plan.spotId,
        localDate: plan.localDate,
        localTime: plan.localTime,
        notes: plan.notes,
        expectedRevision,
      },
      idempotencyKey: idempotencyKey("plan-save"),
    },
  );
  await invalidateAfter("PLAN");
  return result;
}

export async function deleteObservationPlan(planId: string) {
  const result = await requestOperation(
    `plan-delete:${planId}`,
    "planDelete",
    {
      pathParams: { planId },
      idempotencyKey: idempotencyKey("plan-delete"),
    },
  );
  await invalidateAfter("PLAN");
  return result;
}

export async function getProfileLinks(signal?: AbortSignal) {
  return requestOperation("profile-links", "profileLinksGet", signal ? { signal } : undefined);
}

export async function createProfileLink(input: {
  platform: PlatformKind;
  displayName: string;
  url: string;
  visibility: "PRIVATE" | "PUBLIC";
  sortOrder: number;
}) {
  const result = await requestOperation(
    "profile-link-mutation",
    "profileLinkPost",
    {
      body: input,
      idempotencyKey: idempotencyKey("profile-link"),
    },
  );
  await invalidateAfter("PROFILE_LINK");
  return result;
}

export async function deleteProfileLink(profileLinkId: string) {
  const result = await requestOperation(
    `profile-link-delete:${profileLinkId}`,
    "profileLinkDelete",
    {
      pathParams: { profileLinkId },
      idempotencyKey: idempotencyKey("profile-link-delete"),
    },
  );
  await invalidateAfter("PROFILE_LINK");
  return result;
}

export async function createPostImport(input: {
  platform: PlatformKind;
  originalUrl: string;
  rightsConfirmed: boolean;
}) {
  const result = await requestOperation("import-create", "importPost", {
    body: input,
    idempotencyKey: idempotencyKey("import-create"),
  });
  await invalidateAfter("IMPORT");
  return result;
}

export async function getPostImport(importDraftId: string, signal?: AbortSignal) {
  return requestOperation(
    `import:${importDraftId}`,
    "importGet",
    {
      pathParams: { importId: importDraftId },
      ...(signal ? { signal } : {}),
    },
  );
}

export async function updatePostImport(
  importDraftId: string,
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
) {
  const result = await requestOperation(
    `import-mutation:${importDraftId}`,
    "importPut",
    {
      pathParams: { importId: importDraftId },
      body: input,
      idempotencyKey: idempotencyKey("import-update"),
    },
  );
  await invalidateAfter("IMPORT");
  return result;
}

export function cancelRequest(key: string) {
  requests.cancel(key);
}
