import assert from "node:assert/strict";
import test from "node:test";
import { departureTimeLabel, observingWindowLabel } from "./plan-time-labels";

test("departure uses the spot timezone and includes a previous calendar day", () => {
  assert.equal(departureTimeLabel("2026-09-06T14:00:00Z", 90, "Asia/Shanghai"), "20:30");
  assert.equal(departureTimeLabel("2026-09-05T16:30:00Z", 90, "Asia/Shanghai"), "2026-09-05 23:00");
  assert.equal(departureTimeLabel("2026-01-01T16:30:00Z", 1800, "Asia/Shanghai"), "2025-12-31 18:30");
});
test("elapsed drive time crosses daylight-saving transitions in the spot zone", () => {
  assert.equal(departureTimeLabel("2026-03-08T07:30:00Z", 60, "America/New_York"), "01:30");
});
test("invalid time, duration and timezone do not produce a suggested departure", () => {
  for (const minutes of [-1, NaN, Infinity]) assert.equal(departureTimeLabel("2026-09-06T14:00:00Z", minutes, "Asia/Shanghai"), null);
  assert.equal(departureTimeLabel("invalid", 60, "Asia/Shanghai"), null);
  assert.equal(departureTimeLabel("2026-09-06T14:00:00Z", 60, "invalid"), null);
});

test("observing windows retain both dates across midnight without padding ordinary windows", () => {
  assert.equal(observingWindowLabel({ start: "2026-09-06T14:00:00Z", end: "2026-09-06T15:00:00Z" }, "Asia/Shanghai"), "22:00–23:00");
  assert.equal(observingWindowLabel({ start: "2026-09-06T14:00:00Z", end: "2026-09-06T18:00:00Z" }, "Asia/Shanghai"), "2026-09-06 22:00–2026-09-07 02:00");
});
test("invalid or reversed observing intervals are unavailable", () => {
  assert.equal(observingWindowLabel(null, "Asia/Shanghai"), null);
  assert.equal(observingWindowLabel({ start: "bad", end: "2026-09-06T15:00:00Z" }, "Asia/Shanghai"), null);
  assert.equal(observingWindowLabel({ start: "2026-09-06T18:00:00Z", end: "2026-09-06T14:00:00Z" }, "Asia/Shanghai"), null);
});
