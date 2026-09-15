import assert from "node:assert/strict";
import test from "node:test";
import { createSkyOrientationController, compassAccuracyState } from "./sky-orientation-controller";
import type { CompassPort, CompassEvent, DeviceMotionEvent } from "./compass-lifecycle";
import { createSkyViewBasis, projectSkyDirection, type SkyViewBasis } from "./sky-view-projection";

const settled = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function harness(options: { compassError?: string; motionError?: string; platform?: string } = {}) {
  let now = 1000, sequence = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const motion = new Set<(event: DeviceMotionEvent) => void>();
  const compass = new Set<(event: CompassEvent) => void>();
  const calls: string[] = [];
  let presented: SkyViewBasis | null = null;
  const port: CompassPort = {
    onDeviceMotionChange(fn) { motion.add(fn); }, offDeviceMotionChange(fn) { motion.delete(fn); },
    async startDeviceMotionListening(options_) { calls.push(`motion:${options_.interval}`); if (options.motionError) throw new Error(options.motionError); },
    async stopDeviceMotionListening() { calls.push("stop-motion"); },
    onCompassChange(fn) { compass.add(fn); }, offCompassChange(fn) { compass.delete(fn); },
    async startCompass() { calls.push("compass"); if (options.compassError) throw new Error(options.compassError); },
    async stopCompass() { calls.push("stop-compass"); },
  };
  const controller = createSkyOrientationController({ port, platform: options.platform ?? "android", presented: () => presented,
    changed() {}, clock: { now: () => now,
      schedule(fn, ms) { const id = ++sequence; timers.set(id, { at: now + ms, fn }); return id; },
      cancel(id) { timers.delete(id as number); } } });
  const elapse = (ms: number) => {
    const until = now + ms;
    for (;;) {
      const next = [...timers].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      timers.delete(next[0]); now = next[1].at; next[1].fn();
    }
    now = until;
  };
  return { controller, motion, compass, calls, elapse,
    move(alpha: number, beta = -90, gamma = 0) { now++; for (const fn of motion) fn({ alpha, beta, gamma }); },
    quality(accuracy: number | string, direction = 0) { for (const fn of compass) fn({ accuracy, direction }); },
    paint() { presented = controller.snapshot().pose?.basis ?? null; return presented; },
    present(basis: SkyViewBasis) { presented = basis; } };
}
function center(basis: SkyViewBasis | null, azimuth: number, altitude = 0) {
  assert.ok(basis);
  const point = projectSkyDirection(azimuth, altitude, basis, 400, 800, 45);
  assert.ok(point, "the intended object must still be visible");
  assert.ok(Math.abs(point.x - 200) < 1e-7 && Math.abs(point.y - 400) < 1e-7, JSON.stringify(point));
}

test("Android full attitude follows without compass availability or quality gating", async () => {
  const h = harness({ compassError: "unavailable" });
  await h.controller.start(); h.move(0); center(h.paint(), 0);
  assert.equal(h.controller.snapshot().state, "READY");
  h.move(45); center(h.paint(), 45);
  assert.equal(h.motion.size, 1); assert.equal(h.compass.size, 0);
  assert.equal(h.calls[0], "motion:game");
  h.controller.dispose(); await settled(); assert.equal(h.motion.size, 0);
});

test("freeze uses actual presentation and confirm uses the newest unrendered callback", async () => {
  const h = harness(); await h.controller.start(); h.move(0); h.paint();
  h.move(15); // Not yet presented: do not freeze this pose.
  assert.equal(h.controller.begin(), true); center(h.controller.snapshot().pose!.basis, 0);
  h.move(90); assert.equal(h.controller.commit(), true); center(h.paint(), 0);
  h.move(135); center(h.paint(), 45);
  const stationary = h.controller.snapshot().pose!.basis;
  h.move(135); assert.deepEqual(h.controller.snapshot().pose!.basis, stationary);
  h.controller.dispose();
});

test("cancel resumes previous correction at the current pose and recalibration replaces it", async () => {
  const h = harness(); await h.controller.start(); h.move(0); h.paint();
  h.controller.begin(); h.move(90); h.controller.commit(); h.paint();
  h.controller.begin(); h.move(135); h.controller.cancel(); center(h.paint(), 45);
  h.controller.begin(); h.move(180); h.controller.commit(); center(h.paint(), 45);
  h.move(225); center(h.paint(), 90); h.controller.dispose();
});

test("background preserves presented calibration, rejects old callbacks and requires a fresh reference", async () => {
  const h = harness(); await h.controller.start(); h.move(0); h.paint();
  h.controller.begin(); h.move(90); h.controller.commit(); h.paint();
  const oldMotion = [...h.motion][0]!;
  h.move(120); // Unpainted newer raw sample is not the held screen.
  h.controller.hide(); await settled(); oldMotion({ alpha: 180, beta: -90, gamma: 0 });
  center(h.controller.snapshot().pose!.basis, 0);
  assert.equal(h.controller.snapshot().alignment.ready, false);
  h.controller.show(); await settled(); h.move(180); center(h.paint(), 0);
  assert.equal(h.controller.snapshot().alignment.mode, "needs-alignment");
  assert.equal(h.controller.begin(), true); assert.equal(h.controller.commit(), true);
  h.move(225); center(h.paint(), 45); h.controller.dispose();
});

test("expiry cannot confirm an old pose; reconnect keeps held view until recalibration", async () => {
  const h = harness(); await h.controller.start(); h.move(0); h.paint();
  h.controller.begin(); h.move(90); h.controller.commit(); h.paint();
  h.controller.begin(); h.elapse(501);
  assert.equal(h.controller.commit(), false);
  assert.equal(h.controller.snapshot().state, "STALE");
  assert.equal(h.controller.snapshot().alignment.mode, "needs-alignment");
  h.controller.stop(); await h.controller.start(); h.move(180);
  center(h.paint(), 0); h.controller.begin(); h.controller.commit();
  h.move(225); center(h.paint(), 45); h.controller.dispose();
});

test("quality warning is sustained metadata, never another heading or pose owner", async () => {
  const h = harness(); await h.controller.start(); h.move(0); const initial = h.paint();
  h.quality("low", 240); assert.equal(h.controller.snapshot().state, "READY");
  for (let i = 0; i < 11; i++) { h.elapse(200); h.move(0); h.quality("low", 240); }
  assert.equal(h.controller.snapshot().state, "LOW_ACCURACY");
  assert.deepEqual(h.paint(), initial);
  h.quality("high"); h.quality("high"); assert.equal(h.controller.snapshot().state, "LOW_ACCURACY");
  h.quality("high"); assert.equal(h.controller.snapshot().state, "READY");
  h.controller.dispose();
});

test("empty/unknown/numeric compass quality keeps its declared meaning", () => {
  assert.equal(compassAccuracyState(""), "UNAVAILABLE");
  assert.equal(compassAccuracyState("high"), "READY");
  assert.equal(compassAccuracyState("medium"), "READY");
  assert.equal(compassAccuracyState("unknown"), "LOW_ACCURACY");
  assert.equal(compassAccuracyState(30), "LOW_ACCURACY");
});

test("permission failure preserves manual fallback and can be retried", async () => {
  const options = { motionError: "permission denied" };
  const h = harness(options); await h.controller.start();
  assert.equal(h.controller.snapshot().state, "DENIED"); assert.equal(h.controller.snapshot().pose, null);
  options.motionError = ""; await h.controller.start(); h.move(45); center(h.paint(), 45);
  h.controller.dispose();
});

test("new page has no correction; explicit manual mode does not resume sensors on show", async () => {
  const h = harness(); await h.controller.start(); h.move(0); h.paint();
  h.controller.begin(); h.move(90); h.controller.commit();
  h.controller.stopFollowing(); await settled(); h.controller.hide(); h.controller.show(); await settled();
  assert.equal(h.controller.active, false); h.controller.dispose();
  const next = harness(); await next.controller.start(); next.move(90); center(next.paint(), 90); next.controller.dispose();
});

test("all displayed axes, including zenith, can serve as a full alignment reference", async () => {
  const h = harness(); await h.controller.start(); h.move(0);
  h.present(createSkyViewBasis(0, 180, 0)!);
  h.controller.begin(); h.move(90); h.controller.commit();
  center(h.paint(), 0, 90); h.controller.dispose();
});

test("retained radian adapter explains a live but undefined initial phone-top direction", async () => {
  const h = harness({ platform: "ios" }); await h.controller.start(); h.quality("high", 0);
  for (let i = 0; i < 4; i++) {
    h.move(0, Math.PI / 2, 0); h.elapse(400);
    assert.equal(h.controller.snapshot().state, "CALIBRATING");
    assert.match(h.controller.snapshot().reason, /放平手机/);
  }
  h.move(0, Math.PI / 3, 0);
  assert.equal(h.controller.snapshot().state, "READY");
  assert.ok(h.paint()); h.controller.dispose();
});
