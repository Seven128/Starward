import assert from "node:assert/strict";
import test from "node:test";
import { resolvePlanTiming } from "./plan-timing.ts";

const input = { localDate: "2026-09-09", localTime: "23:00", timezone: "Asia/Shanghai",
  timing: { endLocalDate: "2026-09-10", endLocalTime: "02:30", departureLocalDate: "2026-09-09", departureLocalTime: "20:00" } };

test("plan times preserve a chosen cross-midnight interval independently of weather", () => {
  const before = structuredClone(input);
  assert.deepEqual(resolvePlanTiming(input), { start: "2026-09-09T15:00:00.000Z",
    end: "2026-09-09T18:30:00.000Z", departure: "2026-09-09T12:00:00.000Z" });
  assert.deepEqual(input, before);
});

test("end must follow start and departure must strictly precede it", () => {
  for (const endLocalTime of ["22:59", "23:00"]) {
    assert.throws(() => resolvePlanTiming({ ...input, timing: { ...input.timing,
      endLocalDate: input.localDate, endLocalTime } }), /plan_end_must_follow_start/);
  }
  for (const departureLocalTime of ["23:00", "23:01"]) {
    assert.throws(() => resolvePlanTiming({ ...input, timing: { ...input.timing, departureLocalTime } }), /plan_departure_must_precede_start/);
  }
});

test("invalid calendar dates and missing fields do not invent valid plan times", () => {
  assert.throws(() => resolvePlanTiming({ ...input, timing: { ...input.timing, endLocalDate: "2026-02-30" } }));
  assert.throws(() => resolvePlanTiming({ ...input, timing: { ...input.timing, endLocalTime: "25:00" } }));
  assert.throws(() => resolvePlanTiming({ ...input, timing: null as never }), /plan_timing_invalid/);
});
