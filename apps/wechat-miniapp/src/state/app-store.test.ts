import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { create } from "zustand";
import { DEFAULT_USER_PREFERENCES, EMPTY_FILTER_STATE, cloneFilterState } from "@starward/miniapp-contracts";
import * as transitions from "./app-transitions";
import { enqueueNotification, dismissNotification } from "./notification";
import type { useAppStore } from "./app-store";

const validObservationContext = {
  schemaVersion: "observation-context-v2",
  contextId: "synthetic-context",
  contextFingerprint: "synthetic-fingerprint",
  revision: 1,
  location: {
    kind: "MAP_POINT",
    displayName: "Synthetic point",
    wgs84: { system: "WGS84", latitude: 30, longitude: 110 },
    source: "MAP_VIEWPORT",
  },
  routeOrigin: null,
  timezone: "Asia/Shanghai",
  localDate: "2026-08-29",
  nightStartUtc: "2026-08-29T12:00:00.000Z",
  nightEndUtc: "2026-08-29T22:00:00.000Z",
  selectedAtUtc: "2026-08-29T14:00:00.000Z",
  eventInstanceId: null,
  targetProfile: "DAILY",
  weatherView: {
    primaryPolicy: "QWEATHER",
    comparisonModels: [],
    selectedModel: null,
    cloudLayer: "TOTAL",
  },
  algorithmVersions: {
    astronomy: "1",
    opportunity: "1",
    tripDecision: "1",
    darkSky: "1",
    eventCatalog: "1",
  },
  privacyClass: "PUBLIC_REFERENCE",
  createdAt: "2026-08-29T00:00:00.000Z",
  expiresAt: "2999-08-30T00:00:00.000Z",
};

function loadStore(storage: { value: unknown; failWrites?: boolean; session?: unknown; accounts?: Record<string, unknown>; unclaimed?: unknown } = { value: {} }) {
  // Run the actual whole store module with real Zustand/transitions. Only native
  // storage and the microtask scheduler are ports; no Taro runtime or user data.
  if (!("session" in storage)) storage.session = {
    userId: "user:test", accessToken: "test-token", expiresAt: "2999-01-01T00:00:00.000Z",
  };
  const source = ts.createSourceFile("app-store.ts", readFileSync(new URL("./app-store.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const code = source.statements.filter((node) => !ts.isImportDeclaration(node)).map((node) => node.getText(source)).join("\n");
  const scheduled: (() => void)[] = [];
  const exports: Record<string, unknown> = {};
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, create, ...transitions, cloneFilterState, DEFAULT_USER_PREFERENCES, EMPTY_FILTER_STATE,
    enqueueNotification, removeNotification: dismissNotification,
    acceptanceBootstrapJson: {}, __MINIAPP_ACCEPTANCE_DIAGNOSTICS__: false,
    queueMicrotask: (fn: () => void) => scheduled.push(fn),
    Taro: {
      getStorageSync: (key: string) => key.endsWith("auth.current") ? storage.session
        : key.endsWith("state.unclaimed") ? storage.unclaimed
        : key.includes(".state.account.") ? storage.accounts?.[key]
        : storage.value,
      removeStorageSync: (key: string) => { if (storage.failWrites) throw Error("native removal failed");
        if (key.endsWith("state.unclaimed")) storage.unclaimed = undefined;
        else if (key.includes(".state.account.")) { if (storage.accounts) delete storage.accounts[key]; }
        else storage.value = undefined;
      },
      setStorageSync: (key: string, value: unknown) => { if (storage.failWrites) throw Error("native write failed");
        if (key.endsWith("state.unclaimed")) storage.unclaimed = value;
        else if (key.includes(".state.account.")) (storage.accounts ??= {})[key] = value;
        else storage.value = value;
      },
    },
  }, { timeout: 1000 });
  return { store: exports.useAppStore as typeof useAppStore, flush: () => { while (scheduled.length) scheduled.shift()!(); }, storage };
}

test("switching accounts isolates and restores local preferences and private projections", () => {
  const storage = { value: {}, accounts: {} as Record<string, unknown>, session: {
    userId: "user:a", accessToken: "test-token", expiresAt: "2999-01-01T00:00:00.000Z",
  } };
  const { store, flush } = loadStore(storage);
  store.getState().bindAccount("user:a");
  store.getState().setPreference("equipment", "A 的较早配置");
  flush();
  store.getState().setPreference("equipment", "A 的未同步望远镜");
  store.getState().replaceFavoriteIds(["spot:a"] as never);
  store.getState().replacePlans([{ planId: "plan:a" }] as never);
  store.getState().bindAccount("user:b");
  flush();
  assert.equal(store.getState().preferences.equipment, DEFAULT_USER_PREFERENCES.equipment);
  assert.equal(store.getState().preferencesRevision, 0);
  assert.equal(store.getState().preferencesDirty, false);
  assert.deepEqual([...store.getState().favoriteIds], []);
  assert.deepEqual([...store.getState().plans], []);
  store.getState().markPreferencesSynced({ preferences: { ...DEFAULT_USER_PREFERENCES, equipment: "B 的配置" }, revision: 1, updatedAt: "2026-09-25T00:00:00Z" });
  flush();
  store.getState().bindAccount("user:a");
  assert.equal(store.getState().preferences.equipment, "A 的未同步望远镜");
  assert.equal(store.getState().preferencesDirty, true);
  assert.deepEqual([...store.getState().favoriteIds], ["spot:a"]);
  assert.equal(store.getState().plans[0]?.planId, "plan:a");
});

test("several account switches before queued writes preserve each fresh snapshot", () => {
  const storage = { value: {}, accounts: {} as Record<string, unknown>, session: {
    userId: "user:a", accessToken: "test-token", expiresAt: "2999-01-01T00:00:00.000Z",
  } };
  const { store, flush } = loadStore(storage);
  store.getState().setPreference("equipment", "A 的新编辑");
  store.getState().bindAccount("user:b");
  store.getState().setPreference("equipment", "B 的新编辑");
  store.getState().bindAccount("user:c");
  flush();
  store.getState().bindAccount("user:a");
  assert.equal(store.getState().preferences.equipment, "A 的新编辑");
  store.getState().bindAccount("user:b");
  assert.equal(store.getState().preferences.equipment, "B 的新编辑");
});

test("cold start under a different account never hydrates another account's private state", () => {
  const savedA = {
    accountOwnerId: "user:a", preferences: { ...DEFAULT_USER_PREFERENCES, equipment: "A 的望远镜" },
    preferencesRevision: 8, preferencesDirty: true, favoriteIds: ["spot:a"], plans: [{ planId: "plan:a" }],
  };
  const storage = { value: savedA, session: {
    userId: "user:b", accessToken: "test-token", expiresAt: "2999-01-01T00:00:00.000Z",
  }, accounts: {} as Record<string, unknown> };
  const { store, flush } = loadStore(storage);
  assert.equal(store.getState().accountOwnerId, "user:b");
  assert.equal(store.getState().preferences.equipment, DEFAULT_USER_PREFERENCES.equipment);
  assert.equal(store.getState().preferencesRevision, 0);
  assert.equal(store.getState().favoriteIds.length, 0);
  assert.equal(store.getState().plans.length, 0);
  store.getState().hydrate();
  store.getState().setPreference("equipment", "B 的配置");
  flush();
  assert.equal((storage.value as { accountOwnerId: string }).accountOwnerId, "user:b");
  assert.equal((storage.accounts["starward.wechat-miniapp.state.account.user:a"] as { preferences: { equipment: string } }).preferences.equipment, "A 的望远镜");
});

test("cold start with an expired session does not expose its saved private projection", () => {
  const storage = { value: {
    accountOwnerId: "user:a", preferences: { ...DEFAULT_USER_PREFERENCES, equipment: "A 的设备" },
    favoriteIds: ["spot:a"], plans: [{ planId: "plan:a" }],
  }, session: { userId: "user:a", accessToken: "expired", expiresAt: "2020-01-01T00:00:00.000Z" } };
  const { store } = loadStore(storage);
  assert.equal(store.getState().accountOwnerId, null);
  assert.equal(store.getState().preferences.equipment, DEFAULT_USER_PREFERENCES.equipment);
  assert.equal(store.getState().favoriteIds.length, 0);
  assert.equal(store.getState().plans.length, 0);
  store.getState().hydrate();
  assert.equal(store.getState().accountOwnerId, null);
  assert.equal(store.getState().favoriteIds.length, 0);
});

test("first authentication retains a fresh anonymous map selection while binding private data", () => {
  const storage = { value: {}, session: null as unknown };
  const { store } = loadStore(storage);
  store.getState().setViewport({ center: { latitude: 23.1, longitude: 114.2 } });
  store.getState().selectSpot("spot:chosen" as never);
  store.getState().setObservationContext(validObservationContext as never);
  store.getState().bindAccount("user:b");
  assert.equal(store.getState().accountOwnerId, "user:b");
  assert.equal(store.getState().selectedSpotId, "spot:chosen");
  assert.equal(store.getState().observationContext?.contextId, validObservationContext.contextId);
  assert.equal(store.getState().viewport.center.latitude, 23.1);
  assert.equal(store.getState().favoriteIds.length, 0);
});

test("ownerless legacy snapshot is quarantined instead of assigned to the active account", () => {
  const legacy = {
    preferences: { ...DEFAULT_USER_PREFERENCES, equipment: "旧设备" },
    preferencesRevision: 9, preferencesDirty: true,
    favoriteIds: ["spot:legacy"], plans: [{ planId: "plan:legacy" }],
  };
  const storage = { value: legacy as unknown, session: {
    userId: "user:b", accessToken: "test-token", expiresAt: "2999-01-01T00:00:00.000Z",
  }, unclaimed: undefined as unknown };
  const { store, flush } = loadStore(storage);
  assert.equal(store.getState().accountOwnerId, "user:b");
  assert.equal(store.getState().preferences.equipment, DEFAULT_USER_PREFERENCES.equipment);
  assert.equal(store.getState().favoriteIds.length, 0);
  assert.equal(store.getState().plans.length, 0);
  store.getState().setPreference("equipment", "B 的设备");
  flush();
  assert.deepEqual(storage.unclaimed, legacy);
  assert.equal((storage.value as { accountOwnerId: string }).accountOwnerId, "user:b");
});

test("synchronous observation context persistence respects the account boundary", () => {
  const legacy = { finderQuery: "旧搜索", favoriteIds: ["spot:legacy"] };
  const storage = { value: legacy as unknown, session: {
    userId: "user:b", accessToken: "test-token", expiresAt: "2999-01-01T00:00:00.000Z",
  }, unclaimed: undefined as unknown };
  const { store } = loadStore(storage);
  store.getState().setObservationContext(validObservationContext as never);
  assert.deepEqual(storage.unclaimed, legacy);
  assert.equal((storage.value as { accountOwnerId: string }).accountOwnerId, "user:b");
  store.getState().bindAccount(null);
  const ownedSnapshot = storage.value;
  store.getState().setObservationContext(null);
  assert.equal(storage.value, ownedSnapshot);
});

test("account deletion removes only the deleted account's saved projection", () => {
  const storage = { value: {}, accounts: {} as Record<string, unknown>, session: {
    userId: "user:a", accessToken: "test-token", expiresAt: "2999-01-01T00:00:00.000Z",
  } };
  const { store, flush } = loadStore(storage);
  store.getState().bindAccount("user:a");
  store.getState().setPreference("equipment", "A 的望远镜");
  flush();
  store.getState().bindAccount("user:b");
  store.getState().setPreference("equipment", "B 的望远镜");
  flush();
  store.getState().bindAccount("user:a");
  assert.equal(store.getState().resetAfterAccountDeletion(), true);
  assert.equal(store.getState().accountOwnerId, null);
  assert.equal(storage.accounts["starward.wechat-miniapp.state.account.user:a"], undefined);
  assert.ok(storage.accounts["starward.wechat-miniapp.state.account.user:b"]);
});

test("expired identity hides private state while preserving the same account's unsynced edit", () => {
  const storage = { value: {}, accounts: {} as Record<string, unknown>, session: {
    userId: "user:a", accessToken: "test-token", expiresAt: "2999-01-01T00:00:00.000Z",
  } };
  const { store, flush } = loadStore(storage);
  store.getState().setPreference("equipment", "A 的未同步望远镜");
  store.getState().replaceFavoriteIds(["spot:a"] as never);
  flush();
  store.getState().bindAccount(null);
  assert.equal(store.getState().accountOwnerId, null);
  assert.equal(store.getState().preferences.equipment, DEFAULT_USER_PREFERENCES.equipment);
  assert.equal(store.getState().favoriteIds.length, 0);
  const oldDisk = storage.value;
  const unresolvedClear = store.getState().clearLocalCache();
  assert.equal(storage.value, oldDisk, "unresolved identity cannot delete another account's local recovery state");
  store.getState().bindAccount("user:a");
  assert.equal(store.getState().preferences.equipment, "A 的未同步望远镜");
  assert.equal(store.getState().preferencesDirty, true);
  assert.equal(store.getState().favoriteIds[0], "spot:a");
  return unresolvedClear.then(result => assert.equal(result, false));
});

test("cache reset completion cannot write a newly bound account", async () => {
  const storage = { value: {}, accounts: {} as Record<string, unknown> };
  const { store, flush } = loadStore(storage);
  store.getState().setFinderQuery("A 的搜索");
  flush();
  const clearing = store.getState().clearLocalCache();
  store.getState().bindAccount("user:b");
  store.getState().setFinderQuery("B 的搜索");
  flush();
  assert.equal(await clearing, false);
  assert.equal((storage.value as { accountOwnerId: string; finderQuery: string }).accountOwnerId, "user:b");
  assert.equal((storage.value as { finderQuery: string }).finderQuery, "B 的搜索");
});

test("legacy provider selections disappear on restart while the exact location and time remain recoverable", () => {
  const legacy = { ...validObservationContext, weatherView: { primaryPolicy: "OPEN_METEO", comparisonModels: ["ecmwf"], selectedModel: "ecmwf", cloudLayer: "LOW" } };
  const { store } = loadStore({ value: { accountOwnerId: "user:test", observationContext: legacy } });
  const restored = store.getState().observationContext!;
  assert.ok(restored);
  assert.equal(restored.contextId, legacy.contextId); assert.equal(restored.selectedAtUtc, legacy.selectedAtUtc);
  assert.deepEqual(JSON.parse(JSON.stringify(restored.location)), legacy.location);
  assert.deepEqual(JSON.parse(JSON.stringify(restored.weatherView)), { primaryPolicy: "QWEATHER", comparisonModels: [], selectedModel: null, cloudLayer: "TOTAL" });
});

test("temporary cache reset is synchronous but reports durable write success only after native completion", async () => {
  for (const failWrites of [false, true]) {
    const { store, flush } = loadStore({ value: {}, failWrites });
    store.setState({ observationContext: validObservationContext as never, favoriteIds: ["favorite"] as never,
      plans: [{ planId: "retained" }] as never, finderQuery: "old search" });
    const before = store.getState();
    const pending = store.getState().clearLocalCache();
    assert.equal(store.getState().observationContext, null);
    assert.equal(store.getState().finderQuery, "");
    assert.equal(store.getState().favoriteIds, before.favoriteIds);
    assert.equal(store.getState().plans, before.plans);
    assert.equal(store.getState().notifications.length, 0, "the caller owns feedback after all cache owners finish");
    flush();
    assert.equal(await pending, !failWrites);
    store.getState().setPreference("equipment", "旧账号的望远镜");
    assert.equal(store.getState().resetAfterAccountDeletion(), !failWrites);
    assert.equal(store.getState().favoriteIds.length, 0);
    assert.equal(store.getState().plans.length, 0);
    assert.equal(store.getState().preferences.equipment, DEFAULT_USER_PREFERENCES.equipment);
    assert.equal(store.getState().preferencesRevision, 0);
    assert.equal(store.getState().preferencesDirty, false);
  }
});

test("older account readback cannot roll back saved preferences or a newer local edit", () => {
  const { store } = loadStore();
  const saved = { preferences: { ...DEFAULT_USER_PREFERENCES, equipment: "红光手电" }, revision: 8, updatedAt: "2026-09-07T01:00:00Z" };
  const old = { preferences: { ...DEFAULT_USER_PREFERENCES }, revision: 7, updatedAt: "2026-09-07T00:00:00Z" };
  store.getState().markPreferencesSynced(saved);
  store.getState().applyServerPreferences(old);
  assert.equal(store.getState().preferences.equipment, "红光手电");
  assert.equal(store.getState().preferencesRevision, 8);
  assert.equal(store.getState().preferencesUpdatedAt, saved.updatedAt);
  store.getState().setPreference("equipment", "双筒望远镜");
  store.getState().applyServerPreferences(old);
  assert.equal(store.getState().preferences.equipment, "双筒望远镜");
  assert.equal(store.getState().preferencesRevision, 8);
  assert.equal(store.getState().preferencesDirty, true);
  store.getState().applyServerPreferences({ ...saved, revision: 9 });
  assert.equal(store.getState().preferences.equipment, "双筒望远镜");
  assert.equal(store.getState().preferencesRevision, 9);
});

test("fresh conflict readback rebases a dirty edit even when the server revision is lower", () => {
  const { store } = loadStore();
  store.getState().markPreferencesSynced({ preferences: { ...DEFAULT_USER_PREFERENCES }, revision: 5, updatedAt: "2026-09-07T01:00:00Z" });
  store.getState().setPreference("contributionStatusReminder", true);
  store.getState().rebasePreferencesAfterConflict({ preferences: { ...DEFAULT_USER_PREFERENCES }, revision: 1, updatedAt: "2026-09-24T01:00:00Z" });
  assert.equal(store.getState().preferences.contributionStatusReminder, true);
  assert.equal(store.getState().preferencesRevision, 1);
  assert.equal(store.getState().preferencesDirty, true);
});

test("default-region reset is atomic, retains user content and cannot be undone by focus restoration", () => {
  const { store, flush, storage } = loadStore();
  const initialViewport = JSON.stringify(store.getState().viewport);
  const initial = store.getState();
  store.setState({
    viewport: { ...initial.viewport, center: { latitude: 20, longitude: 110 }, zoom: 14 },
    finderQuery: "synthetic place", locationState: "GRANTED", analysisOverlay: "TOTAL_CLOUD",
    observationContext: { contextId: "synthetic-context" } as never,
    selectedSpotId: "synthetic-spot" as never,
    favoriteIds: ["synthetic-favorite"] as never,
    plans: [{ planId: "synthetic-plan" }] as never,
    searchHistory: ["synthetic search"],
  });
  store.getState().openSourceLift("CONDITIONS");
  store.getState().notify({ owner: "map", tone: "success", placement: "inline", title: "old location", body: "old" });
  store.getState().notify({ owner: "settings", tone: "error", placement: "inline", title: "sync error", body: "retry" });
  const before = store.getState();
  let observations = 0;
  const unsubscribe = store.subscribe((state) => {
    observations++;
    assert.equal(state.locationState, "DEFAULT_REGION");
    assert.equal(JSON.stringify(state.viewport), initialViewport);
    assert.equal(state.observationContext, null);
    assert.equal(state.selectedSpotId, null);
  });
  before.resetMapToDefaultRegion();
  unsubscribe();
  assert.equal(observations, 1);
  const reset = store.getState();
  for (const field of ["favoriteIds", "plans", "searchHistory", "preferences", "committedFilters"] as const)
    assert.equal(reset[field], before[field]);
  assert.equal(reset.finderQuery, "");
  assert.equal(reset.analysisOverlay, "NONE");
  assert.equal(reset.sourceLift.origin, null);
  assert.equal(reset.sourceLift.phase, "IDLE");
  assert.equal(reset.notifications.length, 1);
  assert.equal(reset.notifications[0]?.owner, "settings");
  assert.equal(reset.mapResetVersion, before.mapResetVersion + 1);
  store.getState().finishSourceLift("CONDITIONS", { restoreMap: true });
  assert.equal(JSON.stringify(store.getState().viewport), initialViewport);
  flush();
  const saved = storage.value as Record<string, unknown>;
  assert.equal(saved.observationContext, null);
  assert.equal("mapResetVersion" in saved, false);
  const restarted = loadStore(storage).store.getState();
  assert.equal(JSON.stringify(restarted.viewport), initialViewport);
  assert.equal(restarted.observationContext, null);
  assert.equal(restarted.mapResetVersion, 0);
});

test("startup recovery rejects a partial observation context and a non-array plan cache", () => {
  const { store } = loadStore({
    value: {
      accountOwnerId: "user:test",
      observationContext: {
        schemaVersion: "observation-context-v2",
        expiresAt: "2999-08-30T00:00:00.000Z",
      },
      plans: { stale: true },
    },
  });
  assert.equal(store.getState().observationContext, null);
  assert.equal(store.getState().plans.length, 0);
});

test("startup recovery preserves a complete unexpired observation context", () => {
  const { store } = loadStore({
    value: { accountOwnerId: "user:test", observationContext: validObservationContext, plans: [] },
  });
  assert.equal(store.getState().observationContext?.contextId, "synthetic-context");
  assert.equal(store.getState().observationContext?.location.kind, "MAP_POINT");
});

test("startup recovery never restores a session-precise observation context", () => {
  const { store } = loadStore({
    value: {
      accountOwnerId: "user:test",
      observationContext: {
        ...validObservationContext,
        privacyClass: "SESSION_PRECISE",
      },
    },
  });
  assert.equal(store.getState().observationContext, null);
});
