import { normalizeUtcMoment } from "../../../contracts/src/observing-time";
/** Saved user configuration. This contract does not claim evaluation, scheduling or delivery. */
export interface NotificationRuleDefinition {
  location: { kind: "place"; label: string; latitude: number; longitude: number; spotId?: string }
    | { kind: "grid"; grid: string };
  category: "pretrip" | "long-term";
  target: string;
  threshold: { metric: string; direction: "above" | "below"; value: number; unit: string };
  leadMinutes: number;
  quietHours: { start: string; end: string; timezone: string };
  cooldownMinutes: number;
  channel: "local" | "inbox" | "apns" | "fcm" | "vendor" | "expo-poc";
  enabled: boolean;
  expiresAt: string | null;
}
export interface NotificationRule {
  schemaVersion: "starward-notification-rule-v1";
  id: string;
  ownerId: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  definition: NotificationRuleDefinition;
  evaluation: "not-evaluated";
  delivery: "not-configured";
}
export type NotificationRuleCommand = {
  command: "create-rule";
  idempotencyKey: string;
  input: NotificationRuleDefinition;
} | {
  command: "update-rule";
  idempotencyKey: string;
  ruleId: string;
  baseRevision: number;
  input: NotificationRuleDefinition;
} | {
  command: "set-rule-enabled";
  idempotencyKey: string;
  ruleId: string;
  baseRevision: number;
  enabled: boolean;
};
export interface NotificationRuleResult {
  schemaVersion: "starward-notification-rules-v2";
  status: "saved";
  replayed: boolean;
  rule: NotificationRule;
  receipt: { idempotencyKey: string; ruleId: string; revision: number; committedAt: string };
}
export interface NotificationRuleLibrary {
  schemaVersion: "starward-notification-rules-v2";
  items: NotificationRule[];
  nextCursor: string | null;
  scope: "local-owner-poc";
}
export class NotificationRuleValidationError extends Error {
  constructor(readonly code = "invalid_notification_rule") { super(code); }
}
function record(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new NotificationRuleValidationError();
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new NotificationRuleValidationError("unexpected_notification_rule_field");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || /[\u0000-\u001f]/u.test(value)) throw new NotificationRuleValidationError();
  return value.trim();
}
function minutes(value: unknown, min = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) throw new NotificationRuleValidationError();
  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new NotificationRuleValidationError();
  return value;
}
export function parseNotificationRuleDefinition(value: unknown): NotificationRuleDefinition {
  const input = record(value, ["location", "category", "target", "threshold", "leadMinutes", "quietHours", "cooldownMinutes", "channel", "enabled", "expiresAt"]);
  // In-trip rules require a real itinerary/revision binding, which this
  // configuration path does not yet supply. Do not invent one from a demo ID.
  if (input.category === "intrip") throw new NotificationRuleValidationError("notification_itinerary_rules_unavailable");
  if (input.category !== "pretrip" && input.category !== "long-term") throw new NotificationRuleValidationError();
  const place = record(input.location, ["kind", "label", "latitude", "longitude", "spotId", "grid"]);
  let location: NotificationRuleDefinition["location"];
  if (place.kind === "place") {
    if (typeof place.latitude !== "number" || !Number.isFinite(place.latitude) || place.latitude < -90 || place.latitude > 90
      || typeof place.longitude !== "number" || !Number.isFinite(place.longitude) || place.longitude < -180 || place.longitude > 180 || place.grid !== undefined) throw new NotificationRuleValidationError();
    location = { kind: "place", label: text(place.label), latitude: place.latitude, longitude: place.longitude, ...(place.spotId === undefined ? {} : { spotId: text(place.spotId) }) };
  } else if (place.kind === "grid") {
    if (["label", "latitude", "longitude", "spotId"].some(key => place[key] !== undefined)) throw new NotificationRuleValidationError();
    location = { kind: "grid", grid: text(place.grid) };
  } else throw new NotificationRuleValidationError();
  const threshold = record(input.threshold, ["metric", "direction", "value", "unit"]);
  if (threshold.direction !== "above" && threshold.direction !== "below" || typeof threshold.value !== "number" || !Number.isFinite(threshold.value)) throw new NotificationRuleValidationError();
  const quiet = record(input.quietHours, ["start", "end", "timezone"]);
  if (typeof quiet.start !== "string" || typeof quiet.end !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/u.test(quiet.start) || !/^([01]\d|2[0-3]):[0-5]\d$/u.test(quiet.end)) throw new NotificationRuleValidationError();
  const timezone = text(quiet.timezone);
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }).format(); } catch { throw new NotificationRuleValidationError("invalid_notification_rule_timezone"); }
  if (!["local", "inbox", "apns", "fcm", "vendor", "expo-poc"].includes(String(input.channel))) throw new NotificationRuleValidationError();
  const expiresAt = input.expiresAt === null ? null : typeof input.expiresAt === "string" ? normalizeUtcMoment(input.expiresAt) : null;
  if (input.expiresAt !== null && expiresAt === null) throw new NotificationRuleValidationError("invalid_notification_rule_expiry");
  return {
    location, category: input.category, target: text(input.target),
    threshold: { metric: text(threshold.metric), direction: threshold.direction, value: threshold.value, unit: text(threshold.unit) },
    leadMinutes: minutes(input.leadMinutes), quietHours: { start: quiet.start, end: quiet.end, timezone }, cooldownMinutes: minutes(input.cooldownMinutes),
    channel: input.channel as NotificationRuleDefinition["channel"], enabled: boolean(input.enabled), expiresAt,
  };
}
export function parseNotificationRuleCommand(value: unknown): NotificationRuleCommand {
  const command = record(value, ["command", "idempotencyKey", "input", "ruleId", "baseRevision", "enabled"]);
  const idempotencyKey = text(command.idempotencyKey);
  if (command.command === "create-rule") {
    if (["ruleId", "baseRevision", "enabled"].some(key => command[key] !== undefined)) throw new NotificationRuleValidationError();
    return { command: "create-rule", idempotencyKey, input: parseNotificationRuleDefinition(command.input) };
  }
  const ruleId = text(command.ruleId), baseRevision = minutes(command.baseRevision, 1);
  if (command.command === "update-rule" && command.enabled === undefined) return { command: "update-rule", idempotencyKey, ruleId, baseRevision, input: parseNotificationRuleDefinition(command.input) };
  if (command.command === "set-rule-enabled" && command.input === undefined) return { command: "set-rule-enabled", idempotencyKey, ruleId, baseRevision, enabled: boolean(command.enabled) };
  throw new NotificationRuleValidationError("invalid_notification_rule_command");
}
