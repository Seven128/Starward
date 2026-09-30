import type { ObservationPlan } from "@starward/miniapp-contracts";
import { planInterval } from "../../../features/plan/plan-interval";

export type PlanPartition = "upcoming" | "past";
export function planListEmptyState(partition: PlanPartition, hasPlansInOtherPartition: boolean) {
  if (hasPlansInOtherPartition) return partition === "past"
    ? { title: "暂无过往计划", detail: "接下来的计划可在“接下来”查看。", actionLabel: "查看接下来", action: "switch" as const }
    : { title: "接下来暂无计划", detail: "已结束的计划可在“过往”查看。", actionLabel: "查看过往", action: "switch" as const };
  return partition === "past"
    ? { title: "暂无过往计划", detail: "已结束的计划会显示在这里。", actionLabel: "＋ 新建计划", action: "create" as const }
    : { title: "暂无观星计划", detail: "新建计划后会显示在这里。", actionLabel: "＋ 新建计划", action: "create" as const };
}
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
