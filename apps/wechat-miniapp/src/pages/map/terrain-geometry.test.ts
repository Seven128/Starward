import assert from "node:assert/strict";
import test from "node:test";

import { TERRAIN_RADIUS_TICKS, terrainCropPercent, terrainMapRadiusKm, terrainRadiusForSlider, terrainSliderForRadius, terrainViewportBounds } from "./terrain-geometry";

test("Map terrain follows the logical native window and latitude instead of a 750-rpx query span", () => {
  // At Shenzhen/zoom 12, the logical ground resolution is about 35.3 m/pixel.
  const radius = terrainMapRadiusKm(12, 22.65, { width: 390, height: 700 });
  assert.ok(radius > 14.7 && radius < 14.9, "350 logical pixels plus the existing 20% buffer is about 14.8 km");
  assert.ok(Math.abs(terrainMapRadiusKm(13, 22.65, { width: 390, height: 700 }) * 2 - radius) <= 0.002);
  assert.equal(terrainMapRadiusKm(12, 22.65, { width: 700, height: 390 }), radius);
  assert.ok(terrainMapRadiusKm(12, 55, { width: 390, height: 700 }) < radius);
});

test("terrain radius uses the adopted 2-50 km logarithmic scale", () => {
  assert.equal(terrainRadiusForSlider(-10), 2);
  assert.equal(terrainRadiusForSlider(110), 50);
  for (const radius of TERRAIN_RADIUS_TICKS) {
    assert.ok(Math.abs(terrainRadiusForSlider(terrainSliderForRadius(radius)) - radius) <= 0.1, `${radius} km must round-trip`);
  }
  assert.ok(terrainSliderForRadius(5) - terrainSliderForRadius(2) > terrainSliderForRadius(50) - terrainSliderForRadius(20), "log scale reserves more control travel for nearby terrain");
});

test("terrain viewport and crop stay centered on the selected GCJ-02 point", () => {
  const requested = terrainViewportBounds({ latitude: 22.55, longitude: 114.25 }, 5);
  assert.ok(Math.abs((requested.west + requested.east) / 2 - 114.25) < 1e-9);
  assert.ok(Math.abs((requested.south + requested.north) / 2 - 22.55) < 1e-9);
  const published = terrainViewportBounds({ latitude: 22.55, longitude: 114.25 }, 50);
  const crop = terrainCropPercent(published, requested);
  assert.ok(Math.abs(crop.width - 1000) < 1e-7);
  assert.ok(Math.abs(crop.height - 1000) < 1e-7);
  assert.ok(Math.abs(crop.left + 450) < 1e-7);
  assert.ok(Math.abs(crop.top + 450) < 1e-7);
  assert.throws(() => terrainCropPercent(published, { west: 1, east: 1, south: 0, north: 1 }), /invalid_terrain_viewport/);
});
