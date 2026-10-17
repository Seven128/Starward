import { OPTICAL_IMAGE_LEVELS, type OpticalImageLevel } from "./optical-publication-content.ts";
import { assertPreparedOpticalPublication, assertPreparedOpticalManifest,
  preparedOpticalPublicationHash, type PreparedOpticalPublication, type PreparedOpticalManifest } from "./prepared-optical-publication.ts";
import { assertPreparedDisplayOpticalPublication, assertPreparedDisplayOpticalManifest,
  preparedDisplayOpticalPublicationHash, type PreparedDisplayOpticalPublication,
  type PreparedDisplayOpticalManifest } from "./prepared-display-optical-publication.ts";
import { assertPreparedProgressiveOpticalPublication, assertPreparedProgressiveOpticalManifest,
  preparedProgressiveOpticalPublicationHash, type PreparedProgressiveOpticalPublication,
  type PreparedProgressiveOpticalManifest } from "./prepared-progressive-optical-publication.ts";
import { assertPreparedNativeOpticalPublication, assertPreparedNativeOpticalManifest,
  preparedNativeOpticalPublicationHash, preparedNativeDisplayGeometry, type PreparedNativeOpticalPublication,
  type PreparedNativeOpticalManifest } from "./prepared-native-optical-publication.ts";
import { assertPreparedDerivedRegionOpticalPublication, assertPreparedDerivedRegionOpticalManifest,
  preparedDerivedRegionOpticalPublicationHash, type PreparedDerivedRegionOpticalPublication,
  type PreparedDerivedRegionOpticalManifest, type PreparedDerivedRegionSupport } from "./prepared-derived-region-optical-publication.ts";

/** Shared wire/storage family with explicit immutable colour meaning. */
export type PreparedRenderedOpticalPublication = PreparedOpticalPublication | PreparedDisplayOpticalPublication | PreparedProgressiveOpticalPublication | PreparedNativeOpticalPublication | PreparedDerivedRegionOpticalPublication;
export type PreparedRenderedOpticalManifest = PreparedOpticalManifest | PreparedDisplayOpticalManifest | PreparedProgressiveOpticalManifest | PreparedNativeOpticalManifest | PreparedDerivedRegionOpticalManifest;
export function isPreparedRenderedOpticalVersion(value: unknown): value is PreparedRenderedOpticalPublication["imageVersion"] {
  return typeof value === "string" && ["prepared-optical-v1", "prepared-display-optical-v1", "prepared-optical-v2",
    "prepared-native-optical-v1", "prepared-derived-region-optical-v1"].includes(value);
}
/** Classification of already admitted metadata; this is not validation. */
export function isPreparedRenderedOpticalFamily(value: unknown): value is PreparedRenderedOpticalPublication | PreparedRenderedOpticalManifest {
  return isPreparedRenderedOpticalVersion((value as { imageVersion?: unknown } | null)?.imageVersion);
}
export function isPreparedPlaneOpticalPublication(value: PreparedRenderedOpticalPublication | PreparedRenderedOpticalManifest):
  value is PreparedNativeOpticalPublication | PreparedNativeOpticalManifest | PreparedDerivedRegionOpticalPublication | PreparedDerivedRegionOpticalManifest {
  return value.imageVersion === "prepared-native-optical-v1" || value.imageVersion === "prepared-derived-region-optical-v1";
}
export function preparedOpticalDisplayGeometry(value: PreparedNativeOpticalPublication | PreparedNativeOpticalManifest |
  PreparedDerivedRegionOpticalPublication | PreparedDerivedRegionOpticalManifest) {
  return value.imageVersion === "prepared-native-optical-v1" ? preparedNativeDisplayGeometry(value) : value.nominalTan;
}
/** Every immutable file exported by this family, including derivative support.
 * Runtime image acquisition still reads levels only. */
type PreparedRenderedAsset = PreparedRenderedOpticalPublication["levels"][OpticalImageLevel] | (PreparedDerivedRegionSupport & { fieldDegrees: number });
export function preparedRenderedOpticalAssets(publication: PreparedRenderedOpticalManifest): Array<PreparedRenderedAsset & { downloadUrl: string }>;
export function preparedRenderedOpticalAssets(publication: PreparedRenderedOpticalPublication): PreparedRenderedAsset[];
export function preparedRenderedOpticalAssets(publication: PreparedRenderedOpticalPublication): PreparedRenderedAsset[] {
  return [...OPTICAL_IMAGE_LEVELS.map(level => publication.levels[level]),
    ...(publication.imageVersion === "prepared-derived-region-optical-v1" ? Object.values(publication.support).map(asset =>
      ({ ...asset, fieldDegrees: publication.levels.DETAIL.fieldDegrees })) : [])];
}

export function opticalPublicationReference(publication: { objectRef: string } | { reference: string }): string {
  return "reference" in publication ? publication.reference : publication.objectRef;
}
export function opticalAssetDimensions(asset: { pixels: number } | { width: number; height: number }) {
  return "pixels" in asset ? { width: asset.pixels, height: asset.pixels } : { width: asset.width, height: asset.height };
}

export function assertPreparedRenderedOpticalPublication(value: unknown, reference: string,
  expectedHash?: string): asserts value is PreparedRenderedOpticalPublication {
  if ((value as PreparedRenderedOpticalPublication | null)?.imageVersion === "prepared-derived-region-optical-v1")
    assertPreparedDerivedRegionOpticalPublication(value, reference, expectedHash);
  else if ((value as PreparedRenderedOpticalPublication | null)?.imageVersion === "prepared-native-optical-v1")
    assertPreparedNativeOpticalPublication(value, reference, expectedHash);
  else if ((value as PreparedRenderedOpticalPublication | null)?.imageVersion === "prepared-optical-v2")
    assertPreparedProgressiveOpticalPublication(value, reference, expectedHash);
  else if ((value as PreparedRenderedOpticalPublication | null)?.imageVersion === "prepared-display-optical-v1")
    assertPreparedDisplayOpticalPublication(value, reference, expectedHash);
  else assertPreparedOpticalPublication(value, reference, expectedHash);
}

export function assertPreparedRenderedOpticalManifest(value: unknown, reference: string,
  expectedHash: string): asserts value is PreparedRenderedOpticalManifest {
  if ((value as PreparedRenderedOpticalManifest | null)?.imageVersion === "prepared-derived-region-optical-v1")
    assertPreparedDerivedRegionOpticalManifest(value, reference, expectedHash);
  else if ((value as PreparedRenderedOpticalManifest | null)?.imageVersion === "prepared-native-optical-v1")
    assertPreparedNativeOpticalManifest(value, reference, expectedHash);
  else if ((value as PreparedRenderedOpticalManifest | null)?.imageVersion === "prepared-optical-v2")
    assertPreparedProgressiveOpticalManifest(value, reference, expectedHash);
  else if ((value as PreparedRenderedOpticalManifest | null)?.imageVersion === "prepared-display-optical-v1")
    assertPreparedDisplayOpticalManifest(value, reference, expectedHash);
  else assertPreparedOpticalManifest(value, reference, expectedHash);
}

export function preparedRenderedOpticalPublicationHash(value: PreparedRenderedOpticalPublication): string {
  return value.imageVersion === "prepared-derived-region-optical-v1" ? preparedDerivedRegionOpticalPublicationHash(value) : value.imageVersion === "prepared-native-optical-v1" ? preparedNativeOpticalPublicationHash(value) : value.imageVersion === "prepared-optical-v2" ? preparedProgressiveOpticalPublicationHash(value) : value.imageVersion === "prepared-display-optical-v1"
    ? preparedDisplayOpticalPublicationHash(value) : preparedOpticalPublicationHash(value);
}
