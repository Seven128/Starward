import assert from "node:assert/strict";
import test from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { mediaIsRenderable } from "./spot-panel-media";

test("sample media is visible only in the explicit fixture lane", () => {
  const sample = TEST_PUBLISHED_SPOT.media[0]!;
  assert.equal(mediaIsRenderable(sample), false);
  assert.equal(mediaIsRenderable(sample, true), true);
  assert.equal(mediaIsRenderable({ ...sample, state: "EXPIRED" }, true), false);
  assert.equal(mediaIsRenderable({ ...sample, license: "" }, true), false);
});
