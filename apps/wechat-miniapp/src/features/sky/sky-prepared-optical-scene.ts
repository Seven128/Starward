import type { DeepSkySceneCatalogEntry, SkyObservationFrame } from "@starward/miniapp-contracts";
import type { SkyArtworkView } from "./sky-artwork-registration";
import type { SkyRenderSurface } from "./sky-render-surface";
import type { SkyTargetOpticalImage } from "./sky-sdss-optical-frame";
import { submitSkySceneTargetOptical, type SkySceneTargetOpticalPort } from "./sky-target-optical-scene";

/** Explicit Prepared publication intent, independent of science/default data. */
export type SkyScenePreparedOpticalPort = SkySceneTargetOpticalPort;
export function submitSkyScenePreparedOptical(context: SkyRenderSurface,
  port: SkyScenePreparedOpticalPort | undefined, frame: SkyTargetOpticalImage | null | undefined,
  observation: SkyObservationFrame | null, view: SkyArtworkView,
  failed?: (image: object) => void, catalogEntry?: DeepSkySceneCatalogEntry | null) {
  return submitSkySceneTargetOptical(context, "prepared", port, frame, observation, view, failed, catalogEntry);
}
