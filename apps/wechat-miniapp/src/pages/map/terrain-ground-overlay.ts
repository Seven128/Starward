import { createMapGroundOverlayCoordinator, mapGroundOverlayKey,
  type MapGroundOverlayTarget, type MapGroundOverlayContext, type MapGroundOverlayResult } from "./map-ground-overlay";

// Compatibility names retain the existing terrain consumer and regression
// entrypoint; all native commands and file pins have one shared implementation.
export type TerrainGroundOverlayTarget = MapGroundOverlayTarget;
export type TerrainGroundOverlayContext = MapGroundOverlayContext;
export type TerrainGroundOverlayResult = MapGroundOverlayResult;
export const terrainGroundOverlayKey = mapGroundOverlayKey;
export function createTerrainGroundOverlayCoordinator(id: number, createContext: () => TerrainGroundOverlayContext,
  onResult: (result: TerrainGroundOverlayResult) => void, resources?: { retainPath(path: string): () => void }) {
  return createMapGroundOverlayCoordinator(id, createContext, onResult, resources, "地形");
}
