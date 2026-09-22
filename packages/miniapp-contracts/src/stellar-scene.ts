import type { DeepSkyScene, SourceSummary } from "./types.ts";
import type { StellarCatalogReference } from "./stellar-catalog-publication.ts";
import type { StellarGeometryFrame, StellarGeometryObserver } from "./stellar-geometry.ts";

export const STELLAR_SCENE_FORMAT = "stellar-scene-v2";
export interface SkySceneCatalogReference extends StellarCatalogReference {
  magnitudeLimit: number;
  rowCount: number;
  sources: readonly SourceSummary[];
}
export interface SkySceneFrame {
  at: string;
  state: "AVAILABLE" | "UNAVAILABLE";
  geometry: StellarGeometryFrame | null;
}
/** Per-observation facts only; static star rows use the separately cached publication. */
export interface SkyScene {
  format: typeof STELLAR_SCENE_FORMAT;
  state: "AVAILABLE" | "UNAVAILABLE";
  observer: StellarGeometryObserver | null;
  catalog: SkySceneCatalogReference | null;
  frames: readonly SkySceneFrame[];
  unavailableReason: string | null;
  deepSky?: DeepSkyScene | null;
}
