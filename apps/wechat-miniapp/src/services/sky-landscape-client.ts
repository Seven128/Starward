import { MINIAPP_API_BASE_PATH, assertSkyLandscapeManifest, decodeSkyLandscapeAlpha,
  type SkyLandscapeManifestData, type SkyLandscapeResource } from "@starward/miniapp-contracts";
import { requestBareSkyResource, skyResourceUrl } from "./bare-sky-resource";

export async function getSkyLandscapeManifest(signal?: AbortSignal): Promise<SkyLandscapeManifestData> {
  const response = await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/landscape/manifest`, "landscape", signal);
  if (response.status !== 200) throw new Error("sky_landscape_manifest_unavailable");
  assertSkyLandscapeManifest(response.body); return response.body;
}
export async function getSkyLandscapeAlpha(resource: SkyLandscapeResource, signal?: AbortSignal): Promise<Uint8Array> {
  const response = await requestBareSkyResource(resource.alpha.downloadUrl, "landscape", signal);
  if (response.status !== 200) throw new Error("sky_landscape_alpha_unavailable");
  return decodeSkyLandscapeAlpha(response.body, resource);
}
export function skyLandscapeAssetUrl(path: string) { return skyResourceUrl(path, "landscape"); }
