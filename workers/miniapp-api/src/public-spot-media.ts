import type { RepresentativeMedia, SpotDetail, SpotSummary } from "@starward/miniapp-contracts";

export function spotMediaGroups(spot: SpotSummary, formalMedia: SpotDetail["formalMedia"]) {
  const media = { parking: [] as string[], toilet: [] as string[], site: [] as string[] };
  for (const item of spot.media) {
    const label = `${item.alt} ${item.caption}`;
    if (/停车/u.test(label)) media.parking.push(item.id);
    else if (/洗手间|厕所/u.test(label)) media.toilet.push(item.id);
    else if (item.isSiteSpecific) media.site.push(item.id);
  }
  for (const kind of ["parking", "toilet", "site"] as const) {
    if (formalMedia && Object.prototype.hasOwnProperty.call(formalMedia, kind))
      media[kind] = [...(formalMedia[kind] ?? [])];
  }
  return media;
}

export type PublicSpotMedia = {
  groups: SpotDetail["formalMedia"];
  uploads: { id: string; kind: "parking" | "toilet" | "site" }[];
};

// One statement snapshot with the caller's publication gate. No private payloads,
// object keys, original filenames or contributor identity enter the public DTO.
export const PUBLIC_SPOT_MEDIA_SQL = `(SELECT jsonb_build_object(
  'groups', media_document.payload->'formalMedia',
  'uploads', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.upload_id, 'kind', c.kind))
    FROM spot_formal_reference_media c WHERE c.spot_id = s.spot_id), '[]'::jsonb))
  FROM spot_overview_read_models media_document WHERE media_document.spot_id = s.spot_id) AS public_media`;

export function projectPublicSpotMedia(spot: SpotSummary, reference: PublicSpotMedia | null): SpotSummary {
  if (!reference?.groups) return spot;
  const groups = spotMediaGroups(spot, reference.groups);
  const groupedLegacy = new Set(Object.values(spotMediaGroups(spot, undefined)).flat());
  const existing = new Map(spot.media.map(item => [item.id, item]));
  const uploads = new Map(reference.uploads.map(item => [item.id, item.kind]));
  const seen = new Set<string>();
  const media: RepresentativeMedia[] = [];
  for (const kind of ["site", "parking", "toilet"] as const) {
    for (const id of groups[kind]) {
      if (seen.has(id)) continue;
      if (!id.startsWith("upload:")) {
        const original = existing.get(id);
        if (original) { media.push(original); seen.add(id); }
        continue;
      }
      if (uploads.get(id) !== kind) continue;
      seen.add(id);
      const image = `/v2/spots/${encodeURIComponent(spot.spotId)}/media/${encodeURIComponent(id)}/image`;
      const label = { site: "现场照片", parking: "停车照片", toilet: "洗手间照片" }[kind];
      media.push({ id, localPath: image, thumbnailPath: image, alt: `${spot.name}${label}`,
        caption: label, photographer: "经核验的用户投稿", license: "用户授权站内展示，其他使用需另行授权",
        licenseUrl: "", sourceUrl: image, capturedAt: null, direction: null,
        sequence: media.length, isSiteSpecific: true, state: "FRESH" });
    }
  }
  // Editorial illustration references are not replaced by a field-photo proposal.
  media.push(...spot.media.filter(item => !seen.has(item.id) && !groupedLegacy.has(item.id) && !item.id.startsWith("upload:")));
  return { ...spot, media };
}
