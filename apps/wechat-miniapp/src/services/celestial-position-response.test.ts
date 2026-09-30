import assert from "node:assert/strict";
import test from "node:test";
import type { ApiEnvelope, CelestialObjectPositionData } from "@starward/miniapp-contracts";
import { matchingCelestialPositionResponse, type CelestialPositionBinding } from "./celestial-position-response.ts";

const binding: CelestialPositionBinding = { reference: "HR:7001", spotId: "spot:test", contextId: "context:test",
  contextRevision: 4, contextFingerprint: "current-place-and-time", dataRevision: "data-v1", algorithmVersion: "algorithm-v1", at: "2026-09-22T13:00:00.000Z" };
const catalog = { catalogVersion: "bsc5p-bright-stars.v2", catalogHash: "a".repeat(64) };
function response(): ApiEnvelope<CelestialObjectPositionData> {
  return { dataState: "FRESH", data: { ...binding, position: { ...catalog, azimuthDeg: 127.34567, altitudeDeg: -21.12345 },
    unavailableReason: null } } as ApiEnvelope<CelestialObjectPositionData>;
}

test("exact query/context/catalog binding preserves negative altitude and precision", () => {
  const input = response();
  assert.equal(matchingCelestialPositionResponse(input, binding, catalog), input);
  assert.equal(input.data.position!.altitudeDeg, -21.12345);
  for (const changed of [{ reference: "HR:424" }, { spotId: "spot:other" }, { contextId: "context:other" },
    { contextRevision: 3 }, { contextFingerprint: "old-place" }, { dataRevision: "old-data" },
    { algorithmVersion: "old-algorithm" }, { at: "2026-09-22T13:30:00.000Z" }]) {
    const stale = response(); Object.assign(stale.data, changed);
    assert.throws(() => matchingCelestialPositionResponse(stale, binding, catalog), /binding_invalid/);
  }
});

test("malformed, expired or other-publication coordinates cannot move the camera", () => {
  for (const changed of [{ azimuthDeg: 360 }, { altitudeDeg: NaN }, { altitudeDeg: 91 },
    { catalogHash: "b".repeat(64) }, { catalogVersion: "old" }]) {
    const invalid = response(); Object.assign(invalid.data.position!, changed);
    assert.throws(() => matchingCelestialPositionResponse(invalid, binding, catalog), /geometry_invalid/);
  }
  const expired = response(); expired.dataState = "EXPIRED";
  assert.throws(() => matchingCelestialPositionResponse(expired, binding, catalog), /geometry_invalid/);
  const absent = response(); absent.data.position = null;
  assert.throws(() => matchingCelestialPositionResponse(absent, binding, catalog), /availability_invalid/);
  absent.dataState = "UNAVAILABLE"; absent.data.unavailableReason = "OBJECT_GEOMETRY_UNAVAILABLE";
  assert.equal(matchingCelestialPositionResponse(absent, binding, catalog), absent);
});
