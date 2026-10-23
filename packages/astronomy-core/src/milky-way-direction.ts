import { observationHorizontalFrame } from "./observation-frame.ts";
import { createStellarMotion, projectStellarMotion } from "./stellar-vectors.ts";

// The existing Sagittarius A* vicinity proxy used by the native App's night
// calculation. This fixed J2000 direction is not a surface-brightness model.
export const MILKY_WAY_CORE_DIRECTION = Object.freeze({
  raHours: 17.761133,
  decDeg: -29.0078,
});

const direction = createStellarMotion({
  raDeg: MILKY_WAY_CORE_DIRECTION.raHours * 15,
  decDeg: MILKY_WAY_CORE_DIRECTION.decDeg,
  pmRaCosDecArcsecYr: 0,
  pmDecArcsecYr: 0,
});

/** Geometric horizon, using the shared exact observer/time frame. */
export function positionMilkyWayCoreDirection(input: {
  at: Date | string; latitude: number; longitude: number; elevationM: number;
}) {
  const frame = observationHorizontalFrame(input);
  const position = projectStellarMotion(direction, 0, frame.equatorialToEnu);
  return { ...position, visible: position.altitudeDeg > 0, obstructed: null };
}
