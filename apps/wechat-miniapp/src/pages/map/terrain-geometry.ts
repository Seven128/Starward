export const TERRAIN_RADIUS_TICKS = [2, 5, 10, 20, 50] as const;
const LOG_RANGE = Math.log(25);

export type TerrainBounds = { west: number; east: number; south: number; north: number };

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
