import assert from "node:assert/strict";
import test from "node:test";
import { planTravelMatchesRouteOrigin, planTravelModeLabel } from "./plan-travel";

test("route evidence is eligible for every supported mode only at the saved origin", () => {
  assert.equal(planTravelMatchesRouteOrigin({ origin: " 深圳地图中心 ", mode: "DRIVING" }, "深圳地图中心"), true);
  assert.equal(planTravelMatchesRouteOrigin({ origin: "另一个起点", mode: "DRIVING" }, "深圳地图中心"), false);
  assert.equal(planTravelMatchesRouteOrigin({ origin: "深圳地图中心", mode: "TRANSIT" }, "深圳地图中心"), true);
  assert.equal(planTravelMatchesRouteOrigin(undefined, "深圳地图中心"), false);
  assert.equal(planTravelModeLabel("WALKING"), "步行");
});
