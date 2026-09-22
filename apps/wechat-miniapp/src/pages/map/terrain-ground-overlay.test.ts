import assert from "node:assert/strict";
import test from "node:test";
import { createTerrainGroundOverlayCoordinator, type TerrainGroundOverlayTarget } from "./terrain-ground-overlay";

const target = (src: string): TerrainGroundOverlayTarget => ({
  src,
  bounds: {
    southwest: { latitude: 22, longitude: 113 },
    northeast: { latitude: 23, longitude: 114 },
  },
  opacity: 0.62,
  zIndex: 0,
});

test("hidden cleanup failure is not reported as a visible terrain failure on return", async () => {
  const results: { error: unknown | null; target: TerrainGroundOverlayTarget | null }[] = [];
  let updates = 0;
  let rejectUpdate = false;
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: async () => undefined,
    updateGroundOverlay: async () => {
      updates++;
      if (rejectUpdate) throw new Error("visible update failed");
    },
    removeGroundOverlay: async () => { throw new Error("hidden native map unavailable"); },
  }), result => results.push(result));
  await coordinator.apply(target("/terrain.png"));
  results.length = 0;
  await coordinator.apply(null, "suspend");
  assert.equal(results.length, 0, "hidden cleanup cannot become the next visible error");
  await coordinator.apply(target("/terrain.png"));
  assert.equal(updates, 1, "failed removal retains the installed overlay for recovery");
  assert.equal(results.at(-1)?.error, null);
  rejectUpdate = true;
  await coordinator.apply(target("/terrain.png"));
  assert.match(String(results.at(-1)?.error), /visible update failed/u);
});

test("a failed native removal remains installed and a retry removes the old overlay", async () => {
  let removalAttempts = 0;
  const results: { error: unknown | null; target: TerrainGroundOverlayTarget | null }[] = [];
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: async () => undefined,
    updateGroundOverlay: async () => undefined,
    removeGroundOverlay: async () => {
      removalAttempts++;
      if (removalAttempts === 1) throw new Error("native remove failed");
    },
  }), result => results.push(result));

  await coordinator.apply(target("/terrain.png"));
  await coordinator.apply(null);
  assert.equal(removalAttempts, 1);
  assert.match(String(results.at(-1)?.error), /native remove failed/u);
  assert.equal(results.at(-1)?.target, null);

  await coordinator.apply(null);
  assert.equal(removalAttempts, 2);
  assert.equal(results.at(-1)?.error, null);
  assert.equal(results.at(-1)?.target, null);
});

test("a queued obsolete target never touches the native map", async () => {
  const added: string[] = [];
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => ({
    addGroundOverlay: async options => { added.push(options.src); },
    updateGroundOverlay: async options => { added.push(options.src); },
    removeGroundOverlay: async () => undefined,
  }), () => undefined);

  const obsolete = coordinator.apply(target("/obsolete.png"));
  const current = coordinator.apply(target("/current.png"));
  await Promise.all([obsolete, current]);
  assert.deepEqual(added, ["/current.png"]);
});

test("synchronous native context failure is recoverable and an already empty target needs no context", async () => {
  let createAttempts = 0;
  const results: { error: unknown | null; target: TerrainGroundOverlayTarget | null }[] = [];
  const context = {
    addGroundOverlay: async () => undefined,
    updateGroundOverlay: async () => undefined,
    removeGroundOverlay: async () => undefined,
  };
  const coordinator = createTerrainGroundOverlayCoordinator(91301, () => {
    createAttempts++;
    if (createAttempts === 1) throw new Error("native context unavailable");
    return context;
  }, result => results.push(result));

  await coordinator.apply(null);
  assert.equal(createAttempts, 0);
  await coordinator.apply(target("/terrain.png"));
  assert.match(String(results.at(-1)?.error), /native context unavailable/u);
  await coordinator.apply(target("/terrain.png"));
  assert.equal(createAttempts, 2);
  assert.equal(results.at(-1)?.error, null);
});
