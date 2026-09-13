import assert from "node:assert/strict";
import test from "node:test";

import { TERRAIN_RADIUS_TICKS, terrainCropPercent, terrainRadiusForSlider, terrainSliderForRadius, terrainViewportBounds } from "./terrain-geometry";

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
