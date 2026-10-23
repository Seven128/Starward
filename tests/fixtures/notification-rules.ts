import type { NotificationRule, NotificationRuleDefinition, NotificationRuleResult } from "../../packages/domain/src/notifications/rules";
export const ruleDefinition = (): NotificationRuleDefinition => ({ location: { kind: "place", label: "用户选定地点", latitude: 23.12, longitude: 113.26 }, category: "pretrip", target: "moon", threshold: { metric: "cloud-cover", direction: "below", value: 25, unit: "%" }, leadMinutes: 60, quietHours: { start: "22:00", end: "08:00", timezone: "Asia/Shanghai" }, cooldownMinutes: 120, channel: "local", enabled: false, expiresAt: null });
export function savedRule(revision = 1, definition = ruleDefinition()): NotificationRule {
  return { schemaVersion: "starward-notification-rule-v1", id: "rule-1", ownerId: "local-owner", revision, createdAt: "2026-10-24T00:00:00Z", updatedAt: "2026-10-24T00:00:00Z", definition, evaluation: "not-evaluated", delivery: "not-configured" };
}
export function ruleResult(key = "same-key", rule = savedRule()): NotificationRuleResult {
  return { schemaVersion: "starward-notification-rules-v2", status: "saved", replayed: false, rule, receipt: { idempotencyKey: key, ruleId: rule.id, revision: rule.revision, committedAt: rule.updatedAt } };
}
