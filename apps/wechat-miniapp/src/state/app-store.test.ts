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
    primaryPolicy: "synthetic-policy",
    comparisonModels: ["synthetic-model"],
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

function loadStore(storage: { value: unknown } = { value: {} }) {
  // Run the actual whole store module with real Zustand/transitions. Only native
  // storage and the microtask scheduler are ports; no Taro runtime or user data.
  const source = ts.createSourceFile("app-store.ts", readFileSync(new URL("./app-store.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const code = source.statements.filter((node) => !ts.isImportDeclaration(node)).map((node) => node.getText(source)).join("\n");
  const scheduled: (() => void)[] = [];
  const exports: Record<string, unknown> = {};
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, create, ...transitions, cloneFilterState, DEFAULT_USER_PREFERENCES, EMPTY_FILTER_STATE,
    enqueueNotification, removeNotification: dismissNotification,
    acceptanceBootstrapJson: {}, __MINIAPP_ACCEPTANCE_DIAGNOSTICS__: false,
    queueMicrotask: (fn: () => void) => scheduled.push(fn),
    Taro: { getStorageSync: () => storage.value, setStorageSync: (_key: string, value: unknown) => { storage.value = value; } },
  }, { timeout: 1000 });
  return { store: exports.useAppStore as typeof useAppStore, flush: () => { while (scheduled.length) scheduled.shift()!(); }, storage };
}

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
    value: { observationContext: validObservationContext, plans: [] },
  });
  assert.equal(store.getState().observationContext?.contextId, "synthetic-context");
  assert.equal(store.getState().observationContext?.location.kind, "MAP_POINT");
});

test("startup recovery never restores a session-precise observation context", () => {
  const { store } = loadStore({
    value: {
      observationContext: {
        ...validObservationContext,
        privacyClass: "SESSION_PRECISE",
      },
    },
  });
  assert.equal(store.getState().observationContext, null);
});
