import type { SkyArtworkCanvas } from "./sky-artwork-request";
import { useSkyTargetOptical } from "./use-sky-target-optical";
import type { SkyTargetOpticalView } from "./sky-target-optical-visibility";

/** Preserve legacy discovery and the explicitly pinned calibrated family. */
export function useSkySdssOptical(reference: string | null, fov: number,
  canvas: SkyArtworkCanvas | null, canvasRevision: number, active: boolean, opticalPublicationHash?: string,
  footprint?: SkyTargetOpticalView) {
  return useSkyTargetOptical(opticalPublicationHash === undefined ? "sdss-legacy" : "sdss-calibrated",
    reference, fov, canvas, canvasRevision, active, opticalPublicationHash, footprint);
}
