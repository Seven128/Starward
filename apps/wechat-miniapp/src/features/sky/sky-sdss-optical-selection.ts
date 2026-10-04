import type { SdssOpticalLevel } from "@/services/sdss-optical-publication";
import { sdssOpticalPublication, type SdssScienceOpticalManifest } from "@starward/miniapp-contracts";

/** Keep the adopted angular refinement policy for this opt-in format, using
 * each actual TAN footprint. A cutout may occupy only part of the viewport;
 * the view is not required to fit inside the photograph. These ratios express
 * the existing M51 0.3/.16/.065 degree policy against its reference footprints,
 * and never replace the new publication's geometry with JPEG scales. */
export function skyTargetOpticalLevelForFov(fov: number,
  publication: { readonly levels: Readonly<Record<SdssOpticalLevel, { readonly fieldDegrees: number }>> }): SdssOpticalLevel | null {
  if (!Number.isFinite(fov) || fov <= 0 ||
    fov > .3 * publication.levels.OVERVIEW.fieldDegrees / (512 * 1.6 / 3600)) return null;
  if (fov > .16 * publication.levels.MEDIUM.fieldDegrees / (512 * .8 / 3600)) return "OVERVIEW";
  if (fov > .065 * publication.levels.DETAIL.fieldDegrees / (512 * .4 / 3600)) return "MEDIUM";
  return "DETAIL";
}

/** Shared angular refinement does not confer colour or scientific coverage meaning. */
export function sdssScienceOpticalLevelForFov(fov: number,
  publication: SdssScienceOpticalManifest): SdssOpticalLevel | null {
  return skyTargetOpticalLevelForFov(fov, publication);
}

export function sdssOpticalLevelForFov(fov: number, reference: string | null = "M:51"): SdssOpticalLevel | null {
  const publication = sdssOpticalPublication(reference);
  if (!publication || !Number.isFinite(fov) || fov > 0.3 * publication.scales.OVERVIEW / 1.6 || fov <= 0) return null;
  // Preserve the adopted M51 selection; larger admitted fields follow their actual scales.
  if (fov > 0.16 * publication.scales.MEDIUM / .8) return "OVERVIEW";
  if (fov > 0.065) return "MEDIUM";
  return "DETAIL";
}

export function sdssOpticalPresentation(input: {
  requested: boolean;
  photoPresented: boolean;
  canvasVisible: boolean;
  failed: boolean;
  loading: boolean;
}): "CREDIT" | "RETRY" | "LOADING" | "NONE" {
  // Attribution follows the last completed native frame. The requested level
  // can change while its previous pixels remain on the canvas.
  if (input.canvasVisible && input.photoPresented) return "CREDIT";
  if (!input.requested) return "NONE";
  if (input.failed) return "RETRY";
  return input.loading ? "LOADING" : "NONE";
}
