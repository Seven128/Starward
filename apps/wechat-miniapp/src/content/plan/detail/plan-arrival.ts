import { zonedLocalToUtc, type ObservationPlan } from "@starward/miniapp-contracts";

export interface PlanArrivalCheck {
  arrivalLabel: string;
  delayMinutes: number;
}

/** Compares attributable route duration with user-owned times without changing either. */
export function checkPlanArrival(plan: ObservationPlan, travelMinutes: number | null): PlanArrivalCheck | null {
  if (!plan.timing || travelMinutes === null || !Number.isFinite(travelMinutes) || travelMinutes < 0) return null;
  try {
    const timezone = plan.contextSnapshot.timezone;
    const departure = zonedLocalToUtc({ localDate: plan.timing.departureLocalDate,
      localTime: plan.timing.departureLocalTime, timezone });
    const start = zonedLocalToUtc({ localDate: plan.localDate, localTime: plan.localTime, timezone });
    const arrival = new Date(Date.parse(departure) + travelMinutes * 60_000);
    const parts = new Intl.DateTimeFormat("zh-CN", { timeZone: timezone, month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(arrival);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)?.value ?? "";
    return { arrivalLabel: `${part("month")}-${part("day")} ${part("hour")}:${part("minute")}`,
      delayMinutes: Math.max(0, Math.ceil((arrival.getTime() - Date.parse(start)) / 60_000)) };
  } catch { return null; }
}
