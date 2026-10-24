import type { ForecastModelComparison, ForecastModelSeries, ProfessionalForecastHour } from "../../../contracts/src/forecast";

const metrics = [
  { field: "totalCloudPct", label: "总云量", significantDifference: 25 },
  { field: "precipitationProbabilityPct", label: "降水概率", significantDifference: 30 },
] as const;
type Metric = typeof metrics[number];
type Point = { instant: string; fields: Metric[]; disagreement: boolean };
const hourMs = 3_600_000;
const round = (value: number) => Math.round(value * 100) / 100;
const present = (value: number | null | undefined): value is number => typeof value === "number" && Number.isFinite(value);

function unavailable(explanation: string): ForecastModelComparison {
  // Retain the v1 numeric missing placeholder; it is not qualified evidence
  // and the shared presentation does not expose it as a confidence reading.
  return { status: "missing", confidence: 0.45, explanation, consensusStartUtc: null, consensusEndUtc: null, disagreementStartUtc: null, disagreementEndUtc: null, comparedFields: [] };
}

function firstContinuousRange(points: Point[], admitted: (point: Point) => boolean) {
  let start: string | null = null, end: string | null = null;
  for (const point of points) {
    if (!admitted(point)) { if (start !== null) break; continue; }
    if (end !== null && Date.parse(point.instant) - Date.parse(end) !== hourMs) break;
    start ??= point.instant; end = point.instant;
  }
  return { start, end };
}

/** Comparison qualification is separate from overall source freshness. */
export function compareForecastModels(primary: ForecastModelSeries, secondary: ForecastModelSeries | null): ForecastModelComparison {
  if (!secondary) return unavailable("对比模型暂不可用；当前仅展示主模型。");
  const primaryByTime = new Map(primary.hours.map(hour => [hour.validTimeUtc, hour]));
  const secondaryByTime = new Map(secondary.hours.map(hour => [hour.validTimeUtc, hour]));
  const instants = [...new Set([...primaryByTime.keys(), ...secondaryByTime.keys()])].sort((a, b) => Date.parse(a) - Date.parse(b));
  const points: Point[] = instants.map(instant => {
    const a: ProfessionalForecastHour | undefined = primaryByTime.get(instant), b = secondaryByTime.get(instant);
    const fields = metrics.filter(metric => present(a?.[metric.field]) && present(b?.[metric.field]));
    return { instant, fields, disagreement: fields.some(metric => Math.abs(a![metric.field]! - b![metric.field]!) >= metric.significantDifference) };
  });
  const comparable = points.filter(point => point.fields.length > 0);
  if (!comparable.length) return unavailable("两个模型没有可配对的云量或降水概率资料；暂不能判断模型是否一致。");
  const disagreements = comparable.filter(point => point.disagreement);
  const incomplete = points.some((point, index) => point.fields.length !== metrics.length
    || index > 0 && Date.parse(point.instant) - Date.parse(points[index - 1].instant) !== hourMs);
  const stale = primary.run.status === "stale" || secondary.run.status === "stale";
  const consensus = firstContinuousRange(points, point => point.fields.length === metrics.length && !point.disagreement);
  const disagreement = firstContinuousRange(points, point => point.disagreement);
  const conclusion = disagreements.length
    ? `${disagreements.length} 个小时的已配对云量或降水概率存在显著分歧，临行前需要刷新。`
    : incomplete ? "已有可比资料未发现显著分歧，尚不能判断整体一致。" : "两个模型在可比较时段未出现显著分歧。";
  return {
    status: stale ? "stale" : incomplete || disagreements.length > 0 ? "partial" : "fresh",
    confidence: round(Math.max(0.35, 0.82 - disagreements.length / comparable.length * 0.35)),
    explanation: `${conclusion}${incomplete ? "部分时刻或指标缺少配对资料。" : ""}${stale ? "模型资料已过期，需刷新后再判断。" : ""}${consensus.start || disagreement.start ? "连续范围仅代表首段可比资料。" : ""}`,
    consensusStartUtc: consensus.start, consensusEndUtc: consensus.end,
    disagreementStartUtc: disagreement.start, disagreementEndUtc: disagreement.end,
    comparedFields: metrics.filter(metric => comparable.some(point => point.fields.includes(metric))).map(metric => metric.field),
  };
}

/** The actual App consumes the qualified state, not absence of a disagreement. */
export function forecastComparisonPresentation(comparison: ForecastModelComparison) {
  const usable = comparison.status !== "missing" && comparison.status !== "failed" && comparison.comparedFields.length > 0;
  const confidence = usable && Number.isFinite(comparison.confidence) ? Math.round(comparison.confidence * 100) : null;
  return {
    title: !usable ? "模型暂不可比"
      : comparison.status === "stale" ? "模型对比已过期"
      : comparison.disagreementStartUtc ? "模型存在分歧"
      : comparison.status === "partial" ? "模型部分可比" : "可比资料未见显著分歧",
    confidenceLabel: confidence === null ? "暂无对比可信度"
      : comparison.status === "stale" ? `${confidence}% 上次参考可信度`
      : comparison.status === "partial" ? `对比有限 · ${confidence}% 参考可信度` : `${confidence}% 参考可信度`,
    fieldsLabel: usable ? comparison.comparedFields.map(field => metrics.find(metric => metric.field === field)?.label ?? "未识别指标").join("、") : "暂无可比指标",
  };
}
