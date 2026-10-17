import type { FacilityType, RepresentativeMedia, SpotDetail } from "@starward/miniapp-contracts";

/** Keep the published capture precision and direction text. Upload/verification
 * time and the selected observing date cannot supply missing photo evidence. */
export function sitePhotoContext(media: Pick<RepresentativeMedia, "capturedAt" | "direction">) {
  const capturedAt = media.capturedAt?.trim(), direction = media.direction?.trim();
  return `${capturedAt ? `拍摄时间 ${capturedAt}` : "拍摄时间未提供"} · ${direction ? `方位 ${direction}` : "方位未提供"}`;
}

export function mediaIsRenderable(media: RepresentativeMedia, allowSampleData = false) {
  return Boolean(!["EXPIRED", "UNAVAILABLE"].includes(media.state) &&
    (allowSampleData || media.state !== "SAMPLE_DATA") && media.license.trim() &&
    (media.thumbnailPath.trim() || media.localPath.trim()));
}

/** Only a reviewed facility association can supply that facility's photographs. */
export function facilityPhotos(type: FacilityType, media: readonly RepresentativeMedia[], formalMedia: SpotDetail["formalMedia"], allowSampleData = false) {
  const kind = type === "PARKING" ? "parking" : type === "TOILET" ? "toilet" : null;
  if (!kind) return [];
  const byId = new Map(media.filter(item => item.isSiteSpecific && mediaIsRenderable(item, allowSampleData)).map(item => [item.id, item]));
  return [...new Set(formalMedia?.[kind] ?? [])].flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
}
