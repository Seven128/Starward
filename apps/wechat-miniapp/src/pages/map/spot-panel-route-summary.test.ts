import assert from "node:assert/strict";
import test from "node:test";
import { spotRouteSummary } from "./spot-panel-route-summary";

test("route summary distinguishes active loading, disabled detail, and a completed unavailable route", () => {
  assert.equal(spotRouteSummary(undefined, false, true), "正在加载路线信息");
  assert.equal(spotRouteSummary(undefined, false, false), "路线暂无数据");
  assert.equal(spotRouteSummary(undefined, true, false), "路线服务暂不可用");
});
