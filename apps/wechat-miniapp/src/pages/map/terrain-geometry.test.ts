import assert from "node:assert/strict";
import test from "node:test";

import { mercatorY } from "@starward/coordinate-system";
import { TERRAIN_RADIUS_TICKS, terrainCropPercent, terrainMapViewportBounds, terrainBoundsForNativeRegion, terrainRadiusForSlider, terrainSliderForRadius, terrainViewportBounds } from "./terrain-geometry";

test("Map terrain covers the whole logical Mercator window beyond the Spot 50 km limit", () => {
  const center = { latitude: 22.65, longitude: 114.05 }, frame = { width: 390, height: 700 };
  const bounds = terrainMapViewportBounds(center, 8, frame);
  assert.ok((bounds.north - bounds.south) * 111.32 > 300, "a zoomed-out phone window cannot be limited to a 100 km square");
  assert.ok(Math.abs((bounds.east - bounds.west) / 360 - 390 / (256 * 2 ** 8) * 1.2) < 1e-12);
  assert.ok(Math.abs(mercatorY(bounds.south) - mercatorY(bounds.north) - 700 / (256 * 2 ** 8) * 1.2) < 1e-12);
  const zoomed = terrainMapViewportBounds(center, 9, frame);
  assert.ok(Math.abs((bounds.east - bounds.west) / (zoomed.east - zoomed.west) - 2) < 1e-10);
  const actual = terrainBoundsForNativeRegion({ southwest: { latitude: 20, longitude: 112 }, northeast: { latitude: 25, longitude: 116 } });
  assert.ok(actual && actual.west < 112 && actual.east > 116 && actual.south < 20 && actual.north > 25);
  assert.equal(terrainBoundsForNativeRegion({ southwest: { latitude: 20, longitude: 116 }, northeast: { latitude: 25, longitude: 112 } }), null);
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
