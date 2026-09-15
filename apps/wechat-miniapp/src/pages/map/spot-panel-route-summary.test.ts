import assert from "node:assert/strict";
import test from "node:test";
import { spotRouteSummary } from "./spot-panel-route-summary";
import type { SpotDetail } from "@starward/miniapp-contracts";

test("route summary distinguishes active loading, disabled detail, and a completed unavailable route", () => {
  assert.equal(spotRouteSummary(undefined, false, true), "正在加载距离信息");
  assert.equal(spotRouteSummary(undefined, false, false), "暂无数据");
  assert.equal(spotRouteSummary(undefined, true, false), "暂无数据");
});

test("old road estimates cannot reappear as driving durations or relabelled straight distance", () => {
  const old = { kind: "ROUTE_ESTIMATE", distanceKm: 12, driveMinutes: 30 } as SpotDetail["route"];
  assert.equal(spotRouteSummary(old, true, false), "暂无数据");
  assert.equal(spotRouteSummary({ ...old, kind: "STRAIGHT_LINE_ONLY" }, true, false), "直线距离约 12 km");
});
