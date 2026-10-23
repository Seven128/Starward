import { skySceneTestFrame } from "./sky-scene-test-support";
import assert from "node:assert/strict";
import test from "node:test";
import { drawSkyScene, skyPickIdentity } from "./sky-scene-render";
import { pickPaintedSkyObjects, type SkyPickSnapshot, skyObjectKindLabel } from "./sky-object-picking";
import { locatedBodyOccludesMarker } from "./sky-located-object";
import { createSkyViewBasis, projectSkyDirectionUnclipped } from "./sky-view-projection";
import type { SkyRenderSurface } from "./sky-render-surface";
import type { ResolvedSkyReport } from "./sky-stellar-scene";
import type { SkyStellarSupplementFrame } from "./sky-stellar-supplement-scene";

const at = "2026-09-28T04:00:00.000Z";
function paint(altitude = 45, failed = "", duplicate = false) {
  const row = { at, sunAzimuthDeg: 90, sunAltitudeDeg: altitude, sunAngularDiameterDeg: .53,
    moonAzimuthDeg: 90.1, moonAltitudeDeg: altitude, moonAngularDiameterDeg: .5, moonIllumination: .9 };
  const report = { hourly: duplicate ? [row, row] : [row], skyScene: { state: "UNAVAILABLE", frames: [] },
    targetFrames: [] } as unknown as ResolvedSkyReport;
  const basis = createSkyViewBasis(90, 90 + Math.max(0, altitude), 0)!;
  const surface = new Proxy({}, { get: (_target, key) => () => key !== failed }) as SkyRenderSurface;
  let snapshot: SkyPickSnapshot | null = null;
  drawSkyScene(surface, skySceneTestFrame({ observation: { data: report, frameAt: at }, view: { heading: null, pose: null, mode: "NIGHT", verticalFovDeg: 2, manualBasis: basis }, canvas: { width: 400, height: 800 }, imagery: { infrared: null } }), { painted: (({snapshot: value}) => { snapshot = value; }) });
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
  assert.deepEqual(paint(-1).snapshot?.objects.map(object=>object.reference),['SOLAR:SUN','SOLAR:MOON'],
    'full-sphere browsing keeps below-horizon bodies when no foreground hides them');
});

test("full-sphere sunrise keeps both above and below-horizon portions selectable without a foreground", () => {
  const { snapshot, basis, report } = paint(-.1);
  assert.ok(snapshot?.objects.some(object => object.reference === "SOLAR:SUN"));
  const above = projectSkyDirectionUnclipped(90, .08, basis, 400, 800, 2)!;
  const below = projectSkyDirectionUnclipped(90, -.1, basis, 400, 800, 2)!;
  const input = { frameAt: at, ...skyPickIdentity(report) };
  assert.ok(pickPaintedSkyObjects(snapshot, { ...input, x: above.x, y: above.y }).some(object => object.reference === "SOLAR:SUN"));
  assert.ok(pickPaintedSkyObjects(snapshot, { ...input, x: below.x, y: below.y }).some(object=>object.reference==='SOLAR:SUN'));
});

test("the completed Moon frame cannot pick a background star hidden by its opaque disc; failed Moon painting preserves the star", () => {
  const row = { at, sunAzimuthDeg: 270, sunAltitudeDeg: -45, sunAngularDiameterDeg: .53,
    moonAzimuthDeg: 90, moonAltitudeDeg: 45, moonAngularDiameterDeg: .5, moonIllumination: .7 };
  const geometry = { at } as SkyStellarSupplementFrame["geometry"];
  // A controlled same-frame supplement enters the actual Scene/star/body
  // owners. The ray is a regression fixture, not a new SAO astrometric claim.
  const report = { hourly: [row], skyScene: { state: "UNAVAILABLE", frames: [{ at, geometry }] },
    targetFrames: [] } as unknown as ResolvedSkyReport;
  const supplement: SkyStellarSupplementFrame = { catalogVersion: "controlled-sao", publicationHash: "a".repeat(64),
    geometry, points: [["SAO:76142", 8.8, 90, 45], ["SAO:1", 8.8, 90.5, 45]] };
  const basis = createSkyViewBasis(90, 135, 0)!;
  for (const moonAvailable of [true, false]) {
    let snapshot: SkyPickSnapshot | null = null;
    const stars: number[] = [];
    const surface = new Proxy({}, { get: (_target, key) => key === "moon" ? () => moonAvailable :
      key === "disc" ? (x: number) => { stars.push(x); } : () => true }) as SkyRenderSurface;
    drawSkyScene(surface, skySceneTestFrame({ observation: { data: report, frameAt: at, stellarSupplement: supplement }, view: { heading: null, pose: null, mode: "NIGHT", verticalFovDeg: 2, manualBasis: basis }, canvas: { width: 400, height: 800 }, imagery: { infrared: null } }), { painted: (({snapshot: value}) => { snapshot = value; }) });
    assert.equal(stars.length, 2, "both original stars still reach their original drawing owner");
    assert(snapshot);
    const frame = snapshot as SkyPickSnapshot;
    const choices = pickPaintedSkyObjects(frame, { x: 200, y: 400, frameAt: at, ...skyPickIdentity(report, supplement) });
    assert.deepEqual(choices.map(value => value.reference), moonAvailable ? ["SOLAR:MOON"] : ["SAO:76142"]);
    assert(frame.objects.some(value => value.reference === "SAO:1"), "the unoccluded independent star survives");
  }
});
