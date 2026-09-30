import assert from "node:assert/strict";
import test from "node:test";
import type { CelestialObjectPositionData, SpotSkyContext } from "@starward/miniapp-contracts";
import { skyObjectPositionIsCurrent } from "./sky-object-location.ts";

test("located marker and camera reject changes of observer, report, time and source publication", () => {
  const context = { spotId: "spot:test", contextId: "context:test", contextRevision: 3,
    contextFingerprint: "current", dataRevision: "data-v1", algorithmVersion: "algorithm-v1" } as SpotSkyContext;
  const catalog = { catalogVersion: "bsc5p-bright-stars.v2", catalogHash: "a".repeat(64) };
  const data: CelestialObjectPositionData = { ...context, reference: "HR:7001", at: "2026-09-22T13:00:00.000Z",
    position: { ...catalog, azimuthDeg: 1.123, altitudeDeg: -20.456 }, unavailableReason: null };
  assert.equal(skyObjectPositionIsCurrent(data, context, data.at, catalog), true);
  for (const change of [{ spotId: "spot:other" }, { contextId: "context:other" },
    { contextRevision: 4 }, { contextFingerprint: "new-place" }, { dataRevision: "old-data" }, { algorithmVersion: "old-algorithm" }])
    assert.equal(skyObjectPositionIsCurrent(data, { ...context, ...change } as SpotSkyContext, data.at, catalog), false);
  assert.equal(skyObjectPositionIsCurrent(data, context, "2026-09-22T13:30:00.000Z", catalog), false);
  assert.equal(skyObjectPositionIsCurrent(data, context, data.at, { ...catalog, catalogHash: "b".repeat(64) }), false);
  assert.equal(skyObjectPositionIsCurrent(data, context, data.at, null), false);
  assert.equal(skyObjectPositionIsCurrent({ ...data, position: null }, context, data.at, catalog), false);
});
