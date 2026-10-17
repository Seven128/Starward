import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createSkyContextSession } from "./sky-context-session";
import { createSkyObservationTime } from "./sky-observation-time";
import { createSkyOrientationController } from "./sky-orientation-controller";
import { createSkyCanvasLifecycle } from "./sky-canvas-lifecycle";
import { createSkyTimeCommitContinuity } from "./sky-time-commit-continuity";
import { skyForecastPresentation } from "../../services/forecast-presentation";
import type { ContextVersion } from "../../services/observation-context-version";

// Run the page's actual lifecycle registrations with real synchronous owners.
// Native sensor, Canvas and hook delivery are controlled ports; this does not
// assert platform callback order, visible native controls or physical behavior.
const source = ts.createSourceFile("spot-sky-page.tsx", readFileSync(
  process.env.SKY_LIFECYCLE_SOURCE ?? new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotSkyPage") as ts.FunctionDeclaration;
assert.ok(page?.body);
const lifecycleNames = ["hideSkyPage", "showSkyPage"];
const declarations = page.body.statements.filter(node => ts.isVariableStatement(node) &&
  node.declarationList.declarations.some(declaration => lifecycleNames.includes(declaration.name.getText(source))));
const assignments = page.body.statements.filter(node => ts.isExpressionStatement(node) &&
  /^(hideSkyPageRef|showSkyPageRef)\.current\s*=/.test(node.getText(source)));
const hooks = page.body.statements.filter(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
  (["useDidHide", "useDidShow"].includes(node.expression.expression.getText(source)) ||
    node.expression.expression.getText(source) === "useEffect" && node.getText(source).includes("Taro.onAppHide")));
assert.ok(hooks.length >= 3);
const code = ts.transpileModule([...declarations, ...assignments, ...hooks].map(node => node.getText(source)).join("\n"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const ageEffects = page.body.statements.filter(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
  node.expression.expression.getText(source) === "useEffect" && node.getText(source).includes("setCompassNow"));
assert.equal(ageEffects.length, 1);
const ageCode = ts.transpileModule(ageEffects[0]!.getText(source),
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const settled = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const at = "2026-09-22T13:00:00.000Z";
const context = { contextId: "ctx:a" as ContextVersion["contextId"], revision: 1, contextFingerprint: "fp:1", selectedAtUtc: at,
  timezone: "Asia/Shanghai", localDate: "2026-09-22" };

function harness() {
  const session = createSkyContextSession(context.contextId, () => ({ observationContext: context,
    selectedSpotId: "spot:a", mapResetVersion: 0, spotOpenRequestVersion: 0 }));
  const time = createSkyObservationTime();
  time.bind("ctx:a:1:fp:1", at, { startAt: at, endAt: "2026-09-22T15:00:00.000Z" });
  const motion = new Set<(event: { alpha: number; beta: number; gamma: number }) => void>();
  let acquisitions = 0, nextJob = 0, gestureCancels = 0, browsingStops = 0, releases = 0, measurements = 0, stateWrites = 0;
  const jobs = new Map<number, () => void>();
  const schedule = (run: () => void) => { jobs.set(++nextJob, run); return nextJob; };
  const sensorJobs = new Map<number, () => void>();
  let compassSample: ((event: { direction: number; accuracy: number }) => void) | undefined;
  const orientation = createSkyOrientationController({ platform: "android", presented: () => null, changed() {},
    clock: { now: () => 1000, schedule: run => { sensorJobs.set(++nextJob, run); return nextJob; },
      cancel: handle => { sensorJobs.delete(handle as number); } },
    port: { onDeviceMotionChange: fn => { motion.add(fn); }, offDeviceMotionChange: fn => { motion.delete(fn); },
      async startDeviceMotionListening() { acquisitions++; }, async stopDeviceMotionListening() {},
      onCompassChange: fn => { compassSample = fn; }, offCompassChange: fn => { if (compassSample === fn) compassSample = undefined; },
      async startCompass() {}, async stopCompass() {} } });
  let paintDone: (() => void) | undefined, canvasFrames = 0;
  const canvas = createSkyCanvasLifecycle<number, object>({
    measure: done => { measurements++; done({ width: 390, height: 844 }); }, createContext: () => ({}),
    releaseContext: () => { releases++; }, validateContext: () => true,
    paint: (_canvas, _frame, _size, done) => { paintDone = done; },
    presented: () => { canvasFrames++; }, invalidated() {}, suspended() {}, failed: error => { throw error; },
  }, { schedule, cancel: handle => { jobs.delete(handle as number); } });
  const hide: (() => void)[] = [], show: (() => void)[] = [];
  let appHide: (() => void) | undefined;
  const cleanup: (() => void)[] = [];
  const visible = { current: true }, mounted = { current: true }, retained = { current: false };
  const sandbox = {
    contextSession: session, observationTime: time, canvasLifecycle: canvas,
    timeCommitContinuity: createSkyTimeCommitContinuity(skyForecastPresentation),
    hideSkyPageRef: { current: (_retained?: boolean) => {} }, showSkyPageRef: { current: () => {} },
    viewportActiveRef: visible, viewportMountedRef: mounted, viewportMeasurementRevision: { current: 0 },
    sourceReturnRef: retained, cancelSkyCalibration() {},
    skyTapRef: { current: null },
    opticalSourcesOpeningRef: { current: null as object | null }, skyReturnPendingRef: { current: null as object | null },
    orientationSettingsOpeningRef:{current:null as object | null},
    cancelSkyGestureRef: { current: () => {
      gestureCancels++;
      // A cancelled pan may restore following. The real controller must defer
      // acquisition while hidden, including AppHide arriving before PageHide.
      orientation.stopFollowing(); void orientation.start();
    } },
    stopBrowsingAnimation: () => { browsingStops++; }, hideCompass: orientation.hide, showCompass: orientation.show,
    setPageVisible: () => { stateWrites++; }, setTimeSaving: () => { stateWrites++; },
    setSourceReturn: () => { stateWrites++; }, setTimeIntent: () => { stateWrites++; }, measureBottomControls() {},
    Date: { now: () => 1200 },
    useDidHide: (callback: () => void) => { hide.push(callback); }, useDidShow: (callback: () => void) => { show.push(callback); },
    useEffect: (effect: () => (() => void) | void) => { const result = effect(); if (result) cleanup.push(result); },
    Taro: { onAppHide: (callback: () => void) => { appHide = callback; },
      offAppHide: (callback: () => void) => { assert.strictEqual(callback, appHide); appHide = undefined; } },
  };
  vm.runInNewContext(code, sandbox);
  assert.ok(appHide);
  const nextFrame = (value: number) => {
    canvas.ready(); canvas.request(value);
    const job = [...jobs].find(([, run]) => run); assert.ok(job); jobs.delete(job[0]); job[1]();
    assert.ok(paintDone); return paintDone;
  };
  return { session, time, orientation, canvas, motion, visible, mounted, retained, jobs, sandbox,
    sampleCompass: () => { assert.ok(compassSample); compassSample({ direction: 0, accuracy: 5 }); },
    hide: () => { for (const callback of hide) callback(); }, show: () => { for (const callback of show) callback(); },
    background: () => appHide!(), nextFrame,
    counts: () => ({ acquisitions, gestureCancels, browsingStops, releases, measurements, canvasFrames, stateWrites }),
    dispose: () => { for (const callback of cleanup) callback(); orientation.dispose(); canvas.dispose(); } };
}

test("AppHide first retires Context commits and 1x time before PageHide or React", () => {
  const page = harness();
  const request = page.session.begin(context); assert.ok(request);
  for (const name of ["opticalSourcesOpeningRef", "skyReturnPendingRef", "orientationSettingsOpeningRef"] as const)
    page.sandbox[name].current = {};
  page.time.play(1000); page.background();
  assert.equal(page.session.isCurrent(request), false, "background cannot keep an API commit owner alive");
  assert.equal(page.session.busy, false);
  assert.equal(page.time.snapshot().mode, "PAUSED");
  assert.equal(page.time.snapshot().at, "2026-09-22T13:00:00.200Z");
  assert.equal(page.visible.current, false);
  for (const name of ["opticalSourcesOpeningRef", "skyReturnPendingRef", "orientationSettingsOpeningRef"] as const)
    assert.equal(page.sandbox[name].current, null, `background retires ${name}`);
  assert.equal(page.counts().gestureCancels, 1);
  assert.equal(page.counts().browsingStops, 1);
  page.hide(); assert.equal(page.session.visibilityRevision, 1, "duplicate PageHide is one retirement");
  page.dispose();
});

test("AppHide first stops the real native listener and cancellation cannot reacquire it until PageShow", async () => {
  const page = harness(); await page.orientation.start();
  assert.equal(page.motion.size, 1); page.background(); await settled();
  assert.equal(page.motion.size, 0);
  assert.equal(page.counts().acquisitions, 1);
  page.hide(); await settled(); assert.equal(page.counts().acquisitions, 1);
  page.show(); await settled(); assert.equal(page.motion.size, 1); assert.equal(page.counts().acquisitions, 2);
  page.dispose();
});

test("background clears a hidden Sources retained surface and rejects its late paint without replay on return", () => {
  const page = harness(), latePaint = page.nextFrame(1);
  page.retained.current = true; page.hide();
  assert.equal(page.counts().releases, 0);
  page.background();
  assert.equal(page.retained.current, false); assert.equal(page.counts().releases, 1);
  latePaint(); assert.equal(page.counts().canvasFrames, 0);
  page.show(); assert.equal(page.jobs.size, 0, "PageShow waits for a newly published visible render");
  page.canvas.show(); const currentPaint = page.nextFrame(2); currentPaint();
  assert.equal(page.counts().canvasFrames, 1); page.dispose();
});

test("a detached AppHide callback has no effect after the page unmounts", async () => {
  const page = harness(); await page.orientation.start(); page.time.play(1000);
  page.mounted.current = false; const before = page.counts(); page.background();
  assert.deepEqual(page.counts(), before); assert.equal(page.time.snapshot().mode, "PLAYING");
  assert.equal(page.session.visibilityRevision, 0); assert.equal(page.motion.size, 1); page.dispose();
});

test("the actual retained-sample age clock retires on hide and fences a queued callback before React", async () => {
  const page = harness(); await page.orientation.start(); page.sampleCompass();
  const timers = new Map<number, () => void>();
  let timerId = 0, updates = 0, dependencies: readonly unknown[] | undefined;
  const cleanup: { current: (() => void) | void } = { current: undefined };
  const render = (pageVisible: boolean, withSample = true) => {
    const snapshot = page.orientation.snapshot();
    vm.runInNewContext(ageCode, {
      pageVisible, viewportActiveRef: page.visible,
      compassTelemetry: withSample ? snapshot.telemetry : { sampledAt: null }, devicePose: withSample ? snapshot.pose : null,
      Date: { now: () => 1500 }, setCompassNow: () => { updates++; },
      setInterval: (callback: () => void, delay: number) => { assert.equal(delay, 1000); timers.set(++timerId, callback); return timerId; },
      clearInterval: (id: number) => { timers.delete(id); },
      useEffect(effect: () => (() => void) | void, next: readonly unknown[]) {
        if (dependencies && next.length === dependencies.length && next.every((value, index) => Object.is(value, dependencies![index]))) return;
        cleanup.current?.(); dependencies = Array.from(next); cleanup.current = effect();
      },
    });
  };
  assert.equal(page.orientation.snapshot().telemetry.sampledAt, 1000);
  render(true); assert.equal(timers.size, 1);
  const queued = [...timers.values()][0]!; queued(); assert.equal(updates, 1);
  page.background(); await settled();
  assert.equal(page.orientation.snapshot().telemetry.sampledAt, 1000, "hide keeps honest last-sample telemetry");
  queued(); assert.equal(updates, 1, "a queued callback cannot update the hidden page before effects retire");
  render(false); assert.equal(timers.size, 0, "a retained sample must not keep background polling alive");
  page.show(); await settled(); render(true, false); assert.equal(timers.size, 0, "no new sample needs no age clock");
  page.sampleCompass(); render(true); assert.equal(timers.size, 1, "visible current telemetry resumes one clock");
  cleanup.current?.(); assert.equal(timers.size, 0); page.dispose();
});
