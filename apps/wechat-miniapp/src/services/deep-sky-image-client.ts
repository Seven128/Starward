import { assertDeepSkyImageDiscovery, DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION,
  MINIAPP_API_BASE_PATH, MINIAPP_API_OPERATIONS, type DeepSkyImageDiscoveryData } from "@starward/miniapp-contracts";
import { requestBareSkyResource } from "./bare-sky-resource";
import { getSkyPublicationResource } from "./sky-publication-resource";

export async function getDeepSkyImageDiscovery(reference: string, signal?: AbortSignal): Promise<DeepSkyImageDiscoveryData> {
  if (!/^M:(?:[1-9]|[1-9]\d|10\d|110)$/u.test(reference)) throw new Error("deep_sky_image_reference_invalid");
  const path = MINIAPP_API_BASE_PATH + MINIAPP_API_OPERATIONS.deepSkyImageDiscoveryGet.path
    .replace("{reference}", encodeURIComponent(reference)) + `?imageVersion=${DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION}`;
  const response = await requestBareSkyResource(path, "deep-sky", signal);
  if (response.status !== 200) throw new Error("deep_sky_image_discovery_unavailable");
  assertDeepSkyImageDiscovery(response.body, reference);
  return response.body;
}

export function getDeepSkyImageResource(reference: string, signal?: AbortSignal) {
  return getSkyPublicationResource(pending => getDeepSkyImageDiscovery(reference, pending),
    "deep_sky_image_resource_cancelled", signal);
}

