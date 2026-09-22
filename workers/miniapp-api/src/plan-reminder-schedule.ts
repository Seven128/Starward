import { createHash } from "node:crypto";
import { zonedLocalToUtc, type ObservationPlan, type PlanReminderNotificationStatus } from "@starward/miniapp-contracts";

export type StoredPlanReminderState =
  | "NOT_REQUESTED"
  | "UNSCHEDULABLE"
  | "WAITING_AUTHORIZATION"
  | "SCHEDULED"
  | "SENT"
  | "SKIPPED"
  | "FAILED"
  | "RESULT_UNKNOWN"
  | "CANCELED";

export interface StoredPlanReminderSchedule {
  planId: string;
  userId: string;
  reminderId: string;
  planRevision: number;
  scheduleVersion: string;
  triggerAtUtc: string | null;
  departureAtUtc: string | null;
  state: StoredPlanReminderState;
  reason: string;
  attemptCount: number;
  updatedAt: string;
}

function versionOf(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function derivePlanReminderSchedules(
  userId: string,
  plan: ObservationPlan,
  now = new Date(),
): StoredPlanReminderSchedule[] {
  const updatedAt = now.toISOString();
  let departureAtUtc: string | null = null;
  if (plan.timing) {
    try {
      departureAtUtc = zonedLocalToUtc({
        localDate: plan.timing.departureLocalDate,
        localTime: plan.timing.departureLocalTime,
        timezone: plan.contextSnapshot.timezone,
      });
    } catch {
      departureAtUtc = null;
    }
  }
  return (plan.reminders ?? []).map((reminder) => {
    const scheduleVersion = versionOf({
      planId: plan.planId,
      reminderId: reminder.reminderId,
      notifyOnWechat: reminder.notifyOnWechat,
      hoursBeforeDeparture: reminder.hoursBeforeDeparture,
      departureAtUtc,
    });
    const triggerAtUtc = departureAtUtc
      ? new Date(Date.parse(departureAtUtc) - reminder.hoursBeforeDeparture * 3_600_000).toISOString()
      : null;
    let state: StoredPlanReminderState = "WAITING_AUTHORIZATION";
    let reason = "AUTHORIZATION_NOT_GRANTED";
    if (!reminder.notifyOnWechat) {
      state = "NOT_REQUESTED";
      reason = "USER_DID_NOT_REQUEST";
    } else if (!departureAtUtc || !triggerAtUtc) {
      state = "UNSCHEDULABLE";
      reason = "DEPARTURE_TIME_REQUIRED";
    } else if (Date.parse(departureAtUtc) <= now.getTime()) {
      state = "SKIPPED";
      reason = "DEPARTURE_EXPIRED";
    } else if (Date.parse(triggerAtUtc) <= now.getTime()) {
      state = "SKIPPED";
      reason = "TRIGGER_MISSED";
    }
    return {
      planId: plan.planId,
      userId,
      reminderId: reminder.reminderId,
      planRevision: plan.revision,
      scheduleVersion,
      triggerAtUtc,
      departureAtUtc,
      state,
      reason,
      attemptCount: 0,
      updatedAt,
    };
  });
}

export function publicReminderStatus(
  row: StoredPlanReminderSchedule,
  capabilityConfigured: boolean,
  now = new Date(),
): PlanReminderNotificationStatus {
  const result = (state: PlanReminderNotificationStatus["state"], reason: PlanReminderNotificationStatus["reason"]): PlanReminderNotificationStatus => ({
    planId: row.planId,
    reminderId: row.reminderId,
    planRevision: row.planRevision,
    scheduleVersion: row.scheduleVersion,
    triggerAtUtc: row.triggerAtUtc,
    departureAtUtc: row.departureAtUtc,
    state,
    reason,
    updatedAt: row.updatedAt,
  });
  if ((row.state === "WAITING_AUTHORIZATION" || row.state === "SCHEDULED") && row.departureAtUtc && Date.parse(row.departureAtUtc) <= now.getTime())
    return result("SKIPPED", "DEPARTURE_EXPIRED");
  if ((row.state === "WAITING_AUTHORIZATION" || row.state === "SCHEDULED") && row.triggerAtUtc && Date.parse(row.triggerAtUtc) <= now.getTime())
    return result("SKIPPED", "TRIGGER_MISSED");
  if ((row.state === "WAITING_AUTHORIZATION" || row.state === "SCHEDULED") && !capabilityConfigured)
    return result("CAPABILITY_UNAVAILABLE", "DELIVERY_NOT_CONFIGURED");
  const state = row.state === "WAITING_AUTHORIZATION" ? "AUTHORIZATION_REQUIRED"
    : row.state === "UNSCHEDULABLE" || row.state === "CANCELED" ? "SKIPPED"
    : row.state;
  const reasons = new Set([
    "USER_DID_NOT_REQUEST", "DEPARTURE_TIME_REQUIRED", "AUTHORIZATION_NOT_GRANTED",
    "WAITING_FOR_TRIGGER", "DELIVERED", "TRIGGER_MISSED", "DEPARTURE_EXPIRED",
    "PROVIDER_REJECTED", "PROVIDER_OUTCOME_UNKNOWN", "PROVIDER_ACCEPTED", "PROVIDER_NOT_ATTEMPTED",
  ]);
  const reason = reasons.has(row.reason) ? row.reason : "PROVIDER_OUTCOME_UNKNOWN";
  return result(state, reason as PlanReminderNotificationStatus["reason"]);
}
