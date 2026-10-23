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

test("coverage ends without extrapolation and withdrawn supply pauses without cancelling the time intent", () => {
  const time = createSkyObservationTime();
  time.bind("context:1", start, { startAt: start, endAt: end });
  time.play(0);
  assert.equal(time.tick(1_900_000).at, end);
  assert.equal(time.snapshot().mode, "PAUSED");
  assert.equal(time.snapshot().reachedEnd, true);
  assert.equal(time.play(1_900_001).mode, "PAUSED");
  time.preview("2026-09-29T13:15:00.000Z");
  assert.equal(time.bind("context:1", start, null).at, "2026-09-29T13:15:00.000Z");
  assert.equal(time.snapshot().mode, "PREVIEW");
  assert.equal(time.play(2_000_000).mode, "PREVIEW", "missing supply cannot start playback");
  time.bind("context:1", start, { startAt: start, endAt: end });
  time.play(2_000_000);
  assert.equal(time.bind("context:1", start, null).mode, "PAUSED");
  assert.equal(time.snapshot().at, "2026-09-29T13:15:00.000Z");
  assert.equal(time.tick(2_100_000).at, "2026-09-29T13:15:00.000Z");
});

test("same-context supply changes cannot roll back rapid earlier and later preview intents", () => {
  const time = createSkyObservationTime();
  const original = { startAt: start, endAt: end };
  const previous = { startAt: "2026-09-28T13:00:00.000Z", endAt: "2026-09-28T13:30:00.000Z" };
  time.bind("context:1", start, original);
  time.preview("2026-09-28T13:15:00.000Z");
  time.bind("context:1", start, previous);
  time.preview("2026-09-29T13:15:00.000Z");
  time.bind("context:1", start, original);

  const earlier = "2026-09-27T13:15:00.000Z";
  time.preview(earlier);
  assert.equal(time.bind("context:1", start, previous).at, earlier,
    "a retained preceding window is fallback supply, not a command to restore the committed time");
  const later = "2026-09-28T13:16:00.000Z";
  time.preview(later);
  assert.equal(time.bind("context:1", start, null).at, later, "pending or failed supply preserves the latest input");
  time.preview(earlier);
  assert.equal(time.bind("context:1", start, previous).at, earlier, "a late preceding window cannot overwrite a newer input");
  assert.equal(time.snapshot().mode, "PREVIEW");
  assert.equal(time.cancel().at, start);
  time.preview(earlier);
  assert.equal(time.bind("context:1", "2026-09-29T13:10:00.000Z", original).at, "2026-09-29T13:10:00.000Z",
    "a confirmed Context time change still replaces the preview");
});

test("preserving an unsupplied preview does not permit future time or playback beyond the current instant", () => {
  const now = Date.parse("2026-09-29T13:15:00.000Z");
  const time = createSkyObservationTime({ latestInstant: () => now });
  time.bind("context:1", start, { startAt: start, endAt: end });
  assert.equal(time.preview(end).at, new Date(now).toISOString());
  assert.equal(time.play(0).mode, "PREVIEW", "the latest legal instant cannot start future playback");
  time.preview(start);
  time.play(0);
  assert.equal(time.tick(1_900_000).at, new Date(now).toISOString());
  assert.equal(time.snapshot().mode, "PAUSED");
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

test("pending Play belongs to the exact time intent and cannot survive its cancellation or replacement", () => {
  for (const retire of [
    (time: ReturnType<typeof createSkyObservationTime>) => time.preview("2026-09-29T13:10:00.000Z"),
    (time: ReturnType<typeof createSkyObservationTime>) => time.cancel(),
    (time: ReturnType<typeof createSkyObservationTime>) => time.pause(),
    (time: ReturnType<typeof createSkyObservationTime>) => time.hide(0),
    (time: ReturnType<typeof createSkyObservationTime>) => time.bind("context:2", start, { startAt: start, endAt: end }),
  ]) {
    const time = createSkyObservationTime(); time.bind("context:1", start, { startAt: start, endAt: end });
    time.requestPlay(); assert.equal(time.snapshot().playRequested, true); assert.equal(time.snapshot().mode, "FIXED");
    assert.equal(time.bind("context:1", start, null).playRequested, true, "pending supply does not cancel an explicit request");
    retire(time); assert.equal(time.snapshot().playRequested, false);
    const current = time.snapshot(); time.bind(current.binding, current.committedAt, { startAt: start, endAt: end });
    assert.equal(time.snapshot().playRequested, false); assert.notEqual(time.snapshot().mode, "PLAYING");
  }
});
