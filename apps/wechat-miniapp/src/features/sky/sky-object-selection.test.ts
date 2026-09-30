import test from "node:test";
import assert from "node:assert/strict";
import { createSkyObjectSelection } from "./sky-object-selection";
import { projectSkySelectionMarker } from "./sky-selection-marker";
import { createSkyViewBasis } from "./sky-view-projection";
import { skyPickSnapshotIsCurrent, pickPaintedSkyObjects, type SkyPickSnapshot } from "./sky-object-picking";

const star = { reference: "HR:7557", displayName: "Altair", kind: "STAR" as const };
const galaxy = { reference: "M:31", displayName: "仙女座星系", kind: "GALAXY" as const };
const position = { azimuthDeg: 180, altitudeDeg: 45 };
const view = { basis: createSkyViewBasis(180, 135, 0)!, width: 400, height: 800,
  center: { x: 200, y: 400 }, verticalFovDeg: 25 };

test("selection retains only immutable identity and place, never an old painted coordinate", () => {
  const owner = createSkyObjectSelection();
  const painted = { ...star, x: 10, y: 20, magnitude: .77 };
  const first = owner.select(painted, "spot:a");
  painted.x = 300; painted.displayName = "changed";
  assert.deepEqual(first, { object: star, spotId: "spot:a" });
  assert.equal(owner.snapshot(), first);
  owner.select(galaxy, "spot:a");
  assert.equal(owner.snapshot().object?.reference, galaxy.reference);
  assert.equal(first.object?.reference, star.reference, "another object cannot rewrite a prior snapshot");
  assert.deepEqual(owner.clear(), { object: null, spotId: null });
});

test("point selection survives name fade and returns to the same view without changing intent", () => {
  const owner = createSkyObjectSelection(); const selected = owner.select(star, "spot:a");
  const close = projectSkySelectionMarker(star, position, view)!;
  const wide = projectSkySelectionMarker(star, position, { ...view, verticalFovDeg: 90 })!;
  const middle = projectSkySelectionMarker(star, position, { ...view, verticalFovDeg: 45 })!;
  assert.equal(close.shape, "cross"); assert.equal(wide.shape, "cross");
  assert.equal(close.nameOpacity, 1); assert.equal(wide.nameOpacity, 0);
  assert(middle.nameOpacity > 0 && middle.nameOpacity < 1);
  assert.equal(wide.radiusPx, close.radiusPx, "zoomed-out selection remains a marker");
  assert.deepEqual(projectSkySelectionMarker(star, position, view), close);
  assert.equal(owner.snapshot(), selected);
});

test("extended selection uses the catalogue angular diameter through the shared projection", () => {
  const wide = projectSkySelectionMarker(galaxy, position, view, 3)!;
  const close = projectSkySelectionMarker(galaxy, position, { ...view, verticalFovDeg: 5 }, 3)!;
  assert.equal(wide.shape, "circle"); assert.equal(close.shape, "circle");
  assert(close.radiusPx > wide.radiusPx * 4);
  assert.equal(projectSkySelectionMarker(star, position, view, 3)!.radiusPx, 12,
    "a point is not expanded by an unrelated area size");
  assert.equal(projectSkySelectionMarker(galaxy, position, view, null)!.radiusPx, 12,
    "missing extent keeps a semantic circle rather than inventing a scientific diameter");
});

test("unprojectable data cannot manufacture an on-screen selection", () => {
  assert.equal(projectSkySelectionMarker(star, { azimuthDeg: NaN, altitudeDeg: 45 }, view), null);
  assert.equal(projectSkySelectionMarker(star, position, { ...view, width: 0 }), null);
  assert.equal(projectSkySelectionMarker(star, { azimuthDeg: 0, altitudeDeg: -45 }, view), null);
});

test("verified blank and stale no-result remain distinct for deselection", () => {
  const snapshot: SkyPickSnapshot = { catalogVersion: "test", catalogHash: "hash", frameAt: "now",
    width: 400, height: 800, objects: [] };
  const input = { x: 200, y: 400, frameAt: "now", catalogVersion: "test", catalogHash: "hash" };
  assert.deepEqual(pickPaintedSkyObjects(snapshot, input), []);
  assert.equal(skyPickSnapshotIsCurrent(snapshot, input), true);
  assert.equal(skyPickSnapshotIsCurrent(null, input), false);
  assert.equal(skyPickSnapshotIsCurrent(snapshot, { ...input, frameAt: "old" }), false);
  assert.equal(skyPickSnapshotIsCurrent(snapshot, { ...input, catalogHash: "another" }), false);
});
