import type { DeepSkySceneCatalogEntry, SkyObservationFrame } from "@starward/miniapp-contracts";
import type { SkyArtworkView } from "./sky-artwork-registration";
import type { SkyRenderSurface } from "./sky-render-surface";
import type { SkyTargetOpticalImage } from "./sky-sdss-optical-frame";
import { submitSkySceneTargetOptical, type SkySceneTargetOpticalPort } from "./sky-target-optical-scene";
import { skyExactTargetOpticalIdentity } from "./sky-target-optical-identity";

/** Explicit science intent; ordinary callers omit this capability. */
export type SkySceneScienceOpticalPort = SkySceneTargetOpticalPort;
export type SkySceneCalibratedOpticalPort = SkySceneTargetOpticalPort;
export function submitSkySceneScienceOptical(context: SkyRenderSurface,
  port: SkySceneScienceOpticalPort | undefined, frame: SkyTargetOpticalImage | null | undefined,
  observation: SkyObservationFrame | null, view: SkyArtworkView,
  failed?: (image: object) => void, catalogEntry?: DeepSkySceneCatalogEntry | null) {
  return submitSkySceneTargetOptical(context, "science", port, frame, observation, view, failed, catalogEntry);
}
/** Explicit calibrated family port, distinct from the strict science-only port. */
export function submitSkySceneCalibratedOptical(context: SkyRenderSurface,
  port: SkySceneCalibratedOpticalPort | undefined, frame: SkyTargetOpticalImage | null | undefined,
  observation: SkyObservationFrame | null, view: SkyArtworkView,
  failed?: (image: object) => void, catalogEntry?: DeepSkySceneCatalogEntry | null) {
  const identity = skyExactTargetOpticalIdentity(frame);
  return identity && identity.kind !== "prepared"
    ? submitSkySceneTargetOptical(context, identity.kind, port, frame, observation, view, failed, catalogEntry) : null;
}
export { observeSkySceneTargetOptical as observeSkySceneScienceOptical,
  skyTargetOpticalDisplayFacts as skyScienceOpticalDisplayFacts } from "./sky-target-optical-scene";
