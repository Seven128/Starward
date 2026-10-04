import type { SkyArtworkCanvas } from "./sky-artwork-request";
import { useSkyTargetOptical } from "./use-sky-target-optical";
import type { SkyTargetOpticalView } from "./sky-target-optical-visibility";

/** Explicit prepared observation; no default source discovery or adoption. */
export function useSkyPreparedOptical(reference: string | null, publicationHash: string,
  fov: number, canvas: SkyArtworkCanvas | null, canvasRevision: number, active: boolean, footprint?: SkyTargetOpticalView) {
  return useSkyTargetOptical("prepared-optical-v1", reference, fov, canvas, canvasRevision, active, publicationHash, footprint);
}
