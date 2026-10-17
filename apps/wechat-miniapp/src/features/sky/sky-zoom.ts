import { skyProjectionViewport } from "./sky-viewport";

export const SKY_OBSERVING_VERTICAL_FOV_DEG = 45;
// A 0.18-degree Android preview left the observed Saturn globe about 12
// logical pixels in radius, too small to inspect its historical cloud bands
// or illustrative ring shadow. The finite 0.05-degree floor projects that
// same globe above 40 px on the observed logical canvas; phone cost remains
// to verify at this new limit.
export const SKY_MIN_VERTICAL_FOV_DEG = 0.05;
// A reversed stereographic pinch can land a few ulps above 45 degrees.
// Canonicalize only numerical noise so the camera can leave its overview path.
const LOCAL_BOUNDARY_EPSILON_DEG = 1e-9;
const localBoundary = (value: number) => Math.abs(value - SKY_OBSERVING_VERTICAL_FOV_DEG) < LOCAL_BOUNDARY_EPSILON_DEG
  ? SKY_OBSERVING_VERTICAL_FOV_DEG : value;
/** Full horizon circle fits the stable Canvas, with a modest edge inset. */
export function skyDomeFieldOfView(width: number, height: number): number {
  const viewport = skyProjectionViewport(width, height);
  if (!viewport) return SKY_OBSERVING_VERTICAL_FOV_DEG;
  return 720 / Math.PI * Math.atan(height / (viewport.shortSide * 0.92));
}

export function clampSkyFieldOfView(value: number, width: number, height: number) {
  if (!Number.isFinite(value)) return SKY_OBSERVING_VERTICAL_FOV_DEG;
  return Math.max(SKY_MIN_VERTICAL_FOV_DEG, Math.min(skyDomeFieldOfView(width, height), localBoundary(value)));
}

export function skyDomeProgress(fov: number, width: number, height: number): number {
  const maximum = skyDomeFieldOfView(width, height);
  if (!Number.isFinite(fov) || maximum <= SKY_OBSERVING_VERTICAL_FOV_DEG) return 0;
  return Math.max(0, Math.min(1, (localBoundary(fov) - SKY_OBSERVING_VERTICAL_FOV_DEG) / (maximum - SKY_OBSERVING_VERTICAL_FOV_DEG)));
}

export function remapSkyFieldOfView(value: number,
  previous: { width: number; height: number },
  next: { width: number; height: number }) {
  if (value <= SKY_OBSERVING_VERTICAL_FOV_DEG) return clampSkyFieldOfView(value, next.width, next.height);
  const progress = skyDomeProgress(value, previous.width, previous.height);
  return SKY_OBSERVING_VERTICAL_FOV_DEG + progress * (skyDomeFieldOfView(next.width, next.height) - SKY_OBSERVING_VERTICAL_FOV_DEG);
}

export function pinchFieldOfView(startFov: number, startDistance: number, currentDistance: number, width: number, height: number) {
  if (![startDistance, currentDistance].every(Number.isFinite) || !(startDistance > 0) || !(currentDistance > 0)) return clampSkyFieldOfView(startFov, width, height);
  const start = clampSkyFieldOfView(startFov, width, height);
  // Finger separation scales projected distances, not angles linearly.
  return clampSkyFieldOfView(720 / Math.PI * Math.atan(Math.tan(start * Math.PI / 720) * startDistance / currentDistance), width, height);
}

export type DeepSkyImageLevel = "OVERVIEW" | "MEDIUM" | "DETAIL";

export function deepSkyImageLevelForFov(fov: number): DeepSkyImageLevel | null {
  if (fov > 15) return null;
  if (fov > 6) return "OVERVIEW";
  if (fov > 2.5) return "MEDIUM";
  return "DETAIL";
}
