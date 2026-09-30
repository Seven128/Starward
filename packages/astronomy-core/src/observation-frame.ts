import { Observer, Rotation_EQJ_HOR } from "./astronomy-engine-runtime.ts";
import type { EquatorialToEnu } from "./stellar-vectors.ts";

export interface ObservationFrameInput {
  at: Date | string;
  latitude: number;
  longitude: number;
  elevationM: number;
}

/** One observer/time EQJ-to-ENU transform for every celestial data layer.
 * Bright-star publication availability has no bearing on this calculation. */
export function observationHorizontalFrame(input: ObservationFrameInput) {
  const at = new Date(input.at);
  if (!Number.isFinite(at.getTime())) throw new Error("observation_instant_invalid");
  if (![input.latitude, input.longitude, input.elevationM].every(Number.isFinite) ||
    Math.abs(input.latitude) > 90 || Math.abs(input.longitude) > 180)
    throw new Error("observation_observer_invalid");
  const observer = new Observer(input.latitude, input.longitude, input.elevationM);
  // Astronomy Engine indexes rot as [input axis][output axis]. HOR uses
  // north/west/up, so transpose and negate west for row-major east/north/up.
  const m = Rotation_EQJ_HOR(at, observer).rot;
  const equatorialToEnu: EquatorialToEnu = [
    -m[0][1], -m[1][1], -m[2][1],
    m[0][0], m[1][0], m[2][0],
    m[0][2], m[1][2], m[2][2],
  ];
  return { at: at.toISOString(), equatorialToEnu };
}
