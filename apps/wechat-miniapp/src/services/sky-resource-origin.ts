/** Immutable public resources may use an environment-bound CDN origin.
 * Discovery and ordinary API operations keep the business API origin. Source
 * clients validate their own path/manifest before using this address owner. */
const publishedPath = /^\/v2\/sky\/(?:(?:constellations|deep-sky|optical|sdss-optical|prepared-optical|wide-field|moon(?:\/coverage)?|mercury|mars|jupiter|saturn|uranus|neptune|galactic|landscape)\/[a-f0-9]{64}\/|supplements\/sao\/v2\/[a-f0-9]{64}\/)[A-Za-z0-9/_.-]+$/u;

const apiOrigin = () => __MINIAPP_API_BASE__.replace(/\/+$/u, "");

export function skyPublishedResourceOrigin(): string {
  const configured = typeof __MINIAPP_SKY_RESOURCE_BASE__ === "undefined" ? "" : __MINIAPP_SKY_RESOURCE_BASE__;
  const origin = (configured || apiOrigin()).replace(/\/+$/u, "");
  if (!/^https?:\/\/[A-Za-z0-9.-]+(?::[0-9]{1,5})?$/u.test(origin)) throw new Error("sky_public_resource_origin_invalid");
  return origin;
}

function isPublishedPath(path: string): boolean {
  return publishedPath.test(path) && !path.includes("//") &&
    path.split("/").every(segment => segment !== "." && segment !== "..");
}

export function skyResourceOriginForPath(path: string): string {
  // Historical W3 manifests contain /v2/celestial-objects/... query downloads.
  // Their relative links retain the API meaning; current displayed bitmaps use
  // hash-bound /v2/sky/deep-sky/... paths on the separate resource origin.
  if (/^\/v2\/sky\/deep-sky\/[a-f0-9]{64}\/manifest$/u.test(path)) return apiOrigin();
  return isPublishedPath(path) ? skyPublishedResourceOrigin() : apiOrigin();
}

/** Used for already validated SAO/source-file references without discovery. */
export function skyPublishedResourceUrl(path: string): string {
  if (!isPublishedPath(path)) throw new Error("sky_public_resource_path_invalid");
  return skyResourceOriginForPath(path) + path;
}

/** Preserve the existing same-origin cache key. A separate resource origin
 * remains bound to both the API environment and the public delivery origin. */
export function skyResourceEnvironmentIdentity(): string {
  const api = apiOrigin(), resource = skyPublishedResourceOrigin();
  return api === resource ? api : `${api}\n${resource}`;
}

export { skyResourcePreviewHeaders } from './sky-resource-preview';
