import assert from "node:assert/strict";
import test from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { projectPublicSpotMedia } from "./public-spot-media.ts";

test("current groups, order and canonical ownership govern public photos, including removals", () => {
  const spot = TEST_PUBLISHED_SPOT;
  const uploads = [{ id: "upload:one", kind: "parking" as const },
    { id: "upload:two", kind: "parking" as const }, { id: "upload:old", kind: "site" as const }];
  const projected = projectPublicSpotMedia(spot, { groups: { parking: ["upload:two", "upload:one", "upload:foreign"], toilet: [], site: [] }, uploads });
  assert.deepEqual(projected.media.map(item => item.id), ["upload:two", "upload:one"]);
  assert.ok(projected.media.every(item => item.state === "FRESH" && item.localPath.endsWith("/image")));
  assert.deepEqual(projectPublicSpotMedia(spot, { groups: { parking: [], toilet: [], site: [] }, uploads }).media, []);
  assert.deepEqual(projectPublicSpotMedia(spot, null), spot);
  assert.deepEqual(projectPublicSpotMedia(spot, { groups: { site: ["upload:one"], parking: [], toilet: [] }, uploads }).media, [], "cannot reclassify a different canonical kind");
  const illustration = { ...spot.media[0]!, id: "editorial", isSiteSpecific: false, alt: "星图", caption: "示意资料" };
  const withArticle = { ...spot, media: [...spot.media, illustration] };
  assert.deepEqual(projectPublicSpotMedia(withArticle, { groups: { site: [], parking: [], toilet: [] }, uploads }).media, [illustration]);
  assert.deepEqual(projectPublicSpotMedia(withArticle, { groups: { site: [illustration.id], parking: [], toilet: [] }, uploads }).media, [illustration], "an explicitly grouped editorial image is not appended again");
});
