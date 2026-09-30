import assert from "node:assert/strict";
import test from "node:test";
import type { CelestialObjectPositionData, SpotSkyContext } from "@starward/miniapp-contracts";
import { createSkyObjectTracking } from "./sky-object-tracking";

const context = { spotId: "spot:test", contextId: "context:test", contextRevision: 3,
  contextFingerprint: "current", dataRevision: "data-v1", algorithmVersion: "algorithm-v1" } as SpotSkyContext;
const catalog = { catalogVersion: "bsc5p-bright-stars.v2", catalogHash: "a".repeat(64) };
const first: CelestialObjectPositionData = { ...context, reference: "HR:7001", at: "2026-09-22T13:00:00.000Z",
  position: { ...catalog, azimuthDeg: 308.6, altitudeDeg: 58.6 }, unavailableReason: null };
const object = { reference: "HR:7001", displayName: "Vega", kind: "STAR" as const };

test("tracking follows the selected report time, rejects late or foreign data and retains the last usable position on failure", () => {
  const tracking = createSkyObjectTracking();
  tracking.start(object, context.spotId);
  assert.equal(tracking.accept(first, context, first.at, catalog), true);
  const later = { ...first, at: "2026-09-22T14:00:00.000Z", position: { ...first.position!, azimuthDeg: 299, altitudeDeg: 45 } };
  assert.equal(tracking.accept(later, context, later.at, catalog), true);
  for (const bad of [first, { ...later, reference: "HR:424" }, { ...later, contextRevision: 2 },
    { ...later, dataRevision: "old" }, { ...later, algorithmVersion: "old" },
    { ...later, position: null, unavailableReason: "SKY_UNAVAILABLE" as const }]) {
    assert.equal(tracking.accept(bad, context, later.at, catalog), false);
    assert.equal(tracking.snapshot().position, later);
  }
  assert.equal(tracking.accept(later, context, later.at, { ...catalog, catalogHash: "b".repeat(64) }), false);
  assert.equal(tracking.accept(later, { ...context, spotId: "spot:other" } as SpotSkyContext, later.at, catalog), false);
  // Canceling the time preview returns to the original shared time, not a tracking clock.
  assert.equal(tracking.accept(first, context, first.at, catalog), true);
  assert.equal(tracking.snapshot().position, first);
});

test("explicit stop rejects delayed replies; canceled drag restores intent without accepting an old frame", () => {
  const tracking = createSkyObjectTracking();
  tracking.start(object, context.spotId);
  tracking.accept(first, context, first.at, catalog);
  const checkpoint = tracking.snapshot();
  tracking.stop();
  assert.equal(tracking.accept(first, context, first.at, catalog), false);
  assert.equal(tracking.snapshot().target, null);
  tracking.restore(checkpoint);
  assert.deepEqual(tracking.snapshot().target, object);
  assert.equal(tracking.accept(first, context, "2026-09-22T14:00:00.000Z", catalog), false);
  const next = { ...first, contextRevision: 4 };
  assert.equal(tracking.accept(next, { ...context, contextRevision: 4 }, first.at, catalog), true);
  tracking.start({ reference: "HR:424", displayName: "Polaris", kind: "STAR" }, context.spotId);
  assert.equal(tracking.snapshot().position, null);
  assert.equal(tracking.accept(first, context, first.at, catalog), false);
});
