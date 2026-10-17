/** Human-readable sector of a north-zero, clockwise horizontal direction. */
export function compassLabel(azimuthDeg: number | null | undefined) {
  if (azimuthDeg == null || !Number.isFinite(azimuthDeg)) return "";
  const labels = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"] as const;
  return labels[Math.round(((azimuthDeg % 360) + 360) % 360 / 45) % 8]!;
}
