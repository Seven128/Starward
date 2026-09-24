import assert from "node:assert/strict";
import test from "node:test";
import { photoRevealLeft } from "./spot-media-gallery-geometry.ts";

test("paged photo reveals its own thumbnail while one-photo galleries stay fixed", () => {
  assert.equal(photoRevealLeft(0, 3, 320), 0);
  assert.ok((photoRevealLeft(2, 3, 320) ?? 0) > 320);
  assert.equal(photoRevealLeft(0, 1, 320), null);
  assert.equal(photoRevealLeft(3, 3, 320), null);
});
