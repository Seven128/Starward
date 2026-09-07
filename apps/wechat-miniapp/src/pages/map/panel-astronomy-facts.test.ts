import assert from "node:assert/strict";
import test from "node:test";
import type { MapSpotTimeSignal } from "@starward/miniapp-contracts";
import { panelAstronomyFacts } from "./panel-astronomy-facts";
const signal: MapSpotTimeSignal = {
  spotId: "spot:test" as MapSpotTimeSignal["spotId"], cloudPercent: 0, lowCloudPercent: null, midCloudPercent: 12,
  highCloudPercent: 80, moonImpact: "LOW", opportunityScore: null,
  opportunityConfidence: null, opportunityEligible: false, opportunityLabel: "", state: "PARTIAL",
};
test("cloud zero remains a measurement and lunar impact uses its own contract", () => {
  assert.deepEqual(panelAstronomyFacts(signal).map(row => row.value), ["0%", "暂无数据", "12%", "80%", "较低"]);
  for (const [moonImpact, expected] of [["MEDIUM", "中等"], ["HIGH", "较高"], ["UNKNOWN", "暂无数据"]] as const) {
    assert.equal(panelAstronomyFacts({ ...signal, moonImpact }).at(-1)?.value, expected);
  }
});
test("unavailable and invalid measurements never masquerade as observed conditions", () => {
  for (const input of [null, { ...signal, state: "UNAVAILABLE" as const }]) {
    assert.ok(panelAstronomyFacts(input).every(row => row.value === "暂无数据"));
  }
  assert.equal(panelAstronomyFacts({ ...signal, cloudPercent: NaN })[0]?.value, "暂无数据");
  assert.equal(panelAstronomyFacts({ ...signal, cloudPercent: 101 })[0]?.value, "暂无数据");
});
