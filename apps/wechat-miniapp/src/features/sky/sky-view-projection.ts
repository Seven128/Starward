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

export type SkyVector = readonly [number, number, number];

export interface SkyViewBasis {
  /** Direction of increasing screen x in ENU world coordinates. */
  readonly right: SkyVector;
  /** Direction of increasing screen y-up in ENU world coordinates. */
  readonly up: SkyVector;
  /** Direction from the phone back into the displayed sky. */
  readonly forward: SkyVector;
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

const DEGREES_TO_RADIANS = Math.PI / 180;
const BASIS_TOLERANCE = 1e-6;

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeDegrees(value: number): number {
  const normalized = ((value % 360) + 360) % 360;
  return Object.is(normalized, -0) ? 0 : normalized;
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

function validBasis(value: unknown): value is SkyViewBasis {
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
 * Project one local-horizon direction through a perspective camera.
 *
 * `verticalFovDeg` is deliberately required at every call so the caller must
 * own the selected view profile.  Horizontal FOV is derived from the actual
 * width/height aspect ratio.  A direction behind the phone or outside the
 * view frustum returns null; it is never clamped to an edge position.
 */
export function projectSkyDirection(
  azimuthDeg: number,
  altitudeDeg: number,
  basis: SkyViewBasis,
  width: number,
  height: number,
  verticalFovDeg: number,
): SkyDirectionProjection | null {
  if (
    !finite(azimuthDeg) ||
    !finite(altitudeDeg) ||
    altitudeDeg < -90 ||
    altitudeDeg > 90 ||
    !validBasis(basis) ||
    !finite(width) ||
    !finite(height) ||
    width <= 0 ||
    height <= 0 ||
    !finite(verticalFovDeg) ||
    verticalFovDeg <= 0 ||
    verticalFovDeg >= 180
  )
    return null;

  const azimuthRad = normalizeDegrees(azimuthDeg) * DEGREES_TO_RADIANS;
  const altitudeRad = altitudeDeg * DEGREES_TO_RADIANS;
  const cosAltitude = Math.cos(altitudeRad);
  // Azimuth is clockwise from north in ENU: x=east, y=north.
  const direction: SkyVector = [
    cosAltitude * Math.sin(azimuthRad),
    cosAltitude * Math.cos(azimuthRad),
    Math.sin(altitudeRad),
  ];

  const cameraRight = dot(direction, basis.right);
  const cameraUp = dot(direction, basis.up);
  const cameraForward = dot(direction, basis.forward);
  if (!(cameraForward > 0)) return null;

  const focalLength = height / (2 * Math.tan((verticalFovDeg * DEGREES_TO_RADIANS) / 2));
  if (!finite(focalLength) || focalLength <= 0) return null;
  const x = width / 2 + (focalLength * cameraRight) / cameraForward;
  const y = height / 2 - (focalLength * cameraUp) / cameraForward;
  if (!finite(x) || !finite(y) || x < 0 || x > width || y < 0 || y > height)
    return null;

  return {
    x,
    y,
    degrees: normalizeDegrees(azimuthDeg),
    altitude: altitudeDeg,
  };
}

/**
 * Convert one compass reading and one inverse-clockwise alpha reading into a
 * reusable heading offset.  The alpha sign is an explicit platform boundary:
 * heading = offset - alpha (modulo 360).
 */
export function calibrateSkyHeadingOffset(
  compassHeadingDeg: number,
  alphaDeg: number,
): number | null {
  if (!finite(compassHeadingDeg) || !finite(alphaDeg)) return null;
  return normalizeDegrees(compassHeadingDeg + alphaDeg);
}

/** Resolve a world heading from the calibrated offset and inverse-clockwise alpha. */
export function resolveSkyHeading(
  offsetDeg: number,
  alphaDeg: number,
): number | null {
  if (!finite(offsetDeg) || !finite(alphaDeg)) return null;
  return normalizeDegrees(offsetDeg - alphaDeg);
}
