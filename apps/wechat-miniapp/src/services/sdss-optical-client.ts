import { MINIAPP_API_BASE_PATH, sdssOpticalPublication, assertSdssScienceOpticalManifest,
  assertSdssCalibratedOpticalManifest, type SdssCalibratedOpticalManifest,
  type SdssScienceOpticalManifest } from "@starward/miniapp-contracts";
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

/** One immutable HTTP boundary; callers retain distinct admission semantics. */
async function requestSdssPinnedOpticalManifest(reference: string, expectedOpticalHash: string,
  unavailable: string, signal?: AbortSignal): Promise<unknown> {
  if (!/^M:(?:[1-9]|[1-9]\d|10\d|110)$/u.test(reference) || !/^[a-f0-9]{64}$/u.test(expectedOpticalHash))
    throw new Error(unavailable);
  const response = await requestBareSkyResource(`${MINIAPP_API_BASE_PATH}/sky/sdss-optical/${expectedOpticalHash}/manifest`, "sdss-optical", signal);
  if (response.status !== 200) throw new Error(unavailable);
  return response.body;
}

/** Strict measurement publication compatibility, never a display fallback. */
export async function getSdssScienceOpticalManifest(reference: string, expectedOpticalHash: string,
  signal?: AbortSignal): Promise<SdssScienceOpticalManifest> {
  const body = await requestSdssPinnedOpticalManifest(reference, expectedOpticalHash, "sdss_science_optical_manifest_unavailable", signal);
  assertSdssScienceOpticalManifest(body, reference, expectedOpticalHash);
  return body;
}

/** Explicit calibrated family intent, including independently typed display estimates. */
export async function getSdssCalibratedOpticalManifest(reference: string, expectedOpticalHash: string,
  signal?: AbortSignal): Promise<SdssCalibratedOpticalManifest> {
  const body = await requestSdssPinnedOpticalManifest(reference, expectedOpticalHash, "sdss_calibrated_optical_manifest_unavailable", signal);
  assertSdssCalibratedOpticalManifest(body, reference, expectedOpticalHash);
  return body;
}

export function sdssOpticalImageUrl(path: string) { return skyResourceUrl(path, "sdss-optical"); }
