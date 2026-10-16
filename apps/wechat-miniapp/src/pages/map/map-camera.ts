import { mercatorY, latitudeForMercatorY } from "@starward/coordinate-system";

export function cameraCenterForVisibleMapTarget(
  point: { latitude: number; longitude: number },
  viewportHeightPx: number,
  visibleMapHeightPx: number,
  zoom: number,
) {
  if (
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude) ||
    !Number.isFinite(viewportHeightPx) ||
    !Number.isFinite(visibleMapHeightPx) ||
    !Number.isFinite(zoom) ||
    viewportHeightPx <= 0 ||
    visibleMapHeightPx <= 0 ||
    visibleMapHeightPx > viewportHeightPx
  ) return point;

  const worldSize = 256 * 2 ** zoom;
  const targetY = visibleMapHeightPx / 2;
  const verticalShift = viewportHeightPx / 2 - targetY;
  return {
    latitude: latitudeForMercatorY(
      mercatorY(point.latitude) + verticalShift / worldSize,
    ),
    longitude: point.longitude,
  };
}
