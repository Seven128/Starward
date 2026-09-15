import Quaternion from "quaternion";

import type { SkyVector, SkyViewBasis } from "./sky-view-projection";

export type DeviceMotionAngleUnit = "degrees" | "radians";

export interface DeviceMotionAngles {
  readonly alpha: number;
  readonly beta: number;
  readonly gamma: number;
}

export interface DeviceOrientationFrame {
  readonly alphaDeg: number;
  readonly betaDeg: number;
  readonly gammaDeg: number;
  /** Undefined azimuth at the zenith/nadir does not invalidate the 3D view. */
  readonly headingDeg: number | null;
  readonly basis: SkyViewBasis;
  readonly sampledAt: number;
}

export interface DeviceOrientationViewTracker {
  readonly awaitingNorthReference: boolean;
  setCompassHeading(headingDeg: number): void;
  updateMotion(angles: DeviceMotionAngles, sampledAt: number): DeviceOrientationFrame | null;
  reset(): void;
}

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const FILTER_TIME_CONSTANT_MS = 45;

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

/**
 * WeChat documents radians, but the verified Android runtime emits degrees.
 * Selecting that boundary before the first sample prevents an ambiguous small
 * degree value from being amplified by 180/PI and then snapping back later.
 */
export function deviceMotionAngleUnit(platform: string | null | undefined): DeviceMotionAngleUnit {
  return String(platform ?? "").toLowerCase() === "android" ? "degrees" : "radians";
}

export function normalizeDeviceMotionAngles(
  angles: DeviceMotionAngles,
  unit: DeviceMotionAngleUnit,
): { alphaDeg: number; betaDeg: number; gammaDeg: number } | null {
  const { alpha, beta, gamma } = angles;
  if (![alpha, beta, gamma].every(finite)) return null;
  const scale = unit === "degrees" ? 1 : RAD;
  const alphaDeg = alpha * scale;
  const betaDeg = beta * scale;
  const gammaDeg = gamma * scale;
  // The observed Android degree contract uses atan2-style roll through ±180°.
  // Keep the documented radian boundary separate until that platform is measured.
  const maximumGammaDeg = unit === "degrees" ? 180 : 90;
  if (
    Math.abs(alphaDeg) > 360 ||
    Math.abs(betaDeg) > 180 ||
    Math.abs(gammaDeg) > maximumGammaDeg
  ) return null;
  return { alphaDeg: normalizeDegrees(alphaDeg), betaDeg, gammaDeg };
}

function axis(axis: [number, number, number], angle: number): Quaternion {
  return Quaternion.fromAxisAngle(axis, angle);
}

/**
 * The same rotation order used by Three.js DeviceOrientationControls:
 * Euler(beta, alpha, -gamma, YXZ), followed by the camera's -PI/2 X
 * correction. Quaternion.js owns composition and shortest-arc interpolation.
 * This does not correct noise or frame changes in the platform sensor itself.
 */
function deviceQuaternion(alphaDeg: number, betaDeg: number, gammaDeg: number): Quaternion {
  return axis([0, 1, 0], alphaDeg * DEG)
    .mul(axis([1, 0, 0], betaDeg * DEG))
    .mul(axis([0, 0, 1], -gammaDeg * DEG))
    .mul(axis([1, 0, 0], -Math.PI / 2))
    .normalize();
}

function enu(vector: [number, number, number]): SkyVector {
  // Three.js world axes for DeviceOrientationControls are east/up/south.
  return [vector[0], -vector[2], vector[1]];
}

function basisFromQuaternion(value: Quaternion): SkyViewBasis {
  return {
    right: enu(value.rotateVector([1, 0, 0]) as [number, number, number]),
    up: enu(value.rotateVector([0, 1, 0]) as [number, number, number]),
    forward: enu(value.rotateVector([0, 0, -1]) as [number, number, number]),
  };
}

function headingFromBasis(basis: SkyViewBasis): number | null {
  const horizontal = Math.hypot(basis.forward[0], basis.forward[1]);
  if (horizontal < 0.15) return null;
  return normalizeDegrees(Math.atan2(basis.forward[0], basis.forward[1]) * RAD);
}

export function createDeviceOrientationViewTracker(
  angleUnit: DeviceMotionAngleUnit,
): DeviceOrientationViewTracker {
  let compassHeading: number | null = null;
  let northCorrection: Quaternion | null = null;
  let filtered: Quaternion | null = null;
  let filteredAt: number | null = null;
  let awaitingNorthReference = false;

  return {
    get awaitingNorthReference() { return awaitingNorthReference; },
    setCompassHeading(headingDeg) {
      if (finite(headingDeg)) compassHeading = normalizeDegrees(headingDeg);
    },

    updateMotion(angles, sampledAt) {
      if (!finite(sampledAt)) return null;
      if (filteredAt !== null && sampledAt <= filteredAt) return null;
      const normalized = normalizeDeviceMotionAngles(angles, angleUnit);
      awaitingNorthReference = false;
      if (!normalized) return null;
      // The measured Android wx boundary matches platformize's negative
      // alpha/beta/gamma adaptation before Three's YXZ camera conversion.
      // Its full attitude already contains heading: a separate compass
      // anchor and another temporal filter caused the rejected pull-back.
      if (angleUnit === "degrees") {
        const basis = basisFromQuaternion(deviceQuaternion(
          -normalized.alphaDeg, -normalized.betaDeg, -normalized.gammaDeg,
        ));
        filteredAt = sampledAt;
        return { ...normalized, headingDeg: headingFromBasis(basis), basis, sampledAt };
      }

      // Preserve the separate, not-yet-device-verified radian boundary.
      const raw = deviceQuaternion(
        normalized.alphaDeg,
        normalized.betaDeg,
        normalized.gammaDeg,
      );

      if (!northCorrection) {
        if (compassHeading === null) return null;
        const rawBasis = basisFromQuaternion(raw);
        // Compass azimuth refers to the phone top (+Y), not the rear camera.
        // Never substitute the camera axis: its horizontal projection can
        // point the opposite way. An upright phone must tilt for this initial
        // reference; after anchoring all camera orientations remain valid.
        if (Math.hypot(rawBasis.up[0], rawBasis.up[1]) < 0.15) {
          awaitingNorthReference = true;
          return null;
        }
        const rawHeading = normalizeDegrees(
          Math.atan2(rawBasis.up[0], rawBasis.up[1]) * RAD,
        );
        const correctionDeg = normalizeDegrees(compassHeading - rawHeading + 180) - 180;
        northCorrection = axis([0, 1, 0], -correctionDeg * DEG);
      }

      const target = northCorrection.mul(raw).normalize();
      if (!filtered || filteredAt === null || sampledAt - filteredAt > 500) {
        filtered = target;
      } else {
        const elapsed = sampledAt - filteredAt;
        const amount = 1 - Math.exp(-elapsed / FILTER_TIME_CONSTANT_MS);
        filtered = filtered.slerp(target)(amount).normalize();
      }
      filteredAt = sampledAt;
      const basis = basisFromQuaternion(filtered);
      const headingDeg = headingFromBasis(basis);
      return { ...normalized, headingDeg, basis, sampledAt };
    },

    reset() {
      compassHeading = null;
      northCorrection = null;
      filtered = null;
      filteredAt = null;
      awaitingNorthReference = false;
    },
  };
}
