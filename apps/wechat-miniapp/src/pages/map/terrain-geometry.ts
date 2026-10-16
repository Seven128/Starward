export const TERRAIN_RADIUS_TICKS = [2, 5, 10, 20, 50] as const;
const LOG_RANGE = Math.log(25);

/** Geographic extent of the actual logical native Map window. Buffer both
 * Mercator axes by the existing 20%; Spot's radius is a separate product. */
export function terrainMapViewportBounds(center: { latitude: number; longitude: number }, zoom: number,
  frame: { width: number; height: number }): TerrainBounds {
  const pixels = 256 * 2 ** zoom, halfX = Math.min(0.5, frame.width / pixels * 0.6), halfY = frame.height / pixels * 0.6;
  const y = mercatorY(center.latitude), x = (center.longitude + 180) / 360;
  // A wrapped world cannot be one GroundOverlay. Cover the whole longitude
  // range in that case; never squeeze it into an incorrectly narrow rectangle.
  const wrapped = x - halfX < 0 || x + halfX > 1;
  return { west: wrapped ? -180 : (x - halfX) * 360 - 180,
    east: wrapped ? 180 : (x + halfX) * 360 - 180,
    south: latitudeForMercatorY(y + halfY), north: latitudeForMercatorY(y - halfY) };
}

export function terrainBoundsForNativeRegion(value: unknown): TerrainBounds | null {
  const region = value as { southwest?: { latitude?: number; longitude?: number }; northeast?: { latitude?: number; longitude?: number } } | null;
  const west = region?.southwest?.longitude, south = region?.southwest?.latitude;
  const east = region?.northeast?.longitude, north = region?.northeast?.latitude;
  if (![west, south, east, north].every(value => typeof value === "number" && Number.isFinite(value))
    || west! < -180 || east! > 180 || south! < -85.05112878 || north! > 85.05112878 || west! >= east! || south! >= north!) return null;
  const middleY = (mercatorY(north!) + mercatorY(south!)) / 2, halfY = (mercatorY(south!) - mercatorY(north!)) * 0.6;
  const middleX = (west! + east!) / 2, halfX = (east! - west!) * 0.6;
  return { west: Math.max(-180, middleX - halfX), east: Math.min(180, middleX + halfX),
    south: latitudeForMercatorY(middleY + halfY), north: latitudeForMercatorY(middleY - halfY) };
}

export function terrainRadiusForSlider(value: number) {
  return Math.round(2 * Math.exp(LOG_RANGE * Math.min(100, Math.max(0, value)) / 100) * 10) / 10;
}

export function terrainSliderForRadius(radiusKm: number) {
  return Math.log(Math.min(50, Math.max(2, radiusKm)) / 2) / LOG_RANGE * 100;
}

export function terrainViewportBounds(center: { latitude: number; longitude: number }, radiusKm: number): TerrainBounds {
  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.cos(center.latitude * Math.PI / 180));
  return { west: center.longitude - lonDelta, east: center.longitude + lonDelta, south: center.latitude - latDelta, north: center.latitude + latDelta };
}

export function terrainCropPercent(published: TerrainBounds, requested: TerrainBounds) {
  const requestedWidth = requested.east - requested.west;
  const requestedHeight = requested.north - requested.south;
  if (!(requestedWidth > 0 && requestedHeight > 0)) throw new Error("invalid_terrain_viewport");
  return {
    width: (published.east - published.west) / requestedWidth * 100,
    height: (published.north - published.south) / requestedHeight * 100,
    left: -(requested.west - published.west) / requestedWidth * 100,
    top: -(published.north - requested.north) / requestedHeight * 100,
  };
}
import { mercatorY, latitudeForMercatorY } from "@starward/coordinate-system";
import type { TerrainBounds } from "@starward/miniapp-contracts";
export type { TerrainBounds } from "@starward/miniapp-contracts";
