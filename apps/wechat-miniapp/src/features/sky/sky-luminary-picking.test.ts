import assert from "node:assert/strict";
import test from "node:test";
import { drawSkyScene, skyPickIdentity } from "./sky-scene-render";
import { pickPaintedSkyObjects, type SkyPickSnapshot, skyObjectKindLabel } from "./sky-object-picking";
import { locatedBodyOccludesMarker } from "./sky-located-object";
import { createSkyViewBasis, projectSkyDirectionUnclipped } from "./sky-view-projection";
import type { SkyRenderSurface } from "./sky-render-surface";
import type { ResolvedSkyReport } from "./sky-stellar-scene";

const at = "2026-09-28T04:00:00.000Z";
function paint(altitude = 45, failed = "", duplicate = false) {
  const row = { at, sunAzimuthDeg: 90, sunAltitudeDeg: altitude, sunAngularDiameterDeg: .53,
    moonAzimuthDeg: 90.1, moonAltitudeDeg: altitude, moonAngularDiameterDeg: .5, moonIllumination: .9 };
  const report = { hourly: duplicate ? [row, row] : [row], skyScene: { state: "UNAVAILABLE", frames: [] },
    targetFrames: [] } as unknown as ResolvedSkyReport;
  const basis = createSkyViewBasis(90, 90 + Math.max(0, altitude), 0)!;
  const surface = new Proxy({}, { get: (_target, key) => () => key !== failed }) as SkyRenderSurface;
  let snapshot: SkyPickSnapshot | null = null;
  drawSkyScene(surface, report, at, null, null, 400, 800, "NIGHT", value => { snapshot = value; },
    undefined, 2, null, basis);
  return { snapshot: snapshot as SkyPickSnapshot | null, report, basis };
}

test("rendered Sun/Moon discs share accurate identity, large-area picking and location-marker replacement", () => {
  const { snapshot, report, basis } = paint();
  assert.ok(snapshot);
  assert.deepEqual(snapshot.objects.map(object => object.reference), ["SOLAR:SUN", "SOLAR:MOON"]);
  const sun = snapshot.objects[0]!, moon = snapshot.objects[1]!;
  assert.equal(sun.kind, "STAR"); assert.equal(moon.kind, "MOON");
  assert.equal(skyObjectKindLabel(sun.kind), "恒星"); assert.equal(skyObjectKindLabel(moon.kind), "月球");
  assert.equal(sun.magnitude, null);
  const input = { x: sun.x - sun.hitDisc!.majorRadiusPx * .8, y: sun.y,
    frameAt: at, ...skyPickIdentity(report) };
  assert.ok(Math.abs(input.x - sun.x) > 18, "exercise visible limb beyond ordinary centre tolerance");
  assert.equal(pickPaintedSkyObjects(snapshot, input)[0]?.reference, "SOLAR:SUN");
  assert.deepEqual(pickPaintedSkyObjects(snapshot, { ...input, frameAt: "other" }), []);
  for (const object of snapshot.objects) {
    assert.equal(locatedBodyOccludesMarker(object.reference, report.hourly[0], basis, 400, 800, 2, { x: 200, y: 400 }), true);
    assert.equal(locatedBodyOccludesMarker(object.reference, report.hourly[0], basis, 400, 800, 100, { x: 200, y: 400 }), false);
  }
});

test("failed or ambiguous discs cannot be picked; the independent successful body survives", () => {
  assert.deepEqual(paint(45, "sun").snapshot?.objects.map(object => object.reference), ["SOLAR:MOON"]);
  assert.deepEqual(paint(45, "moon").snapshot?.objects.map(object => object.reference), ["SOLAR:SUN"]);
  assert.deepEqual(paint(45, "", true).snapshot?.objects, []);
  assert.deepEqual(paint(-1).snapshot?.objects, []);
});

test("partial sunrise keeps its visible limb selectable but rejects the below-horizon area", () => {
  const { snapshot, basis, report } = paint(-.1);
  assert.ok(snapshot?.objects.some(object => object.reference === "SOLAR:SUN"));
  const above = projectSkyDirectionUnclipped(90, .08, basis, 400, 800, 2)!;
  const below = projectSkyDirectionUnclipped(90, -.1, basis, 400, 800, 2)!;
  const input = { frameAt: at, ...skyPickIdentity(report) };
  assert.ok(pickPaintedSkyObjects(snapshot, { ...input, x: above.x, y: above.y }).some(object => object.reference === "SOLAR:SUN"));
  assert.deepEqual(pickPaintedSkyObjects(snapshot, { ...input, x: below.x, y: below.y }), []);
});
