import type { PreparedOpticalSelection } from "@starward/miniapp-contracts";
import { nativeTanDirection } from "@starward/astronomy-core/tan-optical-geometry";
import { registerSkyArtworkPlane } from "./sky-artwork-registration";
import { artworkIntersectsView } from "./sky-artwork-visibility";
import { exactSkyObservationFrame, skyEquatorialDirectionToEnu } from "./sky-observation-frame";
import type { SkyTargetOpticalView } from "./sky-target-optical-visibility";

/** Regions remain photographs of finite fields, independent of catalogue
 * picks. Unknown bounds keep demand; only the shared conservative Scene
 * intersection can remove it. The full edition is admitted before drawing. */
export function skyPreparedRegionSelections(publications: readonly PreparedOpticalSelection[] | undefined,
  footprint: SkyTargetOpticalView | undefined): readonly PreparedOpticalSelection[] {
  if (!footprint) return [];
  const observation = exactSkyObservationFrame(footprint.report, footprint.at);
  if (!observation) return [];
  return (publications ?? []).filter(selection => {
    if (!selection.reference.startsWith("REGION:")) return false;
    if (!selection.tan) return true;
    const registration = registerSkyArtworkPlane(([[0, 0], [1, 0], [0, 1]] as const).map(uv => ({ uv,
      point: skyEquatorialDirectionToEnu(observation.equatorialToEnu, nativeTanDirection(selection.tan!, uv)) })));
    return !registration || artworkIntersectsView(registration, footprint.view, footprint.width, footprint.height);
  });
}
