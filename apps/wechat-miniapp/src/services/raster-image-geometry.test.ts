import assert from "node:assert/strict";
import test from "node:test";
import { latitudeRasterCropPercent, mercatorRasterCropPercent } from "./raster-image-geometry.ts";

test("fixed Mercator images crop in their actual projection while radius DEM retains linear latitude", () => {
  const published = { west: 110, east: 120, south: 20, north: 50 }, requested = { west: 112, east: 118, south: 20, north: 30 };
  const linear = latitudeRasterCropPercent(published, requested), fixed = mercatorRasterCropPercent(published, requested);
  assert.equal(linear.height, 300);
  assert.ok(fixed.height > linear.height, "higher-latitude source rows occupy more Mercator pixels");
  assert.equal(fixed.width, linear.width); assert.equal(fixed.left, linear.left);
  assert.ok(Math.abs(fixed.top + fixed.height - 100) < 1e-10, "the shared southern edge stays exactly aligned");
  assert.deepEqual(mercatorRasterCropPercent(requested, requested), { width: 100, height: 100, left: 0, top: 0 });
});
