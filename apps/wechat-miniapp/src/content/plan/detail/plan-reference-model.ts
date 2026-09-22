import { zonedLocalToUtc, type ObservationPlan, type SkyReport } from "@starward/miniapp-contracts";
import { calendarDateInTimezone, clockTimeInTimezone } from "../../../utils/zoned-date";

export function planReference(plan: ObservationPlan, report: SkyReport | null) {
  const timezone = plan.contextSnapshot.timezone;
  const empty = { nightRange: null as string | null, dusk: "暂无数据", dawn: "暂无数据",
    moonrise: "暂无数据", moonset: "暂无数据", illumination: "暂无数据",
    cloud: "暂无数据", wind: "暂无数据", temperature: "暂无数据", weatherStarts: [] as string[] };
  const start = Date.parse(plan.contextSnapshot.selectedAtUtc);
  let end: number;
  try {
    end = plan.timing ? Date.parse(zonedLocalToUtc({ localDate: plan.timing.endLocalDate,
      localTime: plan.timing.endLocalTime, timezone })) : NaN;
  } catch { return empty; }
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !report ||
    report.context.spotId !== plan.spotId || report.context.timezone !== timezone ||
    Date.parse(report.context.at) !== start) return empty;
  const stamp = (time: number) => {
    const date = new Date(time);
    return `${calendarDateInTimezone(date, timezone)} ${clockTimeInTimezone(date, timezone)}`;
  };
  const rows = report.hourly.filter(row => Date.parse(row.at) >= start && Date.parse(row.at) < end);
  const range = (values: readonly (number | null)[], unit: string, min = -Infinity, max = Infinity) => {
    const valid = values.filter((n): n is number => n !== null && Number.isFinite(n) && n >= min && n <= max);
    if (!valid.length) return "暂无数据";
    const low = Math.round(Math.min(...valid) * 10) / 10, high = Math.round(Math.max(...valid) * 10) / 10;
    return `${low === high ? low : `${low}–${high}`}${unit}`;
  };
  const weatherRows = rows.filter(row => row.weatherAt && Number.isFinite(Date.parse(row.weatherAt)) &&
    Date.parse(row.weatherAt) <= Date.parse(row.at) && Date.parse(row.at) < Date.parse(row.weatherAt) + 3_600_000);
  const nightStart = Date.parse(report.nightFacts?.startAt ?? ""), nightEnd = Date.parse(report.nightFacts?.endAt ?? "");
  const nightValid = Number.isFinite(nightStart) && Number.isFinite(nightEnd) && nightEnd > nightStart && nightStart < end && nightEnd > start;
  const event = (at: string | null | undefined) => {
    const time = Date.parse(at ?? "");
    return nightValid && time >= nightStart && time < nightEnd ? stamp(time) : "暂无数据";
  };
  return {
    nightRange: nightValid ? `${stamp(nightStart)}–${stamp(nightEnd)}` : null,
    dusk: event(report.nightFacts?.astronomicalDuskAt), dawn: event(report.nightFacts?.astronomicalDawnAt),
    moonrise: event(report.lunarFacts.moonriseAt), moonset: event(report.lunarFacts.moonsetAt),
    illumination: range(rows.map(row => row.moonIllumination === null ? null : row.moonIllumination * 100), "%", 0, 100),
    cloud: range(weatherRows.map(row => row.cloudPercent), "%", 0, 100),
    wind: range(weatherRows.map(row => row.windKph), " km/h", 0),
    temperature: range(weatherRows.map(row => row.temperatureC), "°C"),
    weatherStarts: [...new Set(weatherRows.map(row => row.weatherAt!))],
  };
}
