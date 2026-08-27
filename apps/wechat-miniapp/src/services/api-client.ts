import Taro from "@tarojs/taro";
import {
  MINIAPP_API_BASE_PATH,
  MINIAPP_API_OPERATIONS,
  type ApiEnvelope,
  type ApiError,
  type AuthSessionData,
  type ContributionDraftRequest,
  type ContributionId,
  type ContributionUpdateRequest,
  type ContributionUploadCompleteRequest,
  type ContributionUploadId,
  type ContributionUploadSessionRequest,
  type FilterState,
  type ImportStage,
  type MapLayerKind,
  type MiniappApiOperationId,
  type MiniappApiRequest,
  type MiniappApiResponse,
  type ObservationContext,
  type ObservationContextId,
  type ObservationContextResolveRequest,
  type ObservationContextUpdateRequest,
  type ObservationPlan,
  type PlatformKind,
  type SpotRankingPreferences,
  type SpotId,
  type UserPreferences,
} from "@starward/miniapp-contracts";
import { localFailureMessage } from "@/utils/presentation";
import { observationContextRecoveryInput } from "./observation-context-recovery";
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
  type RequestCancellationReason,
} from "./request-lifecycle";

const SESSION_STORAGE_KEY = "starward.wechat-miniapp.auth.current";
const INSTALLATION_STORAGE_KEY =
  "starward.wechat-miniapp.installation.current";
const RESPONSE_CACHE_STORAGE_KEY =
  "starward.wechat-miniapp.response-cache.current";
const MAX_PERSISTED_RESPONSES = 24;
const MAX_PERSISTED_RESPONSE_BYTES = 300_000;
const MAX_STALE_AGE_MS = 30 * 60 * 1_000;
const SESSION_EXPIRY_SKEW_MS = 60_000;

const requests = new LatestRequestRegistry();

type RequestMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
type AuthPolicy = "NONE" | "OPTIONAL" | "REQUIRED";
type AnyEnvelope = ApiEnvelope<unknown>;

interface CachedResponse {
  envelope: AnyEnvelope;
  storedAt: number;
}

interface PersistedResponseCache {
  schemaVersion: 1;
  entries: readonly (readonly [string, CachedResponse])[];
}

const responseCache = new Map<string, CachedResponse>();
let responseCacheLoaded = false;
let sessionPromise: Promise<AuthSessionData> | null = null;

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
    return labels[error.code];
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return localFailureMessage(message);
  }
  return localFailureMessage(String(error ?? ""));
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

function isEnvelope(value: unknown): value is AnyEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { apiVersion?: unknown }).apiVersion === "v2" &&
    typeof (value as { generatedAt?: unknown }).generatedAt === "string" &&
    typeof (value as { requestId?: unknown }).requestId === "string" &&
    Array.isArray((value as { warnings?: unknown }).warnings) &&
    Array.isArray((value as { sources?: unknown }).sources)
  );
}

function idempotencyKey(prefix: string) {
  return (
    prefix +
    ":" +
    Date.now().toString(36) +
    ":" +
    Math.random().toString(36).slice(2, 12)
  );
}

function loadResponseCache() {
  if (responseCacheLoaded) return;
  responseCacheLoaded = true;
  try {
    const value = Taro.getStorageSync(RESPONSE_CACHE_STORAGE_KEY) as unknown;
    if (
      typeof value !== "object" ||
      value === null ||
      (value as { schemaVersion?: unknown }).schemaVersion !== 1 ||
      !Array.isArray((value as { entries?: unknown }).entries)
    )
      return;
    for (const entry of (
      value as PersistedResponseCache
    ).entries.slice(-MAX_PERSISTED_RESPONSES)) {
      if (
        Array.isArray(entry) &&
        typeof entry[0] === "string" &&
        typeof entry[1] === "object" &&
        entry[1] !== null &&
        Number.isFinite(entry[1].storedAt) &&
        isEnvelope(entry[1].envelope)
      )
        responseCache.set(entry[0], entry[1]);
    }
  } catch {
    // Cache I/O is optional. Failure never creates product data.
  }
}

function persistResponseCache() {
  try {
    const entries = [...responseCache.entries()]
      .sort((left, right) => right[1].storedAt - left[1].storedAt)
      .slice(0, MAX_PERSISTED_RESPONSES);
    const payload: PersistedResponseCache = { schemaVersion: 1, entries };
    Taro.setStorageSync(RESPONSE_CACHE_STORAGE_KEY, payload);
  } catch {
    // A valid network response remains usable if storage is full.
  }
}

function cacheResponse(key: string, envelope: AnyEnvelope) {
  if (JSON.stringify(envelope).length > MAX_PERSISTED_RESPONSE_BYTES) return;
  responseCache.set(key, { envelope, storedAt: Date.now() });
  while (responseCache.size > MAX_PERSISTED_RESPONSES) {
    const oldest = [...responseCache.entries()].sort(
      (left, right) => left[1].storedAt - right[1].storedAt,
    )[0];
    if (!oldest) break;
    responseCache.delete(oldest[0]);
  }
  persistResponseCache();
}

function staleCandidate<T>(
  cached: CachedResponse | undefined,
  failure: string,
): ApiEnvelope<T> | null {
  if (!cached || Date.now() - cached.storedAt > MAX_STALE_AGE_MS) return null;
  const envelope = cached.envelope;
  if (
    envelope.dataState === "EXPIRED" ||
    envelope.dataState === "UNAVAILABLE" ||
    envelope.dataState === "SAMPLE_DATA" ||
    envelope.sources.some((source) => source.kind === "TEST_FIXTURE")
  )
    return null;
  const age = Math.max(
    1,
    Math.round((Date.now() - cached.storedAt) / 60_000),
  );
  return {
    ...(envelope as ApiEnvelope<T>),
    dataState: "STALE_USABLE",
    warnings: [
      ...envelope.warnings,
      "网络暂不可用，显示 " +
        age +
        " 分钟内同一请求的真实响应。" +
        failure,
    ],
  };
}

function readStoredSession(): AuthSessionData | null {
  try {
    const value = Taro.getStorageSync(SESSION_STORAGE_KEY) as unknown;
    if (
      typeof value !== "object" ||
      value === null ||
      typeof (value as { userId?: unknown }).userId !== "string" ||
      typeof (value as { accessToken?: unknown }).accessToken !== "string" ||
      typeof (value as { expiresAt?: unknown }).expiresAt !== "string"
    )
      return null;
    const session = value as AuthSessionData;
    if (
      !Number.isFinite(Date.parse(session.expiresAt)) ||
      Date.parse(session.expiresAt) <= Date.now() + SESSION_EXPIRY_SKEW_MS
    ) {
      Taro.removeStorageSync(SESSION_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function clearStoredSession() {
  sessionPromise = null;
  try {
    Taro.removeStorageSync(SESSION_STORAGE_KEY);
  } catch {
    // A failed local deletion cannot authorize a server request.
  }
}

function installationIdentity() {
  try {
    const existing = Taro.getStorageSync(INSTALLATION_STORAGE_KEY) as unknown;
    if (
      typeof existing === "string" &&
      existing.startsWith("local:") &&
      existing.length >= 22
    )
      return existing;
    const created =
      "local:device-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 14);
    Taro.setStorageSync(INSTALLATION_STORAGE_KEY, created);
    return created;
  } catch {
    return (
      "local:ephemeral-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 14)
    );
  }
}

async function resolveSession(
  policy: AuthPolicy,
): Promise<AuthSessionData | null> {
  if (policy === "NONE") return null;
  try {
    return await ensureSession();
  } catch (error) {
    if (policy === "REQUIRED") throw error;
    return null;
  }
}

async function request<T>(
  key: string,
  path: string,
  options: {
    method?: RequestMethod;
    body?: unknown;
    idempotencyKey?: string;
    signal?: AbortSignal;
    session?: AuthSessionData | null;
  } = {},
): Promise<ApiEnvelope<T>> {
  loadResponseCache();
  return new Promise((resolve, reject) => {
    let settled = false;
    let task: unknown;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let release = () => {};
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      if (watchdog) clearTimeout(watchdog);
      release();
      callback();
    };
    const cancel = (reason: RequestCancellationReason) => {
      recordAcceptanceDiagnostic(key, "cancel", reason);
      abortTask(task);
      finish(() => reject(new MiniappRequestCancelled(reason)));
    };

    release = requests.register(key, cancel);
    recordAcceptanceDiagnostic(key, "start", Taro.getEnv());

    const method = options.method ?? "GET";
    const scope = options.session?.userId ?? "anonymous";
    const exactCacheKey =
      responseCacheKey(key, path) + ":" + String(scope);
    const cached =
      method === "GET" ? responseCache.get(exactCacheKey) : undefined;
    const header: Record<string, string> = { Accept: "application/json" };
    if (__MINIAPP_OPERATOR_PREVIEW_TOKEN__)
      header["X-Starward-Operator-Preview"] =
        __MINIAPP_OPERATOR_PREVIEW_TOKEN__;
    if (cached) header["If-None-Match"] = cached.envelope.etag;
    if (options.idempotencyKey)
      header["Idempotency-Key"] = options.idempotencyKey;
    if (options.session)
      header.Authorization = "Bearer " + options.session.accessToken;

    const transportFallback = (failure: string, error: Error) => {
      const stale = staleCandidate<T>(cached, failure);
      if (stale) {
        recordAcceptanceDiagnostic(key, "success", "stale_real_response");
        resolve(stale);
      } else {
        reject(error);
      }
    };

    watchdog = setTimeout(() => {
      recordAcceptanceDiagnostic(key, "timeout", "watchdog");
      abortTask(task);
      finish(() =>
        transportFallback(
          "请求超时，请联网后刷新。",
          new Error("bff_request_timeout"),
        ),
      );
    }, 12_000);

    try {
      task = Taro.request<ApiEnvelope<T> | ApiError>({
        url: __MINIAPP_API_BASE__.replace(/\/+$/u, "") + path,
        method,
        timeout: 10_000,
        header,
        ...(options.body === undefined ? {} : { data: options.body }),
        success(response) {
          finish(() => {
            if (response.statusCode === 304 && cached) {
              recordAcceptanceDiagnostic(key, "success", "not_modified");
              resolve(cached.envelope as ApiEnvelope<T>);
              return;
            }
            if (response.statusCode >= 200 && response.statusCode < 300) {
              if (!isEnvelope(response.data)) {
                reject(new Error("bff_response_contract_invalid"));
                return;
              }
              const envelope = response.data as ApiEnvelope<T>;
              if (method === "GET")
                cacheResponse(exactCacheKey, envelope as AnyEnvelope);
              recordAcceptanceDiagnostic(
                key,
                "success",
                String(response.statusCode),
              );
              resolve(envelope);
              return;
            }
            if (isApiError(response.data)) {
              reject(new MiniappApiError(response.data, response.statusCode));
              return;
            }
            reject(new Error("bff_http_" + response.statusCode));
          });
        },
        fail(error) {
          const message = error.errMsg || "bff_request_failed";
          if (/abort/iu.test(message)) {
            recordAcceptanceDiagnostic(key, "failure", "transport_abort");
            finish(() =>
              reject(new MiniappRequestCancelled("transport_abort")),
            );
            return;
          }
          recordAcceptanceDiagnostic(key, "failure", "transport_failure");
          finish(() =>
            transportFallback(
              "连接失败，请联网后刷新。",
              new Error(message),
            ),
          );
        },
      });
      if (settled) abortTask(task);
    } catch (error) {
      finish(() =>
        transportFallback(
          "请求未能发出，请联网后刷新。",
          error instanceof Error ? error : new Error(String(error)),
        ),
      );
    }
  });
}

export function invalidateApiCache(prefix = "") {
  loadResponseCache();
  for (const key of responseCache.keys())
    if (!prefix || key.startsWith(prefix)) responseCache.delete(key);
  persistResponseCache();
}

export function resetApiNetworkCacheForAcceptance() {
  if (!__MINIAPP_ACCEPTANCE_DIAGNOSTICS__)
    throw new Error("acceptance_api_reset_unavailable");
  const cancelled = requests.cancelAll("manual");
  responseCache.clear();
  responseCacheLoaded = true;
  try {
    Taro.removeStorageSync(RESPONSE_CACHE_STORAGE_KEY);
  } catch {
    // Live network caches are still reset when storage is unavailable.
  }
  return cancelled;
}

export function resetApiClientForAcceptance() {
  const cancelled = resetApiNetworkCacheForAcceptance();
  clearStoredSession();
  try {
    Taro.removeStorageSync(INSTALLATION_STORAGE_KEY);
  } catch {
    // Live state is still reset when storage is unavailable.
  }
  return cancelled;
}

async function invalidateAfter(mutation: MiniappMutationKind) {
  const policy = invalidationPolicy(mutation);
  for (const prefix of policy.responsePrefixes) invalidateApiCache(prefix);
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
    value = value.replace(
      "{" + key + "}",
      encodeURIComponent(replacement),
    );
  if (/\{[^}]+\}/u.test(value))
    throw new Error(
      "miniapp_sdk_path_parameter_missing:" + operationId,
    );
  const path = MINIAPP_API_BASE_PATH + value;
  return query ? path + "?" + query : path;
}

async function requestOperation<K extends MiniappApiOperationId>(
  key: string,
  operationId: K,
  options: {
    pathParams?: Readonly<Record<string, string>>;
    query?: string;
    body?: MiniappApiRequest<K>;
    idempotencyKey?: string;
    signal?: AbortSignal;
    auth?: AuthPolicy;
  } = {},
  retried = false,
): Promise<MiniappApiResponse<K>> {
  const policy = options.auth ?? "NONE";
  const session = await resolveSession(policy);
  try {
    return (await request<OperationData<K>>(
      key,
      operationPath(operationId, options.pathParams, options.query),
      {
        method: MINIAPP_API_OPERATIONS[operationId].method,
        ...(options.body === undefined ? {} : { body: options.body }),
        ...(options.idempotencyKey
          ? { idempotencyKey: options.idempotencyKey }
          : {}),
        ...(options.signal ? { signal: options.signal } : {}),
        ...(session ? { session } : {}),
      },
    )) as MiniappApiResponse<K>;
  } catch (error) {
    if (
      !retried &&
      policy !== "NONE" &&
      error instanceof MiniappApiError &&
      error.code === "PERMISSION_DENIED"
    ) {
      clearStoredSession();
      return requestOperation(key, operationId, options, true);
    }
    throw error;
  }
}

async function ensureSession(force = false): Promise<AuthSessionData> {
  if (!force) {
    const stored = readStoredSession();
    if (stored) return stored;
    if (sessionPromise) return sessionPromise;
  } else {
    clearStoredSession();
  }
  sessionPromise = (async () => {
    const capabilities = await requestOperation(
      "capabilities:auth",
      "capabilitiesGet",
      { auth: "NONE" },
    );
    const code = capabilities.data.flags.WECHAT_AUTH_ENABLED
      ? (await Taro.login()).code
      : installationIdentity();
    if (!code) throw new Error("wechat_login_code_missing");
    const result = await requestOperation("auth:login", "wechatLoginPost", {
      auth: "NONE",
      body: { code },
    });
    Taro.setStorageSync(SESSION_STORAGE_KEY, result.data);
    return result.data;
  })();
  try {
    return await sessionPromise;
  } catch (error) {
    sessionPromise = null;
    throw error;
  }
}

export function getCapabilities(signal?: AbortSignal) {
  return requestOperation(
    "capabilities",
    "capabilitiesGet",
    signal ? { signal } : {},
  );
}

export function resolveObservationContext(
  input: ObservationContextResolveRequest,
  signal?: AbortSignal,
) {
  return requestOperation(
    "observation-context:resolve",
    "observationContextPost",
    {
      body: input,
      ...(signal ? { signal } : {}),
    },
  );
}

export function getObservationContext(
  contextId: string,
  signal?: AbortSignal,
) {
  return requestOperation(
    "observation-context:" + contextId,
    "observationContextGet",
    {
      pathParams: { contextId },
      ...(signal ? { signal } : {}),
    },
  );
}

/**
 * Persisted Context is a client-side recovery hint, not server authority. A
 * server restart or expiry may invalidate its ID; only those explicit states
 * rebuild the same product context. Transport failures keep normal offline
 * cache semantics and never silently create a different location or date.
 */
export async function restoreObservationContext(
  context: ObservationContext,
  signal?: AbortSignal,
) {
  try {
    return await getObservationContext(context.contextId, signal);
  } catch (error) {
    if (
      !(error instanceof MiniappApiError) ||
      (error.code !== "NOT_FOUND" && error.code !== "STALE_REJECTED")
    )
      throw error;
    let routeOriginContextId: string | null = null;
    if (context.routeOrigin) {
      const routeOrigin = await resolveObservationContext(
        {
          location: {
            kind: "MAP_POINT",
            displayName: context.routeOrigin.displayName,
            wgs84: context.routeOrigin.wgs84,
            source: context.routeOrigin.source,
            ...(context.timezone === "Asia/Hong_Kong" ||
            context.timezone === "Asia/Shanghai"
              ? { timezoneHint: context.timezone }
              : {}),
          },
          localDate: context.localDate,
          selectedAt: context.selectedAtUtc,
          eventInstanceId: context.eventInstanceId,
          targetProfile: context.targetProfile,
        },
        signal,
      );
      routeOriginContextId = routeOrigin.data.contextId;
    }
    return resolveObservationContext(
      observationContextRecoveryInput(context, routeOriginContextId),
      signal,
    );
  }
}

export { observationContextRecoveryInput };

export async function updateObservationContext(
  context: ObservationContext,
  input: Omit<ObservationContextUpdateRequest, "expectedRevision">,
  signal?: AbortSignal,
) {
  const result = await requestOperation(
    "observation-context:" + context.contextId,
    "observationContextPatch",
    {
      pathParams: { contextId: context.contextId },
      body: { ...input, expectedRevision: context.revision },
      idempotencyKey: idempotencyKey("observation-context"),
      ...(signal ? { signal } : {}),
    },
  );
  invalidateApiCache("map-scene");
  invalidateApiCache("spot-overview");
  invalidateApiCache("spot-sky");
  return result;
}

export function searchPlaces(
  query: string,
  signal?: AbortSignal,
  region = "",
) {
  return requestOperation("place-search", "searchGet", {
    query:
      "q=" +
      encodeURIComponent(query) +
      (region.trim() ? "&region=" + encodeURIComponent(region.trim()) : ""),
    ...(signal ? { signal } : {}),
  });
}

export function estimateSpotRoute(
  contextId: ObservationContextId,
  spotId: SpotId,
  signal?: AbortSignal,
) {
  return requestOperation("route-estimate:" + spotId, "routeEstimatePost", {
    body: { contextId, spotId },
    ...(signal ? { signal } : {}),
  });
}

export function getMapScene(
  contextId: string,
  filters: FilterState,
  query = "",
  viewport?: {
    center: { latitude: number; longitude: number };
    zoom: number;
  },
  preferences?: SpotRankingPreferences,
  layer: MapLayerKind = "NORMAL",
  cloudLayer: ObservationContext["weatherView"]["cloudLayer"] = "TOTAL",
  signal?: AbortSignal,
) {
  const params = [
    "contextId=" + encodeURIComponent(contextId),
    "filters=" + encodeURIComponent(JSON.stringify(filters)),
    "layer=" + encodeURIComponent(layer),
    "cloudLayer=" + encodeURIComponent(cloudLayer),
    ...(query ? ["q=" + encodeURIComponent(query)] : []),
    ...(viewport
      ? [
          "centerLat=" + viewport.center.latitude.toFixed(6),
          "centerLng=" + viewport.center.longitude.toFixed(6),
          "zoom=" + viewport.zoom,
        ]
      : []),
    ...(preferences
      ? [
          "preferences=" +
            encodeURIComponent(JSON.stringify(preferences)),
        ]
      : []),
  ].join("&");
  return requestOperation("map-scene", "mapSceneGet", {
    auth: "OPTIONAL",
    query: params,
    ...(signal ? { signal } : {}),
  });
}

export function getSpotOverview(
  spotId: string,
  contextId: string,
  signal?: AbortSignal,
) {
  return requestOperation(
    "spot-overview:" + spotId,
    "spotOverviewGet",
    {
      pathParams: { spotId },
      query: "contextId=" + encodeURIComponent(contextId),
      ...(signal ? { signal } : {}),
    },
  );
}

export function getSpotGuides(spotId: string, signal?: AbortSignal) {
  return requestOperation(
    "spot-guides:" + spotId,
    "spotGuidesGet",
    {
      pathParams: { spotId },
      ...(signal ? { signal } : {}),
    },
  );
}

export function getSpotSite(spotId: string, signal?: AbortSignal) {
  return requestOperation("spot-site:" + spotId, "spotSiteGet", {
    pathParams: { spotId },
    ...(signal ? { signal } : {}),
  });
}

export function getSkyReport(
  spotId: string,
  contextId: string,
  signal?: AbortSignal,
) {
  if (!spotId.startsWith("spot:"))
    throw new Error("night_requires_formal_spot_id");
  return requestOperation("spot-sky:" + spotId, "spotSkyGet", {
    pathParams: { spotId },
    query: "contextId=" + encodeURIComponent(contextId),
    ...(signal ? { signal } : {}),
  });
}

export function getFavorites(signal?: AbortSignal) {
  return requestOperation("favorites", "favoritesGet", {
    auth: "REQUIRED",
    ...(signal ? { signal } : {}),
  });
}

export function getUserLibrary(signal?: AbortSignal) {
  return requestOperation("user-library", "libraryGet", {
    auth: "REQUIRED",
    ...(signal ? { signal } : {}),
  });
}

export function getPreferences(signal?: AbortSignal) {
  return requestOperation("preferences", "preferencesGet", {
    auth: "REQUIRED",
    ...(signal ? { signal } : {}),
  });
}

export async function savePreferences(
  preferences: UserPreferences,
  expectedRevision: number,
) {
  const result = await requestOperation(
    "preferences-mutation",
    "preferencesPut",
    {
      auth: "REQUIRED",
      body: { preferences, expectedRevision },
      idempotencyKey: idempotencyKey("preferences"),
    },
  );
  await invalidateAfter("PREFERENCES");
  return result;
}

export async function setFavoriteRelation(
  spotId: string,
  favorite: boolean,
) {
  const result = await requestOperation(
    "favorite-mutation:" + spotId,
    "favoritePut",
    {
      auth: "REQUIRED",
      pathParams: { spotId },
      body: { favorite },
      idempotencyKey: idempotencyKey("favorite"),
    },
  );
  await invalidateAfter("FAVORITE");
  return result;
}

export function getPlans(signal?: AbortSignal) {
  return requestOperation("plans", "plansGet", {
    auth: "REQUIRED",
    ...(signal ? { signal } : {}),
  });
}

export async function saveObservationPlan(
  plan: Omit<
    ObservationPlan,
    "revision" | "updatedAt" | "contextSnapshot"
  >,
  expectedRevision: number | null,
) {
  const result = await requestOperation(
    "plan-mutation:" + plan.planId,
    "planPut",
    {
      auth: "REQUIRED",
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
    "plan-delete:" + planId,
    "planDelete",
    {
      auth: "REQUIRED",
      pathParams: { planId },
      idempotencyKey: idempotencyKey("plan-delete"),
    },
  );
  await invalidateAfter("PLAN");
  return result;
}

export function getProfileLinks(signal?: AbortSignal) {
  return requestOperation("profile-links", "profileLinksGet", {
    auth: "REQUIRED",
    ...(signal ? { signal } : {}),
  });
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
      auth: "REQUIRED",
      body: input,
      idempotencyKey: idempotencyKey("profile-link"),
    },
  );
  await invalidateAfter("PROFILE_LINK");
  return result;
}

export async function deleteProfileLink(profileLinkId: string) {
  const result = await requestOperation(
    "profile-link-delete:" + profileLinkId,
    "profileLinkDelete",
    {
      auth: "REQUIRED",
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
  const result = await requestOperation(
    "import-create",
    "importPost",
    {
      auth: "REQUIRED",
      body: input,
      idempotencyKey: idempotencyKey("import-create"),
    },
  );
  await invalidateAfter("IMPORT");
  return result;
}

export function getPostImports(signal?: AbortSignal) {
  return requestOperation("imports", "importsGet", {
    auth: "REQUIRED",
    ...(signal ? { signal } : {}),
  });
}

export function getPostImport(
  importDraftId: string,
  signal?: AbortSignal,
) {
  return requestOperation("import:" + importDraftId, "importGet", {
    auth: "REQUIRED",
    pathParams: { importId: importDraftId },
    ...(signal ? { signal } : {}),
  });
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
    "import-mutation:" + importDraftId,
    "importPut",
    {
      auth: "REQUIRED",
      pathParams: { importId: importDraftId },
      body: input,
      idempotencyKey: idempotencyKey("import-update"),
    },
  );
  await invalidateAfter("IMPORT");
  return result;
}

export function getContributions(signal?: AbortSignal) {
  return requestOperation("contributions", "contributionsGet", {
    auth: "REQUIRED",
    ...(signal ? { signal } : {}),
  });
}

export async function createContributionDraft(
  input: ContributionDraftRequest,
) {
  const result = await requestOperation(
    "contribution-create",
    "contributionPost",
    {
      auth: "REQUIRED",
      body: input,
      idempotencyKey: idempotencyKey("contribution-create"),
    },
  );
  invalidateApiCache("contributions");
  await miniappQueryClient.invalidateQueries({ queryKey: ["contributions"] });
  return result;
}

export async function updateContributionDraft(
  submissionId: ContributionId,
  input: ContributionUpdateRequest,
) {
  const result = await requestOperation(
    "contribution-update:" + submissionId,
    "contributionPut",
    {
      auth: "REQUIRED",
      pathParams: { submissionId },
      body: input,
      idempotencyKey: idempotencyKey("contribution-update"),
    },
  );
  invalidateApiCache("contributions");
  return result;
}

export async function createContributionUpload(
  submissionId: ContributionId,
  input: ContributionUploadSessionRequest,
) {
  const result = await requestOperation(
    "contribution-upload-create:" + submissionId,
    "contributionUploadPost",
    {
      auth: "REQUIRED",
      pathParams: { submissionId },
      body: input,
      idempotencyKey: idempotencyKey("contribution-upload-create"),
    },
  );
  invalidateApiCache("contributions");
  return result;
}

export async function completeContributionUpload(
  submissionId: ContributionId,
  uploadId: ContributionUploadId,
  input: ContributionUploadCompleteRequest,
) {
  const result = await requestOperation(
    "contribution-upload-complete:" + uploadId,
    "contributionUploadPut",
    {
      auth: "REQUIRED",
      pathParams: { submissionId, uploadId },
      body: input,
      idempotencyKey: idempotencyKey("contribution-upload-complete"),
    },
  );
  invalidateApiCache("contributions");
  return result;
}

export async function submitContribution(
  submissionId: ContributionId,
  expectedRevision: number,
) {
  const result = await requestOperation(
    "contribution-submit:" + submissionId,
    "contributionSubmitPost",
    {
      auth: "REQUIRED",
      pathParams: { submissionId },
      body: { expectedRevision },
      idempotencyKey: idempotencyKey("contribution-submit"),
    },
  );
  invalidateApiCache("contributions");
  await miniappQueryClient.invalidateQueries({ queryKey: ["contributions"] });
  return result;
}

export function cancelRequest(key: string) {
  requests.cancel(key);
}
