import assert from "node:assert/strict";
import test from "node:test";

import {
  createDeviceOrientationViewTracker,
  deviceMotionAngleUnit,
  normalizeDeviceMotionAngles,
} from "./device-orientation-view";

const close = (actual: number, expected: number, tolerance = 1e-7) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test("observed Android upright roll is a valid angle, not a lost pose", () => {
  for (const gamma of [175.56, -175.56, 180, -180]) {
    const normalized = normalizeDeviceMotionAngles(
      { alpha: 34.171, beta: -85.656, gamma }, deviceMotionAngleUnit("android"),
    );
    assert.ok(normalized, "real Android roll beyond 90 degrees must survive the input boundary");
    close(normalized.gammaDeg, gamma);
  }
  assert.equal(normalizeDeviceMotionAngles({ alpha: 0, beta: 0, gamma: 180.01 }, "degrees"), null);
  assert.equal(normalizeDeviceMotionAngles({ alpha: 0, beta: 0, gamma: Math.PI }, "radians"), null,
    "Android evidence does not change the unverified iOS contract");
});

test("Android upright attitude works immediately without an independent compass anchor", () => {
  const tracker = createDeviceOrientationViewTracker("degrees");
  const first = tracker.updateMotion({ alpha: 1, beta: -90, gamma: 0 }, 1000)!;
  close(first.headingDeg!, 1);
  tracker.setCompassHeading(240);
  const turned = tracker.updateMotion({ alpha: 123, beta: -90, gamma: 0 }, 1020)!;
  close(turned.headingDeg!, 123);
  const still = tracker.updateMotion({ alpha: 123, beta: -90, gamma: 0 }, 1040)!;
  assert.deepEqual(still.basis, turned.basis, "a stopped phone cannot creep toward a separate compass or filter target");
});
test("Android preserves near-zero degrees and crosses north continuously", () => {
  const tracker = createDeviceOrientationViewTracker("degrees");
  const first = tracker.updateMotion({ alpha: 359, beta: -90, gamma: 0 }, 1)!;
  const next = tracker.updateMotion({ alpha: 1, beta: -90, gamma: 0 }, 2)!;
  close(((next.headingDeg! - first.headingDeg! + 540) % 360) - 180, 2);
  close(next.alphaDeg, 1);
});
test("Android supports the poles and rejects invalid or reordered frames", () => {
  const tracker = createDeviceOrientationViewTracker("degrees");
  for (const [at, beta, altitude] of [[1, 0, -1], [2, -180, 1]] as const) {
    const pose = tracker.updateMotion({ alpha: 0, beta, gamma: 0 }, at)!;
    close(pose.basis.forward[2], altitude); assert.equal(pose.headingDeg, null);
  }
  assert.equal(tracker.updateMotion({ alpha: 1, beta: -90, gamma: 0 }, 2), null);
  assert.equal(tracker.updateMotion({ alpha: NaN, beta: -90, gamma: 0 }, 3), null);
  tracker.reset();
  close(tracker.updateMotion({ alpha: 30, beta: -90, gamma: 0 }, 1)!.headingDeg!, 30);
});
test("radian platform retains its separate compass-referenced boundary", () => {
  const tracker = createDeviceOrientationViewTracker("radians");
  assert.equal(deviceMotionAngleUnit("ios"), "radians");
  assert.equal(tracker.updateMotion({ alpha: 0, beta: Math.PI / 3, gamma: 0 }, 1), null);
  tracker.setCompassHeading(30);
  close(tracker.updateMotion({ alpha: 0, beta: Math.PI / 3, gamma: 0 }, 2)!.headingDeg!, 30);
});
