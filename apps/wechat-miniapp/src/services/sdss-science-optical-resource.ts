import type { SdssScienceOpticalManifest, SdssCalibratedOpticalManifest } from "@starward/miniapp-contracts";
import { getSdssScienceOpticalManifest, getSdssCalibratedOpticalManifest } from "./sdss-optical-client";
import { getSkyPublicationResource, type SkyPublicationResource } from "./sky-publication-resource";
export type SdssScienceOpticalResource = SkyPublicationResource<SdssScienceOpticalManifest>;
export type SdssCalibratedOpticalResource = SkyPublicationResource<SdssCalibratedOpticalManifest>;

/** Pending metadata and the post-resolution acquisition gap share the existing
 * public-cache epoch. Settled query results keep only a read-only epoch stamp;
 * cancellation subscriptions/controller belong to this one pending request. */
export function getSdssScienceOpticalResource(reference: string, opticalHash: string,
  signal?: AbortSignal): Promise<SdssScienceOpticalResource> {
  return getSkyPublicationResource(pending => getSdssScienceOpticalManifest(reference, opticalHash, pending),
    "sdss_science_optical_resource_cancelled", signal);
}

export function getSdssCalibratedOpticalResource(reference: string, opticalHash: string,
  signal?: AbortSignal): Promise<SdssCalibratedOpticalResource> {
  return getSkyPublicationResource(pending => getSdssCalibratedOpticalManifest(reference, opticalHash, pending),
    "sdss_calibrated_optical_resource_cancelled", signal);
}
