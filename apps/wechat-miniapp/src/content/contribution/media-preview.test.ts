import assert from "node:assert/strict";
import test from "node:test";
import { loadAvailableMediaPreviews, recoverCompletedPhotoPreviews } from "./media-preview";

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

test("completed upload decode retry restores the confirmed page source without hiding remote failures", () => {
  const source = "data:image/png;base64,confirmed-upload-bytes";
  const paths = { existing: "available-original" };
  const recovered = recoverCompletedPhotoPreviews(paths, ["new-upload", "remote-old"], { "new-upload": source });
  assert.deepEqual(recovered, { paths: { existing: "available-original", "new-upload": source }, failedIds: ["remote-old"] });
  assert.deepEqual(paths, { existing: "available-original" });
  assert.deepEqual(recoverCompletedPhotoPreviews(paths, ["removed-upload"], {}), { paths, failedIds: ["removed-upload"] });
});
