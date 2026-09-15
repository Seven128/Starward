import assert from "node:assert/strict";
import test from "node:test";
import { restoreMapBootstrapContext } from "./context-restore.ts";
import { canApplyContextRestore } from "../../services/observation-context-version.ts";
import type { ObservationContext } from "@starward/miniapp-contracts";

const id = (value: string) => value as ObservationContext["contextId"];
const initial = { contextId: id("a"), revision: 1, contextFingerprint: "one" };
const updated = { contextId: id("a"), revision: 2, contextFingerprint: "two" };

test("recovery cannot overwrite a newer time or another selected context", () => {
  assert.equal(canApplyContextRestore(initial, updated, initial), false);
  assert.equal(canApplyContextRestore(initial, { ...initial, contextId: id("b") }, updated), false);
  assert.equal(canApplyContextRestore(null, initial, updated), false);
  assert.equal(canApplyContextRestore(updated, updated, initial), false);
});

test("initial bootstrap, current refresh and expired-ID recovery remain available", () => {
  assert.equal(canApplyContextRestore(null, null, initial), true);
  assert.equal(canApplyContextRestore(initial, initial, updated), true);
  assert.equal(canApplyContextRestore(updated, updated, { ...initial, contextId: id("recovered") }), true);
});

test("a removed persisted formal spot returns the map to its current viewport", async () => {
  const fallback = { location: { kind: "MAP_POINT", displayName: "当前地图中心",
    wgs84: { system: "WGS84", latitude: 22.5, longitude: 114 }, source: "MAP_VIEWPORT" },
    localDate: "2026-09-15", targetProfile: "DAILY" } as const;
  const stored = { location: { kind: "FORMAL_SPOT", spotId: "spot:removed" } } as ObservationContext;
  const result = await restoreMapBootstrapContext({
    storedContext: stored, fallback,
    restore: async () => { throw Object.assign(new Error("gone"), { code: "NOT_FOUND" }); },
    resolve: async (request) => ({ data: { location: request.location } } as never),
    shouldFallback: (error) => (error as { code?: string }).code === "NOT_FOUND",
  });
  assert.equal(result.data.location.kind, "MAP_POINT");
});

test("bootstrap does not replace a formal spot on transport or permission failure", async () => {
  for (const code of ["PROVIDER_UNAVAILABLE", "PERMISSION_DENIED"]) {
    let fallbackCalls = 0;
    await assert.rejects(restoreMapBootstrapContext({
      storedContext: { location: { kind: "FORMAL_SPOT", spotId: "spot:kept" } } as ObservationContext,
      fallback: {} as never,
      restore: async () => { throw Object.assign(new Error(code), { code }); },
      resolve: async () => { fallbackCalls++; return {} as never; },
      shouldFallback: (error) => (error as { code?: string }).code === "NOT_FOUND",
    }), new RegExp(code));
    assert.equal(fallbackCalls, 0);
  }
});
