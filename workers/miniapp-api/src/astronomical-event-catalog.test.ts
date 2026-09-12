import assert from "node:assert/strict";
import test from "node:test";
import { ASTRONOMICAL_EVENTS_2026 } from "./astronomical-event-catalog.ts";

test("the pinned 2026 eclipse catalog has stable concrete occurrences and UTC peaks", () => {
  const eclipses = ASTRONOMICAL_EVENTS_2026.filter(event => event.kind !== "METEOR_SHOWER");
  assert.deepEqual(eclipses.map(event => [event.kind, event.eclipseKind, event.peakAtUtc]), [
    ["SOLAR_ECLIPSE", "ANNULAR", "2026-02-17T12:11:53.939Z"],
    ["LUNAR_ECLIPSE", "TOTAL", "2026-03-03T11:33:40.289Z"],
    ["SOLAR_ECLIPSE", "TOTAL", "2026-08-12T17:45:46.794Z"],
    ["LUNAR_ECLIPSE", "PARTIAL", "2026-08-28T04:12:49.076Z"],
  ]);
  assert.equal(eclipses[2]!.peakDate, "2026-08-13");
});
