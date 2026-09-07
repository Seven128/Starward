import assert from "node:assert/strict";
import test from "node:test";
import { parseObservationInput } from "./observation-input";

test("feedback observation rejects impossible dates and normalized 24:00", () => {
  for (const [date, time] of [["2026-02-29", "22:00"], ["2026-04-31", "22:00"], ["2026-09-06", "24:00"], ["2026-09-06", "22:60"], ["", "22:00"], ["2026-09-06", ""]]) {
    assert.equal(parseObservationInput(date!, time!), null);
  }
  assert.equal(parseObservationInput("2024-02-29", "00:07"), "2024-02-28T16:07:00.000Z");
  assert.equal(parseObservationInput("2026-09-06", "22:00"), "2026-09-06T14:00:00.000Z");
});
