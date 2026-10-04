import type { SkyPreparedOpticalField, SkyPreparedOpticalImage, SkySdssDisplayOpticalField,
  SkySdssDisplayOpticalImage, SkySdssScienceOpticalField,
  SkySdssScienceOpticalImage, SkyTargetOpticalImage } from "./sky-sdss-optical-frame";

export type SkyExactTargetOpticalField = SkySdssScienceOpticalField | SkySdssDisplayOpticalField | SkyPreparedOpticalField;
export type SkyExactTargetOpticalImage = SkySdssScienceOpticalImage | SkySdssDisplayOpticalImage | SkyPreparedOpticalImage;
export type SkyExactTargetOpticalIdentity =
  | { readonly kind: "science"; readonly frame: SkySdssScienceOpticalImage;
      readonly publication: SkySdssScienceOpticalImage["sciencePublication"] }
  | { readonly kind: "display"; readonly frame: SkySdssDisplayOpticalImage;
      readonly publication: SkySdssDisplayOpticalImage["displayPublication"] }
  | { readonly kind: "prepared"; readonly frame: SkyPreparedOpticalImage;
      readonly publication: SkyPreparedOpticalImage["preparedPublication"] };

/** An exact-source envelope cannot fall through to the legacy JPEG path, even
 * when its publication or descriptors are invalid. */
export function isSkyLegacyOpticalFrame(frame: SkyTargetOpticalImage): boolean {
  return !("sciencePublication" in frame) && !("displayPublication" in frame) && !("preparedPublication" in frame);
}

/** Shared Scene/completion identity fence for already admitted publications.
 * Native readiness, paint participation and physical accuracy remain separate.
 * Source geometric support is deliberately not scientific sample validity. */
export function skyExactTargetOpticalIdentity(frame: SkyTargetOpticalImage | null | undefined):
  SkyExactTargetOpticalIdentity | null {
  if (!frame || isSkyLegacyOpticalFrame(frame) ||
    ["sciencePublication", "displayPublication", "preparedPublication"].filter(key => key in frame).length !== 1) return null;
  const identity: SkyExactTargetOpticalIdentity = "sciencePublication" in frame
    ? { kind: "science", frame, publication: frame.sciencePublication }
    : "displayPublication" in frame ? { kind: "display", frame, publication: frame.displayPublication }
    : { kind: "prepared", frame: frame as SkyPreparedOpticalImage,
      publication: (frame as SkyPreparedOpticalImage).preparedPublication };
  const { publication } = identity, parent = identity.frame.coarser;
  if (!publication || (identity.kind === "science"
    ? publication.imageVersion !== "science-optical-v2" && publication.imageVersion !== "science-optical-v3"
    : identity.kind === "display" ? publication.imageVersion !== "sdss-display-optical-v1"
    : publication.imageVersion !== "prepared-optical-v1") ||
    publication.objectRef !== frame.reference || publication.publicationHash !== frame.publicationHash) return null;
  const fieldIdentity = (field: SkyExactTargetOpticalField) => !!field.asset &&
    field.asset === publication.levels[field.level] && field.fieldDegrees === field.asset.fieldDegrees &&
    (identity.kind !== "prepared"
      ? "sampleAvailability" in field.asset && field.asset.sampleAvailability === "joint-area-alpha"
      : "displayAlpha" in field.asset && field.asset.displayAlpha === "geometric-source-area" &&
        field.asset.scientificAvailability === "UNKNOWN");
  const order = { OVERVIEW: 0, MEDIUM: 1, DETAIL: 2 } as const;
  if (!fieldIdentity(identity.frame) || (parent && (!fieldIdentity(parent) || parent.image === frame.image ||
    order[parent.level] >= order[frame.level]))) return null;
  return Object.freeze(identity);
}
