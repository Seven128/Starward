import assert from "node:assert/strict";
import test from "node:test";
import { clampSkyFieldOfView, deepSkyImageLevelForFov, pinchFieldOfView } from "./sky-zoom.ts";

test("pinch changes angular field of view within useful survey limits", () => {
  assert.equal(pinchFieldOfView(45, 100, 200), 22.5);
  assert.equal(pinchFieldOfView(3, 100, 300), 1.5);
  assert.equal(pinchFieldOfView(20, 100, 20), 45);
  assert.equal(clampSkyFieldOfView(Number.NaN), 45);
});

test("progressive survey levels are deterministic", () => {
  assert.equal(deepSkyImageLevelForFov(16), null);
  assert.equal(deepSkyImageLevelForFov(10), "OVERVIEW");
  assert.equal(deepSkyImageLevelForFov(5), "MEDIUM");
  assert.equal(deepSkyImageLevelForFov(2), "DETAIL");
});
