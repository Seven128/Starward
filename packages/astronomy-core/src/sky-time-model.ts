import Quaternion from "quaternion";
import { OBSERVATION_FRAME_FORMAT, STELLAR_GEOMETRY_REFERENCE_AT, moonPhaseKey, assertSkyObservationFrames, assertSkyTimeModel,
  type SkyGeometryRow, type SkyBodyFrame, type SkyObservationFrame, type SkyPlanetGeometry,
  type SkyTimeBody, type SkyTimeBodyAxes, type SkyTimeKnot, type SkyTimeModel, type SkyTimeVector, type SkyReport } from "@starward/miniapp-contracts";
import { rotateStellarDirection, type EquatorialToEnu } from "./stellar-vectors.ts";

/** Evaluates only provider-supplied geometry. No clock, observer calculation,
 * Astronomy Engine, catalogue I/O, weather or presentation state lives here. */
export type SkyTimeHourlyGeometry = SkyGeometryRow;
export interface EvaluatedSkyTimeGeometry {
  at: string;
  modelAlgorithmVersion: string;
  observationFrame: SkyObservationFrame;
  julianYears: number;
  hourly: SkyTimeHourlyGeometry;
}

const RAD = Math.PI / 180;
const YEAR_MS = 365.25 * 86_400_000;
const unit = (vector: readonly number[]): SkyTimeVector => {
  const length = Math.hypot(...vector);
  if (!Number.isFinite(length) || length < 1e-12) throw new Error("sky_time_direction_invalid");
  return [vector[0]! / length, vector[1]! / length, vector[2]! / length];
};
const cross = (a: SkyTimeVector, b: SkyTimeVector): SkyTimeVector => [
  a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0],
];
const linear = (left: number, right: number, amount: number) => left + (right - left) * amount;

/** Boundary helper shared by position lookup and sky consumers. Independent
 * observation geometry binds the place even if the bright-star layer failed. */
export function skyReportTimeGeometry(report: Pick<SkyReport, "hourly" | "observationFrames" | "timeModel">,
  at: string): EvaluatedSkyTimeGeometry | null {
  if (!report.timeModel || !report.observationFrames?.length) return null;
  try {
    const hourlyAt = report.hourly.map(row => row.at);
    assertSkyObservationFrames(report.observationFrames, hourlyAt);
    assertSkyTimeModel(report.timeModel, { observer: report.observationFrames[0]!.observer, hourlyAt });
    return evaluateSkyTimeModel(report.timeModel, at);
  } catch { return null; }
}

export function skyTimeDirectionToEqj(direction: SkyTimeVector, matrix: EquatorialToEnu): SkyTimeVector {
  return rotateStellarDirection(direction, [matrix[0],matrix[3],matrix[6],matrix[1],matrix[4],matrix[7],matrix[2],matrix[5],matrix[8]]);
}

function horizontal(direction: SkyTimeVector) {
  return { azimuthDeg: ((Math.atan2(direction[0], direction[1]) / RAD) % 360 + 360) % 360,
    altitudeDeg: Math.atan2(direction[2], Math.hypot(direction[0], direction[1])) / RAD };
}

/** Reprojects an already registered catalogue ray, including its north/east
 * registration rays. The caller must bind both transforms to that catalogue. */
export function reprojectSkyTimeDirection(azimuthDeg: number, altitudeDeg: number,
  from: EquatorialToEnu, to: EquatorialToEnu) {
  const az = azimuthDeg * RAD, alt = altitudeDeg * RAD;
  const direction: SkyTimeVector = [Math.sin(az) * Math.cos(alt), Math.cos(az) * Math.cos(alt), Math.sin(alt)];
  return horizontal(rotateStellarDirection(skyTimeDirectionToEqj(direction, from), to));
}

function quaternion(matrix: EquatorialToEnu) {
  return Quaternion.fromMatrix([[matrix[0],matrix[1],matrix[2]], [matrix[3],matrix[4],matrix[5]],
    [matrix[6],matrix[7],matrix[8]]]).normalize();
}
function rotationMatrix(rotation: Quaternion): EquatorialToEnu {
  const x = rotation.rotateVector([1,0,0]) as SkyTimeVector,
    y = rotation.rotateVector([0,1,0]) as SkyTimeVector, z = rotation.rotateVector([0,0,1]) as SkyTimeVector;
  return [x[0],y[0],z[0],x[1],y[1],z[1],x[2],y[2],z[2]];
}
function bodyQuaternion(frame: SkyTimeBodyAxes | null) {
  if (!frame) return null;
  const prime = unit(frame.primeMeridianEqj), east = unit(cross(unit(frame.poleEqj), prime)), pole = unit(cross(prime, east));
  return quaternion([prime[0],east[0],pole[0],prime[1],east[1],pole[1],prime[2],east[2],pole[2]]);
}

type CompiledKnot = { knot: SkyTimeKnot; at: number; rotation: Quaternion; axes: readonly (Quaternion | null)[] };
const compiled = new WeakMap<SkyTimeModel, readonly CompiledKnot[]>();
function knotsFor(model: SkyTimeModel) {
  let knots = compiled.get(model);
  if (!knots) {
    knots = model.knots.map(knot => ({ knot, at: Date.parse(knot.at), rotation: quaternion(knot.equatorialToEnu),
      axes: knot.bodies.map(body => bodyQuaternion(body.bodyFrameEqj)) }));
    compiled.set(model, knots);
  }
  return knots;
}

function directionBetween(left: SkyTimeBody, right: SkyTimeBody, amount: number, seconds: number) {
  const square = amount * amount, cube = square * amount;
  return unit(left.directionEqj.map((value, index) => (2*cube - 3*square + 1)*value +
    (cube - 2*square + amount)*seconds*left.velocityEqjPerSecond[index]! +
    (-2*cube + 3*square)*right.directionEqj[index]! +
    (cube - square)*seconds*right.velocityEqjPerSecond[index]!));
}
function vectorBetween(left: SkyTimeVector | null, right: SkyTimeVector | null, amount: number,
  rotation: EquatorialToEnu): SkyTimeVector | null {
  if (!left || !right) return null;
  return rotateStellarDirection(unit(left.map((value, i) => linear(value, right[i]!, amount))), rotation);
}
function axesBetween(left: Quaternion | null, right: Quaternion | null, amount: number,
  rotation: EquatorialToEnu): SkyBodyFrame | null {
  if (!left || !right) return null;
  const axes = left.slerp(right)(amount).normalize();
  return { primeMeridianEnu: rotateStellarDirection(axes.rotateVector([1,0,0]) as SkyTimeVector, rotation),
    poleEnu: rotateStellarDirection(axes.rotateVector([0,0,1]) as SkyTimeVector, rotation) };
}

/** The input must first pass assertSkyTimeModel against its report's observer
 * and genuine knot instants. Invalid/noncanonical/out-of-coverage time returns
 * no frame; no nearest row, outward extrapolation or fake timestamp is allowed. */
export function evaluateSkyTimeModel(model: SkyTimeModel, at: string): EvaluatedSkyTimeGeometry | null {
  const millis = Date.parse(at);
  if (!Number.isFinite(millis) || new Date(millis).toISOString() !== at ||
    millis < Date.parse(model.startAt) || millis > Date.parse(model.endAt)) return null;
  const knots = knotsFor(model);
  let low = 0, high = knots.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (knots[middle]!.at < millis) low = middle + 1;
    else high = middle;
  }
  const right = knots[low]!, left = right.at === millis ? right : knots[low - 1];
  if (!left) return null;
  const seconds = (right.at - left.at) / 1000;
  const amount = seconds === 0 ? 0 : (millis - left.at) / (seconds * 1000);
  const rotation = seconds === 0 ? left.knot.equatorialToEnu : rotationMatrix(left.rotation.slerp(right.rotation)(amount).normalize());
  const bodies = left.knot.bodies.map((body, index) => {
    const next = right.knot.bodies[index]!;
    const direction = seconds === 0 ? body.directionEqj : directionBetween(body, next, amount, seconds);
    return { ...horizontal(rotateStellarDirection(direction, rotation)),
      angularDiameterDeg: linear(body.angularDiameterDeg, next.angularDiameterDeg, amount),
      illuminatedFraction: body.illuminatedFraction === null || next.illuminatedFraction === null ? null
        : linear(body.illuminatedFraction, next.illuminatedFraction, amount),
      bodyFrame: axesBetween(left.axes[index]!, right.axes[index]!, amount, rotation),
      visualMagnitude: body.visualMagnitude === null || next.visualMagnitude === null ? null
        : linear(body.visualMagnitude, next.visualMagnitude, amount),
      ringTiltDeg: body.ringTiltDeg === null || next.ringTiltDeg === null ? null : linear(body.ringTiltDeg, next.ringTiltDeg, amount),
      ringPoleEnu: vectorBetween(body.ringPoleEqj, next.ringPoleEqj, amount, rotation),
      ringSunEnu: vectorBetween(body.ringSunEqj, next.ringSunEqj, amount, rotation),
    };
  });
  const sun = bodies[0]!, moon = bodies[1]!;
  const startPhase = left.knot.bodies[1]!.phaseAngleDeg!, endPhase = right.knot.bodies[1]!.phaseAngleDeg!;
  const phaseDelta = ((endPhase - startPhase + 540) % 360) - 180;
  const phaseAngle = (startPhase + phaseDelta * amount + 360) % 360;
  const planets: SkyPlanetGeometry[] = bodies.slice(2).map((body, index) => ({
    body: left.knot.bodies[index + 2]!.body as SkyPlanetGeometry["body"],
    azimuthDeg: body.azimuthDeg, altitudeDeg: body.altitudeDeg, angularDiameterDeg: body.angularDiameterDeg,
    illuminatedFraction: body.illuminatedFraction!, visualMagnitude: body.visualMagnitude!,
    bodyFrame: body.bodyFrame, ringTiltDeg: body.ringTiltDeg, ringPoleEnu: body.ringPoleEnu, ringSunEnu: body.ringSunEnu,
  }));
  return { at, modelAlgorithmVersion: model.algorithmVersion,
    observationFrame: { format: OBSERVATION_FRAME_FORMAT, at, observer: model.observer, equatorialToEnu: rotation },
    julianYears: (millis - Date.parse(STELLAR_GEOMETRY_REFERENCE_AT)) / YEAR_MS,
    hourly: { at, sunAzimuthDeg: sun.azimuthDeg, sunAltitudeDeg: sun.altitudeDeg, sunAngularDiameterDeg: sun.angularDiameterDeg,
      moonAzimuthDeg: moon.azimuthDeg, moonAltitudeDeg: moon.altitudeDeg, moonAngularDiameterDeg: moon.angularDiameterDeg,
      moonBodyFrame: moon.bodyFrame, moonIllumination: moon.illuminatedFraction,
      moonPhase: moonPhaseKey(phaseAngle), moonPhaseAngleDeg: phaseAngle, planets,
      darkness: sun.altitudeDeg <= -18 ? "ASTRONOMICAL_NIGHT" : sun.altitudeDeg < 0 ? "TWILIGHT" : "DAY" } };
}
