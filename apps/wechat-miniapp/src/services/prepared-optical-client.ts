import { MINIAPP_API_BASE_PATH, PREPARED_OPTICAL_DISCOVERY_PATH, assertPreparedOpticalDiscovery,
  isPreparedOpticalReference, assertPreparedRenderedOpticalManifest, type PreparedRenderedOpticalManifest,
  type PreparedOpticalDiscovery } from "@starward/miniapp-contracts";
import { requestBareSkyResource, skyResourceUrl } from "./bare-sky-resource";

export async function getPreparedOpticalDiscovery(signal?: AbortSignal): Promise<PreparedOpticalDiscovery> {
  const response = await requestBareSkyResource(PREPARED_OPTICAL_DISCOVERY_PATH, "prepared-optical", signal);
  if (response.status !== 200) throw new Error("prepared_optical_discovery_unavailable");
  assertPreparedOpticalDiscovery(response.body);
  return response.body;
}

export async function getPreparedOpticalManifest(reference: string, expectedHash: string,
  signal?: AbortSignal): Promise<PreparedRenderedOpticalManifest> {
  if (!isPreparedOpticalReference(reference) || !/^[a-f0-9]{64}$/u.test(expectedHash))
    throw new Error("prepared_optical_manifest_unavailable");
  const response = await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/prepared-optical/${expectedHash}/manifest`,
    "prepared-optical", signal);
  if (response.status !== 200) throw new Error("prepared_optical_manifest_unavailable");
  assertPreparedRenderedOpticalManifest(response.body, reference, expectedHash);
  return response.body;
}

export function preparedOpticalImageUrl(path: string) { return skyResourceUrl(path, "prepared-optical"); }
