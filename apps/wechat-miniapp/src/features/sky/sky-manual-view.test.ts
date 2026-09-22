import assert from "node:assert/strict";
import test from "node:test";
import { createSkyViewBasis, projectSkyDirection } from "./sky-view-projection.ts";
import { dragSkyView, INITIAL_MANUAL_SKY_VIEW } from "./sky-manual-view.ts";

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
