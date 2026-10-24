import { normalizeUtcMoment } from "../../../contracts/src/observing-time";
import type { ForecastQuery } from "../../../contracts/src/forecast";
import type { NotificationRule, NotificationRuleDefinition } from "./rules";

export const notificationWeatherMetrics = {
  totalCloudPct: { label: "总云量", unit: "%" },
  windSpeedMps: { label: "风速", unit: "m/s" },
  windGustMps: { label: "阵风", unit: "m/s" },
  precipitationProbabilityPct: { label: "降水概率", unit: "%" },
  precipitationMm: { label: "降水量", unit: "mm" },
  temperatureC: { label: "气温", unit: "°C" },
} as const;
export type NotificationWeatherMetric = keyof typeof notificationWeatherMetrics;
export interface NotificationSourceSnapshot {
  provider: string; model: string; runId: string; modelRunTimeUtc: string;
  acquiredAt: string; fetchedAt: string; expiresAt: string; dataVersion: string;
  use: "noncommercial-poc" | "production"; sourceLicense: string;
  attribution: Array<{ label: string; url: string; licenseId: string; licenseVersion: string; modified: boolean }>;
}
/** Trusted acquisition projection, not a client command or a regional coverage claim. */
export interface NotificationWeatherAcquisition {
  schemaVersion: "starward-notification-weather-acquisition-v1";
  id: string;
  query: ForecastQuery;
  providerPoint: { latitude: number; longitude: number; coordinateSystem: "WGS84" };
  source: NotificationSourceSnapshot;
  nightWindow: { startUtc: string; endUtc: string } | null;
  targetWindow: { startUtc: string; endUtc: string } | null;
  astronomyAlgorithmVersion: string;
  hours: Array<{ at: string; endUtc: string; gridCellId: string; values: Record<NotificationWeatherMetric, number | null> }>;
}
export interface NotificationControls {
  schemaVersion: "starward-notification-controls-v1"; ownerId: string; revision: number; updatedAt: string | null;
  enabled: boolean; categories: Record<NotificationRuleDefinition["category"], boolean>;
}
export interface NotificationControlsCommand {
  command: "set-controls"; idempotencyKey: string; baseRevision: number;
  /** Restricts the server-derived owner; it never establishes authorization. */
  expectedOwnerId: string;
  enabled: boolean; categories: NotificationControls["categories"];
}
export interface NotificationControlsResult {
  schemaVersion: "starward-notifications-v1"; replayed: boolean; controls: NotificationControls;
  receipt: { idempotencyKey: string; revision: number; committedAt: string };
}
export interface NotificationRuleActivity {
  ruleId: string; revision: number; supported: boolean; reason: string | null;
  lastEvaluation: { eventId: string; at: string; source: NotificationSourceSnapshot; status: string; consideredWindows: number; queued: number } | null;
  lastDeliveryAt: string | null; pending: number;
  evaluationStatus: "ready" | "processing" | "unavailable";
}
export interface NotificationTriggerSnapshot {
  ruleId: string; revision: number; eventId: string; location: NotificationRuleDefinition["location"]; target: string;
  category: NotificationRuleDefinition["category"];
  metric: NotificationWeatherMetric; unit: string; direction: "above" | "below"; threshold: number;
  previousValue: number; previousSource: NotificationSourceSnapshot; value: number; source: NotificationSourceSnapshot;
  window: { startUtc: string; endUtc: string }; query: ForecastQuery; astronomyAlgorithmVersion: string;
}
export interface NotificationInboxMessage {
  id: string; ownerId: string; deliveredAt: string; dueAt: string;
  trigger: NotificationTriggerSnapshot;
  evidence: { value: number; source: NotificationSourceSnapshot };
  current: "same-condition" | "condition-reversed" | "expired" | "unconfirmed";
  currentEvidence: { value: number | null; source: NotificationSourceSnapshot } | null;
  boundary: "in-app-inbox-only";
}
export interface NotificationInboxPage {
  schemaVersion: "starward-notifications-v1"; items: NotificationInboxMessage[]; nextCursor: string | null;
  scope: "local-owner-poc"; ownerId: string; checkedAt: string; evaluationStatus: "ready" | "processing" | "unavailable";
}
export class NotificationEvaluationError extends Error {
  constructor(readonly code: string, readonly statusCode = 400) { super(code); }
}
export function parseNotificationControlsCommand(value: unknown): NotificationControlsCommand {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NotificationEvaluationError("invalid_notification_controls");
  const v = value as Record<string, unknown>, c = v.categories as Record<string, unknown> | undefined;
  if (Object.keys(v).some(key => !["command", "idempotencyKey", "baseRevision", "expectedOwnerId", "enabled", "categories"].includes(key))
    || v.command !== "set-controls" || typeof v.idempotencyKey !== "string" || !v.idempotencyKey.trim()
    || typeof v.expectedOwnerId !== "string" || !v.expectedOwnerId.trim()
    || !Number.isSafeInteger(v.baseRevision) || (v.baseRevision as number) < 0 || typeof v.enabled !== "boolean"
    || !c || typeof c !== "object" || Array.isArray(c) || Object.keys(c).length !== 2
    || typeof c.pretrip !== "boolean" || typeof c["long-term"] !== "boolean") throw new NotificationEvaluationError("invalid_notification_controls");
  return { command: "set-controls", idempotencyKey: v.idempotencyKey, baseRevision: v.baseRevision as number, expectedOwnerId: v.expectedOwnerId, enabled: v.enabled, categories: { pretrip: c.pretrip, "long-term": c["long-term"] } };
}
export function notificationRuleSupport(rule: NotificationRule): string | null {
  const d = rule.definition;
  if (d.location.kind !== "place") return "grid-coverage-unqualified";
  if (!["milky-way-core", "moon", "mercury", "venus", "mars", "jupiter", "saturn"].includes(d.target)) return "target-unavailable";
  if (!Object.hasOwn(notificationWeatherMetrics, d.threshold.metric)) return "metric-unavailable";
  if (notificationWeatherMetrics[d.threshold.metric as NotificationWeatherMetric].unit !== d.threshold.unit) return "metric-unit-mismatch";
  if (d.channel !== "inbox") return "channel-not-configured";
  if (d.quietHours.start === d.quietHours.end) return "quiet-hours-ambiguous";
  if (!Number.isSafeInteger(d.leadMinutes * 60_000) || !Number.isSafeInteger(d.cooldownMinutes * 60_000)) return "time-range-unavailable";
  return null;
}
export function notificationThreshold(value: number, rule: NotificationRule): boolean {
  return rule.definition.threshold.direction === "above" ? value > rule.definition.threshold.value : value < rule.definition.threshold.value;
}
export function isNotificationQuiet(at: number, quiet: NotificationRuleDefinition["quietHours"]): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: quiet.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(at));
  const minute = Number(parts.find(part => part.type === "hour")!.value) * 60 + Number(parts.find(part => part.type === "minute")!.value);
  const toMinute = (v: string) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
  const start = toMinute(quiet.start), end = toMinute(quiet.end);
  return start === end || (start < end ? minute >= start && minute < end : minute >= start || minute < end);
}
/** Minute precision belongs to the user's HH:mm contract. Search only within
 * this evidence's useful lifetime, so DST gaps/repeats never fabricate UTC. */
export function nextNotificationAllowed(at: number, until: number, quiet: NotificationRuleDefinition["quietHours"]): number | null {
  if (!isNotificationQuiet(at, quiet)) return at;
  const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: quiet.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const toMinute = (v: string) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
  const start = toMinute(quiet.start), end = toMinute(quiet.end);
  for (let t = Math.floor(at / 60_000) * 60_000 + 60_000; t < until; t += 60_000) {
    const parts = formatter.formatToParts(new Date(t));
    const minute = Number(parts.find(part => part.type === "hour")!.value) * 60 + Number(parts.find(part => part.type === "minute")!.value);
    if (start < end ? minute < start || minute >= end : minute >= end && minute < start) return t;
  }
  return null;
}
export function requireNotificationInstant(value: string): string {
  const result = normalizeUtcMoment(value);
  if (!result) throw new NotificationEvaluationError("notification_source_invalid");
  return result;
}
