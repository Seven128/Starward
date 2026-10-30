/** Client display intent only. Geographic data keeps its independent owners;
 * this union is never sent as a service MapLayerKind. Old single selections
 * retain exactly the same enabled layer when restored. */
export type AnalysisOverlay = "NONE" | "LIGHT" | "TOTAL_CLOUD" | "LIGHT_AND_CLOUD" | "OPPORTUNITY";
export type AnalysisLayer = "LIGHT" | "TOTAL_CLOUD";

export function normalizeAnalysisOverlay(value: unknown): Exclude<AnalysisOverlay, "OPPORTUNITY"> {
  if (value === "OPPORTUNITY") return "TOTAL_CLOUD";
  return value === "LIGHT" || value === "TOTAL_CLOUD" || value === "LIGHT_AND_CLOUD" ? value : "NONE";
}

export function analysisLayerEnabled(overlay: AnalysisOverlay, layer: AnalysisLayer): boolean {
  const selected = normalizeAnalysisOverlay(overlay);
  return selected === layer || selected === "LIGHT_AND_CLOUD";
}

export function toggleAnalysisLayer(overlay: AnalysisOverlay, layer: AnalysisLayer): AnalysisOverlay {
  const light = analysisLayerEnabled(overlay, "LIGHT") !== (layer === "LIGHT");
  const cloud = analysisLayerEnabled(overlay, "TOTAL_CLOUD") !== (layer === "TOTAL_CLOUD");
  return light && cloud ? "LIGHT_AND_CLOUD" : light ? "LIGHT" : cloud ? "TOTAL_CLOUD" : "NONE";
}
