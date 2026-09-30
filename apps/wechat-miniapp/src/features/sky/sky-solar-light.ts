import type { SkyGeometryRow } from "@starward/miniapp-contracts";
import { exactSkyTimeFrame } from "./sky-time-frame";
import { skyHorizontalDirection, type SkyVector } from "./sky-view-projection";

export interface SkySolarLight {
  readonly direction: SkyVector;
  readonly altitudeDeg: number;
}

/** A missing or retired report row never becomes an invented sun direction. */
export function skySolarLightAt(rows: readonly SkyGeometryRow[] | undefined, at: string | undefined): SkySolarLight | null {
  const row = exactSkyTimeFrame(rows, at);
  if (!row || typeof row.sunAzimuthDeg !== "number" || !Number.isFinite(row.sunAzimuthDeg) ||
    row.sunAzimuthDeg < 0 || row.sunAzimuthDeg >= 360 ||
    typeof row.sunAltitudeDeg !== "number" || !Number.isFinite(row.sunAltitudeDeg) ||
    row.sunAltitudeDeg < -90 || row.sunAltitudeDeg > 90) return null;
  const direction = skyHorizontalDirection(row.sunAzimuthDeg, row.sunAltitudeDeg);
  return direction ? { direction, altitudeDeg: row.sunAltitudeDeg } : null;
}
