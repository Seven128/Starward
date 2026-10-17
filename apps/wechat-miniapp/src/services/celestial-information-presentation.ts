import {parseSkySourceSelection,skySourceSelectionPath,type ApiEnvelope} from "@starward/miniapp-contracts";

/** Object information and painted-image captions open the same exact-version
 * source route. Admission belongs to the API/client, not this URL formatter. */
export function celestialInformationSourceRoute(reference: string, imagePublicationHash?: string,
  opticalPublicationHash?: string,bodyImagePublicationHash?:string) {
  const selection=parseSkySourceSelection({reference:encodeURIComponent(reference),imagePublicationHash,
    opticalPublicationHash,bodyImagePublicationHash});
  if(!selection)throw new Error('sky_source_selection_invalid');
  return skySourceSelectionPath(selection);
}

/** Both the object modal and source route preserve the same missing-source meaning. */
export function celestialInformationPartialDetail(response: Pick<ApiEnvelope<unknown>, "warnings" | "dataState"> | undefined) {
  const warnings = response?.warnings ?? [];
  const infrared = warnings.includes("deep_sky_image_publication_unavailable");
  const optical = warnings.includes("sdss_optical_publication_unavailable") || warnings.includes("prepared_optical_publication_unavailable");
  const missing = infrared && optical ? "红外与光学影像来源"
    : infrared ? "所选红外影像来源" : optical ? "光学影像来源" : null;
  // A transport fallback can be stale and still retain a known missing source.
  if (!missing && response?.dataState !== "PARTIAL") return null;
  return missing ? `${missing}暂不可用，可重试`
    : "部分资料未加载，已保留其余资料";
}
