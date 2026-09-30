import { assertStellarRotation, type StellarGeometryObserver } from "./stellar-geometry.ts";
import { SKY_PLANET_ORDER, validSkyBodyFrame, type SkyPlanetBody } from "./types.ts";

/** Provider geometry, independent of a client's wall clock, photometry or weather. */
export const SKY_TIME_MODEL_FORMAT = "sky-time-model-v1";
export const SKY_TIME_MODEL_METHOD = "EQJ_HERMITE_ENU_SLERP";
export const SKY_TIME_MODEL_MAX_INTERVAL_SECONDS = 1800;
export const SKY_TIME_MODEL_MAX_KNOTS = 49;
export const SKY_TIME_BODY_ORDER = ["SUN", "MOON", ...SKY_PLANET_ORDER] as const;
export type SkyTimeBodyName = "SUN" | "MOON" | SkyPlanetBody;
export type SkyTimeVector = readonly [number, number, number];
export interface SkyTimeBodyAxes {
  primeMeridianEqj: SkyTimeVector;
  poleEqj: SkyTimeVector;
}

/** Apparent topocentric EQJ direction and its tangent rate at reception time.
 * Body/ring axes retain the provider's photon-emission conventions. */
export interface SkyTimeBody {
  body: SkyTimeBodyName;
  directionEqj: SkyTimeVector;
  velocityEqjPerSecond: SkyTimeVector;
  angularDiameterDeg: number;
  illuminatedFraction: number | null;
  phaseAngleDeg: number | null;
  visualMagnitude: number | null;
  bodyFrameEqj: SkyTimeBodyAxes | null;
  ringTiltDeg: number | null;
  ringPoleEqj: SkyTimeVector | null;
  ringSunEqj: SkyTimeVector | null;
}

export interface SkyTimeKnot {
  at: string;
  equatorialToEnu: readonly [number, number, number, number, number, number, number, number, number];
  bodies: readonly SkyTimeBody[];
}

/** Explicit bounded interpolation model produced by the astronomy owner.
 * It never grants weather coverage, a new Observation Context or extrapolation. */
export interface SkyTimeModel {
  format: typeof SKY_TIME_MODEL_FORMAT;
  method: typeof SKY_TIME_MODEL_METHOD;
  algorithmVersion: string;
  observer: StellarGeometryObserver;
  startAt: string;
  endAt: string;
  knots: readonly SkyTimeKnot[];
}

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
function fail(reason: string): never { throw new TypeError(`sky_time_model_invalid:${reason}`); }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("shape");
  return value as Record<string, unknown>;
}
function instant(value: unknown): number {
  const millis = typeof value === "string" ? Date.parse(value) : NaN;
  if (!finite(millis) || new Date(millis).toISOString() !== value) fail("instant");
  return millis;
}
function vector(value: unknown, unit: boolean): asserts value is SkyTimeVector {
  if (!Array.isArray(value) || value.length !== 3 || !Array.from(value).every(finite)) fail("vector");
  if (unit && Math.abs(Math.hypot(...value) - 1) > 1e-6) fail("unit_vector");
}

/** Expected place/time comes from the separately validated report, not the model. */
export function assertSkyTimeModel(value: unknown, expected: {
  observer: StellarGeometryObserver;
  hourlyAt: readonly string[];
}): asserts value is SkyTimeModel {
  const model = record(value);
  if (model.format !== SKY_TIME_MODEL_FORMAT || model.method !== SKY_TIME_MODEL_METHOD ||
    typeof model.algorithmVersion !== "string" || !model.algorithmVersion.trim()) fail("identity");
  const observer = record(model.observer);
  if (!finite(observer.latitude) || Math.abs(observer.latitude) > 90 ||
    !finite(observer.longitude) || Math.abs(observer.longitude) > 180 || !finite(observer.elevationM) ||
    observer.latitude !== expected.observer.latitude || observer.longitude !== expected.observer.longitude ||
    observer.elevationM !== expected.observer.elevationM) fail("observer_binding");
  const knots = model.knots;
  if (!Array.isArray(knots) || knots.length < 2 || knots.length > SKY_TIME_MODEL_MAX_KNOTS ||
    knots.length !== expected.hourlyAt.length) fail("knots");
  const start = instant(model.startAt), end = instant(model.endAt);
  if (end <= start || end - start > 86_400_000) fail("coverage");
  let previous = -Infinity;
  Array.from(knots).forEach((value, index) => {
    const knot = record(value), at = instant(knot.at);
    if (knot.at !== expected.hourlyAt[index] || at <= previous ||
      index > 0 && at - previous > SKY_TIME_MODEL_MAX_INTERVAL_SECONDS * 1000 ||
      index === 0 && at !== start || index === knots.length - 1 && at !== end) fail("time_binding");
    previous = at;
    assertStellarRotation(knot.equatorialToEnu);
    if (!Array.isArray(knot.bodies) || knot.bodies.length !== SKY_TIME_BODY_ORDER.length) fail("bodies");
    Array.from(knot.bodies).forEach((value, bodyIndex) => {
      const body = record(value);
      if (body.body !== SKY_TIME_BODY_ORDER[bodyIndex]) fail("body_identity");
      vector(body.directionEqj, true); vector(body.velocityEqjPerSecond, false);
      const velocity = body.velocityEqjPerSecond;
      const rate = Math.hypot(...velocity);
      const radial = body.directionEqj.reduce((sum, entry, i) => sum + entry * velocity[i]!, 0);
      // The model is a short direction arc, not an arbitrary cubic curve.
      if (rate * SKY_TIME_MODEL_MAX_INTERVAL_SECONDS >= .5 || Math.abs(radial) > Math.max(1e-12, rate * 1e-6)) fail("velocity");
      if (!finite(body.angularDiameterDeg) || body.angularDiameterDeg <= 0 ||
        body.angularDiameterDeg >= (bodyIndex < 2 ? 1 : .1)) fail("diameter");
      if (bodyIndex === 0 ? body.illuminatedFraction !== null :
        !finite(body.illuminatedFraction) || body.illuminatedFraction < 0 || body.illuminatedFraction > 1) fail("illumination");
      if (bodyIndex === 1 ? !finite(body.phaseAngleDeg) || body.phaseAngleDeg < 0 || body.phaseAngleDeg >= 360 :
        body.phaseAngleDeg !== null) fail("phase");
      if (bodyIndex < 2 ? body.visualMagnitude !== null : !finite(body.visualMagnitude) ||
        body.visualMagnitude <= -10 || body.visualMagnitude >= 20) fail("magnitude");
      const surface = body.body === "MOON" || body.body === "MERCURY" || body.body === "MARS" ||
        body.body === "JUPITER" || body.body === "URANUS" || body.body === "NEPTUNE";
      if (body.bodyFrameEqj !== null) {
        const axes = record(body.bodyFrameEqj);
        if (!surface || !validSkyBodyFrame({ primeMeridianEnu: axes.primeMeridianEqj, poleEnu: axes.poleEqj })) fail("body_axes");
      }
      if (body.body === "SATURN") {
        if (body.ringTiltDeg === null || body.ringPoleEqj === null) {
          if (body.ringTiltDeg !== null || body.ringPoleEqj !== null || body.ringSunEqj !== null) fail("ring_pair");
        } else {
          if (!finite(body.ringTiltDeg) || Math.abs(body.ringTiltDeg) > 30) fail("ring_tilt");
          vector(body.ringPoleEqj, true);
          if (body.ringSunEqj !== null) vector(body.ringSunEqj, true);
        }
      } else if (body.ringTiltDeg !== null || body.ringPoleEqj !== null || body.ringSunEqj !== null) fail("ring_body");
    });
  });
}
