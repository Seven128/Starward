import { projectSkyDirection, type SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";
import type { DeviceOrientationFrame as DevicePose } from "./device-orientation-view";
import type { ResolvedSkyReport as SkyReport } from "./sky-stellar-scene";
import { SKY_OBSERVING_VERTICAL_FOV_DEG as SKY_VERTICAL_FOV_DEG } from "./sky-zoom";
import { hasSkyTargetPosition } from "@starward/miniapp-contracts";

export interface SkyTargetProjection {
  x: number;
  y: number;
  degrees: number;
  altitude: number;
}

export function projectHorizontalPoint(
  azimuthDeg: number,
  altitudeDeg: number,
  heading: number | null,
  pose: DevicePose | null,
  width: number,
  height: number,
  verticalFovDeg = SKY_VERTICAL_FOV_DEG,
  manualBasis: SkyViewBasis | null = null,
  center?: SkyProjectionCenter,
): SkyTargetProjection | null {
  const basis = manualBasis ?? pose?.basis ?? null;
  return basis
    ? projectSkyDirection(azimuthDeg, altitudeDeg, basis, width, height, verticalFovDeg, center)
    : null;
}

export function projectSkyTarget(
  target: SkyReport["targets"][number],
  heading: number | null,
  pose: DevicePose | null,
  width: number,
  height: number,
  verticalFovDeg = SKY_VERTICAL_FOV_DEG,
  manualBasis: SkyViewBasis | null = null,
  center?: SkyProjectionCenter,
): SkyTargetProjection | null {
  if (!hasSkyTargetPosition(target)) return null;
  // Stars and targets share the same projection and live view basis.
  // No synthetic direction is introduced for missing/stale sensor data.
  return projectHorizontalPoint(
    target.azimuthDeg,
    target.altitudeDeg,
    heading,
    pose,
    width,
    height,
    verticalFovDeg,
    manualBasis,
    center,
  );
}
