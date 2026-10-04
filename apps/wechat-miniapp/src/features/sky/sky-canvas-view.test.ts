import assert from "node:assert/strict";
import test from "node:test";
import { resolveSkyCanvasView, type SkyCanvasViewInput } from "./sky-canvas-view";
import { createSkyBrowsingCamera } from "./sky-browsing-camera";
import { createSkyViewBasis, projectSkyDirection, type SkyViewBasis } from "./sky-view-projection";
import { skyDomeFieldOfView } from "./sky-zoom";

const north = createSkyViewBasis(0, 110, 0)!;
const east = createSkyViewBasis(90, 110, 0)!;
const input = (changes: Partial<SkyCanvasViewInput> = {}): SkyCanvasViewInput => ({
  queuedOrientationRevision: 1, queuedBasis: east,
  live: { presentationRevision: 2, alignment: { mode: "aligned", view: north } },
  manualBasis: null, tracking: false, requestedFov: 45,
  width: 390, height: 844, insets: { top: 104, bottom: 168 }, ...changes,
});
function centered(basis: SkyViewBasis | null, azimuth: number, view: ReturnType<typeof resolveSkyCanvasView>) {
  assert.ok(basis);
  const point = projectSkyDirection(azimuth, 20, basis, 390, 844, view.verticalFovDeg, view.center);
  assert.ok(point, "the intended celestial target must remain in the real projection");
  assert.ok(Math.abs(point.x - view.center.x) < 1e-8 && Math.abs(point.y - view.center.y) < 1e-8);
}

test("reference changes replace a queued old pose, while ordinary frames keep their own pose", () => {
  const changed = resolveSkyCanvasView(input());
  centered(changed.localView, 0, changed);
  const sameReference = resolveSkyCanvasView(input({ queuedOrientationRevision: 2 }));
  centered(sameReference.localView, 90, sameReference);
});

test("calibration replaces a queued overview with the frozen full rotation and observing scale", () => {
  const camera = createSkyBrowsingCamera();
  camera.update({ localView: east, intent: "follow", progress: 0, at: 0 });
  camera.update({ localView: east, intent: "follow", progress: 1, at: 16 });
  // Roll around the camera's forward axis; device gamma is not equivalent
  // to that roll for a tilted phone, so retain a known celestial center.
  const c = Math.cos(37 * Math.PI / 180), s = Math.sin(37 * Math.PI / 180);
  const frozen: SkyViewBasis = {
    right: north.right.map((value, i) => value * c + north.up[i]! * s) as [number, number, number],
    up: north.up.map((value, i) => value * c - north.right[i]! * s) as [number, number, number],
    forward: north.forward,
  };
  const view = resolveSkyCanvasView(input({
    live: { presentationRevision: 2, alignment: { mode: "editing", view: frozen } },
    requestedFov: skyDomeFieldOfView(390, 844, { top: 104, bottom: 168 }),
  }));
  const painted = camera.update({ localView: view.localView, intent: view.intent, progress: view.progress, at: 32 });
  assert.equal(painted.phase, "local");
  assert.deepEqual(painted.view, frozen, "calibration includes roll, not only heading");
  assert.equal(view.verticalFovDeg, 45);
  assert.deepEqual(view.center, { x: 195, y: 422 });
  centered(painted.view, 0, view);
});

test("lost alignment never borrows a queued pose as a new device direction", () => {
  const held = resolveSkyCanvasView(input({
    live: { presentationRevision: 1, alignment: { mode: "needs-alignment", view: north } },
  }));
  assert.equal(held.intent, "locked");
  centered(held.localView, 0, held);
  const absent = resolveSkyCanvasView(input({
    live: { presentationRevision: 1, alignment: { mode: "needs-alignment", view: null } },
  }));
  assert.equal(absent.localView, null);
});

test("explicit manual and tracking intent preserve their own view through sensor reference changes", () => {
  const manual = resolveSkyCanvasView(input({ manualBasis: east }));
  assert.equal(manual.intent, "manual");
  centered(manual.localView, 90, manual);
  const tracked = resolveSkyCanvasView(input({ manualBasis: east, tracking: true }));
  assert.equal(tracked.intent, "track");
  centered(tracked.localView, 90, tracked);
});
