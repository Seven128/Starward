import { zonedLocalToUtc, type ObservationPlan } from "@starward/miniapp-contracts";

export type PlanPartition = "upcoming" | "past";
export function planListEntries(plans: readonly ObservationPlan[], now: Date, partition: PlanPartition) {
  return plans.map(plan => {
    try {
      const start = Date.parse(zonedLocalToUtc({ localDate: plan.localDate, localTime: plan.localTime, timezone: plan.contextSnapshot.timezone }));
      if (start !== Date.parse(plan.contextSnapshot.selectedAtUtc)) throw new Error("time_mismatch");
      const end = plan.timing ? Date.parse(zonedLocalToUtc({ localDate: plan.timing.endLocalDate, localTime: plan.timing.endLocalTime, timezone: plan.contextSnapshot.timezone })) : null;
      if (end !== null && end <= start) throw new Error("time_order");
      return { plan, start, ongoing: end !== null && start <= now.getTime() && now.getTime() < end,
        past: (end ?? start) <= now.getTime(), invalid: false };
    } catch { return { plan, start: Infinity, ongoing: false, past: false, invalid: true }; }
  }).filter(entry => partition === "past" ? entry.past : !entry.past)
    .sort((a, b) => Number(a.invalid) - Number(b.invalid) ||
      (partition === "past" ? b.start - a.start : a.start - b.start) || a.plan.planId.localeCompare(b.plan.planId));
}

export function planEndLabel(plan: ObservationPlan) {
  if (!plan.timing) return "结束时间未填写";
  const date = plan.timing.endLocalDate;
  const difference = (Date.parse(date + "T00:00:00Z") - Date.parse(plan.localDate + "T00:00:00Z")) / 86_400_000;
  return `${difference === 0 ? "" : difference === 1 ? "次日 " : date + " "}${plan.timing.endLocalTime}`;
}
