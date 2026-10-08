import { sdssOpticalPublication, opticalPublicationReference } from "@starward/miniapp-contracts";
import { celestialInformationSourceRoute } from "../../services/celestial-information-presentation";
import { liveSkyOpticalCompletion, type SkyTargetOpticalCompletion } from "./sky-sdss-optical-completion";

export interface SkyOpticalSourceCredit {
  readonly kind: SkyTargetOpticalCompletion["kind"];
  readonly reference: string;
  readonly publicationHash: string;
  readonly credit: string;
  readonly license: string;
  readonly description: string;
  readonly sourceRoute: string;
}

/** Page owns accepted frame/time, visibility and Canvas generation. This owner
 * reads only its live completion, never current requests or replacement metadata.
 * Source registration/submission/coverage alone cannot produce an exact credit. */
export function skyOpticalSourceCredit(completion: SkyTargetOpticalCompletion | null | undefined):
  SkyOpticalSourceCredit | null {
  const live = liveSkyOpticalCompletion(completion);
  if (!live) return null;
  const common = { kind: live.kind, reference: live.reference, publicationHash: live.publicationHash,
    sourceRoute: celestialInformationSourceRoute(live.reference, undefined, live.publicationHash) };
  if (live.kind === "legacy") {
    // These published JPEGs have a single admitted provider. A foreign hash
    // cannot acquire its caption by entering the legacy shape.
    if (sdssOpticalPublication(live.reference)?.publicationHash !== live.publicationHash) return null;
    return Object.freeze({ ...common, credit: "Sloan Digital Sky Survey", license: "CC BY 4.0",
      description: "历史 g/r/i 合成光学影像" });
  }
  const publication = live.kind === "prepared" ? live.preparedPublication :
    live.kind === "display" ? live.displayPublication : live.sciencePublication;
  if (opticalPublicationReference(publication) !== live.reference || publication.publicationHash !== live.publicationHash ||
    !live.receipt.completed || live.receipt.qualification.any === "empty" ||
    live.participatingFields.some(field => field.asset !== publication.levels[field.level] ||
      field.fieldDegrees !== field.asset.fieldDegrees ||
      (field.slot === "fine" ? live.receipt.finePhoto : live.receipt.coarsePhoto) !== "positive" ||
      live.receipt.qualification[field.slot] === "empty")) return null;
  return Object.freeze({ ...common,
    ...(publication.imageVersion === "prepared-native-optical-v1" ? {
      sourceRoute: `/sky/sources/index?reference=${encodeURIComponent(live.reference)}&preparedPublicationHash=${live.publicationHash}` } : {}),
    credit: publication.source.credit, license: publication.source.license,
    description: live.kind === "prepared" ? publication.imageVersion === "prepared-display-optical-v1"
      ? "历史观测显示估计 · 非新科学测量" : "历史观测处理色 · 非自然真彩" :
      live.kind === "display" ? "历史 g/r/i 光学显示估计 · 非新科学测量" : "历史 g/r/i 合成光学影像" });
}
