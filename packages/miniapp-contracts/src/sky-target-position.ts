/** Geometric horizontal coordinates, independent of localized display text.
 * Null, absent and malformed geometry must not become an approximate bearing.
 * Negative altitudes remain valid facts; visibility belongs to the renderer.
 */
export function hasSkyTargetPosition(value: unknown): value is {
  azimuthDeg: number;
  altitudeDeg: number;
} {
  if (!value || typeof value !== "object") return false;
  const target = value as { azimuthDeg?: unknown; altitudeDeg?: unknown };
  return typeof target.azimuthDeg === "number" && Number.isFinite(target.azimuthDeg) &&
    target.azimuthDeg >= 0 && target.azimuthDeg < 360 &&
    typeof target.altitudeDeg === "number" && Number.isFinite(target.altitudeDeg) &&
    target.altitudeDeg >= -90 && target.altitudeDeg <= 90;
}
