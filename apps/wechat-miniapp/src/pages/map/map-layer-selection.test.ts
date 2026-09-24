import assert from "node:assert/strict";
import test from "node:test";
import {
  layerSheetOverlay,
  lightLayerContentState,
  mapLayerKindForOverlay,
} from "./map-layer-selection.ts";

test("layer sheet defaults an unopened or legacy selection to cloud", () => {
  assert.equal(layerSheetOverlay("NONE"), "TOTAL_CLOUD");
  assert.equal(layerSheetOverlay("OPPORTUNITY"), "TOTAL_CLOUD");
  assert.equal(layerSheetOverlay("TOTAL_CLOUD"), "TOTAL_CLOUD");
  assert.equal(layerSheetOverlay("LIGHT"), "LIGHT");
});

test("a persisted legacy opportunity overlay reads through the cloud data owner", () => {
  assert.equal(mapLayerKindForOverlay("OPPORTUNITY"), "CLOUD");
  assert.equal(mapLayerKindForOverlay("TOTAL_CLOUD"), "CLOUD");
  assert.equal(mapLayerKindForOverlay("LIGHT"), "LIGHT_POLLUTION");
  assert.equal(mapLayerKindForOverlay("NONE"), "NORMAL");
});

test("light layer keeps real empty, stale empty, and request failure distinct", () => {
  assert.equal(lightLayerContentState({ pending: false, failed: false, hasData: true, unavailable: true }), "EMPTY");
  assert.equal(lightLayerContentState({ pending: false, failed: true, hasData: true, unavailable: true }), "STALE");
  assert.equal(lightLayerContentState({ pending: false, failed: true, hasData: false, unavailable: false }), "ERROR");
  assert.equal(lightLayerContentState({ pending: true, failed: false, hasData: false, unavailable: false }), "LOADING");
  assert.equal(lightLayerContentState({ pending: false, failed: false, hasData: true, unavailable: false }), "READY");
});
