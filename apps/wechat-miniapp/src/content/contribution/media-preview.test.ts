import assert from "node:assert/strict";
import test from "node:test";
import { loadAvailableMediaPreviews } from "./media-preview";

test("one failed contribution photo does not hide independently loaded photos", async () => {
  const result = await loadAvailableMediaPreviews(["parking", "toilet", "site"], async id => {
    if (id === "toilet") throw new Error("media unavailable");
    return `data:image/png;base64,${id}`;
  });
  assert.deepEqual(result.paths, {
    parking: "data:image/png;base64,parking",
    site: "data:image/png;base64,site",
  });
  assert.deepEqual(result.failedIds, ["toilet"]);
});
