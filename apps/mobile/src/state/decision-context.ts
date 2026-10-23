import type { ForecastQuery } from "@starward/contracts/forecast";
import type { SkyQuery } from "@starward/contracts/sky";
import { isObservingNight, normalizeUtcMoment, observingNightAt } from "@starward/contracts/observing-time";
export { isObservingNight, shiftObservingNight } from "@starward/contracts/observing-time";

// The native POC has a product default, not a coordinate-to-zone resolver.
export const DEFAULT_DECISION_TIMEZONE = "Asia/Shanghai";
export type DecisionTarget = ForecastQuery["target"] | SkyQuery["target"];
const forecastTargets: readonly ForecastQuery["target"][] = ["milky-way-core", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];
const skyTargets: readonly SkyQuery["target"][] = ["milky-way-core", "sirius", "vega", "antares", "m31"];
export const decisionTargets: readonly DecisionTarget[] = [...forecastTargets, ...skyTargets];
export const forecastTarget = (target: DecisionTarget) => forecastTargets.includes(target as ForecastQuery["target"]) ? target as ForecastQuery["target"] : null;
export const skyTarget = (target: DecisionTarget) => skyTargets.includes(target as SkyQuery["target"]) ? target as SkyQuery["target"] : null;

export interface DecisionContextRevision {
  revision: number;
  observingNight: string;
  moment: string;
  momentSource: "now" | "night-preview" | "selected";
  timezone: typeof DEFAULT_DECISION_TIMEZONE;
  timezoneSource: "product-default";
  origin: string;
  profileId: string;
  profileRevision: number;
  target: DecisionTarget;
}

// Time controls commit only their own intent, never overwrite other owners.
export type DecisionContextInput = { observingNight: string; moment?: never; target?: DecisionTarget }
  | { moment: string; observingNight?: never; target?: DecisionTarget }
  | { target: DecisionTarget; observingNight?: never; moment?: never };

// Astronomy's night starts at local noon, covering evening and the following
// morning. A UTC civil-date substring loses that identity after midnight.
export function currentObservingNight(timezone: string = DEFAULT_DECISION_TIMEZONE, now = new Date()): string {
  return observingNightAt(now, timezone);
}

export function createDecisionContext(profileId: string): DecisionContextRevision {
  const now = new Date();
  return {
    revision: 1, observingNight: currentObservingNight(DEFAULT_DECISION_TIMEZONE, now),
    moment: now.toISOString(), momentSource: "now", timezone: DEFAULT_DECISION_TIMEZONE, timezoneSource: "product-default",
    origin: "尚未选择位置", profileId, profileRevision: 1, target: "milky-way-core",
  };
}

export function advanceDecisionContext(current: DecisionContextRevision, input: DecisionContextInput): DecisionContextRevision {
  if (input.target !== undefined && !decisionTargets.includes(input.target)) return current;
  let next = { ...current, target: input.target ?? current.target };
  if (input.observingNight !== undefined) {
    if (!isObservingNight(input.observingNight)) return current;
    if (input.observingNight !== current.observingNight) {
      // 18:00 is the existing native forecast window's start, not a computed
      // best time or a user-selected instant. Consumers label this distinction.
      next = { ...next, observingNight: input.observingNight, moment: new Date(`${input.observingNight}T18:00:00+08:00`).toISOString(), momentSource: "night-preview" };
    }
  } else if (input.moment !== undefined) {
    const moment = normalizeUtcMoment(input.moment);
    if (!moment) return current;
    next = { ...next, moment, momentSource: "selected", observingNight: currentObservingNight(current.timezone, new Date(moment)) };
  }
  return next.observingNight === current.observingNight && next.moment === current.moment
    && next.momentSource === current.momentSource && next.target === current.target
    ? current : { ...next, revision: current.revision + 1 };
}
