import assert from "node:assert/strict";
import test from "node:test";
import { parsePlanEventOccurrenceIds, parsePlanTravel, PLAN_EVENT_OCCURRENCES_MAX_COUNT, PLAN_NOTES_MAX_LENGTH, PLAN_TRAVEL_ORIGIN_MAX_LENGTH } from "./plan.js";

test("selected origin coordinates survive parsing while corrupt or unidentified metadata is rejected", () => {
  const originLocation = { source: "WECHAT_CHOOSE_LOCATION", address: "所选地址", wgs84: { system: "WGS84", latitude: 0, longitude: 0 } };
  const input = { origin: "零经纬交点", mode: "TRANSIT", originLocation };
  assert.deepEqual(parsePlanTravel(input), input);
  assert.deepEqual(parsePlanTravel({ ...input, originLocation: null }), { ...input, originLocation: null });
  for (const broken of [{ ...originLocation, source: "GUESS" }, { ...originLocation, address: "a".repeat(501) },
    { ...originLocation, wgs84: { system: "GCJ02", latitude: 22, longitude: 113 } },
    { ...originLocation, wgs84: { system: "WGS84", latitude: 91, longitude: 0 } },
    { ...originLocation, wgs84: { system: "WGS84", latitude: 0, longitude: NaN } }, 0, "point"]) {
    assert.throws(() => parsePlanTravel({ ...input, originLocation: broken }), /invalid_plan_travel_location/);
  }
});

test("plan editor limits and travel choices share one contract", () => {
  assert.equal(PLAN_NOTES_MAX_LENGTH, 2000);
  assert.equal(PLAN_TRAVEL_ORIGIN_MAX_LENGTH, 120);
  for (const mode of ["DRIVING", "TRANSIT", "WALKING"] as const) {
    assert.deepEqual(parsePlanTravel({ origin: "深圳市福田区", mode }), { origin: "深圳市福田区", mode });
  }
  assert.throws(() => parsePlanTravel({ origin: "", mode: "DRIVING" }), /invalid_plan_travel/);
  assert.deepEqual(parsePlanTravel({ origin: "", mode: "DRIVING" }, true), { origin: "", mode: "DRIVING" });
  assert.throws(() => parsePlanTravel({ origin: "x".repeat(121), mode: "DRIVING" }), /invalid_plan_travel/);
  assert.throws(() => parsePlanTravel({ origin: "深圳", mode: "FLYING" }), /invalid_plan_travel/);
});

test("plan event associations keep a bounded unique catalog identity list", () => {
  const ids = ["event-occurrence:007-per:2026", "event-occurrence:010-qua:2026"];
  assert.deepEqual(parsePlanEventOccurrenceIds(ids), ids);
  assert.equal(PLAN_EVENT_OCCURRENCES_MAX_COUNT, 8);
  assert.throws(() => parsePlanEventOccurrenceIds([ids[0], ids[0]]), /duplicate/);
  assert.throws(() => parsePlanEventOccurrenceIds(["meteor-shower:007-per"]), /invalid/);
  assert.throws(() => parsePlanEventOccurrenceIds(Array(9).fill(null).map((_, index) => `event-occurrence:${index}:2026`)), /invalid/);
});
