import assert from "node:assert/strict";
import test from "node:test";
import { forecastCoverage } from "./forecast-coverage";

test("coverage joins consecutive source hours but never fills a hole or invents absent time", () => {
  assert.deepEqual(forecastCoverage(["2026-09-15T16:00:00Z", "2026-09-15T14:00:00Z", "2026-09-15T15:00:00Z", "bad", "2026-09-15T14:00:00Z", "2026-09-15T19:00:00Z"]), [
    { start: "2026-09-15T14:00:00.000Z", end: "2026-09-15T17:00:00.000Z" },
    { start: "2026-09-15T19:00:00.000Z", end: "2026-09-15T20:00:00.000Z" },
  ]);
  assert.deepEqual(forecastCoverage([]), []);
  assert.deepEqual(forecastCoverage(["2026-09-15T23:00:00Z"]), [{ start: "2026-09-15T23:00:00.000Z", end: "2026-09-16T00:00:00.000Z" }]);
});
