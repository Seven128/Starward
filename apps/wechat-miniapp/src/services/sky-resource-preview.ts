const apiOrigin = () => __MINIAPP_API_BASE__.replace(/\/+$/u, "");

/** Operator-preview credentials belong only to the API. A public CDN request
 * cannot inherit preview, session or user authorization from that environment. */
export function skyResourcePreviewHeaders(url: string): { header?: Record<string, string> } {
  if (typeof url !== 'string') throw new TypeError('sky_public_resource_preview_url_invalid');
  return url.startsWith(apiOrigin() + "/v2/sky/") &&
    typeof __MINIAPP_OPERATOR_PREVIEW_TOKEN__ !== "undefined" && __MINIAPP_OPERATOR_PREVIEW_TOKEN__
    ? { header: { "X-Starward-Operator-Preview": __MINIAPP_OPERATOR_PREVIEW_TOKEN__ } } : {};
}
