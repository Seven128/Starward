import type { Gcj02Point } from "./types.ts";

export interface MapViewportRequest {
  center: Gcj02Point;
  zoom: number;
}

export function viewportRadiusKm(zoom: number) {
  if (!Number.isFinite(zoom) || zoom < 3 || zoom > 20)
    throw new Error("map_zoom_invalid");
  // 156.543 is the Web Mercator ground resolution in kilometres per pixel at
  // zoom 0. The map contract uses the 750-rpx design width as a conservative
  // radial query span, then adds the required 20% loading buffer.
  const visibleRadius =
    (156.543 * Math.cos((22.5431 * Math.PI) / 180) * 750) /
    2 ** zoom;
  return Math.max(8, Math.min(500, visibleRadius * 1.2));
}
