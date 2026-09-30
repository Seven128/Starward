import assert from "node:assert/strict";
import test from "node:test";
import { createSkyViewBasis, projectSkyDirection, unprojectSkyPoint, validBasis, type SkyViewBasis } from "./sky-view-projection.ts";
import { dragSkyView, INITIAL_MANUAL_SKY_VIEW } from "./sky-manual-view.ts";
import { captureSkyDomeTarget } from "./sky-browsing-camera.ts";

for (const fov of [240, 180, 120, 45, 6, 1.5]) {
  test(`grabbed celestial point follows the finger at ${fov} degrees including rolled camera`, () => {
    for (const gamma of [-30,0,30]) {
      const basis = createSkyViewBasis(350,110,gamma)!;
      const forward = basis.forward;
      const azimuth = Math.atan2(forward[0],forward[1])*180/Math.PI;
      const altitude = Math.asin(forward[2])*180/Math.PI;
      const start = projectSkyDirection(azimuth,altitude,basis,390,780,fov)!;
      assert.ok(start);
      const end = { x: start.x+63, y: start.y-97 };
      const moved = dragSkyView(basis,start,end,390,780,fov);
      const projected = projectSkyDirection(azimuth,altitude,moved,390,780,fov)!;
      assert.ok(projected);
      assert.ok(Math.abs(projected.x-end.x)<1e-6);
      assert.ok(Math.abs(projected.y-end.y)<1e-6);
      assert.equal(dragSkyView(basis,start,start,390,780,fov),basis, "reverse motion returns to the original basis");
      assert.notDeepEqual(moved,basis, "a no-op camera cannot pass the visible result");
    }
  });
}
test("manual initialization is explicit north/up and invalid geometry cannot corrupt it", () => {
  const initial = INITIAL_MANUAL_SKY_VIEW;
  const point = projectSkyDirection(0,45,initial,390,780,45)!;
  assert.ok(Math.abs(point.x-195)<1e-6 && Math.abs(point.y-390)<1e-6);
  assert.equal(dragSkyView(initial,point,{ x:NaN,y:2 },390,780,45),initial);
  assert.equal(dragSkyView(initial,point,{ x:22,y:2 },390,0,45),initial);
});

test("repeated horizontal browsing keeps the horizon level while a grabbed off-center ray follows the finger", () => {
  let basis: SkyViewBasis = INITIAL_MANUAL_SKY_VIEW;
  for (let index = 0; index < 5; index++) {
    const start = { x: 50, y: 450 }, end = { x: 380, y: 450 };
    const grabbed = unprojectSkyPoint(start.x, start.y, basis, 390.4, 844, 45)!;
    const next = dragSkyView(basis, start, end, 390.4, 844, 45);
    const target = projectSkyDirection(Math.atan2(grabbed[0], grabbed[1]) * 180 / Math.PI,
      Math.asin(grabbed[2]) * 180 / Math.PI, next, 390.4, 844, 45)!;
    assert.ok(target && Math.hypot(target.x - end.x, target.y - end.y) < 1e-6);
    const azimuth = Math.atan2(next.forward[0], next.forward[1]);
    const altitude = Math.asin(next.forward[2]);
    const levelRight = [Math.cos(azimuth), -Math.sin(azimuth), 0];
    const levelUp = [-Math.sin(altitude) * Math.sin(azimuth), -Math.sin(altitude) * Math.cos(azimuth), Math.cos(altitude)];
    const roll = Math.atan2(next.right.reduce((sum, value, axis) => sum + value * levelUp[axis]!, 0),
      next.right.reduce((sum, value, axis) => sum + value * levelRight[axis]!, 0));
    assert.ok(Math.abs(roll) < 1e-6, `horizontal pan ${index + 1} accumulated ${roll * 180 / Math.PI}° roll`);
    basis = next;
  }
  assert.ok(Math.abs(Math.asin(basis.forward[2]) * 180 / Math.PI - 45) < 2,
    "a westward sky pan must not turn the center from mid-sky to the horizon");
});

test("a wide or rolled drag moves continuously and reversing returns to the gesture-start view", () => {
  for (const fov of [45, 120, 240]) {
    for (const basis of [INITIAL_MANUAL_SKY_VIEW, createSkyViewBasis(350, 110, 30)!]) {
      let previous = basis;
      const start = { x: 50, y: 450 };
      for (let x = 51; x <= 380; x++) {
        const next = dragSkyView(basis, start, { x, y: 450 }, 390.4, 844, fov);
        assert.ok(validBasis(next));
        const maximumAxisStep = Math.max(...(["right", "up", "forward"] as const).map(axis =>
          Math.hypot(...next[axis].map((value, index) => value - previous[axis][index]!))));
        assert.ok(maximumAxisStep < 0.1, `${fov}° drag jumped at x=${x}: ${maximumAxisStep}`);
        previous = next;
      }
      previous = basis;
      for (let y = 451; y <= 800; y++) {
        const next = dragSkyView(basis, start, { x: 50, y }, 390.4, 844, fov);
        assert.ok(validBasis(next));
        const maximumAxisStep = Math.max(...(["right", "up", "forward"] as const).map(axis =>
          Math.hypot(...next[axis].map((value, index) => value - previous[axis][index]!))));
        assert.ok(maximumAxisStep < 0.1, `${fov}° vertical drag jumped at y=${y}: ${maximumAxisStep}`);
        previous = next;
      }
      assert.equal(dragSkyView(basis, start, start, 390.4, 844, fov), basis);
    }
  }
});

test("a zenith overview keeps its existing free-rotation path without a pole singularity", () => {
  const dome = captureSkyDomeTarget(INITIAL_MANUAL_SKY_VIEW);
  const nearCenter = dragSkyView(dome, { x: 195, y: 422 }, { x: 380, y: 422 }, 390.4, 844, 267.8);
  assert.ok(validBasis(nearCenter));
  assert.deepEqual(captureSkyDomeTarget(nearCenter).right, dome.right,
    "a tiny center offset must not flip the full dome by 180°");
  const offCenter = dragSkyView(dome, { x: 195, y: 200 }, { x: 380, y: 200 }, 390.4, 844, 267.8);
  assert.ok(validBasis(offCenter));
  assert.notDeepEqual(captureSkyDomeTarget(offCenter).right, dome.right,
    "existing off-center overview rotation remains available");
});
