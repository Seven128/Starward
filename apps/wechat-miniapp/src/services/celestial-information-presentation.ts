import type { ApiEnvelope } from "@starward/miniapp-contracts";

/** Object information and painted-image captions open the same exact-version
 * source route. Admission belongs to the API/client, not this URL formatter. */
export function celestialInformationSourceRoute(reference: string, imagePublicationHash?: string,
  opticalPublicationHash?: string) {
  return `/sky/sources/index?reference=${encodeURIComponent(reference)}` +
    (imagePublicationHash ? `&imagePublicationHash=${encodeURIComponent(imagePublicationHash)}` : "") +
    (opticalPublicationHash ? `&opticalPublicationHash=${encodeURIComponent(opticalPublicationHash)}` : "");
}

/** Both the object modal and source route preserve the same missing-source meaning. */
export function celestialInformationPartialDetail(response: Pick<ApiEnvelope<unknown>, "warnings" | "dataState"> | undefined) {
  const warnings = response?.warnings ?? [];
  const infrared = warnings.includes("deep_sky_image_publication_unavailable");
  const optical = warnings.includes("sdss_optical_publication_unavailable") || warnings.includes("prepared_optical_publication_unavailable");
  const missing = infrared && optical ? "所选红外影像与光学影像的来源"
    : infrared ? "所选红外影像版本的来源" : optical ? "光学影像来源" : null;
  // A transport fallback can be stale and still retain a known missing source.
  if (!missing && response?.dataState !== "PARTIAL") return null;
  return missing ? `${missing}暂不可用。已取得的目录资料与来源仍可查看，请重试。`
    : "部分天体资料暂缺，已取得的资料与来源仍可查看。";
}
