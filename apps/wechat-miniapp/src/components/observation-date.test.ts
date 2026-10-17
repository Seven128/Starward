import assert from "node:assert/strict";
import test from "node:test";
import {
  civilDateForInstant,
  instantForCivilDate,
  observationDateOptions,
  observationNightForInstant,
  observationNightLabel,
} from "./observation-date.ts";

test("night attribution follows Context grouping while the civil date crosses midnight", () => {
  assert.equal(observationNightLabel("2026-10-07", "2026-10-07T13:30:00Z", "Asia/Shanghai", "2026-10-07"), "今晚");
  assert.equal(observationNightLabel("2026-10-07", "2026-10-07T16:00:00Z", "Asia/Shanghai", "2026-10-07"), "10月07日观测夜");
  assert.equal(observationNightLabel("2026-10-06", "2026-10-06T13:30:00Z", "Asia/Shanghai", "2026-10-07"), "历史时段");
  assert.equal(observationNightLabel("2026-10-08", "2026-10-08T13:30:00Z", "Asia/Shanghai", "2026-10-07"), "观测夜");
});

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

for (const timezone of ["Asia/Shanghai", "Asia/Hong_Kong", "Asia/Macau"]) {
  test(`date selection preserves committed seconds and milliseconds in ${timezone}`, () => {
    for (const [at, night] of [
      ["2026-10-11T15:59:58.700Z", "2026-10-12"],
      ["2026-10-11T16:00:00.264Z", "2026-10-11"],
      ["2026-10-12T03:59:59.999Z", "2026-10-11"],
      ["2026-10-12T04:00:00.001Z", "2026-10-12"],
    ]) {
      const next = instantForCivilDate("2026-10-12", at!, timezone);
      const originalCivilDate = civilDateForInstant(at!, timezone);
      const dayDelta = (Date.parse("2026-10-12") - Date.parse(originalCivilDate)) / 86400000;
      assert.equal(Date.parse(next.selectedAt), Date.parse(at!) + dayDelta * 86400000);
      assert.equal(next.localDate, night);
      assert.equal(civilDateForInstant(next.selectedAt, timezone), "2026-10-12");
    }
  });
}

test("date selection preserves fractional seconds when native Intl has no formatToParts", () => {
  const original = Intl.DateTimeFormat;
  Object.defineProperty(Intl, "DateTimeFormat", {
    configurable: true,
    value: function DateTimeFormat() { return { format: () => "unsupported" }; },
  });
  try {
    assert.deepEqual(instantForCivilDate("2026-10-13", "2026-10-11T16:00:00.264Z", "Asia/Shanghai"), {
      localDate: "2026-10-12",
      selectedAt: "2026-10-12T16:00:00.264Z",
    });
  } finally {
    Object.defineProperty(Intl, "DateTimeFormat", { configurable: true, value: original });
  }
});
