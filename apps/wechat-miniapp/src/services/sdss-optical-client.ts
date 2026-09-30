import { MINIAPP_API_BASE_PATH, sdssOpticalPublication } from "@starward/miniapp-contracts";
import { requestBareSkyResource, skyResourceUrl } from "./bare-sky-resource";
import { assertSdssOpticalManifest, type SdssOpticalManifest } from "./sdss-optical-publication";

export async function getSdssOpticalManifest(signal?: AbortSignal, reference = "M:51"): Promise<SdssOpticalManifest> {
  const publication = sdssOpticalPublication(reference);
  if (!publication) throw new Error("sdss_optical_manifest_unavailable");
  const resource = reference === "M:51" ? "manifest" : `${publication.publicationHash}/manifest`;
  const response = await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/sdss-optical/${resource}`, "sdss-optical", signal);
  if (response.status !== 200) throw new Error("sdss_optical_manifest_unavailable");
  assertSdssOpticalManifest(response.body, reference);
  return response.body;
}

export function sdssOpticalImageUrl(path: string) { return skyResourceUrl(path, "sdss-optical"); }
