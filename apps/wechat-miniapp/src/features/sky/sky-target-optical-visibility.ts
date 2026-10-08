import { opticalPublicationReference, type SdssOpticalManifest, type SdssCalibratedOpticalManifest, type PreparedRenderedOpticalManifest } from "@starward/miniapp-contracts";
import { exactSkyObservationFrame } from "./sky-observation-frame";
import { registerSkySurvey } from "./sky-survey-registration";
import { registerSkyTanOpticalField } from "./sky-tan-optical-registration";
import { skyTargetImageFamilyIntersectsView, skyTargetImageScenePoint,
  type SkyTargetImageView } from "./sky-target-image-visibility";
import type { SkyArtworkRegistration } from "./sky-artwork-registration";

export type SkyTargetOpticalView = SkyTargetImageView & {
  /** Actual rounded Canvas backing store, not logical size times assumed DPR. */
  readonly drawingWidth?: number | undefined;
  readonly drawingHeight?: number | undefined;
};
export type SkyTargetOpticalGeometry = SdssOpticalManifest | SdssCalibratedOpticalManifest | PreparedRenderedOpticalManifest;
const levels = ["OVERVIEW", "MEDIUM", "DETAIL"] as const;

/** Selection and whole-family retirement share the renderer's registration. */
export function skyTargetOpticalFieldRegistrations(publication: SkyTargetOpticalGeometry,
  footprint: SkyTargetOpticalView): Readonly<Record<typeof levels[number], SkyArtworkRegistration | null>> {
  const { report, at } = footprint;
  const exact = "imageVersion" in publication;
  const observation = exact ? exactSkyObservationFrame(report, at) : null;
  const point = exact ? undefined : skyTargetImageScenePoint(footprint, opticalPublicationReference(publication));
  const field = (level: typeof levels[number]): SkyArtworkRegistration | null => !publication.levels[level] ? null : exact
    ? registerSkyTanOpticalField(publication, publication.levels[level], observation)
    : point ? registerSkySurvey(point, publication.levels[level].fieldDegrees, publication.levels[level].pixels, 256.5) : null;
  return { OVERVIEW: field("OVERVIEW"), MEDIUM: field("MEDIUM"), DETAIL: field("DETAIL") };
}

/** A complete family must be outside the same conservative rendering bounds
 * before acquisition/decoded ownership can retire. Partial edges and unknown
 * geometry retain demand; this says nothing about scientific availability.
 * Include every level, so an already-ready coarse fallback remains eligible. */
export function skyTargetOpticalIntersectsView(
  publication: SkyTargetOpticalGeometry,
  footprint: SkyTargetOpticalView): boolean {
  const exact = "imageVersion" in publication;
  if (exact && publication.imageVersion !== "science-optical-v2" && publication.imageVersion !== "science-optical-v3" &&
    publication.imageVersion !== "sdss-display-optical-v1" && publication.imageVersion !== "prepared-optical-v1" && publication.imageVersion !== "prepared-display-optical-v1" && publication.imageVersion !== "prepared-optical-v2" && publication.imageVersion !== "prepared-native-optical-v1") return true;
  const fields = skyTargetOpticalFieldRegistrations(publication, footprint);
  return skyTargetImageFamilyIntersectsView(footprint, level => fields[level]);
}
