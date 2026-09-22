import { skyVisibleViewport, type SkyViewportInsets } from "./sky-viewport";

export const SKY_OBSERVING_VERTICAL_FOV_DEG = 45;
export const SKY_MIN_VERTICAL_FOV_DEG = 1.5;
/** Full horizon circle fits the actual viewport, with a modest edge inset. */
export function skyDomeFieldOfView(width: number, height: number, insets?: SkyViewportInsets): number {
  const viewport = skyVisibleViewport(width, height, insets);
  if (!viewport) return SKY_OBSERVING_VERTICAL_FOV_DEG;
  return 720 / Math.PI * Math.atan(height / (viewport.shortSide * 0.92));
}

export function clampSkyFieldOfView(value: number, width: number, height: number, insets?: SkyViewportInsets) {
  if (!Number.isFinite(value)) return SKY_OBSERVING_VERTICAL_FOV_DEG;
  return Math.max(SKY_MIN_VERTICAL_FOV_DEG, Math.min(skyDomeFieldOfView(width, height, insets), value));
}

export function skyDomeProgress(fov: number, width: number, height: number, insets?: SkyViewportInsets): number {
  const maximum = skyDomeFieldOfView(width, height, insets);
  if (!Number.isFinite(fov) || maximum <= SKY_OBSERVING_VERTICAL_FOV_DEG) return 0;
  return Math.max(0, Math.min(1, (fov - SKY_OBSERVING_VERTICAL_FOV_DEG) / (maximum - SKY_OBSERVING_VERTICAL_FOV_DEG)));
}

export function remapSkyFieldOfView(value: number,
  previous: { width: number; height: number; insets: SkyViewportInsets },
  next: { width: number; height: number; insets: SkyViewportInsets }) {
  if (value <= SKY_OBSERVING_VERTICAL_FOV_DEG) return clampSkyFieldOfView(value, next.width, next.height, next.insets);
  const progress = skyDomeProgress(value, previous.width, previous.height, previous.insets);
  return SKY_OBSERVING_VERTICAL_FOV_DEG + progress * (skyDomeFieldOfView(next.width, next.height, next.insets) - SKY_OBSERVING_VERTICAL_FOV_DEG);
}

export function pinchFieldOfView(startFov: number, startDistance: number, currentDistance: number, width: number, height: number, insets?: SkyViewportInsets) {
  if (![startDistance, currentDistance].every(Number.isFinite) || !(startDistance > 0) || !(currentDistance > 0)) return clampSkyFieldOfView(startFov, width, height, insets);
  const start = clampSkyFieldOfView(startFov, width, height, insets);
  // Finger separation scales projected distances, not angles linearly.
  return clampSkyFieldOfView(720 / Math.PI * Math.atan(Math.tan(start * Math.PI / 720) * startDistance / currentDistance), width, height, insets);
}

export type DeepSkyImageLevel = "OVERVIEW" | "MEDIUM" | "DETAIL";

export function deepSkyImageLevelForFov(fov: number): DeepSkyImageLevel | null {
  if (fov > 15) return null;
  if (fov > 6) return "OVERVIEW";
  if (fov > 2.5) return "MEDIUM";
  return "DETAIL";
}
