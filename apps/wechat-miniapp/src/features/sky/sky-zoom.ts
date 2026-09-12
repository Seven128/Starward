export const SKY_MAX_VERTICAL_FOV_DEG = 45;
export const SKY_MIN_VERTICAL_FOV_DEG = 1.5;

export function clampSkyFieldOfView(value: number) {
  if (!Number.isFinite(value)) return SKY_MAX_VERTICAL_FOV_DEG;
  return Math.max(SKY_MIN_VERTICAL_FOV_DEG, Math.min(SKY_MAX_VERTICAL_FOV_DEG, value));
}

export function pinchFieldOfView(startFov: number, startDistance: number, currentDistance: number) {
  if (!(startDistance > 0) || !(currentDistance > 0)) return clampSkyFieldOfView(startFov);
  return clampSkyFieldOfView(startFov * startDistance / currentDistance);
}

export type DeepSkyImageLevel = "OVERVIEW" | "MEDIUM" | "DETAIL";

export function deepSkyImageLevelForFov(fov: number): DeepSkyImageLevel | null {
  if (fov > 15) return null;
  if (fov > 6) return "OVERVIEW";
  if (fov > 2.5) return "MEDIUM";
  return "DETAIL";
}

export function deepSkyImageFieldDegrees(majorAxisArcmin: number | null, level: DeepSkyImageLevel) {
  const objectDegrees = Math.max(majorAxisArcmin ?? 10, 1) / 60;
  const profile = level === "OVERVIEW" ? [3, 2, 8] : level === "MEDIUM" ? [1.5, 0.75, 4] : [0.6, 0.25, 2];
  return Math.round(Math.min(profile[2]!, Math.max(profile[1]!, objectDegrees * profile[0]!)) * 1_000) / 1_000;
}
