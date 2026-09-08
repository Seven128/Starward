/** Optical and local-horizon geometry shared by native UI and catalog projection. */
export interface HorizonPoint { azimuthDeg: number; altitudeDeg: number }
export interface HorizonProfile { source: "measured" | "manual" | "estimated"; version: string; confidence: number; points: HorizonPoint[] }

const normalize = (value: number) => ((value % 360) + 360) % 360;
export const interpolateHorizon = (profile: HorizonProfile, azimuthDeg: number): number | null => {
  if (profile.points.length < 2) return null;
  const points = [...profile.points].map((point) => ({ ...point, azimuthDeg: normalize(point.azimuthDeg) })).sort((a, b) => a.azimuthDeg - b.azimuthDeg);
  const target = normalize(azimuthDeg);
  const wrapped = [...points, { ...points[0], azimuthDeg: points[0].azimuthDeg + 360 }];
  const adjusted = target < points[0].azimuthDeg ? target + 360 : target;
  for (let index = 0; index < wrapped.length - 1; index += 1) {
    const left = wrapped[index]; const right = wrapped[index + 1];
    if (adjusted >= left.azimuthDeg && adjusted <= right.azimuthDeg) {
      const ratio = (adjusted - left.azimuthDeg) / Math.max(0.0001, right.azimuthDeg - left.azimuthDeg);
      return left.altitudeDeg + (right.altitudeDeg - left.altitudeDeg) * ratio;
    }
  }
  return null;
};

export function calculateFieldOfView(input: { sensorWidthMm?: number; sensorHeightMm?: number; focalLengthMm?: number; orientation: "landscape" | "portrait" }) {
  const { sensorWidthMm, sensorHeightMm, focalLengthMm } = input;
  if (![sensorWidthMm, sensorHeightMm, focalLengthMm].every((value) => typeof value === "number" && Number.isFinite(value) && value > 0)) return null;
  const horizontal = 2 * Math.atan(sensorWidthMm! / (2 * focalLengthMm!)) * 180 / Math.PI;
  const vertical = 2 * Math.atan(sensorHeightMm! / (2 * focalLengthMm!)) * 180 / Math.PI;
  return input.orientation === "landscape" ? { horizontalDeg: horizontal, verticalDeg: vertical } : { horizontalDeg: vertical, verticalDeg: horizontal };
}

export function visibleIntervals(samples: Array<{ at: string; altitudeDeg: number; azimuthDeg: number }>, profile?: HorizonProfile) {
  return samples.map((sample) => {
    const horizon = profile ? interpolateHorizon(profile, sample.azimuthDeg) : null;
    return { ...sample, horizonAltitudeDeg: horizon, visible: sample.altitudeDeg > (horizon ?? 0), evidence: profile?.source ?? "astronomical-horizon" };
  });
}
