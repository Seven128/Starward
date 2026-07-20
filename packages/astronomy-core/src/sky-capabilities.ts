export function resolveSkyCapability(input: { arSupported: boolean; cameraGranted: boolean; sensors: string }) {
  const arReady = input.arSupported && input.cameraGranted && input.sensors !== "low-accuracy";
  return {
    primaryMode: arReady ? "ar" : "universal-sky",
    availableFallbacks: ["universal-sky", "static-sky"],
    blocked: false,
    accuracy: input.sensors,
    explanation: arReady ? "AR 定向可用" : "AR 条件不足，已保留通用天空与静态星图",
  };
}

export { calculateFieldOfView, catalogChunks, positionCatalog, visibleIntervals, BRIGHT_SKY_CATALOG } from "./sky-model";
export type { CatalogObject, HorizonProfile, PositionedObject, SkyObjectKind } from "./sky-model";
