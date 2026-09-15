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
