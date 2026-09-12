const WEB_MERCATOR_MAX_LATITUDE = 85.05112878;

function mercatorY(latitude: number) {
  const bounded = Math.max(
    -WEB_MERCATOR_MAX_LATITUDE,
    Math.min(WEB_MERCATOR_MAX_LATITUDE, latitude),
  );
  const sin = Math.sin((bounded * Math.PI) / 180);
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

function latitudeForMercatorY(value: number) {
  const y = Math.max(0, Math.min(1, value));
  return (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
}

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
