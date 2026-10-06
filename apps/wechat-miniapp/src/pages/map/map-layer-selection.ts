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

/** A visible local recovery takes the scene's feedback, but cannot recover a
 * failed Context or native Map. Cloud slices with retained data lack a local
 * retry, so their scene recovery remains on the map. */
export function layerSheetOwnsSceneRecovery(input: {
  open: boolean;
  overlay: LayerSheetOverlay;
  contextFailed: boolean;
  sceneFailed: boolean;
  lightState: ReturnType<typeof lightLayerContentState>;
  cloudTimeChoiceCount: number;
}): boolean {
  if (!input.open || input.contextFailed || !input.sceneFailed) return false;
  return input.overlay === "LIGHT"
    ? input.lightState === "ERROR" || input.lightState === "STALE"
    : input.cloudTimeChoiceCount === 0;
}
