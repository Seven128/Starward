import assert from "node:assert/strict";
import test from "node:test";
import { localParts, observationNightBounds, observationNightForCivilDate, shiftCivilDate, zonedLocalToUtc } from "./local-time.js";

test("civil dates share the noon observation-night boundary without changing their calendar", () => {
  assert.equal(observationNightForCivilDate("2027-01-01", "00:00"), "2026-12-31");
  assert.equal(observationNightForCivilDate("2026-10-10", "11:59"), "2026-10-09");
  assert.equal(observationNightForCivilDate("2026-10-10", "12:00"), "2026-10-10");
  assert.equal(observationNightForCivilDate("2026-10-10", "23:59"), "2026-10-10");
  assert.equal(shiftCivilDate("2024-03-01", -1), "2024-02-29");
  assert.throws(() => observationNightForCivilDate("2026-10-10", "24:00"), /observation_time_invalid/);
});

test("the shared civil-night mapping keeps the DST night bounded by local noon", () => {
  const localDate = "2026-03-29", timezone = "Europe/London";
  const nightDate = observationNightForCivilDate(localDate, "03:00");
  assert.equal(nightDate, "2026-03-28");
  const bounds = observationNightBounds({ localDate: nightDate, timezone });
  assert.equal(Date.parse(bounds.nightEndUtc) - Date.parse(bounds.nightStartUtc), 23 * 3600000);
  const at = zonedLocalToUtc({ localDate, localTime: "03:00", timezone });
  assert.ok(Date.parse(at) >= Date.parse(bounds.nightStartUtc) && Date.parse(at) < Date.parse(bounds.nightEndUtc));
});

test("modern Shanghai, Hong Kong and Macao conversion survives Intl without formatToParts", () => {
  const original = Intl.DateTimeFormat;
  Object.defineProperty(Intl, "DateTimeFormat", {
    configurable: true,
    value: function DateTimeFormat() {
      return { format: () => "unsupported" };
    },
  });
  try {
    assert.equal(
      zonedLocalToUtc({
        localDate: "2026-09-13",
        localTime: "21:00",
        timezone: "Asia/Shanghai",
      }),
      "2026-09-13T13:00:00.000Z",
    );
    assert.deepEqual(
      localParts(new Date("2026-09-13T13:45:30.000Z"), "Asia/Hong_Kong"),
      { year: 2026, month: 9, day: 13, hour: 21, minute: 45, second: 30 },
    );
    assert.equal(zonedLocalToUtc({ localDate: "2026-09-13", localTime: "21:00",
      timezone: "Asia/Macau" }), "2026-09-13T13:00:00.000Z");
    assert.throws(
      () => localParts(new Date("2026-09-13T13:00:00.000Z"), "Europe/London"),
      /zoned_date_intl_unavailable/u,
    );
  } finally {
    Object.defineProperty(Intl, "DateTimeFormat", {
      configurable: true,
      value: original,
    });
  }
});
