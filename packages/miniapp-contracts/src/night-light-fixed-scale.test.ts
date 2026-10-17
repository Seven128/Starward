import assert from "node:assert/strict";
import test from "node:test";
import { NIGHT_LIGHT_FIXED_SCALE, nightLightBandForRadiance, nightLightFixedLegend } from "./night-light-fixed-scale.ts";

test("fixed annual-radiance bands and legend use the same explicit physical thresholds", () => {
  assert.deepEqual([0, .5, .5001, 2, 2.01, 10, 10.01, 40, 40.01].map(nightLightBandForRadiance),
    ["VERY_LOW", "VERY_LOW", "LOW", "LOW", "MODERATE", "MODERATE", "HIGH", "HIGH", "VERY_HIGH"]);
  assert.deepEqual([-1, NaN, Infinity].map(nightLightBandForRadiance), [null, null, null]);
  assert.equal(nightLightBandForRadiance(.5 + Number.EPSILON), "VERY_LOW");
  assert.equal(nightLightBandForRadiance(.5 + 1e-10), "LOW");
  assert.equal(NIGHT_LIGHT_FIXED_SCALE.qualityPolicy.zeroRequiresValidCoverage, true);
  assert.equal(nightLightFixedLegend().length, 5);
  assert.ok(nightLightFixedLegend().every(item => item.range.includes("nW/cm²/sr")));
});
