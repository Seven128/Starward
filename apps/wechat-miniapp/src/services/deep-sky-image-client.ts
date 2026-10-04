import { assertDeepSkyImageDiscovery, DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION,
  MINIAPP_API_BASE_PATH, MINIAPP_API_OPERATIONS, type DeepSkyImageDiscoveryData,
  type DeepSkyImageDescriptor } from "@starward/miniapp-contracts";
import { requestBareSkyResource, skyResourceUrl } from "./bare-sky-resource";
import { acquirePublishedSkyImage, beginPublishedSkyImageDemand } from "./sky-public-image-runtime";

export const beginDeepSkyImageDemand = beginPublishedSkyImageDemand;

export async function getDeepSkyImageDiscovery(reference: string, signal?: AbortSignal): Promise<DeepSkyImageDiscoveryData> {
  if (!/^M:(?:[1-9]|[1-9]\d|10\d|110)$/u.test(reference)) throw new Error("deep_sky_image_reference_invalid");
  const path = MINIAPP_API_BASE_PATH + MINIAPP_API_OPERATIONS.deepSkyImageDiscoveryGet.path
    .replace("{reference}", encodeURIComponent(reference)) + `?imageVersion=${DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION}`;
  const response = await requestBareSkyResource(path, "deep-sky", signal);
  if (response.status !== 200) throw new Error("deep_sky_image_discovery_unavailable");
  assertDeepSkyImageDiscovery(response.body, reference);
  return response.body;
}

/** Only the validated discovery supplies this exact immutable descriptor. */
export function acquireDeepSkyImage(asset: DeepSkyImageDescriptor, publicationHash: string) {
  return acquirePublishedSkyImage(asset, skyResourceUrl(asset.downloadUrl, "deep-sky"), publicationHash);
}
