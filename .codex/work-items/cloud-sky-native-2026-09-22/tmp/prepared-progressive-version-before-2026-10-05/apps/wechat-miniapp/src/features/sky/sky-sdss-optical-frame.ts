import type { PreparedRenderedOpticalManifest, SdssOpticalLevel, SdssOpticalManifest, SdssScienceOpticalManifest,
  SdssDisplayOpticalManifest, SdssCalibratedOpticalManifest } from "@starward/miniapp-contracts";

export interface SkySdssOpticalField {
  readonly image: object;
  readonly fieldDegrees: number;
  readonly level: SdssOpticalLevel;
}
export type SkySdssLegacyOpticalImage = SkySdssOpticalField & {
  readonly reference: string;
  readonly publicationHash: string;
  readonly coarser?: SkySdssOpticalField | null;
};
export type SkySdssScienceOpticalField = SkySdssOpticalField & {
  /** The actual immutable PNG descriptor, including CRPIX, crop and availability.
   * A ready parent owns its own descriptor, never the requested finer level's. */
  readonly asset: SdssScienceOpticalManifest["levels"][SdssOpticalLevel];
};
export type SkySdssScienceOpticalImage = SkySdssScienceOpticalField & {
  readonly reference: string;
  readonly publicationHash: string;
  /** This discriminator also retains the common mother, transfer and center.
   * Legacy drawing must not reinterpret these PNG alpha values as opacity. */
  readonly sciencePublication: SdssScienceOpticalManifest;
  readonly coarser: SkySdssScienceOpticalField | null;
};
export type SkySdssDisplayOpticalField = SkySdssOpticalField & {
  readonly asset: SdssDisplayOpticalManifest["levels"][SdssOpticalLevel];
};
export type SkySdssDisplayOpticalImage = SkySdssDisplayOpticalField & {
  readonly reference: string;
  readonly publicationHash: string;
  /** Actual display estimates retain the original science mother, not a new measurement. */
  readonly displayPublication: SdssDisplayOpticalManifest;
  readonly coarser: SkySdssDisplayOpticalField | null;
};
export type SkySdssOpticalImage = SkySdssLegacyOpticalImage | SkySdssScienceOpticalImage | SkySdssDisplayOpticalImage;
export type SkyPreparedOpticalField = SkySdssOpticalField & {
  readonly asset: PreparedRenderedOpticalManifest["levels"][SdssOpticalLevel];
};
export type SkyPreparedOpticalImage = SkyPreparedOpticalField & {
  readonly reference: string;
  readonly publicationHash: string;
  readonly preparedPublication: PreparedRenderedOpticalManifest;
  readonly coarser: SkyPreparedOpticalField | null;
};
export type SkyTargetOpticalImage = SkySdssOpticalImage | SkyPreparedOpticalImage;

type TargetOpticalManifest = SdssOpticalManifest | SdssCalibratedOpticalManifest | PreparedRenderedOpticalManifest;
type LoadedOptical = {
  image: object | null;
  renderedLevel: SdssOpticalLevel | null;
  renderedAsset: TargetOpticalManifest["levels"][SdssOpticalLevel] | null;
  publication: TargetOpticalManifest | undefined;
  coarser: { image: object; level: SdssOpticalLevel; asset: TargetOpticalManifest["levels"][SdssOpticalLevel] | null } | null;
};

/** Atomic native-loader → queued-scene handoff. Transport owns admission; this
 * owner prevents a stale/foreign descriptor or requested level from relabeling
 * the actual ready image. Full science geometry stays available downstream. */
export function skyTargetOpticalFrame(loaded: LoadedOptical): SkyTargetOpticalImage | null {
  const { image, renderedLevel: level, publication } = loaded;
  if (!image || !level || !publication || loaded.renderedAsset !== publication.levels[level]) return null;
  const asset = publication.levels[level];
  const coarser = loaded.coarser;
  const order: readonly SdssOpticalLevel[] = ["OVERVIEW", "MEDIUM", "DETAIL"];
  const validCoarser = coarser && coarser.image !== image &&
    order.indexOf(coarser.level) < order.indexOf(level) &&
    coarser.asset === publication.levels[coarser.level] ? coarser : null;
  const common = { image, level, fieldDegrees: asset.fieldDegrees,
    reference: publication.objectRef, publicationHash: publication.publicationHash };
  if ("imageVersion" in publication && (publication.imageVersion === "prepared-optical-v1" || publication.imageVersion === "prepared-display-optical-v1")) {
    return Object.freeze({ ...common, preparedPublication: publication,
      asset: publication.levels[level], coarser: validCoarser ? Object.freeze({
        image: validCoarser.image, level: validCoarser.level,
        fieldDegrees: publication.levels[validCoarser.level].fieldDegrees,
        asset: publication.levels[validCoarser.level],
      }) : null });
  }
  if ("imageVersion" in publication &&
    (publication.imageVersion === "science-optical-v2" || publication.imageVersion === "science-optical-v3")) {
    return Object.freeze({ ...common, sciencePublication: publication,
      asset: publication.levels[level], coarser: validCoarser ? Object.freeze({
        image: validCoarser.image, level: validCoarser.level,
        fieldDegrees: publication.levels[validCoarser.level].fieldDegrees,
        asset: publication.levels[validCoarser.level],
      }) : null });
  }
  if ("imageVersion" in publication && publication.imageVersion === "sdss-display-optical-v1") {
    return Object.freeze({ ...common, displayPublication: publication,
      asset: publication.levels[level], coarser: validCoarser ? Object.freeze({
        image: validCoarser.image, level: validCoarser.level,
        fieldDegrees: publication.levels[validCoarser.level].fieldDegrees,
        asset: publication.levels[validCoarser.level],
      }) : null });
  }
  if ("imageVersion" in publication) return null;
  return Object.freeze({ ...common, coarser: validCoarser ? Object.freeze({
    image: validCoarser.image, level: validCoarser.level,
    fieldDegrees: publication.levels[validCoarser.level].fieldDegrees,
  }) : null });
}

/** Source-specific consumers cannot accidentally reinterpret a foreign kind. */
export function skySdssOpticalFrame(loaded: LoadedOptical & { publication: SdssOpticalManifest | SdssCalibratedOpticalManifest | undefined }): SkySdssOpticalImage | null {
  const frame = skyTargetOpticalFrame(loaded);
  return frame && !("preparedPublication" in frame) ? frame : null;
}

export function skyPreparedOpticalFrame(loaded: LoadedOptical & { publication: PreparedRenderedOpticalManifest | undefined }): SkyPreparedOpticalImage | null {
  const frame = skyTargetOpticalFrame(loaded);
  return frame && "preparedPublication" in frame ? frame : null;
}
