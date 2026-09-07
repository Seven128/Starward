import { calendarDateInTimezone } from "../../utils/zoned-date";

export function selectPlanEntry<T extends { localDate: string; localTime: string; contextSnapshot: { timezone: string } }>(plans: readonly T[], now: Date) {
  const dated = plans.map((plan) => ({ plan, today: calendarDateInTimezone(now, plan.contextSnapshot.timezone) }));
  const order = (a: typeof dated[number], b: typeof dated[number]) =>
    `${a.plan.localDate}T${a.plan.localTime}`.localeCompare(`${b.plan.localDate}T${b.plan.localTime}`);
  const today = dated.filter((item) => item.plan.localDate === item.today).sort(order)[0];
  const future = dated.filter((item) => item.plan.localDate > item.today).sort(order)[0];
  const past = dated.filter((item) => item.plan.localDate < item.today).sort(order).at(-1);
  return { plan: (today ?? future ?? past)?.plan ?? null, title: today ? "今晚计划" : future ? "观星计划" : past ? "已保存计划" : "今晚计划" };
}
