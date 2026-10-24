import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { parseNotificationControlsCommand, requireNotificationInstant, notificationWeatherMetrics, type NotificationControls, type NotificationControlsCommand,
  type NotificationControlsResult, type NotificationInboxPage, type NotificationRuleActivity } from "../../../../packages/domain/src/notifications/evaluation";
import { createPendingApiCommand, type CommandInput, type PendingCommandStorage } from "./pending-api-command";
export type { NotificationControls, NotificationInboxMessage, NotificationRuleActivity } from "../../../../packages/domain/src/notifications/evaluation";
export type NotificationControlsInput = CommandInput<NotificationControlsCommand>;
export interface NotificationAuthority {
  status: "unknown" | "ready" | "denied";
  ownerId: string | null;
  revision: number;
}
export class NotificationInboxRequestError extends Error {
  constructor(readonly code: string, readonly rejected = false, readonly statusCode?: number) { super(code); }
}
export function createNotificationInboxClient(options: { baseUrl?: string; fetcher?: typeof fetch; storage?: PendingCommandStorage; newKey?: () => string } = {}) {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL, fetcher = options.fetcher ?? fetch;
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    if (!baseUrl) throw new NotificationInboxRequestError("notification_api_base_url_missing");
    const response = await fetcher(`${baseUrl.replace(/\/$/u, "")}${path}`, { ...init, headers: { accept: "application/json", "content-type": "application/json", ...init?.headers } });
    const value = await response.json();
    if (!response.ok) throw new NotificationInboxRequestError(value.code ?? `notification_http_${response.status}`,
      value.outcome === "rejected" && ["invalid_notification_controls", "notification_controls_revision_conflict"].includes(value.code), response.status);
    if (value.schemaVersion !== "starward-notifications-v1") throw new NotificationInboxRequestError("notification_response_invalid");
    return value as T;
  };
  const validateControls = (value: NotificationControls) => {
    if (value?.schemaVersion !== "starward-notification-controls-v1" || typeof value.ownerId !== "string" || !value.ownerId.trim()
      || !Number.isSafeInteger(value.revision) || value.revision < 0 || typeof value.enabled !== "boolean"
      || typeof value.categories?.pretrip !== "boolean" || typeof value.categories["long-term"] !== "boolean"
      || value.updatedAt !== null && (() => { try { requireNotificationInstant(value.updatedAt); return false; } catch { return true; } })()) throw new NotificationInboxRequestError("notification_response_invalid");
    return value;
  };
  const ownerHeader = (expectedOwnerId?: string) => expectedOwnerId ? { "x-notification-owner": expectedOwnerId } : undefined;
  let readGeneration = 0;
  let observed: { generation: number; value: NotificationControls } | null = null;
  let authority: NotificationAuthority = { status: "unknown", ownerId: null, revision: 0 };
  const listeners = new Set<() => void>();
  const publishAuthority = (next: NotificationAuthority) => {
    if (authority.status === next.status && authority.ownerId === next.ownerId && authority.revision === next.revision) return;
    authority = next;
    for (const listener of listeners) listener();
  };
  const deny = (error: unknown, expectedOwnerId?: string, startedAt?: NotificationAuthority) => {
    if (!(error instanceof NotificationInboxRequestError) || ![401, 403].includes(error.statusCode ?? 0)) return;
    if (startedAt && startedAt !== authority || expectedOwnerId && expectedOwnerId !== authority.ownerId) return;
    publishAuthority({ ...authority, status: "denied" });
  };
  const observation = new WeakMap<NotificationControls, number>();
  const controls = async (signal?: AbortSignal, expectedOwnerId?: string) => {
    const generation = ++readGeneration;
    let result: NotificationControls;
    try { result = validateControls((await request<{ controls: NotificationControls }>("/v2/notifications/controls", { signal, headers: ownerHeader(expectedOwnerId) })).controls); }
    catch (error) {
      if (generation === readGeneration) deny(error, expectedOwnerId);
      if (!expectedOwnerId && generation < readGeneration && authority.status === "ready" && observed) return observed.value;
      throw error;
    }
    if (expectedOwnerId && result.ownerId !== expectedOwnerId) throw new NotificationInboxRequestError("notification_readback_unconfirmed");
    observation.set(result, generation);
    if (!observed || generation >= observed.generation) {
      if (observed?.value.ownerId === result.ownerId && observed.value.revision > result.revision) throw new NotificationInboxRequestError("notification_controls_revision_regressed");
      observed = { generation, value: result };
      publishAuthority({ status: "ready", ownerId: result.ownerId, revision: result.revision });
    }
    // An owner-bound readback may confirm its original write after another
    // owner was observed. It cannot become the current authority observation.
    return expectedOwnerId ? result : observed.value;
  };
  const owner = createPendingApiCommand<NotificationControlsCommand, NotificationControls>({
    storage: options.storage ?? AsyncStorage, storageKey: `starward-notification-controls-pending-v1:${baseUrl ?? "unconfigured"}`, newKey: options.newKey ?? randomUUID,
    parse: value => { try { parseNotificationControlsCommand(value); } catch { throw new NotificationInboxRequestError("notification_pending_invalid"); } return value as NotificationControlsCommand; },
    error: reason => new NotificationInboxRequestError(`notification_${reason}`),
    canDiscard: error => error instanceof NotificationInboxRequestError && error.rejected,
    dispatch: async (command, retry) => {
      let result: NotificationControlsResult;
      try { result = await request<NotificationControlsResult>("/v2/notifications/controls/commands", { method: "POST", body: JSON.stringify(command) }); }
      catch (error) {
        if (retry && error instanceof NotificationInboxRequestError && error.rejected && error.code !== "notification_controls_revision_conflict") throw new NotificationInboxRequestError(error.code);
        throw error;
      }
      validateControls(result.controls);
      if (result.controls.ownerId !== command.expectedOwnerId || result.receipt?.idempotencyKey !== command.idempotencyKey || result.receipt.revision !== result.controls.revision) throw new NotificationInboxRequestError("notification_response_invalid");
      let current: NotificationControls;
      try { current = await controls(undefined, command.expectedOwnerId); } catch { throw new NotificationInboxRequestError("notification_readback_unconfirmed"); }
      if (current.ownerId !== command.expectedOwnerId || current.revision < result.receipt.revision) throw new NotificationInboxRequestError("notification_readback_unconfirmed");
      return current;
    },
  });
  return {
    ...owner, controls,
    authority: () => authority,
    subscribeAuthority: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    rejectAuthority: (statusCode: number | undefined, startedAt: NotificationAuthority) => {
      if ([401, 403].includes(statusCode ?? 0) && startedAt === authority) publishAuthority({ ...authority, status: "denied" });
    },
    canPublishControls: (value: NotificationControls) => authority.status === "ready" && observation.get(value) === readGeneration && observed?.value.ownerId === value.ownerId && observed.value.revision <= value.revision,
    command: (input: NotificationControlsInput) => baseUrl ? owner.command(input) : Promise.reject(new NotificationInboxRequestError("notification_api_base_url_missing")),
    inbox: async (signal?: AbortSignal, cursor?: string, expectedOwnerId?: string) => {
      const requestStartedAt = Date.now();
      const startedAuthority = authority;
      let page: NotificationInboxPage;
      try { page = await request<NotificationInboxPage>(`/v2/notifications/inbox${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { signal, headers: ownerHeader(expectedOwnerId) }); }
      catch (error) { deny(error, expectedOwnerId, startedAuthority); throw error; }
      if (!Array.isArray(page.items) || page.scope !== "local-owner-poc" || typeof page.ownerId !== "string" || expectedOwnerId && page.ownerId !== expectedOwnerId) throw new NotificationInboxRequestError("notification_response_invalid");
      for (const message of page.items) {
        if (!message.id || message.ownerId !== page.ownerId || message.boundary !== "in-app-inbox-only" || !["same-condition", "condition-reversed", "expired", "unconfirmed"].includes(message.current)
          || !message.trigger?.ruleId || typeof message.trigger.value !== "number" || !Number.isFinite(message.trigger.value)
          || typeof message.trigger.previousValue !== "number" || !Number.isFinite(message.trigger.previousValue) || !Object.hasOwn(notificationWeatherMetrics, message.trigger.metric)
          || notificationWeatherMetrics[message.trigger.metric].unit !== message.trigger.unit
          || !message.trigger.source?.runId || !message.evidence?.source?.runId || !Array.isArray(message.evidence.source.attribution)
          || !message.trigger.location || !["place", "grid"].includes(message.trigger.location.kind)
          || message.currentEvidence !== null && (!message.currentEvidence?.source?.expiresAt || message.currentEvidence.value !== null && !Number.isFinite(message.currentEvidence.value))) throw new NotificationInboxRequestError("notification_response_invalid");
        for (const instant of [page.checkedAt, message.deliveredAt, message.dueAt, message.trigger.window.startUtc, message.trigger.window.endUtc, message.trigger.source.acquiredAt, message.evidence.source.expiresAt,
          ...(message.currentEvidence ? [message.currentEvidence.source.expiresAt, message.currentEvidence.source.acquiredAt] : [])]) {
          try { requireNotificationInstant(instant); } catch { throw new NotificationInboxRequestError("notification_response_invalid"); }
        }
      }
      try { requireNotificationInstant(page.checkedAt); } catch { throw new NotificationInboxRequestError("notification_response_invalid"); }
      return { ...page, requestStartedAt };
    },
    activity: async (id: string, signal?: AbortSignal, expectedOwnerId?: string) => {
      const startedAuthority = authority;
      let result: { activity: NotificationRuleActivity };
      try { result = await request<{ activity: NotificationRuleActivity }>(`/v2/notifications/rules/${encodeURIComponent(id)}/activity`, { signal, headers: ownerHeader(expectedOwnerId) }); }
      catch (error) { deny(error, expectedOwnerId, startedAuthority); throw error; }
      if (result.activity?.ruleId !== id || !Number.isSafeInteger(result.activity.revision) || typeof result.activity.supported !== "boolean") throw new NotificationInboxRequestError("notification_response_invalid");
      return result.activity;
    },
  };
}
