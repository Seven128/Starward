import assert from "node:assert/strict";
import test from "node:test";
import { skyCivilInstant, skyTimeInputAllowed, stepSkyCivilTime, createSkyTimeRepeat } from "./sky-time-input";
import { createSkyObservationTime } from "./sky-observation-time";

test("civil field steps preserve valid leap/month boundaries and compare the complete zoned instant", () => {
  const zone = "Asia/Shanghai", now = Date.parse("2026-10-17T08:00:00.000Z");
  assert.equal(stepSkyCivilTime("2024-02-29T04:00:00.000Z", zone, "year", 1, now), "2025-02-28T04:00:00.000Z");
  assert.equal(stepSkyCivilTime("2026-01-31T15:59:59.000Z", zone, "month", 1, now), "2026-02-28T15:59:59.000Z");
  assert.equal(stepSkyCivilTime("2026-10-16T15:59:59.000Z", zone, "second", 1, now), "2026-10-16T16:00:00.000Z");
  assert.equal(stepSkyCivilTime("2026-10-17T08:00:00.000Z", zone, "second", 1, now), null);
  assert.equal(skyCivilInstant({ year: 2026, month: 2, day: 30, hour: 12, minute: 0, second: 0 }, zone), null);
  assert.equal(skyTimeInputAllowed("2026-10-17T08:00:00.001Z", now), false);
  assert.equal(stepSkyCivilTime("2026-10-16T12:00:00.750Z", zone, "second", 1, now), "2026-10-16T12:00:01.750Z",
    "a one-second arrow preserves the unedited subsecond component");
});

test("all arrows share one cancellable repeat and consume its compatibility click", () => {
  let serial = 0, steps = 0, now = 1000;
  const tasks = new Map<number, () => void>();
  const repeat = createSkyTimeRepeat({ schedule: callback => { tasks.set(++serial, callback); return serial; },
    cancel: handle => { tasks.delete(handle as number); }, now: () => now });
  const step = () => { steps++; return true; };
  repeat.start(step); assert.equal(steps, 1); assert.equal(tasks.size, 1);
  const old = [...tasks.values()][0]!;
  repeat.stop(); old(); assert.equal(steps, 1); assert.equal(tasks.size, 0);
  repeat.click(step); assert.equal(steps, 1, "the release click cannot add a delayed step");
  repeat.click(step); assert.equal(steps, 2, "keyboard activation still steps");
  repeat.start(step); const retired = [...tasks.values()][0]!;
  repeat.start(step); retired(); assert.equal(tasks.size, 1, "a retired callback cannot lose the replacement task"); repeat.stop();
  assert.equal(tasks.size, 0, "the replacement remains cancellable after that stale callback");
  now += 501; const before = steps; repeat.click(step); assert.equal(steps, before + 1, "a cancelled touch cannot consume a later keyboard action");
});

test("Sky's live current-time ceiling covers ruler previews and 1x playback without changing the default owner", () => {
  let now = Date.parse("2026-10-16T12:00:01.500Z");
  const owner = createSkyObservationTime({ latestInstant: () => now });
  owner.bind("current", "2026-10-16T12:00:00.000Z", { startAt: "2026-10-16T11:00:00.000Z", endAt: "2026-10-16T14:00:00.000Z" });
  owner.play(0); assert.equal(owner.tick(5000).at, "2026-10-16T12:00:01.500Z"); assert.equal(owner.snapshot().mode, "PAUSED");
  now += 1000; assert.equal(owner.preview("2026-10-16T13:00:00.000Z").at, "2026-10-16T12:00:02.500Z");
});
