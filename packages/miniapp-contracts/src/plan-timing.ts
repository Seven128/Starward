import type { PlanTiming } from "./plan.ts";
import { zonedLocalToUtc } from "./local-time.ts";

/** Resolve the user's interval without borrowing provider windows or durations. */
export function resolvePlanTiming(input: {
  localDate: string;
  localTime: string;
  timezone: string;
  timing: PlanTiming;
}) {
  const { timing, timezone } = input;
  if (!timing || typeof timing !== "object" ||
    [timing.endLocalDate, timing.endLocalTime, timing.departureLocalDate, timing.departureLocalTime]
      .some((value) => typeof value !== "string")) throw new Error("plan_timing_invalid");
  const start = zonedLocalToUtc({ localDate: input.localDate, localTime: input.localTime, timezone });
  const end = zonedLocalToUtc({ localDate: timing.endLocalDate, localTime: timing.endLocalTime, timezone });
  const departure = zonedLocalToUtc({ localDate: timing.departureLocalDate, localTime: timing.departureLocalTime, timezone });
  if (Date.parse(end) <= Date.parse(start)) throw new Error("plan_end_must_follow_start");
  if (Date.parse(departure) >= Date.parse(start)) throw new Error("plan_departure_must_precede_start");
  return { start, end, departure };
}
