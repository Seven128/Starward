import { PROCEDURAL_SKY_LANDSCAPE } from "./sky-landscape-mask";
import assert from "node:assert/strict";
import test from "node:test";
import { isUnambiguousTapGesture, pickPaintedSkyObjects, type SkyPickSnapshot } from "./sky-object-picking.ts";
import { createSkyViewBasis, projectSkyDirection, skyHorizontalDirection } from "./sky-view-projection.ts";
import { skyLandscapeOccludes } from "./sky-landscape-geometry.ts";

const snapshot: SkyPickSnapshot = {
  catalogVersion: "catalog-v1",
  catalogHash: "a".repeat(64),
  frameAt: "2026-09-10T12:00:00.000Z",
  width: 390,
  height: 844,
  objects: [
    { reference: "HR:2", displayName: "HR 2", kind: "STAR", magnitude: 2, x: 100, y: 100 },
    { reference: "HR:1", displayName: "Alpha", kind: "STAR", magnitude: 1, x: 100, y: 100 },
    { reference: "HR:3", displayName: "HR 3", kind: "STAR", magnitude: 0, x: 200, y: 200 },
  ],
};

test("picking uses only the exact painted catalog frame and deterministic ordering", () => {
  assert.deepEqual(pickPaintedSkyObjects(snapshot, {
    x: 101, y: 100, frameAt: snapshot.frameAt,
    catalogVersion: snapshot.catalogVersion, catalogHash: snapshot.catalogHash,
  }).map((row) => row.reference), ["HR:1", "HR:2"]);
  assert.deepEqual(pickPaintedSkyObjects(snapshot, {
    x: 101, y: 100, frameAt: "2026-09-10T12:30:00.000Z",
    catalogVersion: snapshot.catalogVersion, catalogHash: snapshot.catalogHash,
  }), []);
});

test("pinch, drag and cancellation never become catalog taps", () => {
  assert.equal(isUnambiguousTapGesture({ startedWithTouches: 1, maximumTouches: 1, travelPx: 8, cancelled: false }), true);
  assert.equal(isUnambiguousTapGesture({ startedWithTouches: 1, maximumTouches: 2, travelPx: 0, cancelled: false }), false);
  assert.equal(isUnambiguousTapGesture({ startedWithTouches: 1, maximumTouches: 1, travelPx: 9, cancelled: false }), false);
  assert.equal(isUnambiguousTapGesture({ startedWithTouches: 1, maximumTouches: 1, travelPx: 0, cancelled: true }), false);
});

test("an above-horizon star covered by the painted virtual foreground cannot be picked", () => {
  // The northwest grove occupies this ray at +10 degrees; it is not the
  // geometric horizon or a claim about the observing site's obstruction.
  const foreground: SkyPickSnapshot = { ...snapshot,
    view: { basis: createSkyViewBasis(324.462322, 100, 0)!, verticalFovDeg: 85,
      landscape: PROCEDURAL_SKY_LANDSCAPE },
    objects: [{ ...snapshot.objects[0]!, x: 195, y: 422 }],
  };
  const input = { x: 195, y: 422, frameAt: foreground.frameAt,
    catalogVersion: foreground.catalogVersion, catalogHash: foreground.catalogHash };
  assert.deepEqual(pickPaintedSkyObjects(foreground, input), []);
  const open = { ...foreground, view: { ...foreground.view!, landscape: null } };
  assert.equal(pickPaintedSkyObjects(open, input)[0]?.reference, "HR:2");
});

test("near-edge tap tolerance never revives a hidden point but exposed globe and ring pixels remain selectable", () => {
  const basis = createSkyViewBasis(324.462322, 100, 0)!;
  // Keep this contract at the current authored crown edge rather than an old
  // crown's now-covered coordinates. The fixture must actually straddle it.
  assert.equal(skyLandscapeOccludes(skyHorizontalDirection(332.1,10)!),true);
  assert.equal(skyLandscapeOccludes(skyHorizontalDirection(333,10)!),false);
  const covered = projectSkyDirection(332.1, 10, basis, 390, 844, 85)!;
  const open = projectSkyDirection(333, 10, basis, 390, 844, 85)!;
  assert.ok(Math.hypot(open.x-covered.x,open.y-covered.y)<18);
  const object = { ...snapshot.objects[0]!, x:covered.x,y:covered.y };
  const frame: SkyPickSnapshot = { ...snapshot, view:{basis,verticalFovDeg:85,landscape:PROCEDURAL_SKY_LANDSCAPE},objects:[object] };
  const input = { x:open.x,y:open.y,frameAt:frame.frameAt,
    catalogVersion:frame.catalogVersion,catalogHash:frame.catalogHash };
  assert.deepEqual(pickPaintedSkyObjects(frame,input),[],"the adjacent open sky is not the covered star");
  assert.deepEqual(pickPaintedSkyObjects({...frame,objects:[{...object,
    hitDisc:{majorRadiusPx:3,minorRadiusPx:3,minorDirection:[0,1]}}]},input),[],"a fully covered small disc is also not resurrected by 18px tolerance");
  assert.equal(pickPaintedSkyObjects({...frame,objects:[{...object,
    hitDisc:{majorRadiusPx:20,minorRadiusPx:20,minorDirection:[0,1]}}]},input)[0]?.reference,"HR:2","the exposed limb remains selectable");
  assert.equal(pickPaintedSkyObjects({...frame,objects:[{...object,
    hitSegments:[[covered.x,open.y,open.x+30,open.y]]}]},input)[0]?.reference,"HR:2","the exposed ring stroke remains selectable");
});
