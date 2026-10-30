import type { MapLayerData, MapLayerKind, MapSceneTimeFrame } from "@starward/miniapp-contracts";
import type { AnalysisOverlay } from "@/state/app-store";
import { analysisLayerEnabled } from "@/state/map-layer-state";
import { projectedLayerPolygons } from "./map-time-frame";

export { analysisLayerEnabled, toggleAnalysisLayer } from "@/state/map-layer-state";

/** Geographic overlays load independently; Scene retains marker/filter
 * evidence without composing the same coverage a second time. */
export function mapSceneLayerForOverlay(_overlay: AnalysisOverlay): MapLayerKind {
  return "NORMAL";
}

/** Terrain is the existing native raster at z=0; annual light is z=1 and
 * transparent cloud polygons z=2. No copy of a Scene layer fills an unavailable
 * independent product, and a cloud time preview cannot retime annual light. */
export function independentMapLayerPolygons(input: {
  overlay: AnalysisOverlay;
  light: MapLayerData | null | undefined;
  cloud: MapLayerData | null | undefined;
  cloudFrame: MapSceneTimeFrame | null;
}) {
  const light = analysisLayerEnabled(input.overlay, "LIGHT") && input.light?.kind === "LIGHT_POLLUTION"
    ? projectedLayerPolygons(input.light, null).map(polygon => ({ polygon, zIndex: 1 })) : [];
  const cloud = analysisLayerEnabled(input.overlay, "TOTAL_CLOUD") && input.cloud?.kind === "CLOUD"
    ? projectedLayerPolygons(input.cloud, input.cloudFrame).map(polygon => ({ polygon, zIndex: 2 })) : [];
  return [...light, ...cloud].map(({ polygon, zIndex }) => ({
    points: polygon.points.map(point => ({ ...point })),
    strokeColor: polygon.strokeColor, fillColor: polygon.fillColor,
    strokeWidth: polygon.strokeWidth, zIndex,
  }));
}

export function lightLayerContentState(input: {
  pending: boolean;
  failed: boolean;
  hasData: boolean;
  unavailable: boolean;
}): "LOADING" | "READY" | "EMPTY" | "STALE" | "ERROR" {
  if (input.failed) return input.hasData ? "STALE" : "ERROR";
  if (input.pending || !input.hasData) return "LOADING";
  return input.unavailable ? "EMPTY" : "READY";
}
