import { assertPreparedOpticalPublication, assertPreparedOpticalManifest,
  preparedOpticalPublicationHash, type PreparedOpticalPublication, type PreparedOpticalManifest } from "./prepared-optical-publication.ts";
import { assertPreparedDisplayOpticalPublication, assertPreparedDisplayOpticalManifest,
  preparedDisplayOpticalPublicationHash, type PreparedDisplayOpticalPublication,
  type PreparedDisplayOpticalManifest } from "./prepared-display-optical-publication.ts";
import { assertPreparedProgressiveOpticalPublication, assertPreparedProgressiveOpticalManifest,
  preparedProgressiveOpticalPublicationHash, type PreparedProgressiveOpticalPublication,
  type PreparedProgressiveOpticalManifest } from "./prepared-progressive-optical-publication.ts";
import { assertPreparedNativeOpticalPublication, assertPreparedNativeOpticalManifest,
  preparedNativeOpticalPublicationHash, type PreparedNativeOpticalPublication,
  type PreparedNativeOpticalManifest } from "./prepared-native-optical-publication.ts";

/** Shared wire/storage family with explicit immutable colour meaning. */
export type PreparedRenderedOpticalPublication = PreparedOpticalPublication | PreparedDisplayOpticalPublication | PreparedProgressiveOpticalPublication | PreparedNativeOpticalPublication;
export type PreparedRenderedOpticalManifest = PreparedOpticalManifest | PreparedDisplayOpticalManifest | PreparedProgressiveOpticalManifest | PreparedNativeOpticalManifest;

export function opticalPublicationReference(publication: { objectRef: string } | { reference: string }): string {
  return "reference" in publication ? publication.reference : publication.objectRef;
}
export function opticalAssetDimensions(asset: { pixels: number } | { width: number; height: number }) {
  return "pixels" in asset ? { width: asset.pixels, height: asset.pixels } : { width: asset.width, height: asset.height };
}

export function assertPreparedRenderedOpticalPublication(value: unknown, reference: string,
  expectedHash?: string): asserts value is PreparedRenderedOpticalPublication {
  if ((value as PreparedRenderedOpticalPublication | null)?.imageVersion === "prepared-native-optical-v1")
    assertPreparedNativeOpticalPublication(value, reference, expectedHash);
  else if ((value as PreparedRenderedOpticalPublication | null)?.imageVersion === "prepared-optical-v2")
    assertPreparedProgressiveOpticalPublication(value, reference, expectedHash);
  else if ((value as PreparedRenderedOpticalPublication | null)?.imageVersion === "prepared-display-optical-v1")
    assertPreparedDisplayOpticalPublication(value, reference, expectedHash);
  else assertPreparedOpticalPublication(value, reference, expectedHash);
}

export function assertPreparedRenderedOpticalManifest(value: unknown, reference: string,
  expectedHash: string): asserts value is PreparedRenderedOpticalManifest {
  if ((value as PreparedRenderedOpticalManifest | null)?.imageVersion === "prepared-native-optical-v1")
    assertPreparedNativeOpticalManifest(value, reference, expectedHash);
  else if ((value as PreparedRenderedOpticalManifest | null)?.imageVersion === "prepared-optical-v2")
    assertPreparedProgressiveOpticalManifest(value, reference, expectedHash);
  else if ((value as PreparedRenderedOpticalManifest | null)?.imageVersion === "prepared-display-optical-v1")
    assertPreparedDisplayOpticalManifest(value, reference, expectedHash);
  else assertPreparedOpticalManifest(value, reference, expectedHash);
}

export function preparedRenderedOpticalPublicationHash(value: PreparedRenderedOpticalPublication): string {
  return value.imageVersion === "prepared-native-optical-v1" ? preparedNativeOpticalPublicationHash(value) : value.imageVersion === "prepared-optical-v2" ? preparedProgressiveOpticalPublicationHash(value) : value.imageVersion === "prepared-display-optical-v1"
    ? preparedDisplayOpticalPublicationHash(value) : preparedOpticalPublicationHash(value);
}
