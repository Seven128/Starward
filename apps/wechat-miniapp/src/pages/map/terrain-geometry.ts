export const TERRAIN_RADIUS_TICKS = [2, 5, 10, 20, 50] as const;
const LOG_RANGE = Math.log(25);

/** Standard Web Mercator frame geometry used by public source trials. This
 * does not calibrate WeChat's scale; production Map coverage uses getRegion. */
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

export function mapBoundsForNativeRegion(value: unknown): TerrainBounds | null {
  const region = value as { southwest?: { latitude?: number; longitude?: number }; northeast?: { latitude?: number; longitude?: number } } | null;
  const west = region?.southwest?.longitude, south = region?.southwest?.latitude;
  const east = region?.northeast?.longitude, north = region?.northeast?.latitude;
  if (![west, south, east, north].every(value => typeof value === "number" && Number.isFinite(value))
    || west! < -180 || east! > 180 || south! < -85.05112878 || north! > 85.05112878 || west! >= east! || south! >= north!) return null;
  return { west: west!, south: south!, east: east!, north: north! };
}

export function bufferTerrainBounds(bounds: TerrainBounds): TerrainBounds {
  const { west, south, east, north } = bounds;
  const middleY = (mercatorY(north) + mercatorY(south)) / 2, halfY = (mercatorY(south) - mercatorY(north)) * 0.6;
  const middleX = (west + east) / 2, halfX = (east - west) * 0.6;
  return { west: Math.max(-180, middleX - halfX), east: Math.min(180, middleX + halfX),
    south: latitudeForMercatorY(middleY + halfY), north: latitudeForMercatorY(middleY - halfY) };
}

export function terrainBoundsForNativeRegion(value: unknown): TerrainBounds | null {
  const bounds = mapBoundsForNativeRegion(value);
  return bounds ? bufferTerrainBounds(bounds) : null;
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
  if (!(requested.east > requested.west && requested.north > requested.south)) throw new Error("invalid_terrain_viewport");
  return latitudeRasterCropPercent(published, requested);
}
import { latitudeRasterCropPercent } from "@/services/raster-image-geometry";
import { mercatorY, latitudeForMercatorY } from "@starward/coordinate-system";
import type { TerrainBounds } from "@starward/miniapp-contracts";
export type { TerrainBounds } from "@starward/miniapp-contracts";
