import type { SdssOpticalLevel } from "@/services/sdss-optical-publication";
import { sdssOpticalPublication } from "@starward/miniapp-contracts";

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
  paintedImage: object | null;
  canvasVisible: boolean;
  failed: boolean;
  loading: boolean;
}): "CREDIT" | "RETRY" | "LOADING" | "NONE" {
  // Attribution follows the last completed native frame. The requested level
  // can change while its previous pixels remain on the canvas.
  if (input.canvasVisible && input.paintedImage) return "CREDIT";
  if (!input.requested) return "NONE";
  if (input.failed) return "RETRY";
  return input.loading ? "LOADING" : "NONE";
}
