import assert from "node:assert/strict";
import test from "node:test";
import Quaternion from "quaternion";
import { createSkyNavigationPath } from "./sky-navigation-path";
import { createSkyViewBasis, validBasis, type SkyVector } from "./sky-view-projection";
import { skyDomeFieldOfView } from "./sky-zoom";

const view = (azimuth: number, zenith = 90, roll = 0) => {
  const base = createSkyViewBasis(azimuth, zenith, 0)!;
  if (!roll) return base;
  const turn = Quaternion.fromAxisAngle([...base.forward], roll * Math.PI / 180);
  return { right: turn.rotateVector([...base.right]) as SkyVector,
    up: turn.rotateVector([...base.up]) as SkyVector, forward: base.forward };
};
const angle = (a: SkyVector, b: SkyVector) => Math.acos(Math.max(-1, Math.min(1,
  a.reduce((sum, value, index) => sum + value * b[index]!, 0))));

test("a nearby result follows the short north-crossing route without a pointless zoom or roll reset", () => {
  const from = view(359, 90, 135), target = view(1);
  const path = createSkyNavigationPath(from, target, 45, 45, 390, 844)!;
  let distance = 0;
  for (let i = 0; i <= 20; i++) {
    const current = path.sample(i / 20);
    assert.ok(validBasis(current.view)); assert.ok(Math.abs(current.fov - 45) < 1e-10);
    const next = angle(from.forward, current.view.forward);
    assert.ok(next >= distance - 1e-12); assert.ok(next <= 2 * Math.PI / 180 + 1e-10);
    distance = next;
  }
  assert.ok(angle(path.sample(1).view.forward, target.forward) < 1e-7);
  assert.ok(angle(path.sample(1).view.up, target.up) > 1, "finding a target preserves the current roll");
});

test("far and large-scale moves turn during both outward and inward zoom, with accurate finite endpoints", () => {
  for (const [a, b, f0, f1] of [[0, 170, .05, .05], [0, 120, 45, 4],
    [359, 180, 264, 45], [0, 180, .05, 45]] as const) {
    const from = view(a, 90, -135), target = view(b);
    const path = createSkyNavigationPath(from, target, f0, f1, 390, 844)!;
    let previous = from.forward, travelled = 0, changingTogether = 0;
    let priorFov = path.sample(0).fov;
    for (let i = 1; i <= 200; i++) {
      const current = path.sample(i / 200);
      assert.ok(validBasis(current.view));
      assert.ok(current.fov >= .05 && current.fov <= skyDomeFieldOfView(390, 844));
      const distance = angle(previous, current.view.forward);
      if (distance > 1e-7 && Math.abs(current.fov - priorFov) > 1e-6) changingTogether++;
      travelled += distance; previous = current.view.forward; priorFov = current.fov;
    }
    assert.ok(changingTogether > 120, "pan and zoom share the path rather than separate phases");
    assert.ok(Math.abs(travelled - angle(from.forward, target.forward)) < 1e-6);
    assert.ok(angle(previous, target.forward) < 1e-7);
    assert.equal(path.sample(1).fov, f1);
    assert.equal(path.sample(0).view, from);
    assert.ok(path.duration >= 240 && path.duration <= 1600);
    if (f0 === f1) assert.ok(path.sample(.5).fov > 90, "distant tiny views pull out while moving");
  }
});

test("stationary pointing, polar views and invalid input preserve their meaning", () => {
  const from = view(0, 0, 20);
  const same = createSkyNavigationPath(from, from, 4, 4, 390, 844)!;
  assert.equal(same.duration, 0); assert.equal(same.sample(.5).fov, 4);
  const zoom = createSkyNavigationPath(from, from, .05, 45, 390, 844)!;
  for (let i = 0; i <= 20; i++) {
    const current = zoom.sample(i / 20);
    assert.equal(current.view, from); assert.ok(current.fov >= .05 && current.fov <= 45);
  }
  assert.equal(createSkyNavigationPath(from, from, NaN, 45, 390, 844), null);
  assert.equal(createSkyNavigationPath(from, from, 45, 0, 390, 844), null);
  assert.equal(createSkyNavigationPath(from, from, 45, 45, 0, 844), null);
});
