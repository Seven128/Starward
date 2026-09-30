import type { MoonPhaseKey } from "./types.ts";

const PHASES: readonly MoonPhaseKey[] = ["NEW", "WAXING_CRESCENT", "FIRST_QUARTER", "WAXING_GIBBOUS",
  "FULL", "WANING_GIBBOUS", "LAST_QUARTER", "WANING_CRESCENT"];

/** Shared provider/evaluator phase buckets; angle remains the continuous fact. */
export function moonPhaseKey(angleDeg: number): MoonPhaseKey {
  if (!Number.isFinite(angleDeg)) throw new RangeError("moon_phase_angle_invalid");
  const normalized = ((angleDeg % 360) + 360) % 360;
  return PHASES[Math.round(normalized / 45) % 8]!;
}
