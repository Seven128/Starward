import type { SdssOpticalManifest, SdssCalibratedOpticalManifest, PreparedRenderedOpticalManifest } from "@starward/miniapp-contracts";
import { exactSkyObservationFrame } from "./sky-observation-frame";
import { registerSkySurvey } from "./sky-survey-registration";
import { registerSkyTanOpticalField } from "./sky-tan-optical-registration";
import { skyTargetImageFamilyIntersectsView, skyTargetImageScenePoint,
  type SkyTargetImageView } from "./sky-target-image-visibility";

export type SkyTargetOpticalView = SkyTargetImageView;

/** A complete family must be outside the same conservative rendering bounds
 * before acquisition/decoded ownership can retire. Partial edges and unknown
 * geometry retain demand; this says nothing about scientific availability.
 * Include every level, so an already-ready coarse fallback remains eligible. */
export function skyTargetOpticalIntersectsView(
  publication: SdssOpticalManifest | SdssCalibratedOpticalManifest | PreparedRenderedOpticalManifest,
  footprint: SkyTargetOpticalView): boolean {
  const { report, at } = footprint;
  const exact = "imageVersion" in publication;
  if (exact && publication.imageVersion !== "science-optical-v2" && publication.imageVersion !== "science-optical-v3" &&
    publication.imageVersion !== "sdss-display-optical-v1" && publication.imageVersion !== "prepared-optical-v1" && publication.imageVersion !== "prepared-display-optical-v1") return true;
  const observation = exact ? exactSkyObservationFrame(report, at) : null;
  const point = exact ? undefined : skyTargetImageScenePoint(footprint, publication.objectRef);
  return skyTargetImageFamilyIntersectsView(footprint, level => {
    if (!publication.levels[level]) return null;
    return "imageVersion" in publication
      ? registerSkyTanOpticalField(publication, publication.levels[level], observation)
      : point ? registerSkySurvey(point, publication.levels[level].fieldDegrees, 512, 256.5) : null;
  });
}
