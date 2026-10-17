import { compassLabel } from "../../utils/compass-label";

/** Presentation only: callers retain the same accepted observer, instant and
 * numeric position. Missing values cannot become a north/horizon zero. */
export function skyDirectionLabel(azimuthDeg: number | null, digits = 0) {
  const direction = compassLabel(azimuthDeg);
  return direction ? `${direction} ${azimuthDeg!.toFixed(digits)}°` : "暂无数据";
}

export function skyHeightLabel(altitudeDeg: number | null, digits = 0) {
  if (altitudeDeg === null || !Number.isFinite(altitudeDeg)) return "暂无数据";
  return `${altitudeDeg < 0 ? "地平线下 " : ""}${Math.abs(altitudeDeg).toFixed(digits)}°`;
}
