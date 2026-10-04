import { assertSdssScienceOpticalPublication, assertSdssScienceOpticalManifest,
  type SdssScienceOpticalPublication, type SdssScienceOpticalManifest } from "./sdss-science-optical-publication.ts";
import { assertSdssDisplayOpticalPublication, assertSdssDisplayOpticalManifest,
  type SdssDisplayOpticalPublication, type SdssDisplayOpticalManifest } from "./sdss-display-optical-publication.ts";

/** One transport family, with distinct measurement/display contracts.
 * An explicit hash supplies intent; this union does not register any offer. */
export type SdssCalibratedOpticalPublication = SdssScienceOpticalPublication | SdssDisplayOpticalPublication;
export type SdssCalibratedOpticalManifest = SdssScienceOpticalManifest | SdssDisplayOpticalManifest;

export function assertSdssCalibratedOpticalPublication(value: unknown, reference: string,
  expectedHash?: string): asserts value is SdssCalibratedOpticalPublication {
  if (value && typeof value === "object" && "imageVersion" in value && value.imageVersion === "sdss-display-optical-v1")
    assertSdssDisplayOpticalPublication(value, reference, expectedHash);
  else assertSdssScienceOpticalPublication(value, reference, expectedHash);
}

export function assertSdssCalibratedOpticalManifest(value: unknown, reference: string,
  expectedHash: string): asserts value is SdssCalibratedOpticalManifest {
  if (value && typeof value === "object" && "imageVersion" in value && value.imageVersion === "sdss-display-optical-v1")
    assertSdssDisplayOpticalManifest(value, reference, expectedHash);
  else assertSdssScienceOpticalManifest(value, reference, expectedHash);
}
