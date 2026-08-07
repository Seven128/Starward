import type {
  DataState,
  DecisionFactor,
  TonightDecision,
} from "@starward/miniapp-contracts";

export interface DecisionInput {
  localDate: string;
  sourceRevision: string;
  weatherState: DataState;
  siteState: DataState;
  astronomyState: DataState;
  thunderstorm: boolean | null;
  severeRain: boolean | null;
  severeWind: boolean | null;
  closed: boolean | null;
  roadClosed: boolean | null;
  explicitDanger: boolean | null;
  illegalAccess: boolean | null;
  criticalConflict: boolean;
  scores: {
    sky: number | null;
    darkness: number | null;
    site: number | null;
    target: number | null;
    access: number | null;
  };
  bestWindow?: { start: string; end: string } | null;
  suitableFor?: TonightDecision["suitableFor"];
}

const BLOCKERS: ReadonlyArray<{
  key: keyof DecisionInput;
  code: string;
  label: string;
}> = [
  { key: "thunderstorm", code: "THUNDERSTORM", label: "雷暴风险" },
  { key: "severeRain", code: "SEVERE_RAIN", label: "强降雨风险" },
  { key: "severeWind", code: "SEVERE_WIND", label: "强风风险" },
  { key: "closed", code: "SITE_CLOSED", label: "地点关闭" },
  { key: "roadClosed", code: "ROAD_CLOSED", label: "道路关闭" },
  { key: "explicitDanger", code: "EXPLICIT_DANGER", label: "明确危险" },
  { key: "illegalAccess", code: "ILLEGAL_ACCESS", label: "禁止或非法进入" },
  {
    key: "criticalConflict",
    code: "CRITICAL_CONFLICT",
    label: "关键现场事实冲突",
  },
];

export function decideTonight(input: DecisionInput): TonightDecision {
  const factors: DecisionFactor[] = [];
  for (const blocker of BLOCKERS) {
    if (input[blocker.key] === true)
      factors.push({
        code: blocker.code,
        label: blocker.label,
        severity: "BLOCKER",
        detail: `${blocker.label}必须先于综合评分阻断推荐。`,
        sourceIds: [input.sourceRevision],
      });
  }
  const criticalExpired = [
    input.weatherState,
    input.siteState,
    input.astronomyState,
  ].some((state) => state === "EXPIRED" || state === "UNAVAILABLE");
  if (criticalExpired)
    factors.push({
      code: "CRITICAL_DATA_UNAVAILABLE",
      label: "关键数据不可用",
      severity: "BLOCKER",
      detail: "过期或不可用的关键数据不能产生当前推荐。",
      sourceIds: [input.sourceRevision],
    });
  if (factors.some((factor) => factor.severity === "BLOCKER")) {
    const explicitRisk = factors.some(
      (factor) => factor.code !== "CRITICAL_DATA_UNAVAILABLE",
    );
    return {
      recommendation: explicitRisk ? "NOT_RECOMMENDED" : "DATA_INSUFFICIENT",
      label: explicitRisk ? "不建议前往" : "数据不足，暂不能判断",
      bestWindow: null,
      suitableFor: [],
      factors,
      confidence: null,
      freshness: criticalExpired ? "UNAVAILABLE" : "FRESH",
      algorithmVersion: "starward-tonight-decision-v1-hard-blocker-first",
      inputDigest: `${input.localDate}:${input.sourceRevision}:blocked`,
    };
  }
  const scores = Object.values(input.scores).filter(
    (score): score is number => typeof score === "number",
  );
  if (scores.length < 4)
    return {
      recommendation: "DATA_INSUFFICIENT",
      label: "数据不足，暂不能判断",
      bestWindow: null,
      suitableFor: [],
      factors: [
        {
          code: "PARTIAL_SCORE",
          label: "评分维度缺失",
          severity: "UNKNOWN",
          detail: "缺失不按 0 处理。",
          sourceIds: [input.sourceRevision],
        },
      ],
      confidence: null,
      freshness: "PARTIAL",
      algorithmVersion: "starward-tonight-decision-v1-hard-blocker-first",
      inputDigest: `${input.localDate}:${input.sourceRevision}:partial`,
    };
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const sample = [input.weatherState, input.siteState, input.astronomyState].some(
    (state) => state === "SAMPLE_DATA",
  );
  const partial = [input.weatherState, input.siteState, input.astronomyState].some(
    (state) => state === "PARTIAL" || state === "ESTIMATED",
  );
  const scoreFactors = Object.entries(input.scores)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number")
    .map(([key, score]) => ({
      code: `SCORE_${key.toUpperCase()}`,
      label: {
        sky: "天空条件",
        darkness: "黑暗条件",
        site: "场地条件",
        target: "目标匹配",
        access: "到达条件",
      }[key]!,
      severity: score >= 70 ? ("POSITIVE" as const) : ("CAUTION" as const),
      detail: `${score >= 70 ? "有利" : "需谨慎"}；规则输入为 ${Math.round(score)}，不作为绝对评分对外承诺。`,
      sourceIds: [input.sourceRevision],
    }));
  const recommended = average >= 70;
  return {
    recommendation: recommended ? "RECOMMEND" : "CONSIDER",
    label: `${sample ? "示例情景：" : ""}${recommended ? "今晚可考虑前往" : "条件一般，谨慎考虑"}`,
    bestWindow: input.bestWindow ?? null,
    suitableFor: input.suitableFor ?? ["NAKED_EYE"],
    factors: [...factors, ...scoreFactors],
    confidence: Math.min(sample ? 0.55 : 0.85, scores.length / 5),
    freshness: sample ? "SAMPLE_DATA" : partial ? "PARTIAL" : "FRESH",
    algorithmVersion: "starward-tonight-decision-v1-hard-blocker-first",
    inputDigest: `${input.localDate}:${input.sourceRevision}:${average.toFixed(2)}`,
  };
}
