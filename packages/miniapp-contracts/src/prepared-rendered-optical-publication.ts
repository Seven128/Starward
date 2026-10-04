import { assertPreparedOpticalPublication, assertPreparedOpticalManifest,
  preparedOpticalPublicationHash, type PreparedOpticalPublication, type PreparedOpticalManifest } from "./prepared-optical-publication.ts";
import { assertPreparedDisplayOpticalPublication, assertPreparedDisplayOpticalManifest,
  preparedDisplayOpticalPublicationHash, type PreparedDisplayOpticalPublication,
  type PreparedDisplayOpticalManifest } from "./prepared-display-optical-publication.ts";
import { assertPreparedProgressiveOpticalPublication, assertPreparedProgressiveOpticalManifest,
  preparedProgressiveOpticalPublicationHash, type PreparedProgressiveOpticalPublication,
  type PreparedProgressiveOpticalManifest } from "./prepared-progressive-optical-publication.ts";

/** Shared wire/storage family with explicit immutable colour meaning. */
export type PreparedRenderedOpticalPublication = PreparedOpticalPublication | PreparedDisplayOpticalPublication | PreparedProgressiveOpticalPublication;
export type PreparedRenderedOpticalManifest = PreparedOpticalManifest | PreparedDisplayOpticalManifest | PreparedProgressiveOpticalManifest;

export function assertPreparedRenderedOpticalPublication(value: unknown, reference: string,
  expectedHash?: string): asserts value is PreparedRenderedOpticalPublication {
  if ((value as PreparedRenderedOpticalPublication | null)?.imageVersion === "prepared-optical-v2")
    assertPreparedProgressiveOpticalPublication(value, reference, expectedHash);
  else if ((value as PreparedRenderedOpticalPublication | null)?.imageVersion === "prepared-display-optical-v1")
    assertPreparedDisplayOpticalPublication(value, reference, expectedHash);
  else assertPreparedOpticalPublication(value, reference, expectedHash);
}

export function assertPreparedRenderedOpticalManifest(value: unknown, reference: string,
  expectedHash: string): asserts value is PreparedRenderedOpticalManifest {
  if ((value as PreparedRenderedOpticalManifest | null)?.imageVersion === "prepared-optical-v2")
    assertPreparedProgressiveOpticalManifest(value, reference, expectedHash);
  else if ((value as PreparedRenderedOpticalManifest | null)?.imageVersion === "prepared-display-optical-v1")
    assertPreparedDisplayOpticalManifest(value, reference, expectedHash);
  else assertPreparedOpticalManifest(value, reference, expectedHash);
}

export function preparedRenderedOpticalPublicationHash(value: PreparedRenderedOpticalPublication): string {
  return value.imageVersion === "prepared-optical-v2" ? preparedProgressiveOpticalPublicationHash(value) : value.imageVersion === "prepared-display-optical-v1"
    ? preparedDisplayOpticalPublicationHash(value) : preparedOpticalPublicationHash(value);
}
