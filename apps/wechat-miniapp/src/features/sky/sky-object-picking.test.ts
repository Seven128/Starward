import assert from "node:assert/strict";
import test from "node:test";
import { isUnambiguousTapGesture, pickPaintedSkyObjects, type SkyPickSnapshot } from "./sky-object-picking.ts";

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
