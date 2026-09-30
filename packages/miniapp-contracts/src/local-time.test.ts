import assert from "node:assert/strict";
import test from "node:test";
import { localParts, zonedLocalToUtc } from "./local-time.js";

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
