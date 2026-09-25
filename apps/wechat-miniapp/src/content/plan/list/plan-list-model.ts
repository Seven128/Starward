import type { ObservationPlan } from "@starward/miniapp-contracts";
import { planInterval } from "../../../features/plan/plan-interval";

export type PlanPartition = "upcoming" | "past";
export function planListEntries(plans: readonly ObservationPlan[], now: Date, partition: PlanPartition) {
  return plans.map(plan => {
    const interval = planInterval(plan);
    if (!interval) return { plan, start: Infinity, ongoing: false, past: false, invalid: true };
    const { start, end } = interval;
    return { plan, start, ongoing: end !== null && start <= now.getTime() && now.getTime() < end,
      past: (end ?? start) <= now.getTime(), invalid: false };
  }).filter(entry => partition === "past" ? entry.past : !entry.past)
    .sort((a, b) => Number(a.invalid) - Number(b.invalid) ||
      (partition === "past" ? b.start - a.start : a.start - b.start) || a.plan.planId.localeCompare(b.plan.planId));
}

/** Recompute the visible partition as soon as a valid plan starts or ends. */
export function nextPlanListBoundary(plans: readonly ObservationPlan[], now: Date): number | null {
  let next: number | null = null;
  for (const plan of plans) {
    const interval = planInterval(plan);
    if (!interval) continue;
    for (const boundary of [interval.start, interval.end]) {
      if (boundary !== null && boundary > now.getTime() && (next === null || boundary < next)) next = boundary;
    }
  }
  return next;
}

export function planEndLabel(plan: ObservationPlan) {
  if (!plan.timing) return "结束时间未填写";
  const date = plan.timing.endLocalDate;
  const difference = (Date.parse(date + "T00:00:00Z") - Date.parse(plan.localDate + "T00:00:00Z")) / 86_400_000;
  return `${difference === 0 ? "" : difference === 1 ? "次日 " : date + " "}${plan.timing.endLocalTime}`;
}
