import assert from "node:assert/strict";
import test from "node:test";
import { restoreMapBootstrapContext, retryObservationScene, observationSceneNeedsContextRestore } from "./context-restore.ts";
import { canApplyContextRestore } from "../../services/observation-context-version.ts";
import type { ApiEnvelope, MapSceneData, ObservationContext } from "@starward/miniapp-contracts";

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

const envelope = <Data>(data: Data, dataState = "FRESH") => ({ data, dataState } as ApiEnvelope<Data>);
const sceneResult = envelope({ spots: [{ spotId: "spot:kept" }] } as unknown as MapSceneData);

test("a map or search retry restores an expired cached Context before loading its scene", async () => {
  for (const sceneFailure of [{ statusCode: 404, code: "NOT_FOUND" }, { statusCode: 410, code: "STALE_REJECTED" }]) {
    const calls: string[] = [];
    const original = { ...initial, location: { kind: "FORMAL_SPOT", spotId: "spot:kept" }, selectedAtUtc: "2026-10-07T13:00:00Z" } as ObservationContext;
    const recovered = { ...original, contextId: id("recovered") };
    const result = await retryObservationScene({ context: original, retryContext: false, retryScene: true,
      sceneFailure, current: () => true,
      refreshContext: async () => { calls.push("restore"); return envelope(recovered); },
      refreshScene: async () => { calls.push("expired-scene"); throw Error("old Context still missing"); },
    });
    assert.deepEqual(calls, ["restore"]);
    assert.equal(result.contextChanged, true);
    assert.equal(result.result?.data, recovered);
    assert.equal(recovered.location, original.location);
    assert.equal(recovered.selectedAtUtc, original.selectedAtUtc);
  }
});

test("ordinary scene failures and permissions do not recreate the upstream Context", async () => {
  for (const sceneFailure of [{ statusCode: 503, code: "PROVIDER_UNAVAILABLE" }, { statusCode: 403, code: "PERMISSION_DENIED" }, { statusCode: 401, code: "LOGIN_REQUIRED" }, { statusCode: 404, code: "PROVIDER_UNAVAILABLE" }]) {
    assert.equal(observationSceneNeedsContextRestore(sceneFailure), false);
    const result = await retryObservationScene({ context: initial as ObservationContext, retryContext: false, retryScene: true,
      sceneFailure, current: () => true,
      refreshContext: async () => { throw Error("must preserve current identity"); },
      refreshScene: async () => sceneResult,
    });
    assert.equal(result.result, sceneResult);
  }
});

test("failed or stale Context restoration never retries an expired scene", async () => {
  for (const restored of [undefined, envelope(initial as ObservationContext, "STALE_USABLE")]) {
    const result = await retryObservationScene({ context: initial as ObservationContext, retryContext: true, retryScene: true,
      sceneFailure: null, current: () => true, refreshContext: async () => restored,
      refreshScene: async () => { throw Error("expired scene must not be requested"); },
    });
    assert.equal(result.result, null);
  }
});

test("unchanged revalidated Context can refresh its scene, changed revision cannot refresh the old render", async () => {
  for (const context of [initial, updated]) {
    let sceneCalls = 0;
    const result = await retryObservationScene({ context: initial as ObservationContext, retryContext: true, retryScene: true,
      sceneFailure: null, current: () => true, refreshContext: async () => envelope(context as ObservationContext),
      refreshScene: async () => { sceneCalls++; return sceneResult; },
    });
    assert.equal(sceneCalls, context === initial ? 1 : 0);
    assert.equal(result.contextChanged, context !== initial);
  }
});

test("leaving or replacing the retry scope while restoration waits cannot request the old scene", async () => {
  let current = true;
  let settle!: (value: ApiEnvelope<ObservationContext>) => void;
  const pending = retryObservationScene({ context: initial as ObservationContext, retryContext: true, retryScene: true,
    sceneFailure: null, current: () => current,
    refreshContext: () => new Promise(resolve => { settle = resolve; }),
    refreshScene: async () => { throw Error("retired request must not launch"); },
  });
  current = false;
  settle(envelope(initial as ObservationContext));
  assert.equal((await pending).result, null);
});
