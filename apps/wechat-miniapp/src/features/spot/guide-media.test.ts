import assert from "node:assert/strict";
import test from "node:test";
import type { GuideArticle, RepresentativeMedia } from "@starward/miniapp-contracts";
import { articleMedia, guideThumbnail } from "./guide-media";

test("guide thumbnail follows article references and never borrows unrelated spot media", () => {
  const media = (id: string, patch: Partial<RepresentativeMedia> = {}): RepresentativeMedia => ({
    id, localPath: `${id}.jpg`, thumbnailPath: `${id}-thumb.jpg`, alt: id,
    caption: id, photographer: "author", license: "CC BY 4.0", licenseUrl: "",
    sourceUrl: "", capturedAt: null, direction: null, sequence: 0,
    isSiteSpecific: true, state: "FRESH", ...patch,
  });
  const guide: Pick<GuideArticle, "blocks"> = { blocks: [{ type: "media", mediaId: "referenced", caption: "关联照片" }] };
  const unrelated = media("unrelated");
  const referenced = media("referenced");
  assert.equal(guideThumbnail(guide, [unrelated, referenced]), referenced);
  assert.equal(articleMedia("unrelated", [unrelated, referenced]), unrelated);
  assert.equal(articleMedia("referenced", [unrelated, referenced]), referenced);
  assert.equal(articleMedia("missing", [unrelated, referenced]), undefined);
  assert.equal(articleMedia("referenced", [media("referenced", { localPath: "" })]), undefined);
  assert.equal(guideThumbnail(guide, [unrelated]), undefined);
  assert.equal(guideThumbnail({ ...guide, blocks: [] }, [unrelated]), undefined);
  for (const patch of [{ license: "" }, { thumbnailPath: "" }, { state: "EXPIRED" as const }, { state: "UNAVAILABLE" as const }]) {
    assert.equal(guideThumbnail(guide, [unrelated, media("referenced", patch)]), undefined);
  }
});
