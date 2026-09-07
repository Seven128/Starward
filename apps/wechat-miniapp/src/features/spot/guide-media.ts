import type { GuideArticle, RepresentativeMedia } from "@starward/miniapp-contracts";

export function articleMedia(mediaId: string, media: readonly RepresentativeMedia[]) {
  return media.find((item) => item.id === mediaId && item.localPath && item.license && !["UNAVAILABLE", "EXPIRED"].includes(item.state));
}

/** A guide thumbnail must belong to that article, not merely the same spot. */
export function guideThumbnail(guide: Pick<GuideArticle, "blocks">, media: readonly RepresentativeMedia[]) {
  for (const block of guide.blocks) {
    if (block.type !== "media") continue;
    const item = articleMedia(block.mediaId, media);
    if (item?.thumbnailPath) return item;
  }
  return undefined;
}
