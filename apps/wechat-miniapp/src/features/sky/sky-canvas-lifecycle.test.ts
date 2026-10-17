import assert from "node:assert/strict";
import test from "node:test";
import { createPoseFramePublisher, createSkyCanvasFrameClock, createSkyCanvasLifecycle, measuredCanvasSize, skyCanvasFailureCode,
  type CanvasClock, type SkyCanvasFrameCanvas } from "./sky-canvas-lifecycle";
import { createSkyReadyImages } from "./sky-ready-presentation";

test("public Canvas failure diagnostics retain known stages and exclude native details", () => {
  assert.equal(skyCanvasFailureCode(new Error("sky_canvas_callback_timeout")), "sky_canvas_callback_timeout");
  assert.equal(skyCanvasFailureCode(new Error("sky_canvas_retirement_failed", { cause: new Error("private native detail") })), "sky_canvas_retirement_failed");
  for (const error of [new Error("native request failed: https://private.invalid/?credential=example"),
    new Error("sky_canvas_callback_timeout: private path"), "sky_canvas_native_error", null]) {
    assert.equal(skyCanvasFailureCode(error), "sky_canvas_unknown_failure");
  }
});

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
function nativeFrames() {
  let next = 0;
  const callbacks = new Map<number, () => void>(), cancelled: number[] = [];
  const canvas: SkyCanvasFrameCanvas = {
    requestAnimationFrame(run) { callbacks.set(++next, run); return next; },
    cancelAnimationFrame(id) { cancelled.push(id); callbacks.delete(id); },
  };
  return { canvas, callbacks, cancelled, frame() {
    const selected = [...callbacks][0]; assert.ok(selected, "expected a native frame callback");
    callbacks.delete(selected[0]); selected[1]();
  } };
}

test("display frame admission keeps startup and deadlines timed, and cancels the original native node", () => {
  const timing = clockFixture(), first = nativeFrames(), second = nativeFrames();
  let display: SkyCanvasFrameCanvas | null = null, runs = 0;
  const clock = createSkyCanvasFrameClock(() => display, timing.clock);
  clock.schedule(() => runs++, 0); timing.tick();
  assert.equal(runs, 1, "first measurement cannot depend on a not-yet-created display");
  display = first.canvas;
  const deadline = clock.schedule(() => runs++, 5000);
  assert.equal(first.callbacks.size, 0, "failure deadlines do not wait for a display frame");
  clock.cancel(deadline); assert.equal(timing.jobs.size, 0);
  const pending = clock.schedule(() => runs++, 0), late = [...first.callbacks.values()][0]!;
  display = second.canvas; clock.cancel(pending); late();
  assert.equal(first.cancelled.length, 1); assert.equal(second.cancelled.length, 0);
  assert.equal(runs, 1); assert.equal(timing.jobs.size, 0);
  clock.schedule(() => runs++, 0); const duplicate = [...second.callbacks.values()][0]!;
  second.frame(); duplicate();
  assert.equal(runs, 2); assert.equal(timing.jobs.size, 0); assert.equal(second.callbacks.size, 0);
  display = {}; clock.schedule(() => runs++, 0); timing.tick(); assert.equal(runs, 3);
});

test("native frame request failure falls back once per surface and recovers after explicit reset", t => {
  const log = t.mock.method(console, "error", () => {}), timing = clockFixture();
  const native = nativeFrames(); let attempts = 0, broken = true, runs = 0;
  const request = native.canvas.requestAnimationFrame!;
  native.canvas.requestAnimationFrame = callback => {
    attempts++; if (broken) throw new Error("private native request detail"); return request(callback);
  };
  const clock = createSkyCanvasFrameClock(() => native.canvas, timing.clock);
  for (let i = 0; i < 3; i++) { clock.schedule(() => runs++, 0); timing.tick(); }
  assert.equal(runs, 3); assert.equal(attempts, 1);
  assert.deepEqual(log.mock.calls.map(call => call.arguments), [["[starward-native]", { code: "sky_canvas_frame_schedule_failed" }]]);
  broken = false; clock.resetFailures(); clock.schedule(() => runs++, 0); native.frame();
  assert.equal(attempts, 2); assert.equal(runs, 4); assert.equal(timing.jobs.size, 0);
});

test("missing frame callbacks recover once without a late draw; failed native cancellation remains fenced", t => {
  const log = t.mock.method(console, "error", () => {}), timing = clockFixture(), native = nativeFrames();
  let display = native.canvas, runs = 0;
  const clock = createSkyCanvasFrameClock(() => display, timing.clock);
  clock.schedule(() => runs++, 0); const late = [...native.callbacks.values()][0]!;
  timing.tick(5000); late();
  assert.equal(runs, 1); assert.equal(native.cancelled.length, 1); assert.equal(timing.jobs.size, 0);
  clock.schedule(() => runs++, 0); timing.tick(); assert.equal(runs, 2);
  const replacement = nativeFrames(); display = replacement.canvas;
  replacement.canvas.cancelAnimationFrame = () => { throw new Error("private native cancel detail"); };
  const handles = [clock.schedule(() => runs++, 0), clock.schedule(() => runs++, 0)];
  const stale = [...replacement.callbacks.values()];
  handles.forEach(handle => clock.cancel(handle)); stale.forEach(callback => callback());
  assert.equal(runs, 2); assert.equal(timing.jobs.size, 0);
  clock.schedule(() => runs++, 0); timing.tick(); assert.equal(runs, 3);
  assert.deepEqual(log.mock.calls.map(call => call.arguments), [
    ["[starward-native]", { code: "sky_canvas_frame_callback_timeout" }],
    ["[starward-native]", { code: "sky_canvas_frame_cancel_failed" }],
  ]);
});

test("the real Canvas lifecycle admits the latest frame on RAF and fences retained, resized and disposed callbacks", () => {
  const timing = clockFixture(), displays: ReturnType<typeof nativeFrames>[] = [];
  let display: SkyCanvasFrameCanvas | null = null, measurements = 0;
  const painted: { frame: number; done: () => void }[] = [], presented: number[] = [], released: object[] = [];
  const clock = createSkyCanvasFrameClock(() => display, timing.clock);
  const canvas = createSkyCanvasLifecycle<number, object>({
    measure(done) { measurements++; done({ width: 390, height: 844 }); },
    createContext() { const next = nativeFrames(); displays.push(next); display = next.canvas; clock.resetFailures(); return next; },
    releaseContext(context) { released.push(context); display = null; clock.resetFailures(); },
    validateContext: () => true,
    paint: (_context, frame, _size, done) => painted.push({ frame, done }),
    presented: frame => presented.push(frame), invalidated() {}, failed(error) { throw error; },
  }, clock);
  canvas.ready(); canvas.request(0); timing.tick(); painted[0]!.done();
  for (let frame = 1; frame <= 50; frame++) canvas.request(frame);
  assert.equal(displays[0]!.callbacks.size, 1); assert.equal(painted.length, 1);
  displays[0]!.frame(); assert.equal(painted[1]!.frame, 50);
  canvas.request(51); assert.equal(displays[0]!.callbacks.size, 0, "one writer remains in flight");
  painted[1]!.done(); displays[0]!.frame(); painted[2]!.done();
  assert.deepEqual(presented, [0, 51]);
  assert.equal(timing.jobs.size, 0); assert.equal(displays[0]!.callbacks.size, 0, "idle does not create a render loop");
  canvas.request(52); const hidden = [...displays[0]!.callbacks.values()][0]!;
  canvas.hide(true); hidden(); assert.equal(painted.length, 3); assert.equal(timing.jobs.size, 0);
  canvas.show(); assert.equal(displays[0]!.callbacks.size, 0, "show cannot replay a hidden frame");
  canvas.request(53); displays[0]!.frame(); painted[3]!.done();
  assert.equal(measurements, 2); assert.equal(displays.length, 1, "Sources reuses only the revalidated display");
  canvas.request(54); const resized = [...displays[0]!.callbacks.values()][0]!;
  canvas.resize(); resized(); timing.tick(); painted[4]!.done();
  assert.equal(displays.length, 2); assert.equal(released.length, 1); assert.equal(painted[4]!.frame, 54);
  canvas.request(55); const disposed = [...displays[1]!.callbacks.values()][0]!;
  canvas.dispose(); disposed(); canvas.request(56);
  assert.deepEqual(presented, [0, 51, 53, 54]); assert.equal(released.length, 2);
  assert.equal(timing.jobs.size, 0); assert(displays.every(item => item.callbacks.size === 0));
});

test("finite image reveal renews the single display writer on RAF and returns to idle", () => {
  const timing = clockFixture(), native = nativeFrames(), images = createSkyReadyImages(), image = {};
  let now = 0, count = 0, pending: ReturnType<typeof images.prepare>;
  const pixels: number[] = [];
  const clock = createSkyCanvasFrameClock(() => native.canvas, timing.clock);
  const canvas = createSkyCanvasLifecycle<number, object>({
    measure: done => done({ width: 390, height: 844 }), createContext: () => ({}),
    paint(_context, _frame, _size, done) {
      pending = images.prepare(now); pending.draw(image, .5, () => true, value => { pixels.push(value); return true; }); done();
    },
    presented(frame) { count++; pending.commit(now); if (pending.animating) canvas.request(frame, false, true); },
    invalidated() {}, failed(error) { throw error; },
  }, clock);
  canvas.ready(); canvas.request(1);
  for (now = 0; now <= 160; now += 16) {
    assert.equal(native.callbacks.size, 1, "one admission, no animation timer before RAF");
    assert([...timing.jobs.values()].every(job => job.delay === 5000), "only the callback watchdog may be timed");
    native.frame();
  }
  assert.equal(count, 11); assert.equal(pixels.length, 10); assert.equal(pixels.at(-1), .5);
  assert.equal(native.callbacks.size, 0); assert.equal(timing.jobs.size, 0);
  canvas.dispose();
});

test("finite continuation retains timed fallback, latest input priority and lifecycle cancellation", () => {
  for (const supported of [true, false]) {
    const timing = clockFixture(), native = nativeFrames(), painted: number[] = [];
    const clock = createSkyCanvasFrameClock(() => supported ? native.canvas : {}, timing.clock);
    let renew = true;
    const canvas = createSkyCanvasLifecycle<number, object>({
      measure: done => done({ width: 390, height: 844 }), createContext: () => ({}), validateContext: () => true,
      paint(_context, frame, _size, done) { painted.push(frame); done(); },
      presented(frame) { if (renew) canvas.request(frame, false, true); }, invalidated() {}, failed(error) { throw error; },
    }, clock);
    const next = (continuation = false) => supported ? native.frame() : timing.tick(continuation ? 16 : 0);
    canvas.ready(); canvas.request(1); next();
    assert.equal(supported ? native.callbacks.size : [...timing.jobs.values()].filter(job => job.delay === 16).length, 1);
    canvas.request(2); renew = false; next();
    assert.deepEqual(painted, [1, 2], "new input replaces the continuation's snapshot without another writer");
    assert.equal(timing.jobs.size, 0); assert.equal(native.callbacks.size, 0);
    for (const action of ["hide", "retain", "resize", "dispose"] as const) {
      if (action !== "hide") canvas.show();
      renew = true; canvas.request(3); next();
      const late = supported ? [...native.callbacks.values()][0]! : [...timing.jobs.values()].find(job => job.delay === 16)!.run;
      const count = painted.length;
      if (action === "resize") canvas.resize();
      else if (action === "dispose") canvas.dispose();
      else canvas.hide(action === "retain");
      late();
      assert.equal(painted.length, count, action + " fences a cancelled continuation");
      if (action === "resize") { renew = false; next(); }
      else assert.equal(timing.jobs.size, 0);
    }
    assert.equal(native.callbacks.size, 0); assert.equal(timing.jobs.size, 0);
  }
});

function canvasFixture(validateContext?: () => boolean) {
  const timing = clockFixture();
  const measurements: ((rect: unknown) => void)[] = [];
  const painted: { frame: number; size: { width: number; height: number }; context: object; done: () => void }[] = [];
  const presented: number[] = [], errors: unknown[] = [], released: object[] = [];
  let contexts = 0, invalidations = 0, failure = "";
  const canvas = createSkyCanvasLifecycle<number, object>({
    ...(validateContext ? { validateContext } : {}),
    measure: done => { if (failure === "measure") throw Error("query_failed"); measurements.push(done); },
    createContext: () => { if (failure === "context") throw Error("context_failed"); return { id: ++contexts }; },
    releaseContext: context => {
      released.push(context);
      if (failure === "release" || failure === "paint-release") throw Error("native_release_failed");
    },
    paint: (context, frame, size, done) => { if (failure === "paint" || failure === "paint-release") throw Error("draw_failed"); painted.push({ context, frame, size, done }); },
    presented: frame => presented.push(frame), invalidated: () => { invalidations++; },
    failed: error => errors.push(error),
  }, timing.clock);
  return { ...timing, canvas, measurements, painted, presented, errors, released,
    counts: () => ({ contexts, invalidations }), fail: (kind: string) => { failure = kind; },
    measure: (size = { width: 375, height: 812 }) => measurements.at(-1)!(size),
  };
}

test("Sources suspension fences late draws and reuses only a revalidated surface with a fresh frame", () => {
  const h = canvasFixture(() => true); h.canvas.ready(); h.canvas.request(1); h.tick(); h.measure();
  const first = h.painted[0]!;
  h.canvas.hide(true); first.done();
  assert.deepEqual(h.presented, []); assert.equal(h.released.length, 0); assert.equal(h.jobs.size, 0);
  h.canvas.show(); assert.equal(h.jobs.size, 0, "a retained surface cannot replay the old frame");
  h.canvas.request(2); h.tick(); assert.equal(h.measurements.length, 2); h.measure();
  assert.equal(h.painted[1]!.context, first.context); h.painted[1]!.done();
  assert.deepEqual(h.presented, [2]); assert.equal(h.counts().contexts, 1);
  h.canvas.hide(); h.canvas.dispose(); assert.deepEqual(h.released, [first.context]);
});

for (const transition of ["hide", "resize", "unmount", "dispose", "invalid-return"] as const) {
  test(`native release failure still fences ${transition} and permits only a fresh recovery`, () => {
    const h = canvasFixture(() => false);
    h.canvas.ready(); h.canvas.request(1); h.tick(); h.measure();
    const previous = h.painted[0]!;
    h.fail("release");
    const invalidations = h.counts().invalidations;
    assert.doesNotThrow(() => {
      if (transition === "hide") h.canvas.hide();
      if (transition === "resize") h.canvas.resize();
      if (transition === "unmount") h.canvas.setMounted(false);
      if (transition === "dispose") h.canvas.dispose();
      if (transition === "invalid-return") {
        h.canvas.hide(true); h.canvas.show(); h.canvas.request(2); h.tick(); h.measure();
      }
    });
    previous.done();
    assert.deepEqual(h.presented, [], "a failed retired generation cannot publish picking or sources");
    assert.deepEqual(h.released, [previous.context], "retirement is attempted once, not claimed successful");
    assert.equal(h.jobs.size, 0);
    assert.equal(h.errors.length, 1);
    assert.equal((h.errors[0] as Error).message, "native_release_failed");
    if (transition !== "dispose") assert(h.counts().invalidations > invalidations);
    h.canvas.request(3);
    assert.equal(h.jobs.size, 0, "ordinary requests cannot silently clear a retirement failure");
    h.fail(""); h.canvas.show(); h.canvas.setMounted(true); h.canvas.retry();
    if (transition !== "dispose") {
      h.tick(); h.measure(); h.painted[1]!.done();
      assert.deepEqual(h.presented, [3]);
      assert.notEqual(h.painted[1]!.context, previous.context);
    }
    h.canvas.dispose(); previous.done();
    assert.equal(h.jobs.size, 0);
    assert.equal(h.released.length, transition === "dispose" ? 1 : 2);
  });
}

test("paint and native release failures both survive the single failure report and explicit retry", () => {
  const h = canvasFixture();
  h.canvas.ready(); h.canvas.request(1); h.tick(); h.fail("paint-release");
  assert.doesNotThrow(() => h.measure());
  assert.equal(h.errors.length, 1);
  const failure = h.errors[0] as Error & { cause: Error; releaseError: Error };
  assert.equal(failure.cause.message, "draw_failed");
  assert.equal(failure.releaseError.message, "native_release_failed");
  assert.equal(h.counts().invalidations, 1);
  assert.equal(h.released.length, 1); assert.equal(h.jobs.size, 0);
  h.canvas.request(2); assert.equal(h.jobs.size, 0);
  h.fail(""); h.canvas.retry(); h.tick(); h.measure(); h.painted[0]!.done();
  assert.deepEqual(h.presented, [2]);
  h.canvas.dispose(); assert.equal(h.released.length, 2);
});

test("Sources return falls back to release/rebuild for invalid, unavailable or resized native surface", () => {
  for (const mode of ["invalid", "unavailable", "resized"] as const) {
    const h = canvasFixture(mode === "unavailable" ? undefined : () => mode !== "invalid");
    h.canvas.ready(); h.canvas.request(1); h.tick(); h.measure(); h.painted[0]!.done();
    h.canvas.hide(true); h.canvas.show(); h.canvas.request(2); h.tick();
    h.measure(mode === "resized" ? {width:812,height:375} : undefined);
    assert.notEqual(h.painted[1]!.context,h.painted[0]!.context,mode);
    assert.deepEqual(h.released,[h.painted[0]!.context]); h.canvas.dispose();
    assert.equal(h.released.length,2);
  }
});

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

test("page hide and native-node removal release the old context before a fresh foreground draw", () => {
  const h = canvasFixture();
  h.canvas.ready(); h.canvas.request(1); h.tick(); h.measure();
  const first = h.painted[0]!;
  h.canvas.hide(); h.canvas.setMounted(false);
  first.done();
  assert.deepEqual(h.released, [first.context]);
  assert.deepEqual(h.presented, [], "hidden page completion cannot publish a stale frame");

  h.canvas.show(); h.canvas.request(2);
  assert.equal(h.jobs.size, 0, "foreground waits for the replacement native node");
  h.canvas.setMounted(true); h.tick(); h.measure();
  const second = h.painted.at(-1)!;
  assert.notEqual(second.context, first.context);
  second.done();
  assert.deepEqual(h.presented, [2]);
  h.canvas.dispose();
  assert.deepEqual(h.released, [first.context, second.context]);
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
