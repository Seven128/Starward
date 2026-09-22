import assert from "node:assert/strict";
import test from "node:test";
import { createPoseFramePublisher, createSkyCanvasLifecycle, measuredCanvasSize, type CanvasClock } from "./sky-canvas-lifecycle";

function clockFixture() {
  let id = 0;
  const jobs = new Map<number, { run: () => void; delay: number }>();
  const clock: CanvasClock = {
    schedule: (run, delay) => { jobs.set(++id, { run, delay }); return id; },
    cancel: handle => { jobs.delete(handle as number); },
  };
  return { clock, jobs, tick(delay = 0) {
    const selected = [...jobs].find(([, job]) => job.delay === delay);
    assert.ok(selected, "expected a scheduled job at " + delay);
    jobs.delete(selected[0]); selected[1].run();
  } };
}
function canvasFixture() {
  const timing = clockFixture();
  const measurements: ((rect: unknown) => void)[] = [];
  const painted: { frame: number; size: { width: number; height: number }; context: object; done: () => void }[] = [];
  const presented: number[] = [], errors: unknown[] = [], released: object[] = [];
  let contexts = 0, invalidations = 0, failure = "";
  const canvas = createSkyCanvasLifecycle<number, object>({
    measure: done => { if (failure === "measure") throw Error("query_failed"); measurements.push(done); },
    createContext: () => { if (failure === "context") throw Error("context_failed"); return { id: ++contexts }; },
    releaseContext: context => released.push(context),
    paint: (context, frame, size, done) => { if (failure === "paint") throw Error("draw_failed"); painted.push({ context, frame, size, done }); },
    presented: frame => presented.push(frame), invalidated: () => { invalidations++; },
    failed: error => errors.push(error),
  }, timing.clock);
  return { ...timing, canvas, measurements, painted, presented, errors, released,
    counts: () => ({ contexts, invalidations }), fail: (kind: string) => { failure = kind; },
    measure: (size = { width: 375, height: 812 }) => measurements.at(-1)!(size),
  };
}

test("canvas measurement rejects missing geometry and accepts both platform result shapes", () => {
  for (const value of [null, undefined, [], {}, { width: 0, height: 800 }, { width: 375, height: -1 },
    { width: NaN, height: 800 }, { width: 375, height: Infinity }, { width: "375", height: 800 }]) {
    assert.throws(() => measuredCanvasSize(value), /sky_canvas_measurement_unavailable/u);
  }
  for (const size of [{ width: 375, height: 812 }, { width: 812, height: 375 }]) {
    assert.deepEqual(measuredCanvasSize(size), size);
    assert.deepEqual(measuredCanvasSize([size]), size);
  }
});

test("failed GPU surface does not reinitialize on every pose and explicit retry consumes the latest frame", () => {
  const h = canvasFixture(); h.canvas.ready(); h.fail("context"); h.canvas.request(1); h.tick(); h.measure();
  for (let i = 2; i <= 100; i++) h.canvas.request(i);
  assert.equal(h.jobs.size, 0, "a persistent native failure must not start an initialization storm");
  assert.equal(h.errors.length, 1);
  h.fail(""); h.canvas.retry(); h.tick(); h.measure(); h.painted.at(-1)!.done();
  assert.deepEqual(h.presented, [100]);
  h.canvas.dispose();
});

test("every acquired GPU generation is released exactly once across reset, failure and late callbacks", () => {
  for (const action of ["resize", "hide", "removed", "error", "timeout", "dispose"] as const) {
    const h = canvasFixture(); h.canvas.ready(); h.canvas.request(1); h.tick(); h.measure();
    const old = h.painted[0]!;
    if (action === "resize") h.canvas.resize();
    if (action === "hide") h.canvas.hide();
    if (action === "removed") h.canvas.setMounted(false);
    if (action === "error") h.canvas.fail(new Error("context_lost"));
    if (action === "timeout") h.tick(5000);
    if (action === "dispose") h.canvas.dispose();
    old.done(); h.canvas.dispose(); h.canvas.dispose();
    assert.deepEqual(h.released, [old.context], action);
    assert.deepEqual(h.presented, [], "released resources must not publish an old frame");
  }
});

test("ready, measurement and draw each retain only the latest requested frame", () => {
  const h = canvasFixture();
  h.canvas.request(1); h.canvas.request(2);
  assert.equal(h.jobs.size, 0);
  h.canvas.ready(); h.tick();
  h.canvas.request(3); h.canvas.request(4);
  assert.equal(h.measurements.length, 1);
  h.measure();
  assert.equal(h.painted[0]!.frame, 4);
  h.measure();
  assert.equal(h.painted.length, 1, "duplicate measurement cannot draw again");
  for (let frame = 5; frame <= 40; frame++) h.canvas.request(frame);
  assert.equal(h.painted.length, 1, "native draws do not overlap");
  h.painted[0]!.done();
  assert.deepEqual(h.presented, [], "superseded completion cannot publish READY");
  h.tick();
  assert.equal(h.painted[1]!.frame, 40);
  h.painted[1]!.done(); h.painted[1]!.done();
  assert.deepEqual(h.presented, [40]);
  assert.equal(h.counts().contexts, 1);
  assert.equal(h.measurements.length, 1);
  assert.equal(h.jobs.size, 0);
});

test("steady sensor frames reuse geometry/context and resizing reacquires both", () => {
  const h = canvasFixture(); h.canvas.ready();
  for (let frame = 0; frame < 20; frame++) {
    h.canvas.request(frame); h.tick();
    if (frame === 0) h.measure();
    h.painted.at(-1)!.done();
  }
  assert.equal(h.measurements.length, 1);
  assert.equal(h.counts().contexts, 1);
  h.canvas.resize(); h.canvas.request(21); h.tick(); h.measure({ width: 812, height: 375 });
  assert.deepEqual(h.painted.at(-1)!.size, { width: 812, height: 375 });
  h.painted.at(-1)!.done();
  assert.equal(h.counts().contexts, 2);
  assert.equal(h.measurements.length, 2);
  assert.equal(h.jobs.size, 0);
});

test("resize, hide, removed canvas and unmount discard stale callbacks", () => {
  for (const phase of ["measure", "draw"]) for (const action of ["resize", "hide", "unmount", "removed"]) {
    const h = canvasFixture(); h.canvas.ready(); h.canvas.request(1); h.tick();
    const measured = h.measurements[0]!;
    if (phase === "draw") h.measure();
    const done = h.painted[0]?.done;
    if (action === "resize") h.canvas.resize();
    if (action === "hide") h.canvas.hide();
    if (action === "unmount") h.canvas.dispose();
    if (action === "removed") h.canvas.setMounted(false);
    measured({ width: 375, height: 812 }); done?.();
    assert.deepEqual(h.presented, []);
    if (action === "unmount") { h.canvas.ready(); h.canvas.show(); h.canvas.request(2); assert.equal(h.jobs.size, 0); continue; }
    if (action === "hide") { h.canvas.show(); assert.equal(h.jobs.size, 0, "foreground waits for a fresh pose/data request"); }
    if (action === "removed") h.canvas.setMounted(true);
    h.canvas.request(2); h.tick(); h.measure(); h.painted.at(-1)!.done();
    assert.deepEqual(h.presented, [2]);
    assert.equal(h.errors.length, 0);
  }
});

test("measurement, context, draw and missing callback failures invalidate size and recover on retry", () => {
  for (const failure of ["invalid-size", "measure", "context", "paint", "measure-timeout", "paint-timeout"]) {
    const h = canvasFixture(); h.canvas.ready(); h.fail(failure); h.canvas.request(1); h.tick();
    if (failure === "invalid-size") h.measurements[0]!(null);
    if (["context", "paint", "paint-timeout"].includes(failure)) h.measure();
    if (failure.endsWith("timeout")) h.tick(5000);
    assert.equal(h.errors.length, 1, failure);
    assert.equal(h.jobs.size, 0, failure);
    assert.ok(h.counts().invalidations > 0);
    h.fail(""); h.canvas.request(2); h.canvas.retry(); h.tick(); h.measure(); h.painted.at(-1)!.done();
    assert.deepEqual(h.presented, [2], failure);
    h.canvas.dispose();
    assert.equal(h.jobs.size, 0);
  }
});

test("expiry/denial hides the previous projection until the clearing draw completes", () => {
  const h = canvasFixture(); h.canvas.ready(); h.canvas.request(1); h.tick(); h.measure();
  h.canvas.request(0, true);
  assert.equal(h.counts().invalidations, 1);
  h.painted[0]!.done();
  assert.deepEqual(h.presented, []);
  h.tick(); h.painted[1]!.done();
  assert.deepEqual(h.presented, [0]);
});

test("continuous poses with a slower native draw cannot starve visibility, while invalidation still fences old frames", () => {
  const h = clockFixture();
  type Frame = { scene: string; pose: number };
  const paints: { frame: Frame; done: () => void }[] = [];
  const completions: Frame[] = [];
  let visible = false;
  const canvas = createSkyCanvasLifecycle<Frame, object>({
    measure: done => done({ width: 375, height: 812 }), createContext: () => ({}),
    paint: (_context, frame, _size, done) => paints.push({ frame, done }),
    sameScene: (completed, latest) => completed.scene === latest.scene,
    presented: frame => { visible = true; completions.push(frame); },
    invalidated: () => { visible = false; }, failed: error => { throw error; },
  }, h.clock);
  canvas.ready(); canvas.request({ scene: "current-night", pose: 0 }); h.tick();
  // Simulate several 16 ms samples arriving before each 48 ms native callback.
  for (let nativeFrame = 0; nativeFrame < 8; nativeFrame++) {
    for (let sample = 1; sample <= 3; sample++) canvas.request({ scene: "current-night", pose: nativeFrame * 3 + sample });
    paints[nativeFrame]!.done();
    assert.equal(visible, true, "a completed current-scene pose makes the canvas visible");
    h.tick();
  }
  assert.equal(completions.length, 8);
  const prior = paints.at(-1)!;
  canvas.request({ scene: "current-night", pose: 99 }, true); // null/denied pose barrier, even within the same report.
  prior.done();
  assert.equal(visible, false);
  h.tick(); paints.at(-1)!.done();
  assert.equal(visible, true);
  canvas.request({ scene: "current-night", pose: 100 }); h.tick();
  const oldScene = paints.at(-1)!;
  canvas.request({ scene: "observation-palette", pose: 101 }, true);
  oldScene.done();
  assert.equal(visible, false);
  h.tick(); paints.at(-1)!.done();
  assert.equal(visible, true);
  canvas.dispose();
});

test("motion bursts publish the latest real sample once while null/unmount cancel pending pose", () => {
  const h = clockFixture();
  const poses: ({ alpha: number; sampledAt: number } | null)[] = [];
  const publisher = createPoseFramePublisher<(typeof poses)[number]>(pose => poses.push(pose), h.clock);
  for (let i = 0; i < 50; i++) publisher.set({ alpha: i, sampledAt: i });
  assert.equal(h.jobs.size, 1); h.tick(16);
  assert.deepEqual(poses, [{ alpha: 49, sampledAt: 49 }]);
  publisher.set({ alpha: 50, sampledAt: 50 });
  const queued = [...h.jobs.values()][0]!.run;
  publisher.set(null); queued();
  assert.deepEqual(poses.at(-1), null);
  assert.equal(h.jobs.size, 0);
  publisher.set({ alpha: 51, sampledAt: 51 });
  const unmounted = [...h.jobs.values()][0]!.run;
  publisher.dispose(); unmounted(); publisher.set({ alpha: 52, sampledAt: 52 });
  assert.equal(poses.length, 2);
  assert.equal(h.jobs.size, 0);
});
