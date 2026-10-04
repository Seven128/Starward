import type { PreparedRenderedOpticalManifest } from "@starward/miniapp-contracts";
import { getPreparedOpticalManifest } from "./prepared-optical-client";
import { getSkyPublicationResource, type SkyPublicationResource } from "./sky-publication-resource";

export type PreparedOpticalResource = SkyPublicationResource<PreparedRenderedOpticalManifest>;
export function getPreparedOpticalResource(reference: string, expectedHash: string,
  signal?: AbortSignal): Promise<PreparedOpticalResource> {
  return getSkyPublicationResource(pending => getPreparedOpticalManifest(reference, expectedHash, pending),
    "prepared_optical_resource_cancelled", signal);
}
