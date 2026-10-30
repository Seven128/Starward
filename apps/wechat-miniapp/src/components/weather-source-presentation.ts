import { CLOUD_NATIVE_STEPS, cloudPointSeriesAt, cloudTimeBracket, copyTotalCloudContext, totalCloudSupports240Hours, uniqueSourceRecords,
  type CloudForecastEvidence, type CloudPointSeries, type SkyReport, type SourceSummary } from "@starward/miniapp-contracts";
import { currentTotalCloudEvidence } from "../services/forecast-presentation";
import { calendarDateInTimezone, clockTimeInTimezone } from "../utils/zoned-date";
import type { SourceSection } from "../utils/source-document";
import { mergeForecastIntervals, type ForecastInterval } from "./forecast-coverage";

export function hasIndependentTotalCloud(report: SkyReport) {
  return report.weatherEvidence?.totalCloud !== undefined || report.hourly.some(row => row.cloudEvidence !== undefined);
}

function sample(series: CloudPointSeries, at: string, now: number) {
  try { return cloudPointSeriesAt(series, at, now); } catch { return null; }
}

function clipped(intervals: readonly ForecastInterval[], window?: ForecastInterval) {
  if (!window) return mergeForecastIntervals(intervals);
  const start = Date.parse(window.start), end = Date.parse(window.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
  return mergeForecastIntervals(intervals.flatMap(interval => {
    const low = Math.max(start, Date.parse(interval.start)), high = Math.min(end, Date.parse(interval.end));
    // The upper plan endpoint is exclusive, including an isolated native instant.
    return low <= high && low < end ? [{ start: new Date(low).toISOString(), end: new Date(high).toISOString() }] : [];
  }));
}

/** Source coverage is admitted by the same point sampler as displayed values.
 * Midpoint queries qualify adjacent native endpoints; isolated native values
 * remain instants and never acquire an invented hour or bridge a missing frame. */
export function totalCloudCoverage(report: SkyReport, now = Date.now(), window?: ForecastInterval): ForecastInterval[] | undefined {
  if (!hasIndependentTotalCloud(report)) return undefined;
  const forecast = report.weatherEvidence?.totalCloud;
  if (forecast !== undefined) {
    if (forecast.state === "EXPIRED" || forecast.state === "UNAVAILABLE") return [];
    const series = forecast.value;
    if (!series || !Array.isArray(series.frames) || series.frames.length > CLOUD_NATIVE_STEPS.length) return [];
    const ranges: ForecastInterval[] = [];
    for (let index = 0; index < series.frames.length; index++) {
      const frame = series.frames[index];
      if (!frame) return [];
      const native = sample(series, frame.validAt, now);
      if (native) ranges.push({ start: native.selectedAt, end: native.selectedAt });
      const next = series.frames[index + 1];
      if (!next) continue;
      const at = (Date.parse(frame.validAt) + Date.parse(next.validAt)) / 2;
      if (!Number.isFinite(at)) continue;
      const between = sample(series, new Date(at).toISOString(), now);
      if (between) ranges.push({ start: between.lowerAt, end: between.upperAt });
    }
    return clipped(ranges, window);
  }
  return clipped(report.hourly.flatMap(row => {
    const evidence = currentTotalCloudEvidence(row.cloudEvidence, row.at, now);
    return evidence ? [{ start: evidence.lowerAt, end: evidence.upperAt }] : [];
  }), window);
}

export function selectedTotalCloud(report: SkyReport, at: string, now = Date.now()): CloudForecastEvidence | null {
  const forecast = report.weatherEvidence?.totalCloud;
  if (forecast !== undefined) return forecast.state !== "EXPIRED" && forecast.state !== "UNAVAILABLE" && forecast.value
    ? sample(forecast.value, at, now) : null;
  const row = report.hourly.find(row => Date.parse(row.at) === Date.parse(at));
  return currentTotalCloudEvidence(row?.cloudEvidence, at, now);
}

export function totalCloudMissingLabel(report: SkyReport, now = Date.now()) {
  const forecast = report.weatherEvidence?.totalCloud;
  if (forecast?.state === "EXPIRED") return "已过期";
  if (forecast?.value) {
    try {
      const binding = copyTotalCloudContext(forecast.value.binding);
      if (binding.state === "PINNED" && now > Date.parse(binding.supports240HoursUntil) && !totalCloudSupports240Hours(binding, now)) return "已过期";
    } catch { return "读取失败"; }
  }
  return forecast?.errorCode ? "读取失败" : "暂无覆盖";
}

function stamp(at: string, timezone: string) {
  const date = new Date(at), second = date.getUTCSeconds(), milliseconds = date.getUTCMilliseconds();
  const precise = second || milliseconds ? `:${String(second).padStart(2, "0")}${milliseconds ? `.${String(milliseconds).padStart(3, "0")}` : ""}` : "";
  return `${calendarDateInTimezone(date, timezone)} ${clockTimeInTimezone(date, timezone)}${precise}`;
}

/** Keep source interpretation in the existing reader, beside full provenance. */
export function weatherSourceSections(report: SkyReport, at: string, timezone: string, stale = false,
  now = Date.now(), cloudIntervals = totalCloudCoverage(report, now)): SourceSection[] {
  const starts = report.hourly.flatMap(row => row.weatherAt ? [row.weatherAt] : []);
  if (cloudIntervals === undefined) return [
    { kind: "forecast", starts, stale, timezone },
    { kind: "text", paragraphs: ["所选时刻的天气取自对应小时；缺少天气覆盖时，天文仍按所选时刻计算。获取时间不代表预报发布时间。"] },
  ];
  const selected = selectedTotalCloud(report, at, now), forecast = report.weatherEvidence?.totalCloud;
  const items = selected ? [
    { label: "起报时刻", value: stamp(selected.runAt, timezone) },
    { label: "所选时刻", value: stamp(selected.selectedAt, timezone) },
    { label: "本批可用至", value: stamp(selected.validUntil, timezone) },
    { label: selected.interpolation === "NATIVE" ? "原生有效时刻" : "插值两端", value: selected.interpolation === "NATIVE"
      ? stamp(selected.lowerAt, timezone) : `${stamp(selected.lowerAt, timezone)} 至 ${stamp(selected.upperAt, timezone)}` },
  ] : [{ label: "所选时刻总云量", value: totalCloudMissingLabel(report, now) }];
  const series = forecast?.value;
  const bracket = selected?.interpolation === "LINEAR" && series ? cloudTimeBracket(series.frames, series.binding.runAt, at) : null;
  if (bracket) items.push({ label: "两端权重", value: `前 ${Number(((1 - bracket.fraction) * 100).toPrecision(8))}% · 后 ${Number((bracket.fraction * 100).toPrecision(8))}%` });
  return [
    { kind: "forecast", starts, cloudIntervals, stale, timezone },
    { kind: "facts", title: "总云量 · 地点时间", items },
    { kind: "text", paragraphs: [
      "总云量来自 ECMWF 同一起报批次，前144小时原生间隔3小时，此后6小时；相邻有效时次间先插值数值，缺测及范围外不补齐。",
      "气温、风、降水等其他天气仍取自和风天气对应小时；云量与其他天气分别判定有效期。获取时间不代表起报或预报发布时间。",
    ] },
  ];
}

/** Required notices follow actual supplied fields, independently of QWeather hours. */
export function weatherCreditSources(report: SkyReport, hasWeather: boolean, hasCloud: boolean): readonly SourceSummary[] {
  const sources = report.sources.filter(source => source.kind === "THIRD_PARTY_FORECAST");
  if (!hasIndependentTotalCloud(report)) return hasWeather ? sources : [];
  const cloud = report.weatherEvidence?.totalCloud?.source ?? sources.find(source =>
    report.hourly.some(row => row.cloudEvidence?.publicationId === source.id));
  return uniqueSourceRecords([
    ...(hasWeather ? sources.filter(source => source.id !== cloud?.id && !source.id.startsWith("ecmwf-tcc:")) : []),
    ...(hasCloud && cloud ? [cloud] : []),
  ]);
}
