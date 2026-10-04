import { MINIAPP_API_BASE_PATH, assertSkyLandscapeManifest, decodeSkyLandscapeAlpha,
  type SkyLandscapeManifestData, type SkyLandscapeResource } from "@starward/miniapp-contracts";
import { requestBareSkyResource, skyResourceUrl } from "./bare-sky-resource";
import { readPublishedSkyJson } from "./sky-public-image-runtime";

export async function getSkyLandscapeManifest(signal?: AbortSignal): Promise<SkyLandscapeManifestData> {
  const response = await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/landscape/manifest`, "landscape", signal);
  if (response.status !== 200) throw new Error("sky_landscape_manifest_unavailable");
  assertSkyLandscapeManifest(response.body); return response.body;
}
export async function getSkyLandscapeAlpha(resource: SkyLandscapeResource, signal?: AbortSignal): Promise<Uint8Array> {
  const route = /^\/v2\/sky\/landscape\/([a-f0-9]{64})\/(panorama-(?:1024|2048)\.alpha-rle\.json)$/.exec(resource.alpha.downloadUrl);
  if (!route || route[2] !== resource.alpha.file) throw new Error("sky_landscape_alpha_route_invalid");
  const body = await readPublishedSkyJson({ format: "json", sha256: resource.alpha.sha256, bytes: resource.alpha.bytes },
    skyResourceUrl(resource.alpha.downloadUrl, "landscape"), route[1]!, signal);
  return decodeSkyLandscapeAlpha(body, resource);
}
export function skyLandscapeAssetUrl(path: string) { return skyResourceUrl(path, "landscape"); }
