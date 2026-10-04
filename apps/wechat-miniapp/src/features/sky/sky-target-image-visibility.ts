import type { DeepSkyImageDiscoveryData, SkyGeometryReport, SkyScene } from "@starward/miniapp-contracts";
import type { SkyArtworkRegistration, SkyArtworkView } from "./sky-artwork-registration";
import { skyArtworkViewParameters } from "./sky-artwork-registration";
import { artworkIntersectsView } from "./sky-artwork-visibility";
import { resolveSkyDeepSkyScene } from "./sky-stellar-scene";
import { registerSkySurvey } from "./sky-survey-registration";

export interface SkyTargetImageView {
  readonly report: (Pick<SkyGeometryReport, "hourly" | "observationFrames"> &
    { readonly skyScene?: Pick<SkyScene, "deepSky"> }) | undefined;
  readonly at: string | undefined;
  readonly view: SkyArtworkView;
  readonly width: number;
  readonly height: number;
}

/** Retire a whole family only when every original field is known outside.
 * Partial coarse edges, unknown geometry and below-horizon browsing retain
 * demand. Rendering bounds do not establish scientific availability. */
export function skyTargetImageFamilyIntersectsView(footprint: SkyTargetImageView,
  registration: (level: "OVERVIEW" | "MEDIUM" | "DETAIL") => SkyArtworkRegistration | null): boolean {
  const { view, width, height } = footprint;
  if (!Number.isFinite(height) || height <= 0 || !skyArtworkViewParameters(view, width, height)) return true;
  for (const level of ["OVERVIEW", "MEDIUM", "DETAIL"] as const) {
    const field = registration(level);
    if (!field || artworkIntersectsView(field, view, width, height)) return true;
  }
  return false;
}

export function skyTargetImageScenePoint(footprint: SkyTargetImageView, reference: string) {
  const deep = resolveSkyDeepSkyScene(footprint.report?.skyScene, footprint.at);
  const index = deep?.catalog.frame === "ICRS J2000" && deep.catalog.imageRegistration === "ICRS_TAN_NORTH_0_1_V1"
    ? deep.catalog.entries.findIndex(entry => entry.objectRef === reference) : -1;
  return index >= 0 ? deep?.frame?.points?.find(candidate => candidate[0] === index) : undefined;
}

/** Selected W3 uses the renderer's original N/2 FITS center, including the
 * 256px overview. Display alpha/support never narrows this family demand. */
export function skyDeepSkyImageIntersectsView(publication: DeepSkyImageDiscoveryData,
  footprint: SkyTargetImageView): boolean {
  const point = skyTargetImageScenePoint(footprint, publication.objectRef);
  return skyTargetImageFamilyIntersectsView(footprint, level => {
    const asset = publication.levels[level];
    return asset && point ? registerSkySurvey(point, asset.fieldDegrees, asset.pixels, asset.pixels / 2) : null;
  });
}
