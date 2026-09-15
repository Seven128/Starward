import type { AstronomicalEventOccurrence, ObservationPlan } from "@starward/miniapp-contracts";

const MONTHS = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"] as const;

export function eventMonthLabel(localDate: string) {
  const month = Number(localDate.slice(5, 7));
  return MONTHS[month - 1] ?? "日期待确认";
}

export function eventDayLabel(localDate: string) {
  return /^\d{4}-\d{2}-\d{2}$/u.test(localDate) ? localDate.slice(8, 10) : "--";
}

export function eventKindLabel(event: AstronomicalEventOccurrence) {
  if (event.kind === "METEOR_SHOWER") return `流星雨 · ${event.code}`;
  return `${event.kind === "LUNAR_ECLIPSE" ? "月食" : "日食"} · ${event.code}`;
}

export function eventDatePresentation(event: AstronomicalEventOccurrence) {
  if (event.kind === "METEOR_SHOWER" && event.annualReference) return {
    ticket: "参考", date: "常年参考日（UTC）", range: "监测参考期",
    precision: "UTC 日期来自常年监测参考，不是当年精确极大或特殊爆发预报。",
  };
  if (event.kind !== "METEOR_SHOWER") return {
    ticket: "食甚", date: "食甚日期（北京时间）", range: "事件期",
    precision: "目录日期采用北京时间；食相按 UTC 时刻计算，所在地时刻与可见性见下方。",
  };
  return { ticket: "极大", date: "目录极大日期", range: "活动期",
    precision: event.peakAtUtc ? "极大时刻按来源精度保存，不代表所在地可见性。" : "年度目录仅提供日期，未提供极大时分。" };
}

export function eventPreviewDays(event: Pick<AstronomicalEventOccurrence, "activeStartDate" | "activeEndDate">) {
  const start = Date.parse(`${event.activeStartDate}T12:00:00Z`);
  const end = Date.parse(`${event.activeEndDate}T12:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  return Array.from({ length: Math.floor((end - start) / 86_400_000) + 1 }, (_, index) => {
    const date = new Date(start + index * 86_400_000);
    return { value: date.toISOString().slice(0, 10),
      weekday: ["日", "一", "二", "三", "四", "五", "六"][date.getUTCDay()]!,
      day: `${date.getUTCMonth() + 1}/${date.getUTCDate()}` };
  });
}

export function eclipseKindLabel(kind: "PENUMBRAL" | "PARTIAL" | "ANNULAR" | "TOTAL") {
  return ({ PENUMBRAL: "半影", PARTIAL: "偏食", ANNULAR: "环食", TOTAL: "全食" } as const)[kind];
}

export function phaseLabel(key: string) {
  return ({
    PENUMBRAL_BEGIN: "半影食始", PARTIAL_BEGIN: "初亏", TOTAL_BEGIN: "食既",
    PEAK: "食甚", TOTAL_END: "生光", PARTIAL_END: "复圆", PENUMBRAL_END: "半影食终",
  } as Record<string, string>)[key] ?? key;
}

export function compassLabel(azimuthDeg: number | null | undefined) {
  if (azimuthDeg == null) return "";
  const labels = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"] as const;
  return labels[Math.round(((azimuthDeg % 360) + 360) % 360 / 45) % 8]!;
}

export function groupEventsByPeakMonth(events: readonly AstronomicalEventOccurrence[]) {
  const groups = new Map<string, AstronomicalEventOccurrence[]>();
  for (const event of events) {
    const key = event.peakDate.slice(0, 7);
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }
  return [...groups.entries()].map(([month, values]) => ({
    month,
    label: eventMonthLabel(`${month}-01`),
    events: values.sort((left, right) => left.peakDate.localeCompare(right.peakDate)),
  }));
}

export type EventPlanState = "LINKED" | "DATE_OVERLAP" | "NONE";

export function eventPlanState(event: AstronomicalEventOccurrence, plans: readonly ObservationPlan[]): EventPlanState {
  if (plans.some(plan => plan.eventOccurrenceIds?.includes(event.occurrenceId))) return "LINKED";
  if (plans.some(plan => {
    const end = plan.timing?.endLocalDate ?? plan.localDate;
    return plan.localDate <= event.activeEndDate && end >= event.activeStartDate;
  })) return "DATE_OVERLAP";
  return "NONE";
}
