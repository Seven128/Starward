import assert from "node:assert/strict";
import test from "node:test";
import { createSkyObservationTime, skyPresentedTimeCurrent } from "./sky-observation-time.ts";

const start = "2026-09-29T13:00:00.000Z";
const end = "2026-09-29T13:30:00.000Z";

test("1x sky time is one bounded intent across play, pause, hide, cancel and a replaced Context", () => {
  const time = createSkyObservationTime();
  assert.equal(time.bind("context:1", start, { startAt: start, endAt: end }).at, start);
  assert.equal(time.play(10_000).mode, "PLAYING");
  assert.equal(time.tick(12_000).at, "2026-09-29T13:00:02.000Z");
  assert.equal(time.tick(11_000).at, "2026-09-29T13:00:02.000Z", "a scheduling-clock rollback cannot rewind the sky");
  assert.equal(time.hide(13_000).at, "2026-09-29T13:00:03.000Z");
  assert.equal(time.snapshot().mode, "PAUSED");
  assert.equal(time.tick(99_000).at, "2026-09-29T13:00:03.000Z", "a hidden page cannot advance");
  time.play(100_000);
  assert.equal(time.tick(100_500).at, "2026-09-29T13:00:03.500Z");
  assert.equal(time.cancel().at, start);
  assert.equal(time.tick(999_000).at, start, "cancelled intent cannot resurrect an old timer");
  time.preview("2026-09-29T13:05:00.000Z");
  assert.equal(time.bind("context:2", "2026-09-29T13:10:00.000Z", { startAt: start, endAt: end }).at,
    "2026-09-29T13:10:00.000Z", "a new Context wins over an old preview");
});

test("coverage ends without extrapolation and withdrawn fine data returns to the committed time", () => {
  const time = createSkyObservationTime();
  time.bind("context:1", start, { startAt: start, endAt: end });
  time.play(0);
  assert.equal(time.tick(1_900_000).at, end);
  assert.equal(time.snapshot().mode, "PAUSED");
  assert.equal(time.snapshot().reachedEnd, true);
  assert.equal(time.play(1_900_001).mode, "PAUSED");
  time.preview("2026-09-29T13:15:00.000Z");
  assert.equal(time.bind("context:1", start, null).at, start);
  assert.equal(time.snapshot().mode, "FIXED");
});

test("interactive paint accepts only its own run and never a future or preceding frame", () => {
  const requested = "2026-09-29T13:00:02.000Z";
  const painted = "2026-09-29T13:00:01.700Z";
  assert.equal(skyPresentedTimeCurrent(requested, painted, true, start), true);
  assert.equal(skyPresentedTimeCurrent(requested, painted, false, start), false);
  assert.equal(skyPresentedTimeCurrent(requested, painted, true, requested), false);
  assert.equal(skyPresentedTimeCurrent(requested, "2026-09-29T13:00:02.001Z", true, start), false);
  assert.equal(skyPresentedTimeCurrent(requested, undefined, true, start), false);
});
