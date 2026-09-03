import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {
  createCompassLifecycle,
  type CompassEvent,
  type CompassPort,
  type DeviceMotionEvent,
} from "./compass-lifecycle";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function scheduled() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

// Execute the production page callbacks, with only native IO and clocks replaced.
const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(
  new URL("./spot-sky-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = new Set(["normalizeDegrees", "compassAccuracyState", "startCompass", "stopCompass"]);
const statements: string[] = [];
function collect(node: ts.Node) {
  if (ts.isFunctionDeclaration(node) && names.has(node.name?.text ?? "")) statements.push(node.getText(source));
  if (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.has(d.name.getText(source)))) statements.push(node.getText(source));
  ts.forEachChild(node, collect);
}
collect(source);
assert.equal(statements.length, 4);
const callbackCode = ts.transpileModule(statements.join("\n") + "\n({startCompass,stopCompass});", {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;

function harness() {
  const requests: ReturnType<typeof deferred>[] = [];
  const listeners = new Set<(event: CompassEvent) => void>();
  const timers = new Set<() => void>();
  const state = { status: "PERMISSION_REQUIRED", heading: null as number | null, reason: "", nativeActive: false, stopCalls: 0 };
  let rejectStop = false;
  let stopGate: ReturnType<typeof deferred> | null = null;
  const lifecycle = createCompassLifecycle({
    onCompassChange: listener => { listeners.add(listener); },
    offCompassChange: listener => { listeners.delete(listener); },
    startCompass: () => {
      const request = deferred(); requests.push(request);
      return request.promise.then(() => { state.nativeActive = true; });
    },
    stopCompass: async () => {
      state.stopCalls++;
      if (rejectStop) throw new Error("synthetic stop failure");
      if (stopGate) await stopGate.promise;
      state.nativeActive = false;
    },
  });
  const callbacks = vm.runInNewContext(callbackCode, {
    compassLifecycle: lifecycle, view: "DETAIL", Error, useCallback: (fn: unknown) => fn,
    lastCompassHeadingRef: { current: null }, compassHeadingRef: { current: null },
    compassQualityRef: { current: null }, devicePoseRef: { current: null },
    motionOffsetRef: { current: null }, compassStaleTimerRef: { current: null },
    motionStaleTimerRef: { current: null },
    setCompassState: (value: string) => { state.status = value; },
    setCompassHeading: (value: number | null) => { state.heading = value; },
    setDevicePose: () => undefined,
    setCompassReason: (value: string) => { state.reason = value; },
    setTimeout: (callback: () => void) => { timers.add(callback); return callback; },
    clearTimeout: (callback: () => void) => timers.delete(callback),
  }, { timeout: 1000 }) as { startCompass(): Promise<void>; stopCompass(): void };
  return { ...callbacks, lifecycle, requests, listeners, timers, state,
    failStops(value: boolean) { rejectStop = value; },
    deferStop() { stopGate = deferred(); return stopGate; },
  };
}

test("hide during native start compensates late success without background publication", async () => {
  const h = harness();
  const start = h.startCompass();
  await scheduled();
  assert.equal(h.requests.length, 1);
  const queued = [...h.listeners][0]!;
  h.stopCompass();
  queued({ direction: 42, accuracy: 1 });
  h.requests[0]!.resolve();
  await start;
  assert.equal(h.state.nativeActive, false);
  assert.equal(h.listeners.size, 0);
  assert.equal(h.state.heading, null);
  assert.equal(h.state.status, "PERMISSION_REQUIRED");
  assert.equal(h.timers.size, 0);
});

test("stop clears trusted heading and rejects queued events and stale timers across retry", async () => {
  const h = harness();
  const start = h.startCompass(); await scheduled();
  h.requests[0]!.resolve(); await start;
  const oldEvent = [...h.listeners][0]!;
  oldEvent({ direction: 42, accuracy: 1 });
  const oldTimer = [...h.timers][0]!;
  assert.equal(h.state.status, "READY");
  h.stopCompass();
  assert.equal(h.state.heading, null);
  assert.equal(h.state.status, "PERMISSION_REQUIRED");
  const retry = h.startCompass(); await scheduled();
  h.requests[1]!.resolve(); await retry;
  [...h.listeners][0]!({ direction: 137, accuracy: 1 });
  oldEvent({ direction: 42, accuracy: 1 }); oldTimer();
  assert.equal(h.state.heading, 137);
  assert.equal(h.state.status, "READY");
  assert.equal(h.timers.size, 1);
  h.stopCompass(); await scheduled();
  assert.equal(h.state.nativeActive, false);
});

test("old startup rejection cannot clear a replacement listener or overwrite its state", async () => {
  const h = harness();
  const old = h.startCompass(); await scheduled();
  h.stopCompass();
  const current = h.startCompass();
  h.requests[0]!.reject(new Error("synthetic permission denied"));
  await old; await scheduled();
  assert.equal(h.requests.length, 2);
  assert.equal(h.listeners.size, 1);
  assert.equal(h.state.status, "CALIBRATING");
  h.requests[1]!.resolve(); await current;
  [...h.listeners][0]!({ direction: 137, accuracy: 1 });
  assert.equal(h.state.status, "READY");
  h.stopCompass(); await scheduled();
  assert.equal(h.listeners.size, 0);
  assert.equal(h.state.nativeActive, false);
});

test("replacement start waits for native stop acknowledgement and duplicate starts coalesce", async () => {
  const h = harness();
  const first = h.startCompass(); await scheduled();
  const duplicate = h.startCompass();
  assert.equal(h.requests.length, 1);
  h.requests[0]!.resolve(); await Promise.all([first, duplicate]);
  const gate = h.deferStop();
  h.stopCompass();
  const next = h.startCompass(); await scheduled();
  assert.equal(h.requests.length, 1);
  gate.resolve(); await scheduled();
  assert.equal(h.requests.length, 2);
  h.requests[1]!.resolve(); await next;
  h.stopCompass(); await scheduled();
});

test("uncertain native release blocks a new start until cleanup succeeds", async () => {
  const h = harness();
  const first = h.startCompass(); await scheduled();
  h.requests[0]!.resolve(); await first;
  h.failStops(true);
  assert.equal(await h.lifecycle.stop(), false);
  await h.startCompass();
  assert.equal(h.requests.length, 1);
  assert.equal(h.state.status, "UNAVAILABLE");
  h.failStops(false);
  const next = h.startCompass(); await scheduled();
  assert.equal(h.requests.length, 2);
  h.requests[1]!.resolve(); await next;
  h.stopCompass(); await scheduled();
  assert.equal(h.state.nativeActive, false);
});

test("current startup errors retain denied/unavailable recovery without a leaked listener", async () => {
  for (const [message, expected] of [["permission denied", "DENIED"], ["unsupported", "UNAVAILABLE"]]) {
    const h = harness();
    const start = h.startCompass(); await scheduled();
    h.requests[0]!.reject(new Error(message)); await start;
    assert.equal(h.state.status, expected);
    assert.equal(h.state.heading, null);
    assert.equal(h.listeners.size, 0);
    assert.equal(h.lifecycle.active, false);
  }
});

test("a replacement page shares native serialization and ignores the old page's late cleanup", async () => {
  const requests: ReturnType<typeof deferred>[] = [];
  const listeners = new Set<(event: CompassEvent) => void>();
  let running = false;
  const port = {
    onCompassChange(listener: (event: CompassEvent) => void) { listeners.add(listener); },
    offCompassChange(listener: (event: CompassEvent) => void) { listeners.delete(listener); },
    startCompass() {
      const request = deferred(); requests.push(request);
      return request.promise.then(() => { running = true; });
    },
    async stopCompass() { running = false; },
  };
  const oldPage = createCompassLifecycle(port);
  const newPage = createCompassLifecycle(port);
  let oldEvents = 0, newEvents = 0;
  const first = oldPage.start(() => { oldEvents++; }, () => assert.fail("unexpected start failure"));
  await scheduled();
  const queued = [...listeners][0]!;
  const second = newPage.start(() => { newEvents++; }, () => assert.fail("unexpected start failure"));
  const oldCleanup = oldPage.stop();
  queued({ direction: 42, accuracy: 1 });
  assert.equal(oldPage.active, false);
  assert.equal(newPage.active, true);
  requests[0]!.resolve(); await first; await scheduled();
  assert.equal(requests.length, 2);
  requests[1]!.resolve(); await second; await oldCleanup;
  assert.equal(running, true);
  assert.equal(listeners.size, 1);
  [...listeners][0]!({ direction: 137, accuracy: 1 });
  assert.equal(oldEvents, 0);
  assert.equal(newEvents, 1);
  assert.equal(await newPage.stop(), true);
  assert.equal(running, false);
});

test("required orientation lifecycle owns compass and device-motion streams together", async () => {
  const compassListeners = new Set<(event: CompassEvent) => void>();
  const motionListeners = new Set<(event: DeviceMotionEvent) => void>();
  let motionStartOptions: { interval?: string } | undefined;
  let compassStarts = 0;
  let motionStarts = 0;
  let compassStops = 0;
  let motionStops = 0;
  const port: CompassPort = {
    onCompassChange(listener) { compassListeners.add(listener); },
    offCompassChange(listener) { compassListeners.delete(listener); },
    startCompass() { compassStarts++; return Promise.resolve(); },
    stopCompass() { compassStops++; return Promise.resolve(); },
    onDeviceMotionChange(listener) { motionListeners.add(listener); },
    offDeviceMotionChange(listener) { motionListeners.delete(listener); },
    startDeviceMotionListening(options) {
      motionStarts++;
      motionStartOptions = options;
      options.success?.();
    },
    stopDeviceMotionListening() { motionStops++; },
  };
  const lifecycle = createCompassLifecycle(port, { requireDeviceMotion: true });
  let compassEvents = 0;
  let motionEvents = 0;
  await lifecycle.start(
    () => { compassEvents++; },
    error => { throw error; },
    () => { motionEvents++; },
  );

  assert.equal(compassStarts, 1);
  assert.equal(motionStarts, 1);
  assert.equal(motionStartOptions?.interval, "ui");
  assert.equal(compassListeners.size, 1);
  assert.equal(motionListeners.size, 1);
  [...compassListeners][0]!({ direction: 12, accuracy: 1 });
  [...motionListeners][0]!({ alpha: 0.2, beta: 0.1, gamma: 0.05 });
  assert.equal(compassEvents, 1);
  assert.equal(motionEvents, 1);

  assert.equal(await lifecycle.stop(), true);
  assert.equal(compassStops, 1);
  assert.equal(motionStops, 1);
  assert.equal(compassListeners.size, 0);
  assert.equal(motionListeners.size, 0);
});

test("required orientation lifecycle fails closed when device motion is unavailable", async () => {
  let compassStarts = 0;
  let failure: unknown;
  const port: CompassPort = {
    onCompassChange() {},
    offCompassChange() {},
    startCompass() { compassStarts++; return Promise.resolve(); },
    stopCompass() { return Promise.resolve(); },
  };
  const lifecycle = createCompassLifecycle(port, { requireDeviceMotion: true });
  await lifecycle.start(
    () => undefined,
    error => { failure = error; },
    () => undefined,
  );
  assert.equal(compassStarts, 0);
  assert.equal(failure instanceof Error && failure.message, "device_motion_unavailable");
  assert.equal(lifecycle.active, false);
});
