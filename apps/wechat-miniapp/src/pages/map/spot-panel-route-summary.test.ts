import assert from "node:assert/strict";
import test from "node:test";
import { spotRouteSummary } from "./spot-panel-route-summary";
import type { SpotDetail } from "@starward/miniapp-contracts";

test("route summary distinguishes loading, failed detail, and a completed missing route", () => {
  assert.equal(spotRouteSummary(undefined, true, false), "正在加载距离信息");
  assert.equal(spotRouteSummary(undefined, false, true), "距离暂未获取");
  assert.equal(spotRouteSummary(undefined, false, false), "暂无数据");
});

test("old road estimates cannot reappear as driving durations or relabelled straight distance", () => {
  const old = { kind: "ROUTE_ESTIMATE", distanceKm: 12, driveMinutes: 30 } as SpotDetail["route"];
  assert.equal(spotRouteSummary(old, false, false), "暂无数据");
  assert.equal(spotRouteSummary({ ...old, kind: "STRAIGHT_LINE_ONLY" }, false, true), "直线距离约 12 km");
});
