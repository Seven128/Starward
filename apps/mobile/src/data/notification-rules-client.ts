import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { NotificationRuleValidationError, parseNotificationRuleCommand, parseNotificationRuleDefinition, type NotificationRule, type NotificationRuleCommand, type NotificationRuleLibrary, type NotificationRuleResult } from "../../../../packages/domain/src/notifications/rules";
import { createPendingApiCommand, type CommandInput, type PendingCommandStorage } from "./pending-api-command";
import { createNotificationInboxClient, NotificationInboxRequestError } from "./notification-inbox-client";
export type { NotificationRule, NotificationRuleDefinition, NotificationRuleCommand } from "../../../../packages/domain/src/notifications/rules";
export type NotificationRuleInput = CommandInput<NotificationRuleCommand>;
interface RuleOwnerQualification { schemaVersion: "starward-notification-rule-owner-v1"; ownerId: string }
type StoredRuleCommand = NotificationRuleCommand & {
  ownerQualification?: RuleOwnerQualification;
  /** Captured restriction for a new intent only; never persisted or sent. */
  requestedOwnerId?: string | null;
};
function wireCommand(value: StoredRuleCommand): NotificationRuleCommand {
  const { ownerQualification: _qualification, requestedOwnerId: _requestedOwner, ...wire } = value;
  return wire as NotificationRuleCommand;
}
function qualification(value: unknown): value is RuleOwnerQualification {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return Object.keys(v).length === 2 && v.schemaVersion === "starward-notification-rule-owner-v1"
    && typeof v.ownerId === "string" && !!v.ownerId.trim() && !/[\u0000-\u001f]/u.test(v.ownerId);
}
// These errors are raised inside mutate, only after this actor/key's receipt
// was absent. Input parsing and HTTP limits run before that durable lookup.
const receiptCheckedRejections = new Set(["notification_rule_revision_conflict"]);
const rejectedCodes = new Set(["invalid_notification_rule", "unexpected_notification_rule_field", "notification_itinerary_rules_unavailable", "invalid_notification_rule_timezone", "invalid_notification_rule_expiry", "invalid_notification_rule_command", "notification_rule_request_body_too_large", ...receiptCheckedRejections]);
export class NotificationRuleRequestError extends Error {
  constructor(readonly code: string, readonly rejected = false, readonly statusCode?: number, readonly expectedOwnerId?: string) { super(code); }
}
export function createNotificationRulesClient(options: { baseUrl?: string; fetcher?: typeof fetch; storage?: PendingCommandStorage; newKey?: () => string; inboxClient?: ReturnType<typeof createNotificationInboxClient> } = {}) {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL, fetcher = options.fetcher ?? fetch;
  const inboxClient = options.inboxClient ?? createNotificationInboxClient({ baseUrl, fetcher, storage: options.storage, newKey: options.newKey });
  const request = async <T>(path: string, init?: RequestInit, expectedOwnerId?: string): Promise<T> => {
    if (!baseUrl) throw new NotificationRuleRequestError("notification_rule_api_base_url_missing");
    const response = await fetcher(`${baseUrl.replace(/\/$/u, "")}${path}`, { ...init, headers: { accept: "application/json", "content-type": "application/json", ...init?.headers,
      ...(expectedOwnerId ? { "x-notification-owner": expectedOwnerId } : {}) } });
    const value = await response.json();
    if (!response.ok) throw new NotificationRuleRequestError(value.code ?? `notification_rule_http_${response.status}`, value.outcome === "rejected" && rejectedCodes.has(value.code), response.status, expectedOwnerId);
    if (value.schemaVersion !== "starward-notification-rules-v2") throw new NotificationRuleRequestError("notification_rule_response_invalid");
    return value as T;
  };
  const validate = (value: NotificationRule, id: string) => {
    if (value?.id !== id || value.schemaVersion !== "starward-notification-rule-v1" || typeof value.ownerId !== "string" || !value.ownerId.trim() || !Number.isSafeInteger(value.revision) || value.revision < 1 || value.evaluation !== "not-evaluated" || value.delivery !== "not-configured") throw new NotificationRuleRequestError("notification_rule_response_invalid");
    try { parseNotificationRuleDefinition(value.definition); } catch { throw new NotificationRuleRequestError("notification_rule_response_invalid"); }
    return value;
  };
  const currentOwner = () => { const value = inboxClient.authority(); return value.status === "ready" ? value.ownerId ?? undefined : undefined; };
  const get = async (id: string, signal?: AbortSignal, expectedOwnerId = currentOwner()) => {
    const rule = validate((await request<{ rule: NotificationRule }>(`/v2/notification-rules/${encodeURIComponent(id)}`, { signal }, expectedOwnerId)).rule, id);
    if (expectedOwnerId && rule.ownerId !== expectedOwnerId) throw new NotificationRuleRequestError("notification_rule_readback_unconfirmed", false, undefined, expectedOwnerId);
    return rule;
  };
  const owner = createPendingApiCommand<StoredRuleCommand, NotificationRule>({
    storage: options.storage ?? AsyncStorage, storageKey: `starward-notification-rule-pending-v2:${baseUrl ?? "unconfigured"}`, newKey: options.newKey ?? randomUUID,
    parse: value => {
      try {
        if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("invalid");
        const stored = value as StoredRuleCommand;
        parseNotificationRuleCommand(wireCommand(stored));
        if (Object.hasOwn(stored, "requestedOwnerId") || Object.hasOwn(stored, "ownerQualification") && !qualification(stored.ownerQualification)) throw Error("invalid");
      } catch { throw new NotificationRuleRequestError("notification_rule_pending_invalid"); }
      // Old unqualified bytes remain readable, but cannot acquire a later owner.
      return value as StoredRuleCommand;
    },
    prepare: async command => {
      const wire = wireCommand(command);
      try { parseNotificationRuleCommand(wire); }
      catch (error) { throw new NotificationRuleRequestError(error instanceof NotificationRuleValidationError ? error.code : "invalid_notification_rule_command", true); }
      const expected = command.requestedOwnerId ?? undefined;
      let qualified;
      try { qualified = await inboxClient.controls(undefined, expected); }
      catch (error) { throw new NotificationRuleRequestError("notification_rule_owner_unconfirmed", false, error instanceof NotificationInboxRequestError ? error.statusCode : undefined, expected); }
      if (!inboxClient.canPublishControls(qualified)) throw new NotificationRuleRequestError("notification_rule_owner_changed_before_dispatch");
      return { ...wire, ownerQualification: { schemaVersion: "starward-notification-rule-owner-v1", ownerId: qualified.ownerId } };
    },
    error: reason => new NotificationRuleRequestError(`notification_rule_${reason}`),
    canDiscard: error => error instanceof NotificationRuleRequestError && error.rejected,
    dispatch: async (command, retry) => {
      if (!qualification(command.ownerQualification)) throw new NotificationRuleRequestError("notification_rule_pending_owner_unqualified");
      const originalOwner = command.ownerQualification.ownerId, wire = wireCommand(command);
      let result: NotificationRuleResult;
      try { result = await request<NotificationRuleResult>("/v2/notification-rules/commands", { method: "POST", body: JSON.stringify(wire) }, originalOwner); }
      catch (error) {
        if (retry && error instanceof NotificationRuleRequestError && error.rejected && !receiptCheckedRejections.has(error.code)) throw new NotificationRuleRequestError(error.code, false, error.statusCode, originalOwner);
        throw error;
      }
      if (result.status !== "saved" || !result.receipt || result.receipt.idempotencyKey !== command.idempotencyKey || result.rule?.id !== result.receipt.ruleId
        || result.rule.revision !== result.receipt.revision || command.command !== "create-rule" && result.rule.id !== command.ruleId) throw new NotificationRuleRequestError("notification_rule_response_invalid");
      validate(result.rule, result.receipt.ruleId);
      if (result.rule.ownerId !== originalOwner) throw new NotificationRuleRequestError("notification_rule_readback_unconfirmed", false, undefined, originalOwner);
      let current: NotificationRule;
      try { current = await get(result.rule.id, undefined, originalOwner); } catch (error) { throw new NotificationRuleRequestError("notification_rule_readback_unconfirmed", false, error instanceof NotificationRuleRequestError ? error.statusCode : undefined, originalOwner); }
      if (current.revision < result.receipt.revision) throw new NotificationRuleRequestError("notification_rule_readback_incomplete");
      return current;
    },
  });
  return {
    ...owner, get, inboxClient,
    command: (input: NotificationRuleInput, expectedOwnerId = currentOwner()) => baseUrl ? owner.command({ ...input, requestedOwnerId: expectedOwnerId ?? null }) : Promise.reject(new NotificationRuleRequestError("notification_rule_api_base_url_missing")),
    list: async (signal?: AbortSignal, cursor?: string, expectedOwnerId = currentOwner()) => {
      const result = await request<NotificationRuleLibrary>(`/v2/notification-rules${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { signal }, expectedOwnerId);
      if (!Array.isArray(result.items) || result.scope !== "local-owner-poc") throw new NotificationRuleRequestError("notification_rule_response_invalid");
      result.items.forEach(item => { validate(item, item.id); if (expectedOwnerId && item.ownerId !== expectedOwnerId) throw new NotificationRuleRequestError("notification_rule_response_invalid"); });
      return result;
    },
  };
}
