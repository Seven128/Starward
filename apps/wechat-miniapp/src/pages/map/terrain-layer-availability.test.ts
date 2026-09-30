import assert from "node:assert/strict";
import test from "node:test";
import { terrainLayerAvailability } from "./terrain-layer-availability";

test("request and provider failures outrank an old uncovered result for both map and spot layers", () => {
  assert.equal(terrainLayerAvailability("UNAVAILABLE", undefined, true), "ERROR");
  assert.equal(terrainLayerAvailability("UNAVAILABLE", "LIGHT_READ_FAILED", false), "ERROR");
  assert.equal(terrainLayerAvailability("UNAVAILABLE", undefined, false), "EMPTY");
  assert.equal(terrainLayerAvailability("PARTIAL", undefined, false), "READY");
  assert.equal(terrainLayerAvailability(undefined, undefined, false), "PENDING");
});
