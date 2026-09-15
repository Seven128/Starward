import assert from "node:assert/strict";
import test from "node:test";
import type { SpotAirQualityData, SourceSummary } from "@starward/miniapp-contracts";
import { airQualityState } from "./air-quality-state";

const now = Date.parse("2026-09-15T00:00:00Z");
const source = { retrievedAt: new Date(now).toISOString() } as SourceSummary;
const snapshot = { indexes: [{ code: "cn-mee", name: "中国 AQI", value: 0, display: "0", category: null, primaryPollutant: null }], pollutants: [] };
const body: SpotAirQualityData = { spotId: "spot:a", current: { value: { ...snapshot, pollutants: [{ code: "pm2p5", name: "PM2.5", value: 0, unit: "μg/m³" }] }, state: "FRESH", unavailableReason: null, source },
  forecast: { value: [{ ...snapshot, at: "2026-09-15T01:00:00Z" }, { ...snapshot, at: "2026-09-15T03:00:00Z" }], state: "FRESH", unavailableReason: null, source } };

test("selected AQ hour is exact, independent of current readings and never bridges a gap", () => {
  for (const selected of ["2026-09-15T00:59:59Z", "2026-09-15T02:00:00Z", "2026-09-15T02:59:59Z", "2026-09-15T04:00:00Z", "invalid"]) {
    const result = airQualityState(body, selected, now);
    assert.equal(result.forecast, null);
    assert.equal(result.current!.pollutants[0]!.value, 0);
    assert.equal(result.failed, false, "outside forecast coverage is not a transport failure");
  }
  const actual = airQualityState(body, "2026-09-15T01:45:00Z", now);
  assert.equal(actual.forecast!.at, "2026-09-15T01:00:00Z");
  assert.equal(actual.forecast!.indexes[0]!.value, 0);
  assert.deepEqual(actual.forecast!.pollutants, []);
});

test("elapsed freshness hides old current data without discarding still valid forecast", () => {
  const result = airQualityState(body, "2026-09-15T03:15:00Z", now + 3_600_000);
  assert.equal(result.current, null); assert.equal(result.forecast!.at, "2026-09-15T03:00:00Z");
  assert.equal(result.failed, true);
  const expired = airQualityState(body, "2026-09-15T03:15:00Z", now + 4 * 3_600_000);
  assert.equal(expired.forecast, null); assert.deepEqual(expired.hours, []);
  assert.equal(airQualityState(undefined, "2026-09-15T01:00:00Z", now).failed, false);
});

test("no coverage is not an error; failed sibling or stale source retains explicit recovery", () => {
  for (const reason of ["NO_DATA", "REQUEST_FAILED"] as const) {
    const result = airQualityState({ ...body, current: { ...body.current, value: null, state: "UNAVAILABLE", unavailableReason: reason } }, "2026-09-15T01:00:00Z", now);
    assert.equal(result.current, null); assert.ok(result.forecast);
    assert.equal(result.failed, reason === "REQUEST_FAILED");
  }
  assert.equal(airQualityState({ ...body, current: { ...body.current, state: "STALE_USABLE" } }, "2026-09-15T01:00:00Z", now).failed, true);
});
