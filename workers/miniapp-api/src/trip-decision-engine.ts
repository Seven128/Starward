import { createHash } from "node:crypto";
import type {
  DataState,
  DecisionFactor,
  SkyOpportunity,
  TripDecision,
} from "@starward/miniapp-contracts";

export interface TripDecisionInput {
  localDate: string;
  sourceRevision: string;
  ruleVersion: string;
  skyOpportunity: SkyOpportunity;
  siteState: DataState;
  routeState: DataState;
  warningState: DataState;
  officialSevereAlert: boolean | null;
  thunderstorm: boolean | null;
  severeRain: boolean | null;
  severeWind: boolean | null;
  closed: boolean | null;
  roadClosed: boolean | null;
  explicitDanger: boolean | null;
  illegalAccess: boolean | null;
  criticalConflict: boolean;
  sensitiveAccessDenied?: boolean;
  requiredFacilityUnavailable?: boolean;
}

const BLOCKERS: ReadonlyArray<{
  key: keyof TripDecisionInput;
  code: string;
  label: string;
}> = [
  {
    key: "officialSevereAlert",
    code: "OFFICIAL_SEVERE_WEATHER_ALERT",
    label: "官方严重天气预警",
  },
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
  {
    key: "sensitiveAccessDenied",
    code: "SENSITIVE_ACCESS_DENIED",
    label: "敏感地点无访问权限",
  },
  {
    key: "requiredFacilityUnavailable",
    code: "REQUIRED_FACILITY_UNAVAILABLE",
    label: "用户刚需设施不可用",
  },
];

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function stateQuality(state: DataState, unavailableFloor = 0): number {
  return {
    FRESH: 1,
    STALE_USABLE: 0.72,
    PARTIAL: 0.68,
    EXPIRED: unavailableFloor,
    UNAVAILABLE: unavailableFloor,
    ESTIMATED: 0.78,
    SAMPLE_DATA: 0.45,
  }[state];
}

function factor(
  code: string,
  label: string,
  severity: DecisionFactor["severity"],
  detail: string,
  sourceRevision: string,
): DecisionFactor {
  return { code, label, severity, detail, sourceIds: [sourceRevision] };
}

function combinedFreshness(input: TripDecisionInput): DataState {
  const states = [
    input.skyOpportunity.freshness,
    input.siteState,
    input.routeState,
    input.warningState,
  ];
  if (states.includes("SAMPLE_DATA")) return "SAMPLE_DATA";
  if (states.includes("UNAVAILABLE") || states.includes("EXPIRED"))
    return "PARTIAL";
  if (states.every((state) => state === "FRESH")) return "FRESH";
  return "PARTIAL";
}

export class TripDecisionEngine {
  compute(input: TripDecisionInput): TripDecision {
    const factors: DecisionFactor[] = [];
    for (const blocker of BLOCKERS) {
      if (input[blocker.key] === true)
        factors.push(
          factor(
            blocker.code,
            blocker.label,
            "BLOCKER",
            `${blocker.label}必须先于天空机会和适用性判断阻断出行建议。`,
            input.sourceRevision,
          ),
        );
    }
    const explicitRisk = factors.some((entry) => entry.severity === "BLOCKER");
    const siteIncomplete =
      input.siteState === "PARTIAL" ||
      input.siteState === "EXPIRED" ||
      input.siteState === "UNAVAILABLE";
    const warningIncomplete =
      input.warningState === "PARTIAL" ||
      input.warningState === "EXPIRED" ||
      input.warningState === "UNAVAILABLE";
    const sample =
      input.siteState === "SAMPLE_DATA" ||
      input.routeState === "SAMPLE_DATA" ||
      input.warningState === "SAMPLE_DATA" ||
      input.skyOpportunity.freshness === "SAMPLE_DATA";
    if (siteIncomplete)
      factors.push(
        factor(
          "SITE_EVIDENCE_INCOMPLETE",
          "地点关键资料不足",
          "UNKNOWN",
          "开放、法律进入、道路或安全事实不完整时不能产生肯定出行建议。",
          input.sourceRevision,
        ),
      );
    if (
      input.routeState === "PARTIAL" ||
      input.routeState === "STALE_USABLE" ||
      input.routeState === "EXPIRED" ||
      input.routeState === "UNAVAILABLE"
    )
      factors.push(
        factor(
          "ROUTE_NOT_CURRENT",
          "实时路线未完整核验",
          "CAUTION",
          "天空结论不等同于可达性；出发前仍需核验当前道路和末段路线。",
          input.sourceRevision,
        ),
      );
    if (warningIncomplete)
      factors.push(
        factor(
          "WARNING_FEED_UNAVAILABLE",
          "官方天气预警不可用",
          "UNKNOWN",
          "主预报不能证明没有官方预警；预警源恢复前不能产生肯定出行建议。",
          input.sourceRevision,
        ),
      );
    factors.push(
      factor(
        `SKY_${input.skyOpportunity.status}`,
        "天空机会",
        input.skyOpportunity.status === "EXCELLENT" ||
          input.skyOpportunity.status === "GOOD"
          ? "POSITIVE"
          : input.skyOpportunity.status === "POOR"
            ? "CAUTION"
            : "UNKNOWN",
        input.skyOpportunity.label,
        input.sourceRevision,
      ),
    );

    const confidence =
      input.skyOpportunity.confidence === null
        ? null
        : Number(
            (
              input.skyOpportunity.confidence *
              stateQuality(input.siteState) *
              stateQuality(input.routeState, 0.62) *
              stateQuality(input.warningState) *
              0.95
            ).toFixed(3),
          );
    let recommendation: TripDecision["recommendation"];
    if (explicitRisk) recommendation = "NOT_RECOMMENDED";
    else if (
      sample ||
      siteIncomplete ||
      warningIncomplete ||
      input.skyOpportunity.status === "INSUFFICIENT_DATA"
    )
      recommendation = "DATA_INSUFFICIENT";
    else if (input.skyOpportunity.status === "POOR")
      recommendation = "NOT_RECOMMENDED";
    else if (
      (input.skyOpportunity.status === "EXCELLENT" ||
        input.skyOpportunity.status === "GOOD") &&
      confidence !== null &&
      confidence >= 0.7 &&
      input.routeState === "FRESH"
    )
      recommendation = "RECOMMENDED";
    else recommendation = "CONSIDER";

    const labels: Readonly<Record<TripDecision["recommendation"], string>> = {
      RECOMMENDED: "今晚可考虑前往",
      CONSIDER: "有观测机会，出发前请复核到达条件",
      NOT_RECOMMENDED: explicitRisk
        ? "存在明确风险，不建议前往"
        : "天空条件不足，不建议专程前往",
      DATA_INSUFFICIENT: sample
        ? "当前资料不能用于真实出行判断"
        : "关键资料不足，暂不能判断是否适合前往",
    };
    return {
      recommendation,
      label: labels[recommendation],
      skyOpportunity: input.skyOpportunity,
      factors,
      confidence,
      freshness: combinedFreshness(input),
      ruleVersion: input.ruleVersion,
      inputDigest: digest({
        localDate: input.localDate,
        sourceRevision: input.sourceRevision,
        ruleVersion: input.ruleVersion,
        skyOpportunity: input.skyOpportunity.inputDigest,
        siteState: input.siteState,
        routeState: input.routeState,
        warningState: input.warningState,
        blockers: BLOCKERS.map((blocker) => [blocker.code, input[blocker.key]]),
      }),
    };
  }
}
