import type { SdssOpticalLevel } from "@/services/sdss-optical-publication";
import { opticalAssetDimensions } from "@starward/miniapp-contracts";
import { artworkIntersectsView } from "./sky-artwork-visibility";
import { skyOpticalPixelMagnification } from "./sky-optical-pixel-sampling";
import { skyTargetOpticalFieldRegistrations, type SkyTargetOpticalGeometry,
  type SkyTargetOpticalView } from "./sky-target-optical-visibility";

const levels = ["OVERVIEW", "MEDIUM", "DETAIL"] as const;

/** Choose the coarsest visible published grid that does not magnify its texels
 * beyond a framebuffer pixel. Finite finer fields cannot refine an exterior
 * they do not cover. If every grid is magnified, use the finest available;
 * this does not claim new source detail or precise instrument resolution.
 *
 * Downshift requires 20% pixel headroom. A round trip across the 1px sampling
 * boundary therefore survives small view/backing-store jitter without repeated
 * decode/upload. History belongs to the same publication/Canvas Hook owner.
 */
export function skyTargetOpticalLevelForView(publication: SkyTargetOpticalGeometry,
  footprint?: SkyTargetOpticalView, previous: SdssOpticalLevel | null = null): SdssOpticalLevel | null {
  if (!footprint) return previous ?? "OVERVIEW";
  const fields = skyTargetOpticalFieldRegistrations(publication, footprint);
  const visible = levels.filter(level => !fields[level] ||
    artworkIntersectsView(fields[level]!, footprint.view, footprint.width, footprint.height));
  if (!visible.length) return null;
  const demands = visible.map(level => ({ level, magnification: fields[level]
    ? skyOpticalPixelMagnification(fields[level]!, opticalAssetDimensions(publication.levels[level]), footprint) : null }));
  if (demands.some(demand => demand.magnification === null))
    return previous && visible.includes(previous) ? previous : visible[0]!;
  const chosen = demands.find(demand => demand.magnification! <= 1) ?? demands.at(-1)!;
  const previousIndex = previous ? levels.indexOf(previous) : -1;
  if (previous && visible.includes(previous) && previousIndex > levels.indexOf(chosen.level) &&
    chosen.magnification! > .8) {
    // A large reverse move can skip a level. Prefer an intermediate grid with
    // sufficient headroom instead of holding an unnecessarily fine image.
    return demands.find(demand => levels.indexOf(demand.level) <= previousIndex &&
      demand.magnification! <= .8)?.level ?? previous;
  }
  return chosen.level;
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
