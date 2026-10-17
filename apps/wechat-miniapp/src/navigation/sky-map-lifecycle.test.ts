import assert from "node:assert/strict";
import test from "node:test";
import { createSkyMapLifecycle } from "./sky-map-lifecycle";

test("Map/Sky handoff records actual teardown and first render, without treating mount as ready", () => {
  let time = 0;
  const journey = createSkyMapLifecycle(() => time);
  journey.beginEntry();
  time = 10; journey.mapUnloaded();
  time = 20; assert.equal(journey.skyMounted(), true);
  assert.equal(journey.snapshot()?.skyReadyAt, undefined);
  time = 180; journey.skyReady();
  time = 250; journey.skyReady();
  assert.equal(journey.snapshot()?.skyReadyAt, 180);
  time = 1000; assert.ok(journey.beginReturn());
  journey.mapReady();
  assert.equal(journey.snapshot()?.mapReadyAt, undefined, "old map callbacks cannot establish a remount");
  time = 1030; journey.mapMounted();
  time = 1200; journey.mapReady();
  time = 1420; journey.finishMapReturn();
  assert.deepEqual(journey.snapshot(), { id: 1, phase: "complete", entryStartedAt: 0,
    mapUnloadedAt: 10, skyMountedAt: 20, skyReadyAt: 180, returnStartedAt: 1000,
    mapMountedAt: 1030, mapReadyAt: 1200, returnCompletedAt: 1420 });
  assert.equal(journey.mapReturnPending(), false);
});

test("failed navigation can recover, and an older entry cannot cancel a newer journey", () => {
  const journey = createSkyMapLifecycle(() => 1);
  assert.equal(journey.beginReturn(), null, "deep links have no saved Map to restore");
  const first = journey.beginEntry(), second = journey.beginEntry();
  journey.cancelEntry(first);
  assert.equal(journey.snapshot()?.id, second);
  journey.skyMounted();
  const failed = journey.beginReturn(); journey.cancelReturn(failed);
  assert.equal(journey.snapshot()?.phase, "sky");
  const completed = journey.beginReturn(); assert.ok(completed);
  journey.mapMounted(); journey.cancelReturn(completed);
  assert.equal(journey.mapReturnPending(), true, "late SDK failure cannot invalidate an already mounted Map");
  journey.finishMapReturn();
  const third = journey.beginEntry(); journey.cancelEntry(third);
  assert.equal(journey.snapshot(), null);
});
