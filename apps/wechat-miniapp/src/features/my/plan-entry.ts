import { localParts, zonedLocalToUtc, type ObservationPlan } from "@starward/miniapp-contracts";

export function myPlanTimeLabel(plan: ObservationPlan, now: Date, ongoing: boolean) {
  const today = localParts(now, plan.contextSnapshot.timezone);
  const date = ongoing && plan.timing ? plan.timing.endLocalDate : plan.localDate;
  const time = ongoing && plan.timing ? plan.timing.endLocalTime : plan.localTime;
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const difference = (Date.UTC(year, month - 1, day) - Date.UTC(today.year, today.month - 1, today.day)) / 86_400_000;
  const dayLabel = difference === 0 ? "今天" : difference === 1 ? "明天" : date;
  const minutes = Math.max(0, Math.ceil((Date.parse(plan.contextSnapshot.selectedAtUtc) - now.getTime()) / 60_000));
  const hours = Math.floor(minutes / 60), remainder = minutes % 60;
  return {
    when: `${dayLabel} ${time}${ongoing ? "结束" : ""}`,
    relative: ongoing ? null : minutes === 0 ? "即将开始" : `${hours ? `${hours}小时` : ""}${remainder ? `${remainder}分` : ""}后`,
  };
}

export function selectPlanEntry<T extends Pick<ObservationPlan, "planId" | "localDate" | "localTime" | "timing" | "contextSnapshot">>(plans: readonly T[], now: Date) {
  const instant = now.getTime();
  const eligible = plans.flatMap((plan) => {
    try {
      const timezone = plan.contextSnapshot.timezone;
      const start = Date.parse(plan.contextSnapshot.selectedAtUtc);
      if (!Number.isFinite(start) || start !== Date.parse(zonedLocalToUtc({ localDate: plan.localDate, localTime: plan.localTime, timezone }))) return [];
      const end = plan.timing ? Date.parse(zonedLocalToUtc({ localDate: plan.timing.endLocalDate, localTime: plan.timing.endLocalTime, timezone })) : null;
      if (end !== null && (!Number.isFinite(end) || end <= start)) return [];
      const ongoing = end !== null && start <= instant && instant < end;
      if (!ongoing && !(instant <= start && start <= instant + 24 * 60 * 60_000)) return [];
      return [{ plan, start, end, ongoing }];
    } catch { return []; }
  }).sort((a, b) => Number(b.ongoing) - Number(a.ongoing) || a.start - b.start || a.plan.planId.localeCompare(b.plan.planId));
  return { title: "观星计划", plan: eligible[0]?.plan ?? null,
    entries: eligible.slice(0, 3), hasMore: eligible.length > 3 };
}
