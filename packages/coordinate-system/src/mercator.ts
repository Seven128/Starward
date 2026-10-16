/** Normalized Web Mercator coordinates used by native map framing and rasters. */
export const WEB_MERCATOR_MAX_LATITUDE = 85.05112878;
export const WEB_MERCATOR_CIRCUMFERENCE_M = 40075016.68557849;

export function mercatorY(latitude: number) {
  const bounded = Math.max(-WEB_MERCATOR_MAX_LATITUDE, Math.min(WEB_MERCATOR_MAX_LATITUDE, latitude));
  const sin = Math.sin(bounded * Math.PI / 180);
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

export function latitudeForMercatorY(value: number) {
  return Math.atan(Math.sinh(Math.PI * (1 - 2 * Math.max(0, Math.min(1, value))))) * 180 / Math.PI;
}
