import assert from "node:assert/strict";
import test from "node:test";
import {
  civilDateForInstant,
  instantForCivilDate,
  observationDateOptions,
  observationNightForInstant,
} from "./observation-date.ts";

test("observation date target is exactly local today minus 7 through plus 15", () => {
  const dates = observationDateOptions(
    new Date("2026-09-10T16:30:00.000Z"),
    "Asia/Shanghai",
  );
  assert.equal(dates.length, 23);
  assert.equal(dates[0], "2026-09-04");
  assert.equal(dates[7], "2026-09-11");
  assert.equal(dates.at(-1), "2026-09-26");
});

test("date selection preserves local clock time and maps after-midnight civil time to the starting night", () => {
  const evening = instantForCivilDate(
    "2026-09-12",
    "2026-09-10T12:30:00.000Z",
    "Asia/Shanghai",
  );
  assert.deepEqual(evening, {
    localDate: "2026-09-12",
    selectedAt: "2026-09-12T12:30:00.000Z",
  });
  const afterMidnight = instantForCivilDate(
    "2026-09-12",
    "2026-09-10T16:30:00.000Z",
    "Asia/Shanghai",
  );
  assert.deepEqual(afterMidnight, {
    localDate: "2026-09-11",
    selectedAt: "2026-09-11T16:30:00.000Z",
  });
  assert.equal(
    civilDateForInstant(afterMidnight.selectedAt, "Asia/Shanghai"),
    "2026-09-12",
  );
  assert.equal(
    observationNightForInstant("2026-09-12T13:00:00.000Z", "Asia/Shanghai"),
    "2026-09-12",
  );
  assert.equal(
    observationNightForInstant("2026-09-12T02:00:00.000Z", "Asia/Shanghai"),
    "2026-09-11",
  );
});
