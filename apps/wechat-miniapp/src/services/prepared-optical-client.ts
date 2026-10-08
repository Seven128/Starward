import { MINIAPP_API_BASE_PATH, isPreparedOpticalReference, assertPreparedRenderedOpticalManifest, type PreparedRenderedOpticalManifest } from "@starward/miniapp-contracts";
import { requestBareSkyResource, skyResourceUrl } from "./bare-sky-resource";

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
