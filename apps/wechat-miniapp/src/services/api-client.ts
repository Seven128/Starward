import { createAccountProfileClient } from "./account-profile-client";
import { createSpotEnvironmentClient } from "./spot-environment-client";
import { projectAdoptedSkyCatalog } from "./sky-report-catalog";
import { createStellarCatalogClient } from "./stellar-catalog-client";
import { createSaoCatalogClient } from "./sao-catalog-client";
import { createConstellationCatalogClient } from "./constellation-catalog-client";
import { createPlanChecklistClient } from "./plan-checklist-client";
import { createPlanSubscriptionClient } from "./plan-subscription-client";
import { createAuthenticatedOperationRequester } from "./authenticated-operation";
import Taro from "@tarojs/taro";
import { clearPlanSaveRecovery, createPlanSaveRetry, planSaveBelongsTo } from "./plan-save-retry";
import { planChecklistBelongsTo } from "../content/plan/detail/plan-checklist";
import { planEventSelectionBelongsTo } from "../content/plan/detail/plan-event-selection";
import { importLocalDraftBelongsTo } from "../content/import/local-draft";
import { clearImportSaveRecovery, createImportSaveRetry, importSaveBelongsTo } from "./import-save-retry";
import { contributionDraftBelongsTo, planDraftBelongsTo, profileDraftBelongsTo } from "./local-draft-keys";
import { contributionSubmitBelongsTo, createContributionSubmitRetry } from "./contribution-submit-retry";
import { clearProfileSaveRecovery, createProfileLinkRetry, profileSaveBelongsTo } from "./profile-link-retry";
import {
  MINIAPP_API_BASE_PATH,
  CONSTELLATION_CATALOG_VERSION,
  isCelestialObjectReference,
  MINIAPP_API_OPERATIONS,
  type ApiEnvelope,
  type ApiError,
  type AuthSessionData,
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
  type TerrainOverlayRequest,
  type UserPreferences,
} from "@starward/miniapp-contracts";
import { localFailureMessage } from "@/utils/presentation";
import { observationContextRecoveryInput } from "./observation-context-recovery";
import {
  invalidationPolicy,
  isTemporaryCacheKey,
  responseCacheKey,
  type MiniappMutationKind,
} from "./cache-policy";
import { recordAcceptanceDiagnostic } from "./acceptance-diagnostics";
import { createDeviceFailureReporter } from "./device-request-diagnostic";
import { miniappQueryClient } from "./query-client";
import { createResponseCache, isResponseEnvelope, MAX_STALE_AGE_MS, type CachedResponse } from "./response-cache";
import { createMutationRetry } from "./mutation-retry";
import {
  LatestRequestRegistry,
  MiniappRequestCancelled,
  type RequestCancellationReason,
} from "./request-lifecycle";

const SESSION_STORAGE_KEY = "starward.wechat-miniapp.auth.current";
const INSTALLATION_STORAGE_KEY =
  "starward.wechat-miniapp.installation.current";
const SESSION_EXPIRY_SKEW_MS = 60_000;

const requests = new LatestRequestRegistry();
const reportDeviceFailure = __MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__
  ? createDeviceFailureReporter((content) => console.info(content))
  : undefined;

type RequestMethod = "GET" | "POST" | "PUT" | "DELETE";
type AuthPolicy = "NONE" | "OPTIONAL" | "REQUIRED";
type AnyEnvelope = ApiEnvelope<unknown>;

const responseCache = createResponseCache(Taro);
let sessionPromise: Promise<AuthSessionData> | null = null;
// A server-confirmed erasure must stay revoked in this runtime even when the
// native store cannot remove its old session. This is not a disk-erasure claim.
let erasedStoredAccountId: string | null = null;

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
  if (typeof error === "object" && error !== null && "errMsg" in error) {
    const message = (error as { errMsg?: unknown }).errMsg;
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
  return isResponseEnvelope(value);
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
    if (session.userId === erasedStoredAccountId) return null;
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

/** Local drafts may be scoped by identity, never by an access token. */
export function currentDraftUserId(): string | null {
  return readStoredSession()?.userId ?? null;
}

function clearStoredSession() {
  sessionPromise = null;
  try {
    Taro.removeStorageSync(SESSION_STORAGE_KEY);
    return true;
  } catch {
    // A failed local deletion cannot authorize a server request.
    return false;
  }
}

function markAccountErased(userId: string) {
  erasedStoredAccountId = userId;
  sessionPromise = null;
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
    reauthenticationCode?: string;
    cache?: boolean;
  } = {},
): Promise<ApiEnvelope<T>> {
  if (options.signal?.aborted)
    throw new MiniappRequestCancelled("query_signal");
  responseCache.load();
  return new Promise((resolve, reject) => {
    let settled = false;
    let task: unknown;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let release = () => {};
    let releaseCache = () => {};
    const finish = (callback: () => void, abort = false) => {
      if (settled) return;
      settled = true;
      if (watchdog) clearTimeout(watchdog);
      options.signal?.removeEventListener("abort", onAbort);
      release();
      releaseCache();
      // Native abort may synchronously re-enter fail. Own the result first.
      if (abort) {
        try {
          abortTask(task);
        } catch {
          recordAcceptanceDiagnostic(key, "failure", "transport_abort_failed");
        }
      }
      callback();
    };
    const cancel = (reason: RequestCancellationReason) => {
      finish(() => {
        recordAcceptanceDiagnostic(key, "cancel", reason);
        reject(new MiniappRequestCancelled(reason));
      }, true);
    };
    const onAbort = () => cancel("query_signal");

    const method = options.method ?? "GET";
    release = requests.register(key, cancel, method === "GET");
    recordAcceptanceDiagnostic(key, "start", Taro.getEnv());

    const scope = options.session?.userId ?? "anonymous";
    const exactCacheKey =
      responseCacheKey(key, path) + ":" + String(scope);
    const cached =
      method === "GET" && options.cache !== false
        ? responseCache.get(exactCacheKey)
        : undefined;
    const cacheFence = responseCache.beginRequest(exactCacheKey);
    releaseCache = cacheFence.release;
    const header: Record<string, string> = { Accept: "application/json" };
    // WeChat defaults to JSON; an empty DELETE body must not trigger JSON parsing.
    if (method === "DELETE" && options.body === undefined) header["Content-Type"] = "text/plain";
    if (__MINIAPP_OPERATOR_PREVIEW_TOKEN__)
      header["X-Starward-Operator-Preview"] =
        __MINIAPP_OPERATOR_PREVIEW_TOKEN__;
    if (cached) header["If-None-Match"] = cached.envelope.etag;
    if (options.idempotencyKey)
      header["Idempotency-Key"] = options.idempotencyKey;
    if (options.session)
      header.Authorization = "Bearer " + options.session.accessToken;
    if (options.reauthenticationCode)
      header["X-Wechat-Reauth-Code"] = options.reauthenticationCode;

    const transportFallback = (failure: string, error: Error) => {
      const stale = staleCandidate<T>(cached && responseCache.isCurrent(exactCacheKey, cached, cacheFence) ? cached : undefined, failure);
      if (stale) {
        recordAcceptanceDiagnostic(key, "success", "stale_real_response");
        resolve(stale);
      } else {
        reject(error);
      }
    };

    const transportFailure = (error: { errMsg?: string }) => {
      const message = error?.errMsg || "bff_request_failed";
      if (/abort/iu.test(message)) {
        finish(() => {
          recordAcceptanceDiagnostic(key, "failure", "transport_abort");
          reject(new MiniappRequestCancelled("transport_abort"));
        });
        return;
      }
      finish(() => {
        recordAcceptanceDiagnostic(key, "failure", "transport_failure");
        if (__MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__) reportDeviceFailure?.("transport", error);
        transportFallback(
          "连接失败，请联网后刷新。",
          new Error(message),
        );
      });
    };

    watchdog = setTimeout(() => {
      finish(() => {
        if (__MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__) reportDeviceFailure?.("watchdog");
        recordAcceptanceDiagnostic(key, "timeout", "watchdog");
        transportFallback(
          "请求超时，请联网后刷新。",
          new Error("bff_request_timeout"),
        );
      }, true);
    }, 12_000);

    try {
      options.signal?.addEventListener("abort", onAbort, { once: true });
      if (options.signal?.aborted) {
        onAbort();
        return;
      }
      task = Taro.request<ApiEnvelope<T> | ApiError>({
        url: __MINIAPP_API_BASE__.replace(/\/+$/u, "") + path,
        method,
        timeout: 10_000,
        header,
        // WeChat's request transport can send a bodyless POST as invalid input.
        // An empty object preserves the operation's no-payload contract.
        ...(options.body === undefined ? (method === "POST" ? { data: {} } : {}) : { data: options.body }),
        success(response) {
          finish(() => {
            if (response.statusCode === 304 && cached && responseCache.isCurrent(exactCacheKey, cached, cacheFence)) {
              recordAcceptanceDiagnostic(key, "success", "not_modified");
              resolve(cached.envelope as ApiEnvelope<T>);
              return;
            }
            if (response.statusCode >= 200 && response.statusCode < 300) {
              if (!isEnvelope(response.data)) {
                if (__MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__) reportDeviceFailure?.("contract", undefined, response.statusCode);
                reject(new Error("bff_response_contract_invalid"));
                return;
              }
              const envelope = response.data as ApiEnvelope<T>;
              if (method === "GET" && options.cache !== false)
                responseCache.set(exactCacheKey, envelope as AnyEnvelope, cacheFence);
              recordAcceptanceDiagnostic(
                key,
                "success",
                String(response.statusCode),
              );
              resolve(envelope);
              return;
            }
            if (__MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__) reportDeviceFailure?.("http", undefined, response.statusCode);
            recordAcceptanceDiagnostic(key, "failure", `http_${response.statusCode}`);
            if (isApiError(response.data)) {
              reject(new MiniappApiError(response.data, response.statusCode));
              return;
            }
            reject(new Error("bff_http_" + response.statusCode));
          });
        },
        fail: transportFailure,
      });
      // Taro rejects its task Promise even after invoking fail. Observe both
      // channels through the same single-settlement owner, including aborts.
      void Promise.resolve(task).catch(transportFailure);
      if (settled) abortTask(task);
    } catch (error) {
      finish(() => {
        if (__MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__) reportDeviceFailure?.("dispatch", error);
        transportFallback(
          "请求未能发出，请联网后刷新。",
          error instanceof Error ? error : new Error(String(error)),
        );
      });
    }
  });
}

export function invalidateApiCache(prefix = "") {
  responseCache.invalidate(key => !prefix || key.startsWith(prefix));
}

export async function clearTemporaryApiCache() {
  const cancelled = requests.cancelReads(isTemporaryCacheKey);
  responseCache.invalidate(isTemporaryCacheKey);
  const filters = { predicate: (query: { queryKey: readonly unknown[] }) => isTemporaryCacheKey(String(query.queryKey[0] ?? "")) };
  await miniappQueryClient.cancelQueries(filters);
  miniappQueryClient.removeQueries(filters);
  await responseCache.flush();
  if (!responseCache.cleanupComplete()) throw new Error("local_cache_cleanup_incomplete");
  return cancelled;
}

export function resetApiNetworkCacheForAcceptance() {
  if (!__MINIAPP_ACCEPTANCE_DIAGNOSTICS__)
    throw new Error("acceptance_api_reset_unavailable");
  const cancelled = requests.cancelAll("manual");
  responseCache.clear();
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

const requestOperation = createAuthenticatedOperationRequester({ resolveSession, readStoredSession, clearStoredSession, request,
  isPermissionDenied: error => error instanceof MiniappApiError && error.code === "PERMISSION_DENIED",
});

export const { getAccountProfile, saveAccountNickname, getAccountAvatar, saveAccountAvatar } = createAccountProfileClient({
  request: requestOperation,
  currentUser: currentDraftUserId,
  makeKey: () => idempotencyKey("account-nickname"),
  invalidate: async () => {
    invalidateApiCache("account-profile");
    await miniappQueryClient.invalidateQueries({ queryKey: ["account-profile"] });
  },
});

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
    if (result.data.userId === erasedStoredAccountId)
      throw new Error("account_identity_revoked");
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
    let recoveredRouteOrigin: Awaited<ReturnType<typeof resolveObservationContext>> | null = null;
    if (context.routeOrigin) {
      recoveredRouteOrigin = await resolveObservationContext(
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
      routeOriginContextId = recoveredRouteOrigin.data.contextId;
    }
    try {
      return await resolveObservationContext(
        observationContextRecoveryInput(context, routeOriginContextId),
        signal,
      );
    } catch (recoveryError) {
      if (context.location.kind === "FORMAL_SPOT" && recoveredRouteOrigin &&
        recoveryError instanceof MiniappApiError && recoveryError.code === "NOT_FOUND")
        return recoveredRouteOrigin;
      throw recoveryError;
    }
  }
}

export { observationContextRecoveryInput };

export async function updateObservationContext(
  context: ObservationContext,
  input: Omit<ObservationContextUpdateRequest, "expectedRevision">,
  signal?: AbortSignal,
) {
  const update = (current: ObservationContext) => requestOperation(
      "observation-context:" + current.contextId,
      "observationContextPut",
      {
        pathParams: { contextId: current.contextId },
        body: { ...input, expectedRevision: current.revision },
        idempotencyKey: idempotencyKey("observation-context"),
        ...(signal ? { signal } : {}),
      },
    );
  let result;
  try {
    result = await update(context);
  } catch (error) {
    if (
      !(error instanceof MiniappApiError) ||
      (error.code !== "NOT_FOUND" && error.code !== "STALE_REJECTED")
    )
      throw error;
    // A persisted context ID is only a recovery hint. The server may have
    // restarted or the context may have expired between the page restore and
    // this user action, so rebuild the same context and apply the edit once.
    const recovered = await restoreObservationContext(context, signal);
    result = await update(recovered.data);
  }
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

export function getTerrainOverlay(input: TerrainOverlayRequest, signal?: AbortSignal) {
  const query = [
    `purpose=${input.purpose}`,
    `centerLat=${input.center.latitude.toFixed(7)}`,
    `centerLng=${input.center.longitude.toFixed(7)}`,
    `radiusKm=${input.radiusKm.toFixed(1)}`,
  ].join("&");
  return requestOperation(`terrain:${input.purpose}`, "terrainOverlayGet", {
    query,
    ...(signal ? { signal } : {}),
  });
}

export function terrainAssetUrl(relativePath: string) {
  if (!/^\/v2\/terrain\/assets\/[A-Za-z0-9][A-Za-z0-9.-]*\.png$/u.test(relativePath))
    throw new Error("terrain_asset_path_invalid");
  return __MINIAPP_API_BASE__.replace(/\/+$/u, "") + relativePath;
}

export function downloadTerrainAsset(relativePath: string, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new MiniappRequestCancelled("superseded"));
      return;
    }
    const task = Taro.downloadFile({
      url: terrainAssetUrl(relativePath),
      success(result) {
        cleanup();
        if (result.statusCode >= 200 && result.statusCode < 300 && result.tempFilePath) resolve(result.tempFilePath);
        else reject(new Error(`terrain_asset_download_failed:${result.statusCode}`));
      },
      fail(error) {
        cleanup();
        reject(signal?.aborted ? new MiniappRequestCancelled("superseded") : new Error(error.errMsg || "terrain_asset_download_failed"));
      },
    });
    const abort = () => task.abort();
    const cleanup = () => signal?.removeEventListener("abort", abort);
    signal?.addEventListener("abort", abort, { once: true });
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

export const { getSpotRecentWeather, getSpotAirQuality } = createSpotEnvironmentClient(requestOperation);

export function getSpotContributionMedia(spotId: string, uploadId: ContributionUploadId) {
  return requestOperation(`spot-contribution-media:${spotId}:${uploadId}`, "spotContributionMediaGet", {
    pathParams: { spotId, uploadId },
  });
}

export function getContributionFormalBaseline(spotId: string, signal?: AbortSignal) {
  return requestOperation("contribution-baseline:" + spotId, "spotContributionBaselineGet", {
    pathParams: { spotId },
    ...(signal ? { signal } : {}),
  });
}

export function getAstronomicalEvents(signal?: AbortSignal) {
  return requestOperation("astronomical-events", "astronomicalEventsGet", {
    ...(signal ? { signal } : {}),
  });
}

export function getAstronomicalEvent(
  occurrenceId: string,
  signal?: AbortSignal,
  contextId?: string,
) {
  return requestOperation(`astronomical-event:${occurrenceId}:${contextId ?? "catalog"}`, "astronomicalEventGet", {
    pathParams: { occurrenceId },
    ...(contextId ? { query: "contextId=" + encodeURIComponent(contextId) } : {}),
    ...(signal ? { signal } : {}),
  });
}

export function getSkyReport(
  spotId: string,
  contextId: string,
  signal?: AbortSignal,
) {
  if (!spotId.startsWith("spot:") && !spotId.startsWith("contribution:"))
    throw new Error("night_location_identity_invalid");
  return requestOperation("spot-sky:" + spotId, "spotSkyGet", {
    auth: spotId.startsWith("contribution:") ? "REQUIRED" : "NONE",
    pathParams: { spotId },
    query: "contextId=" + encodeURIComponent(contextId),
    ...(signal ? { signal } : {}),
  }).then(projectAdoptedSkyCatalog);
}

export function getCelestialObjectInformation(
  reference: string,
  signal?: AbortSignal,
) {
  if (!isCelestialObjectReference(reference))
    throw new Error("celestial_object_reference_invalid");
  return requestOperation("celestial-object:" + reference, "celestialObjectGet", {
    pathParams: { reference },
    query: "locale=zh-CN",
    ...(signal ? { signal } : {}),
  });
}

export const getStellarCatalog = createStellarCatalogClient({
  request: (reference, signal) => requestOperation(
    `stellar-catalog:${reference.catalogVersion}:${reference.catalogHash}`, "stellarCatalogGet", {
      pathParams: { catalogVersion: reference.catalogVersion, catalogHash: reference.catalogHash },
      ...(signal ? { signal } : {}),
    }),
  invalidate: reference => invalidateApiCache(`stellar-catalog:${reference.catalogVersion}:${reference.catalogHash}:`),
});

export const saoCatalogClient = createSaoCatalogClient({
  index: signal => requestOperation('sao-index', 'saoIndexGet', { ...(signal ? {signal} : {}) }),
  tile: (publicationHash, tileId, signal) => requestOperation(`sao-tile:${publicationHash}:${tileId}`, 'saoTileGet', {
    pathParams: {publicationHash, tileId}, ...(signal ? {signal} : {}),
  }),
  invalidateIndex: () => invalidateApiCache('sao-index:'),
  invalidateTile: (publicationHash, tileId) => invalidateApiCache(`sao-tile:${publicationHash}:${tileId}:`),
});

export const getConstellationCatalog = createConstellationCatalogClient({
  request: signal => requestOperation(`constellation-catalog:${CONSTELLATION_CATALOG_VERSION}`, "constellationCatalogGet", {
    ...(signal ? {signal} : {}),
  }),
  invalidate: () => invalidateApiCache("constellation-catalog:"),
});

export function constellationAssetUrl(catalogHash: string, file: string) {
  if (!/^[a-f0-9]{64}$/u.test(catalogHash) || !(file === "geometry-v2.json" || /^[a-z_-]+\.png$/u.test(file))) throw new Error("constellation_asset_reference_invalid");
  return __MINIAPP_API_BASE__.replace(/\/+$/u, "")+MINIAPP_API_BASE_PATH+
    "/sky/constellations/"+catalogHash+"/assets/"+file;
}

export function deepSkyImageUrl(reference: string, level: "OVERVIEW" | "MEDIUM" | "DETAIL") {
  if (!/^M:(?:[1-9]|[1-9]\d|10\d|110)$/u.test(reference))
    throw new Error("deep_sky_image_reference_invalid");
  return __MINIAPP_API_BASE__.replace(/\/+$/u, "") + MINIAPP_API_BASE_PATH +
    "/celestial-objects/" + encodeURIComponent(reference) + "/image?level=" + level;
}

export function deepSkyManifestUrl(sourceId: string): string | undefined {
  const match = /^imagery:[^:]+:([a-f0-9]{64})$/u.exec(sourceId);
  return match ? __MINIAPP_API_BASE__.replace(/\/+$/u, "") + MINIAPP_API_BASE_PATH +
    "/sky/deep-sky/" + match[1] + "/manifest" : undefined;
}

export function getFavorites(signal?: AbortSignal) {
  return requestOperation("favorites", "favoritesGet", {
    auth: "REQUIRED",
    ...(signal ? { signal } : {}),
  });
}

export async function getUserLibrary(signal?: AbortSignal, expectedUserId?: string) {
  const session = await ensureSession();
  const owner = expectedUserId ?? session.userId;
  const result = await requestOperation("user-library", "libraryGet", {
    auth: "REQUIRED",
    ...(signal ? { signal } : {}),
  }, false, owner);
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请重新打开页面读取个人资料。");
  return result;
}

export function getPreferences(signal?: AbortSignal) {
  return requestOperation("preferences", "preferencesGet", {
    auth: "REQUIRED",
    cache: false,
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

async function accountReauthentication() {
  const { userId } = await ensureSession();
  const capabilities = await getCapabilities();
  const code = capabilities.data.flags.WECHAT_AUTH_ENABLED
    ? (await Taro.login()).code
    : installationIdentity();
  if (!code) throw new Error("wechat_login_code_missing");
  if (currentDraftUserId() !== userId) throw new Error("账户已变化，请重新打开页面后再操作。");
  return { userId, code };
}

export async function exportAccountData(signal?: AbortSignal) {
  const { userId, code } = await accountReauthentication();
  const result = await requestOperation("account-data-export", "accountDataExportGet", {
    auth: "REQUIRED",
    reauthenticationCode: code,
    cache: false,
    ...(signal ? { signal } : {}),
  }, false, userId);
  if (currentDraftUserId() !== userId) throw new Error("账户已变化，请重新下载当前账户的数据。");
  return result;
}

export async function deleteAccount() {
  const { userId: deletedUserId, code } = await accountReauthentication();
  const result = await requestOperation("account-delete", "accountDelete", {
    auth: "REQUIRED",
    reauthenticationCode: code,
    body: { confirmation: "DELETE_ACCOUNT" },
    idempotencyKey: idempotencyKey("account-delete"),
  }, false, deletedUserId);
  const localAccountReset = currentDraftUserId() === deletedUserId;
  markAccountErased(deletedUserId);
  let localCleanupComplete = !localAccountReset || clearStoredSession();
  try {
    for (const key of Taro.getStorageInfoSync().keys) {
      if (!planDraftBelongsTo(key, deletedUserId) && !contributionDraftBelongsTo(key, deletedUserId) && !contributionSubmitBelongsTo(key, deletedUserId) && !profileDraftBelongsTo(key, deletedUserId) && !profileSaveBelongsTo(key, deletedUserId) && !importSaveBelongsTo(key, deletedUserId) && !importLocalDraftBelongsTo(key, deletedUserId) && !planChecklistBelongsTo(key, deletedUserId) && !planEventSelectionBelongsTo(key, deletedUserId) && !planSaveBelongsTo(key, deletedUserId)) continue;
      try { Taro.removeStorageSync(key); } catch { localCleanupComplete = false; }
    }
  } catch { localCleanupComplete = false; }
  if (!localAccountReset) {
    const cacheRemoved = await responseCache.removeScope(deletedUserId);
    localCleanupComplete = cacheRemoved && localCleanupComplete;
    miniappQueryClient.removeQueries({ predicate: query => query.queryKey.includes(deletedUserId) });
    return { ...result, localAccountReset, localCleanupComplete };
  }
  responseCache.clear();
  await responseCache.flush();
  localCleanupComplete = responseCache.cleanupComplete() && localCleanupComplete;
  try {
    Taro.removeStorageSync(INSTALLATION_STORAGE_KEY);
  } catch {
    // Server deletion and session revocation remain authoritative.
    localCleanupComplete = false;
  }
  miniappQueryClient.clear();
  return { ...result, localAccountReset, localCleanupComplete };
}

export async function setFavoriteRelation(
  spotId: string,
  favorite: boolean,
  expectedUserId?: string,
) {
  const session = await ensureSession();
  const owner = expectedUserId ?? session.userId;
  const result = await requestOperation(
    "favorite-mutation:" + spotId,
    "favoritePut",
    {
      auth: "REQUIRED",
      pathParams: { spotId },
      body: { favorite },
      idempotencyKey: idempotencyKey("favorite"),
    },
    false,
    owner,
  );
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请重新打开收藏。");
  await invalidateAfter("FAVORITE");
  return result;
}

export async function getPlans(signal?: AbortSignal, expectedUserId?: string) {
  const session = await ensureSession();
  const owner = expectedUserId ?? session.userId;
  const result = await requestOperation("plans", "plansGet", {
    auth: "REQUIRED",
    ...(signal ? { signal } : {}),
  }, false, owner);
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请重新打开页面读取计划。");
  return result;
}

export async function createPlanShare(planId: string, expectedUserId?: string) {
  const session = await ensureSession();
  const owner = expectedUserId ?? session.userId;
  if (session.userId !== owner) throw new Error("账号已变化，请重新打开计划。");
  const result = await requestOperation("plan-share:" + planId, "planSharePost", {
    auth: "REQUIRED", pathParams: { planId },
  }, false, owner);
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请重新打开计划。");
  return result;
}

export function getSharedPlan(token: string, signal?: AbortSignal) {
  return requestOperation("shared-plan:" + token, "sharedPlanGet", {
    auth: "NONE", cache: false, pathParams: { token }, ...(signal ? { signal } : {}),
  }, false);
}

export function getSharedSpot(spotId: string, signal?: AbortSignal) {
  return requestOperation("shared-spot:" + spotId, "sharedSpotGet", {
    auth: "NONE", cache: false, pathParams: { spotId }, ...(signal ? { signal } : {}),
  }, false);
}

const retryPlanSave = createPlanSaveRetry(Taro, () => idempotencyKey("plan-save"),
  error => error instanceof MiniappApiError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408);

export const planReminderSubscription = createPlanSubscriptionClient({
  request: requestOperation, currentUser: currentDraftUserId,
  confirmed: async owner => {
    invalidateApiCache("plans");
    await miniappQueryClient.invalidateQueries({ queryKey: ["plans", owner], exact: true });
  },
});

export const setPlanChecklistCompletion = createPlanChecklistClient({
  request: requestOperation, currentUser: currentDraftUserId,
  makeKey: () => idempotencyKey("plan-checklist"),
  confirmed: async (owner, plan) => {
    miniappQueryClient.setQueryData<MiniappApiResponse<"plansGet">>(["plans", owner], previous => previous ? {
      ...previous, data: { ...previous.data, plans: previous.data.plans.map(item => item.planId === plan.planId && item.revision <= plan.revision ? plan : item) },
    } : previous);
    await invalidateAfter("PLAN");
  },
});

export function clearObservationPlanSaveRecovery(expectedUserId: string) {
  if (currentDraftUserId() !== expectedUserId) throw new Error("账号已变化，请重新打开计划。");
  clearPlanSaveRecovery(Taro, expectedUserId);
}

export async function saveObservationPlan(
  plan: Omit<
    ObservationPlan,
    "revision" | "updatedAt" | "contextSnapshot"
  >,
  observationContextId: ObservationContext["contextId"],
  expectedRevision: number | null,
  expectedUserId?: string,
  contextIdentity = observationContextId as string,
) {
  const session = await ensureSession();
  if (expectedUserId && session.userId !== expectedUserId) throw new Error("账号已变化，请回到原账号核对计划保存结果。");
  const result = await retryPlanSave(session.userId, { ...plan, observationContextId, expectedRevision, contextIdentity }, (retryKey, original) => requestOperation(
    "plan-mutation:" + original.planId,
    "planPut",
    {
      auth: "REQUIRED",
      pathParams: { planId: original.planId },
      body: {
        spotId: original.spotId as SpotId,
        observationContextId: original.observationContextId as ObservationContext["contextId"],
        localDate: original.localDate,
        localTime: original.localTime,
        ...(original.timing ? { timing: original.timing } : {}),
        ...(original.travel ? { travel: original.travel } : {}),
        ...(original.reminders === undefined ? {} : { reminders: original.reminders }),
        ...(original.eventOccurrenceIds === undefined ? {} : { eventOccurrenceIds: original.eventOccurrenceIds }),
        notes: original.notes,
        expectedRevision: original.expectedRevision,
      },
      idempotencyKey: retryKey,
    },
    false,
    session.userId,
  ));
  if (currentDraftUserId() !== session.userId) throw new Error("账号已变化，请回到原账号核对计划保存结果。");
  miniappQueryClient.setQueryData<MiniappApiResponse<"plansGet">>(["plans", session.userId], (previous) => previous ? {
    ...previous, data: { ...previous.data, plans: [...previous.data.plans.filter((item) => item.planId !== result.data.planId), result.data] },
  } : previous);
  await invalidateAfter("PLAN");
  return result;
}

export async function deleteObservationPlan(planId: string, expectedUserId?: string) {
  const session = await ensureSession();
  if (expectedUserId && session.userId !== expectedUserId) throw new Error("账号已变化，请回到原账号核对计划删除结果。");
  const result = await requestOperation(
    "plan-delete:" + planId,
    "planDelete",
    {
      auth: "REQUIRED",
      pathParams: { planId },
      idempotencyKey: idempotencyKey("plan-delete"),
    },
    false,
    session.userId,
  );
  if (currentDraftUserId() !== session.userId) throw new Error("账号已变化，请回到原账号核对计划删除结果。");
  miniappQueryClient.setQueryData(["plans", session.userId], result);
  await invalidateAfter("PLAN");
  return result;
}

export async function getProfileLinks(signal?: AbortSignal, expectedUserId?: string) {
  const session = await ensureSession();
  const owner = expectedUserId ?? session.userId;
  const result = await requestOperation("profile-links", "profileLinksGet", {
    auth: "REQUIRED",
    ...(signal ? { signal } : {}),
  }, false, owner);
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请重新打开页面读取主页链接。");
  return result;
}

const retryProfileLinkCreate = createProfileLinkRetry(Taro, () => idempotencyKey("profile-link"),
  (error) => error instanceof MiniappApiError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408);
const retryProfileLinkDelete = createMutationRetry(() => idempotencyKey("profile-link-delete"));

export function clearProfileLinkSaveRecovery(expectedUserId: string) {
  if (currentDraftUserId() !== expectedUserId) throw new Error("账号已变化，请重新打开主页链接。");
  clearProfileSaveRecovery(Taro, expectedUserId);
}

export async function createProfileLink(input: {
  platform: PlatformKind;
  displayName: string;
  url: string;
  visibility: "PRIVATE" | "PUBLIC";
  sortOrder: number;
}, expectedUserId?: string) {
  const session = await ensureSession();
  const owner = expectedUserId ?? session.userId;
  if (session.userId !== owner) throw new Error("账号已变化，请回到原账号核对主页链接。");
  return retryProfileLinkCreate(owner, input, async (retryKey, originalInput) => {
  const result = await requestOperation(
    "profile-link-mutation",
    "profileLinkPost",
    {
      auth: "REQUIRED",
      body: originalInput,
      idempotencyKey: retryKey,
    },
    false,
    owner,
  );
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请回到原账号核对主页链接。");
  await invalidateAfter("PROFILE_LINK");
  return result;
  });
}

export async function deleteProfileLink(profileLinkId: string, expectedUserId?: string) {
  const session = await ensureSession();
  const owner = expectedUserId ?? session.userId;
  return retryProfileLinkDelete(owner, { profileLinkId }, async (retryKey) => {
  const result = await requestOperation(
    "profile-link-delete:" + profileLinkId,
    "profileLinkDelete",
    {
      auth: "REQUIRED",
      pathParams: { profileLinkId },
      idempotencyKey: retryKey,
    },
    false,
    owner,
  );
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请回到原账号核对链接删除结果。");
  await invalidateAfter("PROFILE_LINK");
  return result;
  });
}

const retryImportSave = createImportSaveRetry(Taro, () => idempotencyKey("import-save"),
  error => error instanceof MiniappApiError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408);

export function clearPostImportSaveRecovery(expectedUserId: string) {
  if (currentDraftUserId() !== expectedUserId) throw new Error("账号已变化，请重新打开内容导入。");
  clearImportSaveRecovery(Taro, expectedUserId);
}

export async function createPostImport(input: {
  platform: PlatformKind;
  originalUrl: string;
  rightsConfirmed: boolean;
}, expectedUserId?: string) {
  const session = await ensureSession();
  const owner = expectedUserId ?? session.userId;
  if (session.userId !== owner) throw new Error("账号已变化，请回到原账号核对导入草稿。");
  const result = await retryImportSave(owner, "create", "", input, retryKey => requestOperation(
    "import-create",
    "importPost",
    {
      auth: "REQUIRED",
      body: input,
      idempotencyKey: retryKey,
    },
    false,
    owner,
  ));
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请回到原账号核对导入草稿。");
  await invalidateAfter("IMPORT");
  return result;
}

export async function getPostImports(signal?: AbortSignal, expectedUserId?: string) {
  const session = await ensureSession();
  const owner = expectedUserId ?? session.userId;
  const result = await requestOperation("imports", "importsGet", {
    auth: "REQUIRED",
    ...(signal ? { signal } : {}),
  }, false, owner);
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请重新打开页面读取导入记录。");
  return result;
}

export async function getPostImport(
  importDraftId: string,
  signal?: AbortSignal,
  expectedUserId?: string,
) {
  const session = await ensureSession();
  const owner = expectedUserId ?? session.userId;
  const result = await requestOperation("import:" + importDraftId, "importGet", {
    auth: "REQUIRED",
    pathParams: { importId: importDraftId },
    ...(signal ? { signal } : {}),
  }, false, owner);
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请重新打开页面读取导入草稿。");
  return result;
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
  expectedUserId?: string,
) {
  const session = await ensureSession();
  const owner = expectedUserId ?? session.userId;
  if (session.userId !== owner) throw new Error("账号已变化，请回到原账号核对导入保存结果。");
  const result = await retryImportSave(owner, "update", importDraftId, input, retryKey => requestOperation(
    "import-mutation:" + importDraftId,
    "importPut",
    {
      auth: "REQUIRED",
      pathParams: { importId: importDraftId },
      body: input,
      idempotencyKey: retryKey,
    },
    false,
    owner,
  ));
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请回到原账号核对导入保存结果。");
  await invalidateAfter("IMPORT");
  return result;
}

export async function getContributions(signal?: AbortSignal, expectedUserId?: string) {
  const session = await ensureSession();
  const owner = expectedUserId ?? session.userId;
  const result = await requestOperation("contributions", "contributionsGet", {
    auth: "REQUIRED",
    ...(signal ? { signal } : {}),
  }, false, owner);
  if (currentDraftUserId() !== owner) {
    throw new Error("账号已变化，请重新打开页面读取反馈记录。");
  }
  return result;
}

const retryContributionCreate = createMutationRetry(() => idempotencyKey("contribution-create"));

export async function createContributionDraft(
  input: ContributionDraftRequest,
) {
  const initiatingOwner = currentDraftUserId();
  const session = await ensureSession();
  if (initiatingOwner && session.userId !== initiatingOwner) throw new Error("账号已变化，请回到原账号核对反馈。");
  return retryContributionCreate(session.userId, input, async (retryKey) => {
  const result = await requestOperation(
    "contribution-create",
    "contributionPost",
    {
      auth: "REQUIRED",
      body: input,
      idempotencyKey: retryKey,
    },
    false,
    session.userId,
  );
  if (currentDraftUserId() !== session.userId) throw new Error("账号已变化，请回到原账号核对反馈结果。");
  invalidateApiCache("contributions");
  await miniappQueryClient.invalidateQueries({ queryKey: ["contributions"] });
  return result;
  });
}

const retryFormalContributionSubmit = createMutationRetry(() => idempotencyKey("formal-contribution-submit"));

export async function submitFormalContribution(input: ContributionFormalSubmitRequest) {
  const initiatingOwner = currentDraftUserId();
  const session = await ensureSession();
  if (initiatingOwner && session.userId !== initiatingOwner) throw new Error("账号已变化，请回到原账号核对反馈。");
  return retryFormalContributionSubmit(session.userId, input, async retryKey => {
    const response = await requestOperation("formal-contribution-submit", "formalContributionSubmitPost", {
      body: input,
      auth: "REQUIRED",
      idempotencyKey: retryKey,
    }, false, session.userId);
    if (currentDraftUserId() !== session.userId) throw new Error("账号已变化，请回到原账号核对反馈结果。");
    invalidateApiCache("contributions");
    await miniappQueryClient.invalidateQueries({ queryKey: ["contributions"] });
    return response;
  });
}

export async function getContributionMedia(
  submissionId: ContributionId,
  uploadId: ContributionUploadId,
  signal?: AbortSignal,
  expectedUserId?: string,
) {
  const session = await ensureSession();
  const owner = expectedUserId ?? session.userId;
  const result = await requestOperation(`contribution-media:${submissionId}:${uploadId}`, "contributionMediaGet", {
    pathParams: { submissionId, uploadId },
    auth: "REQUIRED",
    ...(signal ? { signal } : {}),
  }, false, owner);
  if (currentDraftUserId() !== owner)
    throw new Error("账号已变化，请重新打开页面读取提交照片。");
  return result;
}

export function createFormalUploadIntent(input: ContributionFormalUploadIntentRequest) {
  return requestOperation("formal-upload-intent", "formalContributionUploadIntentPost", { body: input, auth: "REQUIRED", idempotencyKey: idempotencyKey("formal-upload-intent") });
}
export function createFormalContributionUpload(intentId: string, input: ContributionFormalUploadSessionRequest) {
  return requestOperation(`formal-upload:${intentId}`, "formalContributionUploadPost", { pathParams: { intentId }, body: input, auth: "REQUIRED", idempotencyKey: idempotencyKey("formal-upload") });
}
export function completeFormalContributionUpload(intentId: string, uploadId: string, input: ContributionFormalUploadCompleteRequest) {
  return requestOperation(`formal-upload-complete:${uploadId}`, "formalContributionUploadPut", { pathParams: { intentId, uploadId }, body: input, auth: "REQUIRED", idempotencyKey: idempotencyKey("formal-upload-complete") });
}
export function removeFormalContributionUpload(intentId: string, uploadId: string, expectedRevision: number) {
  return requestOperation(`formal-upload-remove:${uploadId}`, "formalContributionUploadDelete", { pathParams: { intentId, uploadId }, body: { expectedRevision }, auth: "REQUIRED", idempotencyKey: idempotencyKey("formal-upload-remove") });
}

const retryContributionUpdate = createMutationRetry(() => idempotencyKey("contribution-update"));

export async function updateContributionDraft(
  submissionId: ContributionId,
  input: ContributionUpdateRequest,
) {
  const initiatingOwner = currentDraftUserId();
  const session = await ensureSession();
  if (initiatingOwner && session.userId !== initiatingOwner) throw new Error("账号已变化，请回到原账号核对反馈。");
  return retryContributionUpdate(session.userId, { submissionId, input }, async (retryKey) => {
  const result = await requestOperation(
    "contribution-update:" + submissionId,
    "contributionPut",
    {
      auth: "REQUIRED",
      pathParams: { submissionId },
      body: input,
      idempotencyKey: retryKey,
    },
    false,
    session.userId,
  );
  if (currentDraftUserId() !== session.userId) throw new Error("账号已变化，请回到原账号核对反馈结果。");
  invalidateApiCache("contributions");
  return result;
  });
}

const retryContributionWithdraw = createMutationRetry(() => idempotencyKey("contribution-withdraw"));

export async function withdrawContributionDraft(
  submissionId: ContributionId,
  expectedRevision: number,
) {
  const initiatingOwner = currentDraftUserId();
  const session = await ensureSession();
  if (initiatingOwner && session.userId !== initiatingOwner)
    throw new Error("账号已变化，请回到原账号核对反馈。");
  return retryContributionWithdraw(session.userId, { submissionId, expectedRevision }, async (retryKey) => {
    const result = await requestOperation(
      "contribution-withdraw:" + submissionId,
      "contributionDelete",
      {
        auth: "REQUIRED",
        pathParams: { submissionId },
        body: { expectedRevision },
        idempotencyKey: retryKey,
      },
      false,
      session.userId,
    );
    if (currentDraftUserId() !== session.userId)
      throw new Error("账号已变化，请回到原账号核对反馈结果。");
    invalidateApiCache("contributions");
    await miniappQueryClient.invalidateQueries({ queryKey: ["contributions"] });
    return result;
  });
}

const retryContributionUpload = createMutationRetry(() => idempotencyKey("contribution-upload-create"));

export async function createContributionUpload(
  submissionId: ContributionId,
  input: ContributionUploadSessionRequest,
) {
  const initiatingOwner = currentDraftUserId();
  const session = await ensureSession();
  if (initiatingOwner && session.userId !== initiatingOwner) throw new Error("账号已变化，请回到原账号核对反馈。");
  return retryContributionUpload(session.userId, { submissionId, input }, async (retryKey) => {
  const result = await requestOperation(
    "contribution-upload-create:" + submissionId,
    "contributionUploadPost",
    {
      auth: "REQUIRED",
      pathParams: { submissionId },
      body: input,
      idempotencyKey: retryKey,
    },
    false,
    session.userId,
  );
  if (currentDraftUserId() !== session.userId) throw new Error("账号已变化，请回到原账号核对反馈结果。");
  invalidateApiCache("contributions");
  return result;
  });
}

export async function completeContributionUpload(
  submissionId: ContributionId,
  uploadId: ContributionUploadId,
  input: ContributionUploadCompleteRequest,
) {
  const initiatingOwner = currentDraftUserId();
  const session = await ensureSession();
  if (initiatingOwner && session.userId !== initiatingOwner) throw new Error("账号已变化，请回到原账号核对反馈。");
  const result = await requestOperation(
    "contribution-upload-complete:" + uploadId,
    "contributionUploadPut",
    {
      auth: "REQUIRED",
      pathParams: { submissionId, uploadId },
      body: input,
      idempotencyKey: idempotencyKey("contribution-upload-complete"),
    },
    false,
    session.userId,
  );
  if (currentDraftUserId() !== session.userId) throw new Error("账号已变化，请回到原账号核对反馈结果。");
  invalidateApiCache("contributions");
  return result;
}

const retryContributionRemoval = createMutationRetry(() => idempotencyKey("contribution-upload-remove"));

export async function removeContributionUpload(submissionId: ContributionId, uploadId: ContributionUploadId, expectedRevision: number) {
  const initiatingOwner = currentDraftUserId();
  const session = await ensureSession();
  if (initiatingOwner && session.userId !== initiatingOwner) throw new Error("账号已变化，请回到原账号核对反馈。");
  return retryContributionRemoval(session.userId, { submissionId, uploadId, expectedRevision }, async (retryKey) => {
    const result = await requestOperation("contribution-upload-remove:" + uploadId, "contributionUploadDelete", {
      auth: "REQUIRED", pathParams: { submissionId, uploadId }, body: { expectedRevision }, idempotencyKey: retryKey,
    }, false, session.userId);
    if (currentDraftUserId() !== session.userId) throw new Error("账号已变化，请回到原账号核对反馈结果。");
    invalidateApiCache("contributions");
    return result;
  });
}

const retryContributionSubmit = createContributionSubmitRetry(Taro, () => idempotencyKey("contribution-submit"),
  (error) => error instanceof MiniappApiError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408);

export async function submitContribution(
  submissionId: ContributionId,
  expectedRevision: number,
) {
  const initiatingOwner = currentDraftUserId();
  const session = await ensureSession();
  if (initiatingOwner && session.userId !== initiatingOwner) throw new Error("账号已变化，请回到原账号核对反馈。");
  return retryContributionSubmit(session.userId, { submissionId, expectedRevision }, async (retryKey) => {
  const result = await requestOperation(
    "contribution-submit:" + submissionId,
    "contributionSubmitPost",
    {
      auth: "REQUIRED",
      pathParams: { submissionId },
      body: { expectedRevision },
      idempotencyKey: retryKey,
    },
    false,
    session.userId,
  );
  if (currentDraftUserId() !== session.userId) throw new Error("账号已变化，请回到原账号核对反馈结果。");
  invalidateApiCache("contributions");
  await miniappQueryClient.invalidateQueries({ queryKey: ["contributions"] });
  return result;
  });
}

export function cancelRequest(key: string) {
  requests.cancel(key);
}
