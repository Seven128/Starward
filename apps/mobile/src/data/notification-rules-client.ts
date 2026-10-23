import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { parseNotificationRuleCommand, parseNotificationRuleDefinition, type NotificationRule, type NotificationRuleCommand, type NotificationRuleLibrary, type NotificationRuleResult } from "../../../../packages/domain/src/notifications/rules";
import { createPendingApiCommand, type CommandInput, type PendingCommandStorage } from "./pending-api-command";
export type { NotificationRule, NotificationRuleDefinition, NotificationRuleCommand } from "../../../../packages/domain/src/notifications/rules";
export type NotificationRuleInput = CommandInput<NotificationRuleCommand>;
// These errors are raised inside mutate, only after this actor/key's receipt
// was absent. Input parsing and HTTP limits run before that durable lookup.
const receiptCheckedRejections = new Set(["notification_rule_revision_conflict"]);
const rejectedCodes = new Set(["invalid_notification_rule", "unexpected_notification_rule_field", "notification_itinerary_rules_unavailable", "invalid_notification_rule_timezone", "invalid_notification_rule_expiry", "invalid_notification_rule_command", "notification_rule_request_body_too_large", ...receiptCheckedRejections]);
export class NotificationRuleRequestError extends Error {
  constructor(readonly code: string, readonly rejected = false) { super(code); }
}
export function createNotificationRulesClient(options: { baseUrl?: string; fetcher?: typeof fetch; storage?: PendingCommandStorage; newKey?: () => string } = {}) {
  const baseUrl = options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL, fetcher = options.fetcher ?? fetch;
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    if (!baseUrl) throw new NotificationRuleRequestError("notification_rule_api_base_url_missing");
    const response = await fetcher(`${baseUrl.replace(/\/$/u, "")}${path}`, { ...init, headers: { accept: "application/json", "content-type": "application/json", ...init?.headers } });
    const value = await response.json();
    if (!response.ok) throw new NotificationRuleRequestError(value.code ?? `notification_rule_http_${response.status}`, value.outcome === "rejected" && rejectedCodes.has(value.code));
    if (value.schemaVersion !== "starward-notification-rules-v2") throw new NotificationRuleRequestError("notification_rule_response_invalid");
    return value as T;
  };
  const validate = (value: NotificationRule, id: string) => {
    if (value?.id !== id || value.schemaVersion !== "starward-notification-rule-v1" || !Number.isSafeInteger(value.revision) || value.revision < 1 || value.evaluation !== "not-evaluated" || value.delivery !== "not-configured") throw new NotificationRuleRequestError("notification_rule_response_invalid");
    try { parseNotificationRuleDefinition(value.definition); } catch { throw new NotificationRuleRequestError("notification_rule_response_invalid"); }
    return value;
  };
  const get = async (id: string, signal?: AbortSignal) => validate((await request<{ rule: NotificationRule }>(`/v2/notification-rules/${encodeURIComponent(id)}`, { signal })).rule, id);
  const owner = createPendingApiCommand<NotificationRuleCommand, NotificationRule>({
    storage: options.storage ?? AsyncStorage, storageKey: `starward-notification-rule-pending-v2:${baseUrl ?? "unconfigured"}`, newKey: options.newKey ?? randomUUID,
    parse: value => { try { parseNotificationRuleCommand(value); } catch { throw new NotificationRuleRequestError("notification_rule_pending_invalid"); } return value as NotificationRuleCommand; },
    error: reason => new NotificationRuleRequestError(`notification_rule_${reason}`),
    canDiscard: error => error instanceof NotificationRuleRequestError && error.rejected,
    dispatch: async (command, retry) => {
      let result: NotificationRuleResult;
      try { result = await request<NotificationRuleResult>("/v2/notification-rules/commands", { method: "POST", body: JSON.stringify(command) }); }
      catch (error) {
        if (retry && error instanceof NotificationRuleRequestError && error.rejected && !receiptCheckedRejections.has(error.code)) throw new NotificationRuleRequestError(error.code);
        throw error;
      }
      if (result.status !== "saved" || !result.receipt || result.receipt.idempotencyKey !== command.idempotencyKey || result.rule?.id !== result.receipt.ruleId
        || result.rule.revision !== result.receipt.revision || command.command !== "create-rule" && result.rule.id !== command.ruleId) throw new NotificationRuleRequestError("notification_rule_response_invalid");
      validate(result.rule, result.receipt.ruleId);
      let current: NotificationRule;
      try { current = await get(result.rule.id); } catch { throw new NotificationRuleRequestError("notification_rule_readback_unconfirmed"); }
      if (current.revision < result.receipt.revision) throw new NotificationRuleRequestError("notification_rule_readback_incomplete");
      return current;
    },
  });
  return {
    ...owner, get,
    command: (input: NotificationRuleInput) => baseUrl ? owner.command(input) : Promise.reject(new NotificationRuleRequestError("notification_rule_api_base_url_missing")),
    list: async (signal?: AbortSignal, cursor?: string) => {
      const result = await request<NotificationRuleLibrary>(`/v2/notification-rules${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { signal });
      if (!Array.isArray(result.items) || result.scope !== "local-owner-poc") throw new NotificationRuleRequestError("notification_rule_response_invalid");
      result.items.forEach(item => validate(item, item.id));
      return result;
    },
  };
}
