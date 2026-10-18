/**
 * Pure camera geometry for the full-sky canvas.
 *
 * World coordinates are ENU: x points east, y points north and z points up.
 * The pose angles follow the platform boundary adopted by the route:
 * heading is clockwise from north, beta is the device front/back tilt and
 * gamma is the device left/right tilt.  This module only performs the
 * declared mathematical conversion.  It does not claim that a particular
 * platform's sensor values are accurate, calibrated or true-north aligned.
 */

import type { SkyProjectionCenter } from "./sky-viewport";
export type SkyVector = readonly [number, number, number];

export interface SkyViewBasis {
  /** Direction of increasing screen x in ENU world coordinates. */
  readonly right: SkyVector;
  /** Direction of increasing screen y-up in ENU world coordinates. */
  readonly up: SkyVector;
  /** Direction from the phone back into the displayed sky. */
  readonly forward: SkyVector;
}

/** Exact rendering identity; never rounds away a real camera change. */
export function sameSkyViewBasis(left: SkyViewBasis | null, right: SkyViewBasis | null): boolean {
  return left === right || Boolean(left && right &&
    (["right", "up", "forward"] as const).every(axis =>
      left[axis].every((component, index) => component === right[axis][index])));
}

export interface SkyDirectionProjection {
  /** Absolute canvas x coordinate in the same units as width. */
  readonly x: number;
  /** Absolute canvas y coordinate in the same units as height. */
  readonly y: number;
  /** The source direction's azimuth, normalized to [0, 360). */
  readonly degrees: number;
  /** The source direction's altitude, retained without horizon clamping. */
  readonly altitude: number;
}

export interface SkyDirectionProjector {
  project(azimuthDeg: number, altitudeDeg: number): SkyDirectionProjection | null;
  unclipped(azimuthDeg: number, altitudeDeg: number): SkyDirectionProjection | null;
  prepared(direction: PreparedSkyDirection): SkyDirectionProjection | null;
  /** Conservative early test only. Accepted points still use the angular
   * projector, retaining its exact clipping, coordinates and metadata. */
  mayProjectVector(direction: SkyVector): boolean;
}

/** A validated direction may outlive a camera, but never its source time. */
export interface PreparedSkyDirection {
  readonly degrees: number;
  readonly altitude: number;
  readonly vector: SkyVector;
}

const DEGREES_TO_RADIANS = Math.PI / 180;
const BASIS_TOLERANCE = 1e-6;

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeDegrees(value: number): number {
  const normalized = ((value % 360) + 360) % 360;
  return Object.is(normalized, -0) ? 0 : normalized;
}

/** Horizontal direction in the same east/north/up frame used by stars and picking. */
export function skyHorizontalDirection(azimuthDeg: number, altitudeDeg: number): SkyVector | null {
  if (!finite(azimuthDeg) || !finite(altitudeDeg) || altitudeDeg < -90 || altitudeDeg > 90) return null;
  const azimuthRad = normalizeDegrees(azimuthDeg) * DEGREES_TO_RADIANS;
  const altitudeRad = altitudeDeg * DEGREES_TO_RADIANS;
  const cosAltitude = Math.cos(altitudeRad);
  return [cosAltitude * Math.sin(azimuthRad), cosAltitude * Math.cos(azimuthRad), Math.sin(altitudeRad)];
}

export function prepareSkyDirection(azimuthDeg: number, altitudeDeg: number): PreparedSkyDirection | null {
  const direction = skyHorizontalDirection(azimuthDeg, altitudeDeg);
  return direction ? Object.freeze({ degrees: normalizeDegrees(azimuthDeg), altitude: altitudeDeg,
    vector: Object.freeze(direction) }) : null;
}

function cleanZero(value: number): number {
  return Math.abs(value) < 1e-12 ? 0 : value;
}

function vector(value: readonly [number, number, number]): SkyVector {
  return [cleanZero(value[0]), cleanZero(value[1]), cleanZero(value[2])];
}

function rotatePoseVector(
  input: SkyVector,
  headingRad: number,
  betaRad: number,
  gammaRad: number,
): SkyVector {
  // Rz(-heading) * Rx(beta) * Ry(gamma), applied right-to-left.
  const sinGamma = Math.sin(gammaRad);
  const cosGamma = Math.cos(gammaRad);
  const afterY: SkyVector = [
    cosGamma * input[0] + sinGamma * input[2],
    input[1],
    -sinGamma * input[0] + cosGamma * input[2],
  ];

  const sinBeta = Math.sin(betaRad);
  const cosBeta = Math.cos(betaRad);
  const afterX: SkyVector = [
    afterY[0],
    cosBeta * afterY[1] - sinBeta * afterY[2],
    sinBeta * afterY[1] + cosBeta * afterY[2],
  ];

  const sinHeading = Math.sin(headingRad);
  const cosHeading = Math.cos(headingRad);
  return vector([
    cosHeading * afterX[0] + sinHeading * afterX[1],
    -sinHeading * afterX[0] + cosHeading * afterX[1],
    afterX[2],
  ]);
}

/**
 * Build the ENU camera basis from the adopted conventional pose model.
 *
 * For an upright phone (`beta=90`, `gamma=0`) heading 0 points the phone's
 * back toward north, screen right toward east and screen up toward zenith.
 * A phone lying face-down (`beta=180`) points its back upward.  These are
 * geometry conventions only; actual WeChat sensor semantics still require
 * physical-device verification at the integration boundary.
 */
export function createSkyViewBasis(
  headingDeg: number,
  betaDeg: number,
  gammaDeg: number,
): SkyViewBasis | null {
  if (
    !finite(headingDeg) ||
    !finite(betaDeg) ||
    !finite(gammaDeg) ||
    betaDeg < -180 ||
    betaDeg > 180 ||
    gammaDeg < -90 ||
    gammaDeg > 90
  )
    return null;

  const headingRad = normalizeDegrees(headingDeg) * DEGREES_TO_RADIANS;
  const betaRad = betaDeg * DEGREES_TO_RADIANS;
  const gammaRad = gammaDeg * DEGREES_TO_RADIANS;
  return {
    right: rotatePoseVector([1, 0, 0], headingRad, betaRad, gammaRad),
    up: rotatePoseVector([0, 1, 0], headingRad, betaRad, gammaRad),
    forward: rotatePoseVector([0, 0, -1], headingRad, betaRad, gammaRad),
  };
}

function dot(left: SkyVector, right: SkyVector): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function cross(left: SkyVector, right: SkyVector): SkyVector {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function validVector(value: unknown): value is SkyVector {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((component) => finite(component))
  );
}

export function validBasis(value: unknown): value is SkyViewBasis {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SkyViewBasis>;
  const right = candidate.right;
  const up = candidate.up;
  const forward = candidate.forward;
  if (
    !validVector(right) ||
    !validVector(up) ||
    !validVector(forward)
  )
    return false;

  const vectors = [right, up, forward] as const;
  for (const current of vectors) {
    if (Math.abs(Math.hypot(...current) - 1) > BASIS_TOLERANCE) return false;
  }
  const rightCrossUp = cross(right, up);
  return (
    Math.abs(dot(right, up)) <= BASIS_TOLERANCE &&
    Math.abs(dot(right, forward)) <= BASIS_TOLERANCE &&
    Math.abs(dot(up, forward)) <= BASIS_TOLERANCE &&
    rightCrossUp.every(
      (component, index) =>
        Math.abs(component + forward[index]!) <= BASIS_TOLERANCE,
    )
  );
}

/**
 * Project one local-horizon direction through a stereographic camera.
 *
 * `verticalFovDeg` is deliberately required at every call so the caller must
 * own the selected view profile.  Horizontal FOV is derived from the actual
 * width/height aspect ratio. The antipode and directions outside the
 * viewport return null; points are never clamped to an edge position.
 */
export function projectSkyDirection(
  azimuthDeg: number,
  altitudeDeg: number,
  basis: SkyViewBasis,
  width: number,
  height: number,
  verticalFovDeg: number,
  center?: SkyProjectionCenter,
): SkyDirectionProjection | null {
  if (!finite(azimuthDeg) || !finite(altitudeDeg) || altitudeDeg < -90 || altitudeDeg > 90) return null;
  return createSkyDirectionProjector(basis,width,height,verticalFovDeg,center)?.project(azimuthDeg,altitudeDeg) ?? null;
}

/** Extended image anchors may leave the viewport while their bitmap still overlaps it.
 * Canvas clips the resulting bitmap; the projection antipode remains rejected.
 * Point visibility and hit testing must continue using projectSkyDirection.
 */
export function projectSkyDirectionUnclipped(
  azimuthDeg: number,
  altitudeDeg: number,
  basis: SkyViewBasis,
  width: number,
  height: number,
  verticalFovDeg: number,
  center?: SkyProjectionCenter,
): SkyDirectionProjection | null {
  if (!finite(azimuthDeg) || !finite(altitudeDeg) || altitudeDeg < -90 || altitudeDeg > 90) return null;
  return createSkyDirectionProjector(basis,width,height,verticalFovDeg,center)?.unclipped(azimuthDeg,altitudeDeg) ?? null;
}

/** One fixed view for a synchronous drawing/geometry job. Validate and retain
 * its camera/scale once; each direction still uses the original formula and
 * rejection rules. The next frame creates a new projector, not a global cache.
 */
export function createSkyDirectionProjector(
  basis: SkyViewBasis, width: number, height: number, verticalFovDeg: number,
  center?: SkyProjectionCenter,
): SkyDirectionProjector | null {
  if (!validBasis(basis) ||
    !finite(width) ||
    !finite(height) ||
    width <= 0 ||
    height <= 0 ||
    !finite(verticalFovDeg) ||
    verticalFovDeg <= 0 ||
    verticalFovDeg >= 360
  ) return null;
  const scale = skyProjectionScale(height, verticalFovDeg);
  if (scale === null) return null;
  const originX = center?.x ?? width / 2, originY = center?.y ?? height / 2;
  if (!finite(originX) || !finite(originY)) return null;
  const { right, up, forward } = basis;
  const acceptedRight: SkyVector = [...right];
  const acceptedUp: SkyVector = [...up];
  const acceptedForward: SkyVector = [...forward];
  // atan2 -> degrees/wrap -> radians -> sin/cos may move the normalized ray
  // by a few ulps. Expand only this early rejection, never final visibility.
  // Plane-space bounds avoid dividing near the stereographic antipode.
  const rayError=3*64*Number.EPSILON;
  const outsidePlane=(value:number,bound:number,denominator:number,upper:boolean)=>{
    const error=rayError*(Math.abs(scale)+Math.abs(bound));
    return upper?value>bound*denominator+error:value<bound*denominator-error;
  };
  const mayProjectVector=(direction:SkyVector)=>{
    const denominator=1+dot(direction,acceptedForward);
    if(denominator<1e-9-rayError)return false;
    if(!(denominator>1e-9+rayError))return true;
    const horizontal=scale*dot(direction,acceptedRight);
    if(outsidePlane(horizontal,-originX-1e-9,denominator,false)||
      outsidePlane(horizontal,width-originX+1e-9,denominator,true))return false;
    const vertical=scale*dot(direction,acceptedUp);
    return !outsidePlane(vertical,originY+1e-9,denominator,true)&&
      !outsidePlane(vertical,originY-height-1e-9,denominator,false);
  };
  const project = (direction: SkyVector, degrees: number, altitude: number, clipped: boolean): SkyDirectionProjection | null => {
    const cameraForward = dot(direction, acceptedForward);
    const denominator = 1 + cameraForward;
    if (!(denominator > 1e-9)) return null;
    const cameraRight = dot(direction, acceptedRight);
    const x = originX + (scale * cameraRight) / denominator;
    // Most catalogue rays leave a portrait viewport horizontally. Preserve
    // the exact projection/boundary formula, but skip the other axis once
    // this one has already rejected a point. Extended anchors stay unclipped.
    if (!finite(x) || clipped && (x < -1e-9 || x > width+1e-9)) return null;
    const cameraUp = dot(direction, acceptedUp);
    const y = originY - (scale * cameraUp) / denominator;
    if (!finite(y) || clipped && (y < -1e-9 || y > height+1e-9)) return null;
    return { x, y, degrees, altitude };
  };
  const fromAngles = (azimuthDeg: number, altitudeDeg: number, clipped: boolean) => {
    const direction = skyHorizontalDirection(azimuthDeg, altitudeDeg);
    return direction ? project(direction, normalizeDegrees(azimuthDeg), altitudeDeg, clipped) : null;
  };
  return {
    unclipped: (azimuthDeg, altitudeDeg) => fromAngles(azimuthDeg, altitudeDeg, false),
    project: (azimuthDeg, altitudeDeg) => fromAngles(azimuthDeg, altitudeDeg, true),
    prepared: direction => project(direction.vector, direction.degrees, direction.altitude, true),
    mayProjectVector,
  };
}

/** Stereographic radius = scale * tan(angular distance from center / 2).
 * The vertical FOV includes unused space outside the horizon in dome mode.
 */
export function skyProjectionScale(height: number, verticalFovDeg: number): number | null {
  if (!finite(height) || height <= 0 || !finite(verticalFovDeg) || verticalFovDeg <= 0 || verticalFovDeg >= 360) return null;
  return height / (2 * Math.tan(verticalFovDeg * Math.PI / 720));
}

/** Exact inverse used by dragging and camera consumers; no second projection. */
export function unprojectSkyPoint(x: number, y: number, basis: SkyViewBasis,
  width: number, height: number, verticalFovDeg: number, center?: SkyProjectionCenter): SkyVector | null {
  const scale = skyProjectionScale(height, verticalFovDeg);
  if (!validBasis(basis) || ![x, y, width].every(finite) || width <= 0 || scale === null) return null;
  if (center && ![center.x, center.y].every(finite)) return null;
  const u = (x - (center?.x ?? width / 2)) / scale, v = ((center?.y ?? height / 2) - y) / scale;
  const squared = u * u + v * v, divisor = 1 + squared;
  const right = 2 * u / divisor, up = 2 * v / divisor, forward = (1 - squared) / divisor;
  return [0, 1, 2].map(i => basis.right[i]! * right + basis.up[i]! * up + basis.forward[i]! * forward) as unknown as SkyVector;
}
