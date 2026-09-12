/** User intent only. Authorization, scheduling and delivery are server-owned facts. */
export interface PlanChecklistCompletionRequest {
  reminderId: string;
  itemId: string;
  completed: boolean;
  expectedRevision: number;
}

export interface PlanReminder {
  reminderId: string;
  title: string;
  hoursBeforeDeparture: number;
  notifyOnWechat: boolean;
  items: readonly { itemId: string; text: string; completed: boolean }[];
}

/** Server-owned notification state. `notifyOnWechat` remains user intent only. */
export type PlanReminderNotificationState =
  | "NOT_REQUESTED"
  | "CAPABILITY_UNAVAILABLE"
  | "AUTHORIZATION_REQUIRED"
  | "SCHEDULED"
  | "SENT"
  | "SKIPPED"
  | "FAILED"
  | "RESULT_UNKNOWN";

export interface PlanReminderNotificationStatus {
  planId: string;
  reminderId: string;
  planRevision: number;
  scheduleVersion: string;
  triggerAtUtc: string | null;
  departureAtUtc: string | null;
  state: PlanReminderNotificationState;
  reason:
    | "USER_DID_NOT_REQUEST"
    | "DEPARTURE_TIME_REQUIRED"
    | "TEMPLATE_NOT_CONFIGURED"
    | "AUTHORIZATION_NOT_GRANTED"
    | "WAITING_FOR_TRIGGER"
    | "DELIVERED"
    | "TRIGGER_MISSED"
    | "DEPARTURE_EXPIRED"
    | "PROVIDER_REJECTED"
    | "PROVIDER_OUTCOME_UNKNOWN";
  updatedAt: string;
}

export function parsePlanReminders(input: unknown, draft = false): PlanReminder[] {
  if (!Array.isArray(input) || input.length > 5) throw new Error("plan_reminder_limit_invalid");
  const ids = new Set<string>();
  const identifier = (value: unknown, seen: Set<string>) => {
    if (typeof value !== "string" || !/^[A-Za-z0-9:_-]{1,128}$/u.test(value) || seen.has(value)) throw new Error("plan_reminder_identity_invalid");
    seen.add(value); return value;
  };
  const content = (value: unknown) => {
    if (typeof value !== "string" || [...value].length > 100 || /[\p{Cc}\p{Zl}\p{Zp}]/u.test(value)) throw new Error("plan_reminder_text_invalid");
    if (!draft && !value.trim()) throw new Error("plan_reminder_text_required");
    return draft ? value : value.trim();
  };
  return input.map(raw => {
    if (!raw || typeof raw !== "object") throw new Error("plan_reminder_invalid");
    const reminderId = identifier(raw.reminderId, ids);
    if (!Number.isFinite(raw.hoursBeforeDeparture) || (!draft && (raw.hoursBeforeDeparture < 0.01 || raw.hoursBeforeDeparture > 8760))) throw new Error("plan_reminder_offset_invalid");
    if (typeof raw.notifyOnWechat !== "boolean") throw new Error("plan_reminder_intent_invalid");
    if (!Array.isArray(raw.items) || raw.items.length > 20) throw new Error("plan_reminder_item_limit_invalid");
    const itemIds = new Set<string>();
    return { reminderId, title: content(raw.title), hoursBeforeDeparture: raw.hoursBeforeDeparture,
      notifyOnWechat: raw.notifyOnWechat,
      items: raw.items.map((item: unknown) => {
        if (!item || typeof item !== "object") throw new Error("plan_reminder_item_invalid");
        const value = item as Record<string, unknown>;
        if (typeof value.completed !== "boolean") throw new Error("plan_reminder_completion_invalid");
        return { itemId: identifier(value.itemId, itemIds), text: content(value.text), completed: value.completed };
      }),
    };
  });
}
