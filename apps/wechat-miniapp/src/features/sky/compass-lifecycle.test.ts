import assert from "node:assert/strict";
import test from "node:test";
import {
  createCompassLifecycle,
  orientationStartFailureDiagnostic,
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
  assert.equal(listeners.size, 0, "a pending native start has no publishable listener");
  const second = newPage.start(() => { newEvents++; }, () => assert.fail("unexpected start failure"));
  const oldCleanup = oldPage.stop();
  assert.equal(oldPage.active, false);
  assert.equal(newPage.active, true);
  requests[0]!.resolve(); await first; await scheduled();
  assert.equal(requests.length, 2);
  assert.equal(listeners.size, 0);
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

test("hide while device motion starts never begins a background compass session", async () => {
  const compassListeners = new Set<(event: CompassEvent) => void>();
  const motionListeners = new Set<(event: DeviceMotionEvent) => void>();
  let motionStartOptions: Parameters<NonNullable<CompassPort["startDeviceMotionListening"]>>[0] | undefined;
  let compassStarts = 0;
  let compassStops = 0;
  let motionStops = 0;
  let failure: unknown;
  const lifecycle = createCompassLifecycle({
    onCompassChange(listener) { compassListeners.add(listener); },
    offCompassChange(listener) { compassListeners.delete(listener); },
    startCompass() { compassStarts++; return Promise.resolve(); },
    stopCompass() { compassStops++; return Promise.resolve(); },
    onDeviceMotionChange(listener) { motionListeners.add(listener); },
    offDeviceMotionChange(listener) { motionListeners.delete(listener); },
    startDeviceMotionListening(options) { motionStartOptions = options; },
    stopDeviceMotionListening() { motionStops++; },
  }, { requireDeviceMotion: true });

  const start = lifecycle.start(
    () => assert.fail("hidden session must not publish compass events"),
    error => { failure = error; },
    () => assert.fail("hidden session must not publish motion events"),
  );
  await scheduled();
  assert.equal(motionListeners.size, 1);
  assert.equal(compassStarts, 0);

  const stop = lifecycle.stop();
  motionStartOptions?.success?.();
  await Promise.all([start, stop]);

  assert.equal(failure, undefined);
  assert.equal(compassStarts, 0, "late motion success must not start the compass after hide");
  assert.equal(compassStops, 0);
  assert.equal(motionStops, 1);
  assert.equal(compassListeners.size, 0);
  assert.equal(motionListeners.size, 0);
  assert.equal(lifecycle.active, false);
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

test("required orientation lifecycle identifies the native start stage without exposing it to product state", async () => {
  for (const [failedStage, expectedMessage] of [
    ["device_motion", "device_motion_start_failed:synthetic motion failure"],
    ["compass", "compass_start_failed:synthetic compass failure"],
  ] as const) {
    let failure: unknown;
    let compassStarts = 0;
    const port: CompassPort = {
      onCompassChange() {},
      offCompassChange() {},
      startCompass() {
        compassStarts++;
        return failedStage === "compass"
          ? Promise.reject(new Error("synthetic compass failure"))
          : Promise.resolve();
      },
      stopCompass() { return Promise.resolve(); },
      onDeviceMotionChange() {},
      offDeviceMotionChange() {},
      startDeviceMotionListening(options) {
        if (failedStage === "device_motion") options.fail?.({ errMsg: "synthetic motion failure" });
        else options.success?.();
      },
      stopDeviceMotionListening() {},
    };
    const lifecycle = createCompassLifecycle(port, { requireDeviceMotion: true });
    await lifecycle.start(
      () => undefined,
      error => { failure = error; },
      () => undefined,
    );
    assert.equal(failure instanceof Error && failure.message, expectedMessage);
    assert.equal(compassStarts, failedStage === "compass" ? 1 : 0);
    assert.equal(lifecycle.active, false);
  }
});

test("orientation startup diagnostics retain only bounded stage, reason and numeric code", () => {
  assert.equal(
    orientationStartFailureDiagnostic(new Error("compass_start_failed:startCompass:fail system permission denied errCode: 2001 private detail")),
    "compass_start_failed:permission_denied:code_2001",
  );
  assert.equal(
    orientationStartFailureDiagnostic(new Error("device_motion_start_failed:startDeviceMotionListening:fail unsupported")),
    "device_motion_start_failed:unsupported",
  );
  assert.equal(
    orientationStartFailureDiagnostic(new Error("compass_start_failed:opaque vendor text")),
    "compass_start_failed:unknown",
  );
});

test("explicit compass startup precedes listener registration to avoid WeChat auto-start races", async () => {
  const order: string[] = [];
  const lifecycle = createCompassLifecycle({
    onCompassChange() { order.push("listen"); },
    offCompassChange() {},
    startCompass() { order.push("start"); return Promise.resolve(); },
    stopCompass() { return Promise.resolve(); },
  });

  await lifecycle.start(() => undefined, error => { throw error; });
  assert.deepEqual(order, ["start", "listen"]);
  assert.equal(await lifecycle.stop(), true);
});

test("an implicit compass start from listener registration accepts the native already-active result", async () => {
  const listeners = new Set<(event: CompassEvent) => void>();
  let running = false;
  let failure: unknown;
  let events = 0;
  const lifecycle = createCompassLifecycle({
    onCompassChange(listener) {
      listeners.add(listener);
      running = true;
    },
    offCompassChange(listener) { listeners.delete(listener); },
    startCompass() {
      return Promise.reject(new Error("startCompass:fail compass already started"));
    },
    stopCompass() { running = false; return Promise.resolve(); },
  });
  await lifecycle.start(
    () => { events++; },
    error => { failure = error; },
  );
  assert.equal(failure, undefined);
  assert.equal(lifecycle.active, true);
  assert.equal(running, true);
  [...listeners][0]!({ direction: 42, accuracy: 1 });
  assert.equal(events, 1);
  assert.equal(await lifecycle.stop(), true);
  assert.equal(running, false);
});

test("native stop settles before removing the last listener, without publishing during release", async () => {
  const compassListeners = new Set<(event: CompassEvent) => void>();
  const motionListeners = new Set<(event: DeviceMotionEvent) => void>();
  const stopGate = deferred();
  const calls: string[] = [];
  let compassRunning = false;
  let motionRunning = false;
  let published = 0;
  const lifecycle = createCompassLifecycle({
    onCompassChange(listener) { compassListeners.add(listener); },
    offCompassChange(listener) {
      calls.push("compass off");
      compassListeners.delete(listener);
      if (!compassListeners.size) compassRunning = false;
    },
    async startCompass() { compassRunning = true; },
    async stopCompass() {
      calls.push("compass stop");
      if (!compassRunning) throw new Error("fail to disable, not enable?");
      compassRunning = false;
    },
    onDeviceMotionChange(listener) { motionListeners.add(listener); },
    offDeviceMotionChange(listener) {
      calls.push("motion off");
      motionListeners.delete(listener);
      if (!motionListeners.size) motionRunning = false;
    },
    async startDeviceMotionListening() { motionRunning = true; },
    async stopDeviceMotionListening() {
      calls.push("motion stop");
      if (!motionRunning) throw new Error("fail to disable, not enable?");
      await stopGate.promise;
      motionRunning = false;
    },
  });
  const start = () => lifecycle.start(() => published++, error => { throw error; }, () => published++);
  await start();
  const stop = lifecycle.stop();
  await scheduled();
  for (const listener of compassListeners) listener({ direction: 20, accuracy: 5 });
  for (const listener of motionListeners) listener({ alpha: 20, beta: 0, gamma: 0 });
  assert.equal(published, 0, "cancelled session must reject events before native stop completes");
  stopGate.resolve();
  assert.equal(await stop, true, "removing the last listener first makes native stop fail");
  assert.ok(calls.indexOf("motion stop") < calls.indexOf("motion off"));
  assert.ok(calls.indexOf("compass stop") < calls.indexOf("compass off"));
  assert.equal(compassListeners.size, 0);
  assert.equal(motionListeners.size, 0);
  await start();
  assert.equal(lifecycle.active, true);
  assert.equal(await lifecycle.stop(), true);
});

test("failed native stop retains its listener until retry confirms release", async () => {
  const listeners = new Set<(event: CompassEvent) => void>();
  let running = false;
  let rejectNextStop = true;
  let starts = 0;
  let publications = 0;
  const lifecycle = createCompassLifecycle({
    onCompassChange(listener) { listeners.add(listener); },
    offCompassChange(listener) {
      listeners.delete(listener);
      if (!listeners.size) running = false;
    },
    async startCompass() { starts++; running = true; },
    async stopCompass() {
      if (rejectNextStop) {
        rejectNextStop = false;
        throw new Error("temporary native stop failure");
      }
      if (!running) throw new Error("fail to disable, not enable?");
      running = false;
    },
  });
  const start = () => lifecycle.start(() => publications++, error => { throw error; });
  await start();
  assert.equal(await lifecycle.stop(), false);
  assert.equal(listeners.size, 1, "do not disable an uncertain stream by removing its final listener");
  for (const listener of listeners) listener({ direction: 20, accuracy: 5 });
  assert.equal(publications, 0, "retained native listener has no publication authority");
  await start();
  assert.equal(starts, 2, "retry must release the previous stream and start a fresh one");
  assert.equal(lifecycle.active, true);
  assert.equal(listeners.size, 1);
  assert.equal(await lifecycle.stop(), true);
  assert.equal(listeners.size, 0);
});

test("WeChat listener registration starts the compass initially and after lifecycle stop", async () => {
  const listeners = new Set<(event: CompassEvent) => void>();
  let starts = 0;
  let stops = 0;
  let events = 0;
  const lifecycle = createCompassLifecycle({
    onCompassChange(listener) { listeners.add(listener); },
    offCompassChange(listener) { listeners.delete(listener); },
    startCompass() { starts++; return Promise.resolve(); },
    stopCompass() { stops++; return Promise.resolve(); },
  }, { listenerStartsCompass: true });

  await lifecycle.start(() => { events++; }, error => { throw error; });
  assert.equal(starts, 0);
  [...listeners][0]!({ direction: 42, accuracy: 1 });
  assert.equal(events, 1);
  assert.equal(await lifecycle.stop(), true);
  assert.equal(stops, 1);

  await lifecycle.start(() => { events++; }, error => { throw error; });
  assert.equal(starts, 0);
  [...listeners][0]!({ direction: 84, accuracy: 1 });
  assert.equal(events, 2);
  assert.equal(await lifecycle.stop(), true);
  assert.equal(stops, 2);
});
