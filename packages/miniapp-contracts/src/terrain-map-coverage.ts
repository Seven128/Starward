import type { TerrainBounds } from "./api-shapes.ts";

/** Existing Map terrain technical coverage, not a political boundary or a
 * guarantee that every pixel has source data. Shared request planning must
 * distinguish a truly out-of-coverage request from a nearby supported one. */
export const MAP_TERRAIN_SUPPORTED_BOUNDS: Readonly<TerrainBounds> = {
  west: 72.004, south: 0.8293, east: 137.8347, north: 55.8271,
};

export function terrainMapBoundsAreSupported(bounds: TerrainBounds) {
  const supported = MAP_TERRAIN_SUPPORTED_BOUNDS;
  return bounds.west < supported.east && bounds.east > supported.west
    && bounds.south < supported.north && bounds.north > supported.south;
}
