import type { MapLayerKind } from "@starward/miniapp-contracts";
import type { AnalysisOverlay } from "@/state/app-store";

export type LayerSheetOverlay = "LIGHT" | "TOTAL_CLOUD";

export function layerSheetOverlay(overlay: AnalysisOverlay): LayerSheetOverlay {
  return overlay === "LIGHT" ? "LIGHT" : "TOTAL_CLOUD";
}

export function mapLayerKindForOverlay(overlay: AnalysisOverlay): MapLayerKind {
  if (overlay === "LIGHT") return "LIGHT_POLLUTION";
  if (overlay === "TOTAL_CLOUD" || overlay === "OPPORTUNITY") return "CLOUD";
  return "NORMAL";
}

/** Static annual light loads independently; the Scene still owns weather-based
 * marker/filter evidence, and must not compose the same raster a second time. */
export function mapSceneLayerForOverlay(overlay: AnalysisOverlay): MapLayerKind {
  return overlay === "LIGHT" ? "NORMAL" : mapLayerKindForOverlay(overlay);
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

/** The independent light retry cannot recover weather/marker Scene data.
 * Empty cloud slices still use their Scene recovery inside the sheet. */
export function layerSheetOwnsSceneRecovery(input: {
  open: boolean;
  overlay: LayerSheetOverlay;
  contextFailed: boolean;
  sceneFailed: boolean;
  lightState: ReturnType<typeof lightLayerContentState>;
  cloudTimeChoiceCount: number;
}): boolean {
  if (!input.open || input.contextFailed || !input.sceneFailed) return false;
  return input.overlay !== "LIGHT" && input.cloudTimeChoiceCount === 0;
}
