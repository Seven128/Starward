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
