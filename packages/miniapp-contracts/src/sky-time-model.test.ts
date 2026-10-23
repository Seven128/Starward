import assert from "node:assert/strict";
import test from "node:test";
import { skyGeometryWindow, type SkyGeometryWindowMode } from "./sky-time-model.ts";

test("geometry keeps the legacy noon-to-noon 49-knot window by default", () => {
  const at = "2026-09-28T13:15:17.123Z";
  const window = skyGeometryWindow(at, "Asia/Shanghai");
  assert.deepEqual(window, skyGeometryWindow(at, "Asia/Shanghai", "NIGHT"));
  assert.equal(window.localDate, "2026-09-28");
  assert.equal(window.startAt, "2026-09-28T04:00:00.000Z");
  assert.equal(window.endAt, "2026-09-29T04:00:00.000Z");
  assert.equal(window.hourlyAt.length, 49);
  assert.equal(window.hourlyAt[0], window.startAt);
  assert.equal(window.hourlyAt.at(-1), window.endAt);
});

test("two-hour geometry uses stable noon-aligned cells with both endpoints and unchanged sampling", () => {
  const window = skyGeometryWindow("2026-09-28T13:15:17.123Z", "Asia/Shanghai", "TWO_HOURS");
  assert.deepEqual(window, {
    localDate: "2026-09-28", startAt: "2026-09-28T12:00:00.000Z", endAt: "2026-09-28T14:00:00.000Z",
    hourlyAt: ["2026-09-28T12:00:00.000Z", "2026-09-28T12:30:00.000Z", "2026-09-28T13:00:00.000Z",
      "2026-09-28T13:30:00.000Z", "2026-09-28T14:00:00.000Z"],
  });
  assert.deepEqual(skyGeometryWindow("2026-09-28T13:59:59.999Z", "Asia/Shanghai", "TWO_HOURS"), window);
  const adjacent = skyGeometryWindow(window.endAt, "Asia/Shanghai", "TWO_HOURS");
  assert.equal(adjacent.startAt, window.endAt);
  assert.equal(adjacent.endAt, "2026-09-28T16:00:00.000Z");
  const last = skyGeometryWindow("2026-09-29T03:59:59.999Z", "Asia/Shanghai", "TWO_HOURS");
  assert.equal(last.localDate, window.localDate, "local morning retains the previous observation night");
  assert.equal(last.startAt, "2026-09-29T02:00:00.000Z");
  assert.equal(last.endAt, "2026-09-29T04:00:00.000Z");
  assert.equal(last.hourlyAt.length, 5);
  assert.equal(skyGeometryWindow(last.endAt, "Asia/Shanghai", "TWO_HOURS").localDate, "2026-09-29");
});

test("the last short cell of an already supported 23-hour DST night cannot extend its coverage", () => {
  const at = "2026-03-08T15:45:00.000Z";
  const night = skyGeometryWindow(at, "America/New_York");
  assert.equal(night.hourlyAt.length, 47);
  const window = skyGeometryWindow(at, "America/New_York", "TWO_HOURS");
  assert.deepEqual(window, {
    localDate: "2026-03-07", startAt: "2026-03-08T15:00:00.000Z", endAt: night.endAt,
    hourlyAt: ["2026-03-08T15:00:00.000Z", "2026-03-08T15:30:00.000Z", "2026-03-08T16:00:00.000Z"],
  });
});

test("window selection preserves input and unsupported-night rejection", () => {
  const at = "2026-09-28T13:15:17.123Z";
  assert.throws(() => skyGeometryWindow(at, "Asia/Shanghai", "other" as SkyGeometryWindowMode),
    /sky_geometry_window_mode_invalid/u);
  assert.throws(() => skyGeometryWindow("2026-09-28T13:15:17Z", "Asia/Shanghai", "TWO_HOURS"),
    /sky_geometry_time_invalid/u);
  for (const mode of ["NIGHT", "TWO_HOURS"] as const)
    assert.throws(() => skyGeometryWindow("2026-11-01T13:00:00.000Z", "America/New_York", mode),
      /sky_geometry_window_unsupported/u);
});
