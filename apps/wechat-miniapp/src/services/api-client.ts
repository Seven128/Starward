import { createAccountProfileClient } from "./account-profile-client";
import { terrainOverlayRequestQuery } from "./terrain-overlay-request";
import { createSpotEnvironmentClient } from "./spot-environment-client";
import { ADOPTED_SKY_REPORT_CATALOG_VERSION, projectAdoptedSkyCatalog } from "./sky-report-catalog";
import { createPlanChecklistClient } from "./plan-checklist-client";
import { createPlanSubscriptionClient } from "./plan-subscription-client";
import { createPlanDestinationClient } from "./plan-destination-client";
import { createAuthenticatedOperationRequester, type RequestOperationScope } from "./authenticated-operation";
import Taro from "@tarojs/taro";
import { planSaveBelongsTo } from "./local-draft-keys";
import type { PlanSaveInput } from "./plan-save-retry";
import { planChecklistBelongsTo } from "../content/plan/detail/plan-checklist";
import { planEventSelectionBelongsTo } from "../content/plan/detail/plan-event-selection";
import { importLocalDraftBelongsTo } from "../content/import/local-draft";
import { clearImportSaveRecovery, createImportSaveRetry, importSaveBelongsTo } from "./import-save-retry";
import { contributionDraftBelongsTo, planDraftBelongsTo, profileDraftBelongsTo } from "./local-draft-keys";
import { contributionSubmitBelongsTo, createContributionSubmitRetry } from "./contribution-submit-retry";
import { clearProfileSaveRecovery, createProfileLinkRetry, profileSaveBelongsTo } from "./profile-link-retry";
import {
  CURRENT_DEEP_SKY_CATALOG_VERSION,
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
  type TerrainHorizonRequest,
  type TerrainOverlayRequest,
  type UserPreferences,
} from "@starward/miniapp-contracts";
import { localFailureMessage } from "@/utils/presentation";
import { confirmedObservationContextEdit, observationContextRecoveryInput, type ConfirmedObservationContextReply } from "./observation-context-recovery";
import {
  invalidationPolicy,
  isTemporaryCacheKey,
  responseCacheKey,
  type MiniappMutationKind,
} from "./cache-policy";
import { recordAcceptanceDiagnostic } from "./acceptance-diagnostics";
import { createDeviceFailureReporter } from "./device-request-diagnostic";
import { reportRuntimeError } from "./runtime-error";
import { miniappQueryClient } from "./query-client";
import { clearSkyPublicImageCache } from "./sky-public-image-runtime";
import { useAppStore } from "@/state/app-store";
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
// Existing verified sessions may renew. A visitor can only establish identity
// through an explicit, cancellable login intent, never a background reader.
let sessionLoginChoice: "UNDECIDED" | "WECHAT" | "GUEST" = "UNDECIDED";
// A server-confirmed erasure must stay revoked in this runtime even when the
// native store cannot remove its old session. This is not a disk-erasure claim.
const erasedStoredAccountIds = new Set<string>();
// A rejected native record stays untrusted if deletion fails. A null token
// means it could not be read; only a confirmed new login can lift that fence.
let invalidatedStoredSession: { accessToken: string | null } | null = null;

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
    if (error.message === "CONTRIBUTION_CORE_ANSWERS_REQUIRED") return "请补充开放、进入、夜间安全和联系情况；若看不到这些字段，请更新小程序后恢复原草稿";
    if (error.message === "CONTRIBUTION_CORE_ANSWERS_CONFLICT") return "开放、进入或联系答案与提交内容不一致，请核对后再保存；原草稿仍保留";
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

export function idempotencyKey(prefix: string) {
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
  let session: AuthSessionData | null = null;
  try {
    const value = Taro.getStorageSync(SESSION_STORAGE_KEY) as unknown;
    if (
      typeof value !== "object" ||
      value === null ||
      typeof (value as { userId?: unknown }).userId !== "string" ||
      !(value as { userId: string }).userId.trim() ||
      typeof (value as { accessToken?: unknown }).accessToken !== "string" ||
      !(value as { accessToken: string }).accessToken.trim() ||
      typeof (value as { expiresAt?: unknown }).expiresAt !== "string"
    ) {
      session = null;
    } else {
      session = value as AuthSessionData;
      if (erasedStoredAccountIds.has(session.userId)) return null;
      if (invalidatedStoredSession && (
        invalidatedStoredSession.accessToken === null ||
        invalidatedStoredSession.accessToken === session.accessToken
      )) {
        session = null;
      } else if (
        !Number.isFinite(Date.parse(session.expiresAt)) ||
        Date.parse(session.expiresAt) <= Date.now() + SESSION_EXPIRY_SKEW_MS
      ) {
        if (sessionLoginChoice === "UNDECIDED" && Number.isFinite(Date.parse(session.expiresAt)))
          sessionLoginChoice = "WECHAT";
        try { Taro.removeStorageSync(SESSION_STORAGE_KEY); } catch { /* No stale identity may remain active in memory. */ }
        session = null;
      }
    }
  } catch {
    session = null;
  }
  // Hide unverifiable private projections; bindAccount preserves their scoped
  // recovery snapshot. A network failure with a valid native session stays bound.
  if (!session) useAppStore.getState().bindAccount(null);
  else sessionLoginChoice = "WECHAT";
  return session;
}

/** Local drafts may be scoped by identity, never by an access token. */
export function currentDraftUserId(): string | null {
  return readStoredSession()?.userId ?? null;
}

function clearStoredSession(rejected?: AuthSessionData) {
  const current = readStoredSession();
  if (rejected && (
    (current && (current.userId !== rejected.userId || current.accessToken !== rejected.accessToken)) ||
    (!current && sessionPromise)
  )) return false;
  invalidatedStoredSession = { accessToken: current?.accessToken ?? null };
  sessionPromise = null;
  if (!erasedStoredAccountIds.has(useAppStore.getState().accountOwnerId ?? ""))
    useAppStore.getState().bindAccount(null);
  try {
    Taro.removeStorageSync(SESSION_STORAGE_KEY);
    return true;
  } catch {
    // A failed local deletion cannot authorize a server request.
    return false;
  }
}

function markAccountErased(userId: string) {
  erasedStoredAccountIds.add(userId);
  if (useAppStore.getState().accountOwnerId === userId) sessionLoginChoice = "GUEST";
  // A newer login has no verified identity yet. Its returned identity is checked
  // by ensureSession; deleting A cannot retire a genuine successor B login.
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

let pendingErasedInstallation: { deletedUserId: string; installationId: string } | null = null;

function nativeSessionOwner(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const userId = (value as Partial<AuthSessionData>).userId;
  return typeof userId === "string" && userId.trim() ? userId.trim() : null;
}

function settleErasedInstallation(): boolean {
  const intent = pendingErasedInstallation;
  if (!intent) return true;
  // A pending login may establish a genuine successor. Its own finally retries
  // this intent, including when an older login was superseded.
  if (sessionPromise) return false;
  try {
    const rawSession = Taro.getStorageSync(SESSION_STORAGE_KEY) as unknown;
    if (rawSession !== undefined && rawSession !== null && rawSession !== "") {
      const nativeOwner = nativeSessionOwner(rawSession);
      if (!nativeOwner) return false;
      if (nativeOwner !== intent.deletedUserId) {
        pendingErasedInstallation = null;
        return true;
      }
    }
    const boundOwner = useAppStore.getState().accountOwnerId;
    if (boundOwner !== null) {
      if (boundOwner === intent.deletedUserId) return false;
      pendingErasedInstallation = null;
      return true;
    }
    // A changed installation belongs to another lifecycle, even when its
    // login failed or its native credentials cannot yet be verified.
    if (Taro.getStorageSync(INSTALLATION_STORAGE_KEY) === intent.installationId)
      Taro.removeStorageSync(INSTALLATION_STORAGE_KEY);
    pendingErasedInstallation = null;
    return true;
  } catch {
    return false;
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
    independent?: boolean;
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
      // Native abort may synchronously re-enter fail. Own the result first.
      if (abort) {
        try {
          abortTask(task);
        } catch (error) {
          reportRuntimeError("native", "bff_transport_abort_failed", error);
          recordAcceptanceDiagnostic(key, "failure", "transport_abort_failed");
        }
      }
      try { callback(); }
      finally { releaseCache(); }
    };
    const cancel = (reason: RequestCancellationReason) => {
      finish(() => {
        recordAcceptanceDiagnostic(key, "cancel", reason);
        reject(new MiniappRequestCancelled(reason));
      }, true);
    };
    const onAbort = () => cancel("query_signal");

    const method = options.method ?? "GET";
    release = requests.register(key, cancel, method === "GET", options.independent === true && method === "GET");
    recordAcceptanceDiagnostic(key, "start", Taro.getEnv());

    const scope = options.session?.userId ?? "anonymous";
    const apiBase = __MINIAPP_API_BASE__.replace(/\/+$/u, "");
    const exactCacheKey =
      responseCacheKey(key, apiBase, path) + ":" + String(scope);
    const cacheFence = responseCache.beginRequest(exactCacheKey, method === "GET" && options.cache !== false);
    const cached = cacheFence.cached;
    releaseCache = cacheFence.release;
    const header: Record<string, string> = { Accept: "application/json" };
    // A cold terrain range read and raster derivation needs a longer bounded
    // window than ordinary DTO reads. Other operations keep their deadline.
    const timeoutMs = key.startsWith("terrain:") ? 18_000 : 10_000;
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

    const transportFallback = (failure: string, error: Error, stage: "transport" | "watchdog" | "dispatch") => {
      reportRuntimeError("request", `bff_${stage}_failed`, error, { stage });
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
          Object.assign(new Error(message), { cause: error }),
          "transport",
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
          "watchdog",
        );
      }, true);
    }, timeoutMs + 2_000);

    try {
      options.signal?.addEventListener("abort", onAbort, { once: true });
      if (options.signal?.aborted) {
        onAbort();
        return;
      }
      task = Taro.request<ApiEnvelope<T> | ApiError>({
        url: apiBase + path,
        method,
        timeout: timeoutMs,
        header,
        // WeChat's request transport can send a bodyless POST as invalid input.
        // An empty object preserves the operation's no-payload contract.
        ...(options.body === undefined ? (method === "POST" ? { data: {} } : {}) : { data: options.body }),
        success(response) {
          finish(() => {
            if (response.statusCode === 304 && cached && responseCache.isCurrent(exactCacheKey, cached, cacheFence, options.independent === true)) {
              recordAcceptanceDiagnostic(key, "success", "not_modified");
              resolve(cached.envelope as ApiEnvelope<T>);
              return;
            }
            if (response.statusCode >= 200 && response.statusCode < 300) {
              if (!isEnvelope(response.data)) {
                if (__MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__) reportDeviceFailure?.("contract", undefined, response.statusCode);
                const error = new Error("bff_response_contract_invalid");
                reportRuntimeError("request", "bff_response_contract_invalid", error, { stage: "contract", status: response.statusCode });
                reject(error);
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
            const error = isApiError(response.data) ? new MiniappApiError(response.data, response.statusCode)
              : new Error("bff_http_" + response.statusCode);
            reportRuntimeError("request", "bff_http_failed", error, { stage: "http", status: response.statusCode });
            reject(error);
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
          error instanceof Error ? error : Object.assign(new Error("bff_request_dispatch_failed"), { cause: error }),
          "dispatch",
        );
      });
    }
  });
}

export function invalidateApiCache(prefix = "") {
  responseCache.invalidate(key => !prefix || key.startsWith(prefix));
}

export async function clearTemporaryApiCache() {
  let incomplete = false;
  let imageCleanup: Promise<void>;
  // Start the shared file owner's epoch fence before any awaited work. Its
  // native cleanup must not prevent the independent API/query cache cleanup.
  try {
    imageCleanup = clearSkyPublicImageCache().then(result => {
      if (result.status !== "complete") incomplete = true;
    }, () => { incomplete = true; });
  } catch {
    incomplete = true;
    imageCleanup = Promise.resolve();
  }
  let cancelled = 0;
  try { cancelled = requests.cancelReads(isTemporaryCacheKey); }
  catch { incomplete = true; }
  try { responseCache.invalidate(isTemporaryCacheKey); }
  catch { incomplete = true; }
  const filters = { predicate: (query: { queryKey: readonly unknown[] }) => isTemporaryCacheKey(String(query.queryKey[0] ?? "")) };
  try { await miniappQueryClient.cancelQueries(filters); }
  catch { incomplete = true; }
  try { miniappQueryClient.removeQueries(filters); }
  catch { incomplete = true; }
  try { await responseCache.flush(); }
  catch { incomplete = true; }
  await imageCleanup;
  try { if (!responseCache.cleanupComplete()) incomplete = true; }
  catch { incomplete = true; }
  if (incomplete) throw new Error("local_cache_cleanup_incomplete");
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

export const requestOperation = createAuthenticatedOperationRequester({ resolveSession, readStoredSession, clearStoredSession, request,
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

async function ensureSession(force = false, loginIntent?: AbortSignal): Promise<AuthSessionData> {
  if (loginIntent?.aborted) throw new MiniappRequestCancelled("query_signal");
  if (!force) {
    const stored = readStoredSession();
    if (stored) {
      // Native current identity takes precedence over an older pending login.
      sessionPromise = null;
      useAppStore.getState().bindAccount(stored.userId);
      return stored;
    }
    if (sessionPromise && !loginIntent) return sessionPromise;
  } else {
    clearStoredSession();
  }
  if (!loginIntent && sessionLoginChoice !== "WECHAT") throw new Error("wechat_login_required");
  function assertCurrentLogin() {
    if (loginIntent?.aborted || sessionPromise !== pending) throw new MiniappRequestCancelled("superseded");
  }
  const pending: Promise<AuthSessionData> = (async () => {
    const capabilities = await requestOperation(
      "capabilities:auth",
      "capabilitiesGet",
      { auth: "NONE", ...(loginIntent ? { signal: loginIntent } : {}) },
    );
    assertCurrentLogin();
    if (loginIntent && !capabilities.data.flags.WECHAT_AUTH_ENABLED) throw new Error("wechat_login_unavailable");
    const code = capabilities.data.flags.WECHAT_AUTH_ENABLED
      ? (await Taro.login()).code
      : installationIdentity();
    if (!code) throw new Error("wechat_login_code_missing");
    assertCurrentLogin();
    const result = await requestOperation("auth:login", "wechatLoginPost", {
      auth: "NONE",
      body: { code },
      ...(loginIntent ? { signal: loginIntent } : {}),
    });
    if (erasedStoredAccountIds.has(result.data.userId))
      throw new Error("account_identity_revoked");
    assertCurrentLogin();
    Taro.setStorageSync(SESSION_STORAGE_KEY, result.data);
    invalidatedStoredSession = null;
    sessionLoginChoice = "WECHAT";
    useAppStore.getState().bindAccount(result.data.userId);
    return result.data;
  })();
  sessionPromise = pending;
  const cancelLogin = () => {
    if (sessionPromise !== pending) return;
    sessionPromise = null;
    sessionLoginChoice = "GUEST";
  };
  loginIntent?.addEventListener("abort", cancelLogin, { once: true });
  if (loginIntent?.aborted) cancelLogin();
  try {
    return await pending;
  } finally {
    loginIntent?.removeEventListener("abort", cancelLogin);
    if (sessionPromise === pending) sessionPromise = null;
    settleErasedInstallation();
  }
}

/** Called only by the visible shortcut-login action; closing it aborts this intent. */
export function loginWithWechat(signal: AbortSignal): Promise<AuthSessionData> {
  return ensureSession(false, signal);
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
  expectedUserId?: string,
) {
  const privateOwner = input.location.kind === "PENDING_PROPOSAL" ? expectedUserId ?? currentDraftUserId() : null;
  const privateReset = privateOwner ? useAppStore.getState().mapResetVersion : null;
  if (input.location.kind === "PENDING_PROPOSAL" && (!privateOwner || currentDraftUserId() !== privateOwner))
    throw new Error("账户已变化，请回到原账号核对待审点。");
  return requestOperation(
    "observation-context:resolve",
    "observationContextPost",
    {
      body: input,
      auth: input.location.kind === "PENDING_PROPOSAL" ? "REQUIRED" : "OPTIONAL",
      cache: false,
      ...(signal ? { signal } : {}),
    }, false, privateOwner ?? undefined,
  ).then(response => {
    if (privateOwner && (currentDraftUserId() !== privateOwner || useAppStore.getState().mapResetVersion !== privateReset ||
        response.data.schemaVersion !== "observation-context-v3" || response.data.privacyClass !== "ACCOUNT_PRIVATE" || response.data.privateProposal?.ownerId !== privateOwner))
      throw new Error("账户已变化，请回到原账号核对待审点。");
    return response;
  });
}

export function getObservationContext(
  contextId: string,
  signal?: AbortSignal,
  expectedUserId?: string,
) {
  const owner = expectedUserId ?? currentDraftUserId();
  const ownerReset = owner ? useAppStore.getState().mapResetVersion : null;
  if (expectedUserId && currentDraftUserId() !== expectedUserId) throw new Error("账户已变化，请回到原账号核对待审点。");
  return requestOperation(
    "observation-context:" + contextId,
    "observationContextGet",
    {
      pathParams: { contextId },
      auth: "OPTIONAL", cache: false,
      ...(signal ? { signal } : {}),
    }, false, owner ?? undefined,
  ).then(response => {
    if (response.data.schemaVersion === "observation-context-v3" && !response.data.privateProposal)
      throw new Error("observation_proposal_identity_invalid");
    if (response.data.privateProposal && (!owner || currentDraftUserId() !== owner || useAppStore.getState().mapResetVersion !== ownerReset ||
        response.data.schemaVersion !== "observation-context-v3" || response.data.privacyClass !== "ACCOUNT_PRIVATE" || response.data.privateProposal.ownerId !== owner))
      throw new Error("账户已变化，请回到原账号核对待审点。");
    return response;
  });
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
  const privateReset = context.privateProposal ? useAppStore.getState().mapResetVersion : null;
  if (context.privateProposal && currentDraftUserId() !== context.privateProposal.ownerId)
    throw new Error("账户已变化，请回到原账号核对待审点。");
  if (context.privateProposal && context.routeOrigin !== null) throw new Error("observation_proposal_identity_invalid");
  try {
    return await getObservationContext(context.contextId, signal, context.privateProposal?.ownerId);
  } catch (error) {
    if (
      !(error instanceof MiniappApiError) ||
      (error.code !== "NOT_FOUND" && error.code !== "STALE_REJECTED")
    )
      throw error;
    if (context.privateProposal && (currentDraftUserId() !== context.privateProposal.ownerId || useAppStore.getState().mapResetVersion !== privateReset))
      throw new Error("账户已变化，请回到原账号核对待审点。");
    return rebuildObservationContext(context, signal, privateReset);
  }
}

/** Retired writes can still change their ID; resolve the confirmed snapshot under a new identity. */
export function replaceRetiredObservationContext(context: ObservationContext, signal?: AbortSignal) {
  return rebuildObservationContext(context, signal, context.privateProposal ? useAppStore.getState().mapResetVersion : null);
}

async function rebuildObservationContext(context: ObservationContext, signal: AbortSignal | undefined, privateReset: number | null) {
    if (context.privateProposal && (currentDraftUserId() !== context.privateProposal.ownerId || useAppStore.getState().mapResetVersion !== privateReset))
      throw new Error("账户已变化，请回到原账号核对待审点。");
    if (context.privateProposal && context.routeOrigin !== null) throw new Error("observation_proposal_identity_invalid");
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
            context.timezone === "Asia/Shanghai" ||
            context.timezone === "Asia/Macau"
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
        context.privateProposal?.ownerId,
      );
    } catch (recoveryError) {
      if (!context.privateProposal && context.location.kind === "FORMAL_SPOT" && recoveredRouteOrigin &&
        recoveryError instanceof MiniappApiError && recoveryError.code === "NOT_FOUND")
        return recoveredRouteOrigin;
      throw recoveryError;
    }
}

export { observationContextRecoveryInput };

export async function updateObservationContext(
  context: ObservationContext,
  input: Omit<ObservationContextUpdateRequest, "expectedRevision">,
  signal?: AbortSignal,
) {
  const privateReset = context.privateProposal ? useAppStore.getState().mapResetVersion : null;
  if (context.privateProposal && currentDraftUserId() !== context.privateProposal.ownerId)
    throw new Error("账户已变化，请回到原账号核对待审点。");
  const update = async (current: ObservationContext, allowPublicationRetry = true): Promise<ApiEnvelope<ObservationContext>> => {
    if (current.privateProposal && (currentDraftUserId() !== current.privateProposal.ownerId || useAppStore.getState().mapResetVersion !== privateReset))
      throw new Error("账户已变化，请回到原账号核对待审点。");
    try {
      const response = await requestOperation(
        "observation-context:" + current.contextId,
        "observationContextPut",
        {
          pathParams: { contextId: current.contextId },
          auth: current.privateProposal ? "REQUIRED" : "OPTIONAL", cache: false,
          body: { ...input, expectedRevision: current.revision },
          idempotencyKey: idempotencyKey("observation-context"),
          ...(signal ? { signal } : {}),
        }, false, current.privateProposal?.ownerId,
      );
      // A successful status cannot acknowledge a different place/time or an
      // unchanged revision. Normal and uncertain replies share one validator.
      if (!confirmedObservationContextEdit(current, input, response))
        throw new Error("bff_observation_context_update_invalid");
      if (current.privateProposal && (currentDraftUserId() !== current.privateProposal.ownerId || useAppStore.getState().mapResetVersion !== privateReset))
        throw new Error("账户已变化，请回到原账号核对待审点。");
      return response;
    } catch (error) {
      if (error instanceof MiniappRequestCancelled || signal?.aborted ||
        (error instanceof MiniappApiError && error.code !== "CONFLICT" && error.statusCode !== 408 && error.statusCode < 500)) throw error;
      // A PUT may be durable even when its reply is lost. Context PUT does
      // not consume the idempotency header, so never replay it speculatively.
      let readback;
      try {
        readback = await requestOperation("observation-context:" + current.contextId, "observationContextGet", {
          pathParams: { contextId: current.contextId }, auth: current.privateProposal ? "REQUIRED" : "OPTIONAL", cache: false, ...(signal ? { signal } : {}),
        }, false, current.privateProposal?.ownerId);
      } catch (readError) {
        if (readError instanceof MiniappRequestCancelled || signal?.aborted) throw readError;
        throw error;
      }
      if (!confirmedObservationContextEdit(current, input, readback)) {
        // An explicit conflict establishes that this PUT did not commit. Only
        // the exact same pending identity's authoritative publication, with all
        // prior time/event values intact, permits one edit on its new revision.
        if (allowPublicationRetry && error instanceof MiniappApiError && error.code === "CONFLICT" &&
            current.privateProposal && current.location.kind === "PENDING_PROPOSAL" && readback.data.location.kind === "FORMAL_SPOT" &&
            confirmedObservationContextEdit(current, {}, readback)) return update(readback.data, false);
        throw error;
      }
      if (current.privateProposal && (currentDraftUserId() !== current.privateProposal.ownerId || useAppStore.getState().mapResetVersion !== privateReset))
        throw new Error("账户已变化，请回到原账号核对待审点。");
      return readback;
    }
  };
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
  return result as ConfirmedObservationContextReply;
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
    bounds?: { west: number; south: number; east: number; north: number };
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
          ...(viewport.bounds ? ["viewportBounds=" + [viewport.bounds.west, viewport.bounds.south,
            viewport.bounds.east, viewport.bounds.north].map(value => value.toFixed(7)).join(",")] : []),
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

export function getTerrainHorizon(input: TerrainHorizonRequest, signal?: AbortSignal) {
  return requestOperation("terrain:HORIZON", "terrainHorizonGet", {
    query: `centerLat=${input.center.latitude.toFixed(7)}&centerLng=${input.center.longitude.toFixed(7)}`,
    cache: false,
    ...(signal ? { signal } : {}),
  });
}

export function getMapNightLight(viewport: import("@starward/miniapp-contracts").MapNightLightRequest["viewport"], signal?: AbortSignal) {
  return requestOperation("map-night-light", "mapNightLightGet", {
    query: [`centerLat=${viewport.center.latitude.toFixed(6)}`, `centerLng=${viewport.center.longitude.toFixed(6)}`,
      `zoom=${viewport.zoom}`, `viewportBounds=${[viewport.bounds.west, viewport.bounds.south,
        viewport.bounds.east, viewport.bounds.north].map(value => value.toFixed(7)).join(",")}`].join("&"),
    cache: false,
    ...(signal ? { signal } : {}),
  });
}

export function getTerrainOverlay(input: TerrainOverlayRequest, signal?: AbortSignal) {
  return requestOperation(`terrain:${input.purpose}`, "terrainOverlayGet", {
    query: terrainOverlayRequestQuery(input),
    // The query owner handles immutable successes and partial-product failures.
    cache: false,
    ...(signal ? { signal } : {}),
  });
}

export function getTerrainOverlayPreview(input: TerrainOverlayRequest, signal?: AbortSignal) {
  return requestOperation("terrain:preview", "terrainOverlayPreviewGet", {
    query: terrainOverlayRequestQuery(input),
    cache: false,
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
      auth: "OPTIONAL",
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

export function getSpotContributionMedia(spotId: string, uploadId: ContributionUploadId, signal?: AbortSignal) {
  return requestOperation(`spot-contribution-media:${spotId}:${uploadId}`, "spotContributionMediaGet", {
    independent: true,
    pathParams: { spotId, uploadId },
    ...(signal ? { signal } : {}),
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
    auth: contextId ? "OPTIONAL" : "NONE", cache: contextId ? false : true,
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
  return requestOperation("spot-sky:v4:extended:" + spotId, "spotSkyGet", {
    auth: spotId.startsWith("contribution:") ? "REQUIRED" : "OPTIONAL",
    pathParams: { spotId },
    query: "contextId=" + encodeURIComponent(contextId) + "&catalogVersion=" + ADOPTED_SKY_REPORT_CATALOG_VERSION +
      "&deepSkyCatalogVersion=" + encodeURIComponent(CURRENT_DEEP_SKY_CATALOG_VERSION),
    ...(signal ? { signal } : {}),
  }).then(projectAdoptedSkyCatalog);
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

export async function getPreferences(signal?: AbortSignal, expectedUserId?: string) {
  const { userId } = await ensureSession();
  const owner = expectedUserId ?? userId;
  const result = await requestOperation("preferences", "preferencesGet", {
    auth: "REQUIRED",
    cache: false,
    ...(signal ? { signal } : {}),
  }, false, owner);
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请重新打开设置。");
  return result;
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

async function accountReauthentication(scope?: RequestOperationScope) {
  scope?.assertCurrent();
  const { userId } = await ensureSession();
  scope?.assertCurrent();
  const capabilities = await getCapabilities();
  scope?.assertCurrent();
  const code = capabilities.data.flags.WECHAT_AUTH_ENABLED
    ? (await Taro.login()).code
    : installationIdentity();
  if (!code) throw new Error("wechat_login_code_missing");
  scope?.assertCurrent();
  if (currentDraftUserId() !== userId) throw new Error("账户已变化，请重新打开页面后再操作。");
  return { userId, code };
}

export async function exportAccountData(signal?: AbortSignal, scope?: RequestOperationScope) {
  const { userId, code } = await accountReauthentication(scope);
  const result = await requestOperation("account-data-export", "accountDataExportGet", {
    auth: "REQUIRED",
    reauthenticationCode: code,
    cache: false,
    ...(scope ? { scope } : {}),
    ...(signal ? { signal } : {}),
  }, false, userId);
  if (currentDraftUserId() !== userId) throw new Error("账户已变化，请重新下载当前账户的数据。");
  return result;
}

export async function deleteAccount(onCurrentAccountDeleted?: (userId: string) => void) {
  const { userId: deletedUserId, code } = await accountReauthentication();
  let installationId: string | null = null;
  let installationReadComplete = true;
  try {
    const stored = Taro.getStorageSync(INSTALLATION_STORAGE_KEY) as unknown;
    if (typeof stored === "string" && stored) installationId = stored;
    else if (stored !== undefined && stored !== null && stored !== "") installationReadComplete = false;
  } catch { installationReadComplete = false; }
  const result = await requestOperation("account-delete", "accountDelete", {
    auth: "REQUIRED",
    reauthenticationCode: code,
    body: { confirmation: "DELETE_ACCOUNT" },
    idempotencyKey: idempotencyKey("account-delete"),
  }, false, deletedUserId);
  let currentSession: AuthSessionData | null = null;
  let acknowledgementComplete = true;
  // Ownership checks must not expire or unbind B while acknowledging A. The
  // normal session reader may retire expired credentials, even for a known B.
  const hasSuccessor = () => {
    const nativeOwner = nativeSessionOwner(Taro.getStorageSync(SESSION_STORAGE_KEY));
    const boundOwner = useAppStore.getState().accountOwnerId;
    return (nativeOwner !== null && nativeOwner !== deletedUserId) ||
      (typeof boundOwner === "string" && boundOwner !== deletedUserId);
  };
  try { if (!hasSuccessor()) currentSession = readStoredSession(); }
  catch { acknowledgementComplete = false; }
  const resetCurrentAccount = currentSession?.userId === deletedUserId;
  if (resetCurrentAccount) {
    // This synchronous acknowledgement distinguishes our successful A -> null
    // cleanup from an external account departure. UI cannot block revocation.
    try { onCurrentAccountDeleted?.(deletedUserId); } catch { acknowledgementComplete = false; }
  }
  // A confirmed server receipt owns all later local retries. No reauthentication,
  // new DELETE or renewed account authority is needed to remove only A's state.
  const cleanupLocal = async (initialComplete = true) => {
    if (!installationReadComplete && initialComplete) {
      try {
        if (!hasSuccessor() && !sessionPromise) {
          const stored = Taro.getStorageSync(INSTALLATION_STORAGE_KEY) as unknown;
          if (typeof stored === "string" && stored) installationId = stored;
          installationReadComplete = stored === undefined || stored === null || stored === "" || typeof stored === "string";
        } else if (hasSuccessor()) installationReadComplete = true;
      } catch { /* Keep the incomplete result retryable. */ }
    }
    let localCleanupComplete = initialComplete && installationReadComplete;
    try { localCleanupComplete = useAppStore.getState().resetAfterAccountDeletion(deletedUserId) && localCleanupComplete; }
    catch { localCleanupComplete = false; }
    markAccountErased(deletedUserId);
    try {
      const nativeSession = Taro.getStorageSync(SESSION_STORAGE_KEY) as unknown;
      const nativeOwner = nativeSessionOwner(nativeSession);
      if (nativeOwner === deletedUserId) Taro.removeStorageSync(SESSION_STORAGE_KEY);
      else if (nativeSession !== undefined && nativeSession !== null && nativeSession !== "" && !nativeOwner)
        localCleanupComplete = false;
    } catch { localCleanupComplete = false; }
    try {
      for (const key of Taro.getStorageInfoSync().keys) {
        if (!planDraftBelongsTo(key, deletedUserId) && !contributionDraftBelongsTo(key, deletedUserId) && !contributionSubmitBelongsTo(key, deletedUserId) && !profileDraftBelongsTo(key, deletedUserId) && !profileSaveBelongsTo(key, deletedUserId) && !importSaveBelongsTo(key, deletedUserId) && !importLocalDraftBelongsTo(key, deletedUserId) && !planChecklistBelongsTo(key, deletedUserId) && !planEventSelectionBelongsTo(key, deletedUserId) && !planSaveBelongsTo(key, deletedUserId)) continue;
        try { Taro.removeStorageSync(key); } catch { localCleanupComplete = false; }
      }
    } catch { localCleanupComplete = false; }
    try { miniappQueryClient.removeQueries({ predicate: query => query.queryKey.includes(deletedUserId) }); }
    catch { localCleanupComplete = false; }
    try { localCleanupComplete = await responseCache.removeScope(deletedUserId) && localCleanupComplete; }
    catch { localCleanupComplete = false; }
    let localAccountReset = false;
    try {
      localAccountReset = resetCurrentAccount && !hasSuccessor() && currentDraftUserId() === null &&
        useAppStore.getState().accountOwnerId === null;
    } catch { localCleanupComplete = false; }
    if (localAccountReset && installationId) {
      pendingErasedInstallation = { deletedUserId, installationId };
      localCleanupComplete = settleErasedInstallation() && localCleanupComplete;
    }
    return { localAccountReset, localCleanupComplete };
  };
  return { ...result, ...await cleanupLocal(acknowledgementComplete && installationReadComplete),
    retryLocalCleanup: async () => (await cleanupLocal()).localCleanupComplete };

}

export async function ensureFavoriteOwner() {
  return (await ensureSession()).userId;
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

export async function createPlanShare(planId: string, expectedUserId?: string, scope?: RequestOperationScope) {
  scope?.assertCurrent();
  const session = await ensureSession();
  scope?.assertCurrent();
  const owner = expectedUserId ?? session.userId;
  if (session.userId !== owner) throw new Error("账号已变化，请重新打开计划。");
  const result = await requestOperation("plan-share:" + planId, "planSharePost", {
    auth: "REQUIRED", pathParams: { planId }, scope,
  }, false, owner);
  scope?.assertCurrent();
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

async function refreshAccountPlans(owner:string) {
  invalidateApiCache('plans');
  await miniappQueryClient.invalidateQueries({queryKey:['plans',owner],exact:true});
}

export const reverifyPlanReminderDestination = createPlanDestinationClient({
  request:requestOperation,currentUser:currentDraftUserId,
  login:()=>Taro.login(),confirmed:refreshAccountPlans,
});

export const planReminderSubscription = createPlanSubscriptionClient({
  request: requestOperation, currentUser: currentDraftUserId,
  confirmed: refreshAccountPlans,
});

export const setPlanChecklistCompletion = createPlanChecklistClient({
  request: requestOperation, currentUser: currentDraftUserId,
  makeKey: () => idempotencyKey("plan-checklist"),
  confirmed: async (owner, plan, scope) => {
    scope?.assertCurrent();
    miniappQueryClient.setQueryData<MiniappApiResponse<"plansGet">>(["plans", owner], previous => previous ? {
      ...previous, data: { ...previous.data, plans: previous.data.plans.map(item => item.planId === plan.planId && item.revision <= plan.revision ? plan : item) },
    } : previous);
    scope?.assertCurrent();
    await invalidateAfter("PLAN");
    scope?.assertCurrent();
  },
});

/** Single authenticated HTTP attempt; the plan editor owns durable recovery. */
export async function sendObservationPlanSave(original: PlanSaveInput, retryKey: string, owner: string, scope?: RequestOperationScope) {
  scope?.assertCurrent();
  const session = await ensureSession();
  scope?.assertCurrent();
  if (session.userId !== owner) throw new Error("账号已变化，请回到原账号核对计划保存结果。");
  const result = await requestOperation("plan-mutation:" + original.planId, "planPut", {
    auth: "REQUIRED", pathParams: { planId: original.planId },
    body: {
      spotId: original.spotId as SpotId,
      observationContextId: original.observationContextId as ObservationContext["contextId"],
      localDate: original.localDate, localTime: original.localTime,
      ...(original.timing ? { timing: original.timing } : {}),
      ...(original.travel ? { travel: original.travel } : {}),
      ...(original.reminders === undefined ? {} : { reminders: original.reminders }),
      ...(original.eventOccurrenceIds === undefined ? {} : { eventOccurrenceIds: original.eventOccurrenceIds }),
      notes: original.notes, expectedRevision: original.expectedRevision,
    }, idempotencyKey: retryKey, scope,
  }, false, owner);
  scope?.assertCurrent();
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请回到原账号核对计划保存结果。");
  return result;
}

/** GET only: a missing receipt remains unknown and cannot authorize a new save. */
export async function getObservationPlanSaveResult(receipt: import("./plan-save-retry").PlanSaveReceipt, scope?: RequestOperationScope) {
  scope?.assertCurrent();
  const result = await requestOperation("plan-save-result:" + receipt.planId, "planSaveResultGet", {
    auth: "REQUIRED", pathParams: { planId: receipt.planId }, idempotencyKey: receipt.key, cache: false, scope,
  }, false, receipt.owner);
  scope?.assertCurrent();
  if (currentDraftUserId() !== receipt.owner) throw new Error("账号已变化，请回到原账号核对计划保存结果。");
  if (result.dataState !== "FRESH") throw new Error("暂时无法确认这次保存，原草稿和请求仍保留。");
  return result;
}

/** A historical receipt must never be installed as the current plan list. */
export async function getCurrentPlansAfterSave(owner: string, scope?: RequestOperationScope) {
  scope?.assertCurrent();
  const current = await requestOperation("plans", "plansGet", { auth: "REQUIRED", cache: false, scope }, false, owner);
  scope?.assertCurrent();
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请回到原账号核对计划保存结果。");
  if (current.dataState !== "FRESH") throw new Error("暂时无法确认当前计划，上次保存请求仍保留。");
  miniappQueryClient.setQueryData(["plans", owner], current);
  scope?.assertCurrent();
  await invalidateAfter("PLAN");
  scope?.assertCurrent();
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请回到原账号核对计划保存结果。");
  return current;
}

export async function deleteObservationPlan(planId: string, expectedUserId?: string, scope?: RequestOperationScope) {
  scope?.assertCurrent();
  const session = await ensureSession();
  scope?.assertCurrent();
  if (expectedUserId && session.userId !== expectedUserId) throw new Error("账号已变化，请回到原账号核对计划删除结果。");
  const result = await requestOperation(
    "plan-delete:" + planId,
    "planDelete",
    {
      auth: "REQUIRED",
      pathParams: { planId },
      idempotencyKey: idempotencyKey("plan-delete"),
      scope,
    },
    false,
    session.userId,
  );
  scope?.assertCurrent();
  if (currentDraftUserId() !== session.userId) throw new Error("账号已变化，请回到原账号核对计划删除结果。");
  miniappQueryClient.setQueryData(["plans", session.userId], result);
  scope?.assertCurrent();
  await invalidateAfter("PLAN");
  scope?.assertCurrent();
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

export async function getContributions(signal?: AbortSignal, expectedUserId?: string, scope?: RequestOperationScope) {
  scope?.assertCurrent();
  const session = await ensureSession();
  scope?.assertCurrent();
  const owner = expectedUserId ?? session.userId;
  const result = await requestOperation("contributions", "contributionsGet", {
    auth: "REQUIRED",
    scope,
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
  scope?: RequestOperationScope,
) {
  scope?.assertCurrent();
  const initiatingOwner = currentDraftUserId();
  const session = await ensureSession();
  scope?.assertCurrent();
  if (initiatingOwner && session.userId !== initiatingOwner) throw new Error("账号已变化，请回到原账号核对反馈。");
  return retryContributionCreate(session.userId, input, async (retryKey) => {
  const result = await requestOperation(
    "contribution-create",
    "contributionPost",
    {
      auth: "REQUIRED",
      body: input,
      scope,
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

export async function ensureContributionOwner() {
  const initiatingOwner = currentDraftUserId();
  const session = await ensureSession();
  if (initiatingOwner && initiatingOwner !== session.userId) throw new Error("账号已变化，请回到原账号核对反馈。");
  return session.userId;
}

export async function submitFormalContribution(input: ContributionFormalSubmitRequest, retryKey: string, owner: string, scope?: RequestOperationScope) {
  const response = await requestOperation("formal-contribution-submit", "formalContributionSubmitPost", {
    body: input, auth: "REQUIRED", idempotencyKey: retryKey, scope,
  }, false, owner);
  if (currentDraftUserId() !== owner) throw new Error("账号已变化，请回到原账号核对反馈结果。");
  invalidateApiCache("contributions");
  await miniappQueryClient.invalidateQueries({ queryKey: ["contributions"] });
  return response;
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
    independent: true,
    pathParams: { submissionId, uploadId },
    auth: "REQUIRED",
    ...(signal ? { signal } : {}),
  }, false, owner);
  if (currentDraftUserId() !== owner)
    throw new Error("账号已变化，请重新打开页面读取提交照片。");
  return result;
}

export function createFormalUploadIntent(input: ContributionFormalUploadIntentRequest, retryKey: string, owner: string, scope?: RequestOperationScope) {
  return requestOperation("formal-upload-intent", "formalContributionUploadIntentPost", { body: input, auth: "REQUIRED", idempotencyKey: retryKey, scope }, false, owner);
}
export function createFormalContributionUpload(intentId: string, input: ContributionFormalUploadSessionRequest, retryKey: string, owner: string, scope?: RequestOperationScope) {
  return requestOperation(`formal-upload:${intentId}`, "formalContributionUploadPost", { pathParams: { intentId }, body: input, auth: "REQUIRED", idempotencyKey: retryKey, scope }, false, owner);
}
export function completeFormalContributionUpload(intentId: string, uploadId: string, input: ContributionFormalUploadCompleteRequest, retryKey: string, owner: string, scope?: RequestOperationScope) {
  return requestOperation(`formal-upload-complete:${uploadId}`, "formalContributionUploadPut", { pathParams: { intentId, uploadId }, body: input, auth: "REQUIRED", idempotencyKey: retryKey, scope }, false, owner);
}
export function removeFormalContributionUpload(intentId: string, uploadId: string, expectedRevision: number, retryKey: string, owner: string, scope?: RequestOperationScope) {
  return requestOperation(`formal-upload-remove:${uploadId}`, "formalContributionUploadDelete", { pathParams: { intentId, uploadId }, body: { expectedRevision }, auth: "REQUIRED", idempotencyKey: retryKey, scope }, false, owner);
}

const retryContributionUpdate = createMutationRetry(() => idempotencyKey("contribution-update"));

export async function updateContributionDraft(
  submissionId: ContributionId,
  input: ContributionUpdateRequest,
  scope?: RequestOperationScope,
) {
  scope?.assertCurrent();
  const initiatingOwner = currentDraftUserId();
  const session = await ensureSession();
  scope?.assertCurrent();
  if (initiatingOwner && session.userId !== initiatingOwner) throw new Error("账号已变化，请回到原账号核对反馈。");
  return retryContributionUpdate(session.userId, { submissionId, input }, async (retryKey) => {
  const result = await requestOperation(
    "contribution-update:" + submissionId,
    "contributionPut",
    {
      auth: "REQUIRED",
      pathParams: { submissionId },
      body: input,
      scope,
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
  scope?: RequestOperationScope,
) {
  scope?.assertCurrent();
  const initiatingOwner = currentDraftUserId();
  const session = await ensureSession();
  scope?.assertCurrent();
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
        scope,
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
  scope?: RequestOperationScope,
) {
  scope?.assertCurrent();
  const initiatingOwner = currentDraftUserId();
  const session = await ensureSession();
  scope?.assertCurrent();
  if (initiatingOwner && session.userId !== initiatingOwner) throw new Error("账号已变化，请回到原账号核对反馈。");
  return retryContributionUpload(session.userId, { submissionId, input }, async (retryKey) => {
  const result = await requestOperation(
    "contribution-upload-create:" + submissionId,
    "contributionUploadPost",
    {
      auth: "REQUIRED",
      pathParams: { submissionId },
      body: input,
      scope,
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
  scope?: RequestOperationScope,
) {
  scope?.assertCurrent();
  const initiatingOwner = currentDraftUserId();
  const session = await ensureSession();
  scope?.assertCurrent();
  if (initiatingOwner && session.userId !== initiatingOwner) throw new Error("账号已变化，请回到原账号核对反馈。");
  const result = await requestOperation(
    "contribution-upload-complete:" + uploadId,
    "contributionUploadPut",
    {
      auth: "REQUIRED",
      pathParams: { submissionId, uploadId },
      body: input,
      scope,
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

export async function removeContributionUpload(submissionId: ContributionId, uploadId: ContributionUploadId, expectedRevision: number, scope?: RequestOperationScope) {
  scope?.assertCurrent();
  const initiatingOwner = currentDraftUserId();
  const session = await ensureSession();
  scope?.assertCurrent();
  if (initiatingOwner && session.userId !== initiatingOwner) throw new Error("账号已变化，请回到原账号核对反馈。");
  return retryContributionRemoval(session.userId, { submissionId, uploadId, expectedRevision }, async (retryKey) => {
    const result = await requestOperation("contribution-upload-remove:" + uploadId, "contributionUploadDelete", {
      auth: "REQUIRED", pathParams: { submissionId, uploadId }, body: { expectedRevision }, idempotencyKey: retryKey, scope,
    }, false, session.userId);
    if (currentDraftUserId() !== session.userId) throw new Error("账号已变化，请回到原账号核对反馈结果。");
    invalidateApiCache("contributions");
    return result;
  });
}

const retryContributionSubmit = createContributionSubmitRetry(Taro, () => idempotencyKey("contribution-submit"),
  (error) => error instanceof MiniappApiError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408);

function assertContributionRequestOwner(owner: string | undefined, scope?: RequestOperationScope) {
  scope?.assertCurrent();
  const current = currentDraftUserId();
  if (!current || (owner && current !== owner)) throw new Error("账号已变化，请重新打开反馈页。");
  return current;
}

async function sendContributionSubmit(submissionId: ContributionId, expectedRevision: number, retryKey: string, owner: string, scope?: RequestOperationScope) {
  assertContributionRequestOwner(owner, scope);
  const result = await requestOperation("contribution-submit:" + submissionId, "contributionSubmitPost", {
    auth: "REQUIRED", pathParams: { submissionId }, body: { expectedRevision }, scope, idempotencyKey: retryKey,
  }, false, owner);
  assertContributionRequestOwner(owner, scope);
  invalidateApiCache("contributions");
  await miniappQueryClient.invalidateQueries({ queryKey: ["contributions"] });
  return result;
}

export async function submitContribution(submissionId: ContributionId, expectedRevision: number, scope?: RequestOperationScope) {
  scope?.assertCurrent();
  const initiatingOwner = currentDraftUserId(), session = await ensureSession();
  scope?.assertCurrent();
  if (initiatingOwner && session.userId !== initiatingOwner) throw new Error("账号已变化，请回到原账号核对反馈。");
  return retryContributionSubmit(session.userId, { submissionId, expectedRevision }, key => sendContributionSubmit(submissionId, expectedRevision, key, session.userId, scope));
}

/** The feature clients retain only projection/recovery; requests and durable intent stay with their existing owners. */
export const contributionSubmissionTransport = { request: requestOperation, send: sendContributionSubmit, retryExisting: retryContributionSubmit.existing, assertOwner: assertContributionRequestOwner };

export function cancelRequest(key: string) {
  requests.cancel(key);
}
