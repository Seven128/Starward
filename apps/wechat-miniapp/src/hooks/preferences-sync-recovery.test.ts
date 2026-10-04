import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type LifecycleStore = {
  preferences: { equipment: string }; preferencesDirty: boolean; preferencesRevision: number;
  setPreference(key: string, value: unknown): void;
  applyServerPreferences(record: { preferences: { equipment: string }; revision: number }): void;
  rebasePreferencesAfterConflict(record: { preferences: { equipment: string }; revision: number }): void;
  markPreferencesSynced(record: { preferences: { equipment: string }; revision: number }): void;
};

function actualPreferencesStore() {
  const source = ts.createSourceFile("store.ts", readFileSync(new URL("../state/app-store.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const names = ["setPreference", "applyServerPreferences", "rebasePreferencesAfterConflict", "markPreferencesSynced"];
  const methods: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isMethodDeclaration(node) && names.includes(node.name.getText(source))) methods.push(node.getText(source));
    ts.forEachChild(node, visit);
  }
  visit(source);assert.equal(methods.length, names.length);
  const state = { preferences: { equipment: "手电" }, preferencesDirty: true, preferencesRevision: 4 } as LifecycleStore;
  Object.assign(state, vm.runInNewContext(ts.transpileModule(`({${methods.join(",")}});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    commit(patch: Partial<LifecycleStore> | ((value: LifecycleStore) => Partial<LifecycleStore>)) { Object.assign(state, typeof patch === "function" ? patch(state) : patch); },
  }));
  return state;
}

function lifecycleHarness(sharedState?: LifecycleStore) {
  const source = ts.createSourceFile("sync.ts", readFileSync(new URL("./use-preferences-sync.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "usePreferencesSync");
  assert.ok(declaration);
  class Conflict extends Error { code = "CONFLICT"; }
  let owner = "user:test", nextTimer = 0, writes = 0, conflictReads = 0;
  let finish!: (value: unknown) => void, reject!: (error: unknown) => void;
  const timers = new Map<number, () => unknown>();
  const requestedRevisions: number[] = [];
  const effects: Array<() => void | (() => void)> = [], cleanups: Array<() => void> = [], statuses: string[] = [];
  const state = sharedState ?? actualPreferencesStore();
  // Match Zustand's immutable top-level snapshots while sharing the current
  // account and actual preference transitions between mounted hook instances.
  const store = Object.assign((select: (value: unknown) => unknown) => select(state), { getState: () => ({ ...state }) });
  const create = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /, "") + "\nusePreferencesSync;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    useAppStore: store, useCallback: (callback: unknown) => callback, useRef: (current: unknown) => ({ current }),
    useState: () => ["", (message: string) => statuses.push(message)],
    useEffect(callback: () => void | (() => void)) { effects.push(callback); const cleanup = callback(); if (cleanup) cleanups.push(cleanup); },
    cloneUserPreferences: (value: unknown) => structuredClone(value), currentDraftUserId: () => owner,
    savePreferences: (_preferences: unknown, revision: number) => { writes++; requestedRevisions.push(revision); return new Promise((resolve, fail) => { finish = resolve; reject = fail; }); },
    getPreferences: async () => { conflictReads++; return { dataState: "FRESH", data: { preferences: { equipment: "手电" }, revision: 5 } }; },
    MiniappApiError: Conflict, errorMessage: () => "offline",
    setTimeout(callback: () => unknown) { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout(id: number) { timers.delete(id); },
  });
  return {
    hook: create(), state, timers, statuses, requestedRevisions,
    get writes() { return writes; }, get conflictReads() { return conflictReads; },
    acknowledge(equipment = "手电", revision = 5) { finish({ data: { preferences: { equipment }, revision } }); },
    conflict() { reject(new Conflict()); }, changeOwner() { owner = "user:other"; },
    cleanup() { for (const cleanup of cleanups.splice(0)) cleanup(); statuses.length = 0; },
    reattachEffects() { for (const setup of effects) { const cleanup = setup(); if (cleanup) cleanups.push(cleanup); } },
  };
}

test("unmount retires retries while a valid in-flight acknowledgement still updates its account revision", async () => {
  const h = lifecycleHarness(), pending = h.hook.syncNow();
  assert.equal(await h.hook.syncNow(), false);
  h.cleanup();
  assert.equal(h.timers.size, 0);
  h.acknowledge();await pending;
  assert.equal(h.state.preferencesRevision, 5);
  assert.equal(h.state.preferencesDirty, false);
  assert.equal(h.timers.size, 0);
  assert.deepEqual(h.statuses, []);
  assert.equal(await h.hook.syncNow(), false);
  assert.equal(h.writes, 1);
});

test("an old same-value acknowledgement cannot clear a later edit across Settings instances", async () => {
  const old = lifecycleHarness(), first = old.hook.syncNow();old.cleanup();
  // Save A committed revision 5 but its acknowledgement is delayed. My's fresh
  // library readback advances the real store before the next save B uses CAS 5.
  old.state.applyServerPreferences({ preferences: { equipment: "手电" }, revision: 5 });
  const next = lifecycleHarness(old.state);next.hook.updatePreference("equipment", "望远镜");
  const second = next.hook.syncNow();next.hook.updatePreference("equipment", "手电");
  old.acknowledge();await first;next.acknowledge("望远镜", 6);await second;
  assert.deepEqual(old.requestedRevisions, [4]);assert.deepEqual(next.requestedRevisions, [5]);
  assert.equal(next.state.preferences.equipment, "手电");
  assert.equal(next.state.preferencesDirty, true);
  assert.equal(next.state.preferencesRevision, 6);
  assert.ok(next.timers.size > 0);next.cleanup();
});

test("a delayed lower-revision acknowledgement cannot roll back a fresh library readback", async () => {
  const h = lifecycleHarness(), pending = h.hook.syncNow();h.cleanup();
  h.state.applyServerPreferences({ preferences: { equipment: "望远镜" }, revision: 6 });
  h.acknowledge("手电", 5);await pending;
  assert.equal(h.state.preferences.equipment, "手电");
  assert.equal(h.state.preferencesDirty, true);
  assert.equal(h.state.preferencesRevision, 6);
});

test("a superseded queued timer cannot retire or dispatch its newer replacement", async () => {
  const h = lifecycleHarness(), oldCallback = [...h.timers.values()][0];
  assert.ok(oldCallback);
  h.hook.updatePreference("equipment", "望远镜");
  oldCallback();await Promise.resolve();
  assert.equal(h.writes, 0);
  assert.equal(h.timers.size, 1);h.cleanup();assert.equal(h.timers.size, 0);
});

test("a conflict after unmount starts no readback or retry and keeps unsynced local intent", async () => {
  const h = lifecycleHarness(), pending = h.hook.syncNow();
  h.cleanup();h.conflict();
  assert.equal(await pending, false);
  assert.equal(h.conflictReads, 0);
  assert.equal(h.state.preferencesRevision, 4);
  assert.equal(h.state.preferencesDirty, true);
  assert.equal(h.timers.size, 0);
  assert.deepEqual(h.statuses, []);
});

test("an already queued callback does no work after cleanup but effect reattachment can resume", async () => {
  const h = lifecycleHarness(), callback = [...h.timers.values()][0];
  assert.ok(callback);h.cleanup();callback();
  await Promise.resolve();
  assert.equal(h.writes, 0);
  h.reattachEffects();assert.equal(h.timers.size, 1);
  h.cleanup();
});

test("a late acknowledgement after account change cannot apply to the new account", async () => {
  const h = lifecycleHarness(), pending = h.hook.syncNow();
  h.cleanup();h.changeOwner();h.acknowledge();
  assert.equal(await pending, false);
  assert.equal(h.state.preferencesRevision, 4);
  assert.equal(h.state.preferencesDirty, true);
  assert.equal(h.timers.size, 0);
  assert.deepEqual(h.statuses, []);
});

test("a dirty local preference waits for an identified account before any cloud write", async () => {
  const source = ts.createSourceFile("sync.ts", readFileSync(new URL("./use-preferences-sync.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "usePreferencesSync");
  assert.ok(declaration);
  const statuses: string[] = [];
  let writes = 0;
  const state = { preferences: { equipment: "双筒望远镜" }, preferencesDirty: true, preferencesRevision: 4 };
  const store = Object.assign((select: (value: unknown) => unknown) => select(state), { getState: () => state });
  const create = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /, "") + "\nusePreferencesSync;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    useAppStore: store, useCallback: (callback: unknown) => callback, useEffect() {},
    useRef: (current: unknown) => ({ current }), useState: () => ["", (message: string) => statuses.push(message)],
    cloneUserPreferences: (value: unknown) => structuredClone(value), currentDraftUserId: () => null,
    savePreferences: async () => { writes++; return { data: { preferences: { equipment: "双筒望远镜" }, revision: 5 } }; },
    getPreferences: async () => assert.fail("no conflict read expected"), MiniappApiError: Error,
    setTimeout: () => assert.fail("no retry expected"), clearTimeout() {}, errorMessage: () => "unexpected error",
  });
  assert.equal(await create().syncNow(), false);
  assert.equal(writes, 0);
  assert.equal(state.preferencesRevision, 4);
  assert.equal(state.preferencesDirty, true);
  assert.match(statuses.at(-1) ?? "", /本机|账户/);
  state.preferencesRevision = 0;
  assert.equal(await create().syncNow(), false);
  assert.equal(writes, 0);
  assert.match(statuses.at(-1) ?? "", /账户尚未恢复/);
});

test("editing during a save retains the new edit and retries with the acknowledged revision", async () => {
  const source = ts.createSourceFile("sync.ts", readFileSync(new URL("./use-preferences-sync.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "usePreferencesSync");
  assert.ok(declaration);
  const timers: Array<() => unknown> = [];
  const writes: Array<{ equipment: string; revision: number }> = [];
  let finish: (value: unknown) => void = () => assert.fail("save was not started");
  const state = {
    preferences: { equipment: "手电" }, preferencesDirty: true, preferencesRevision: 4,
    setPreference(key: string, value: string) { this.preferences = { ...this.preferences, [key]: value }; this.preferencesDirty = true; },
    applyServerPreferences(record: { revision: number }) { this.preferencesRevision = record.revision; },
    markPreferencesSynced(record: { preferences: { equipment: string }; revision: number }) {
      this.preferences = record.preferences; this.preferencesRevision = record.revision; this.preferencesDirty = false;
    },
  };
  const store = Object.assign((select: (value: unknown) => unknown) => select(state), { getState: () => state });
  const create = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /, "") + "\nusePreferencesSync;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    useAppStore: store, useCallback: (callback: unknown) => callback, useEffect() {},
    useRef: (current: unknown) => ({ current }), useState: () => ["", () => {}],
    cloneUserPreferences: (value: unknown) => structuredClone(value),
    currentDraftUserId: () => "user:test",
    savePreferences: (preferences: { equipment: string }, revision: number) => {
      writes.push({ equipment: preferences.equipment, revision });
      return new Promise(resolve => { finish = resolve; });
    },
    getPreferences: () => assert.fail("no conflict expected"), MiniappApiError: Error,
    setTimeout: (callback: () => unknown) => { timers.push(callback); return timers.length; },
    clearTimeout() {}, errorMessage: () => "unexpected error",
  });
  const hook = create();
  const firstSave = hook.syncNow();
  hook.updatePreference("equipment", "双筒望远镜");
  assert.equal(await hook.syncNow(), false); // A second save waits for the active request.
  finish({ data: { preferences: { equipment: "手电" }, revision: 5 } });
  await firstSave;
  assert.equal(state.preferences.equipment, "双筒望远镜");
  assert.equal(state.preferencesDirty, true);
  assert.equal(state.preferencesRevision, 5);
  assert.ok(timers.length > 0);
  timers.at(-1)!();
  assert.deepEqual(writes, [{ equipment: "手电", revision: 4 }, { equipment: "双筒望远镜", revision: 5 }]);
  finish({ data: { preferences: { equipment: "双筒望远镜" }, revision: 6 } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.preferencesDirty, false);
  assert.equal(state.preferences.equipment, "双筒望远镜");
});

test("a failed conflict readback keeps local preferences without a half-second retry loop", async () => {
  const source = ts.createSourceFile("sync.ts", readFileSync(new URL("./use-preferences-sync.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "usePreferencesSync");
  assert.ok(declaration);
  class ApiError extends Error { code = "CONFLICT"; }
  const statuses: string[] = [];
  const timers: unknown[] = [];
  const preferences = { largeText: true };
  let writes = 0;
  const state = {
    preferences, preferencesDirty: true, preferencesRevision: 1,
    applyServerPreferences() { assert.fail("failed readback cannot advance the revision"); },
  };
  const store = Object.assign((select: (state: unknown) => unknown) => select(state), { getState: () => state });
  const create = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /, "") + "\nusePreferencesSync;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    useAppStore: store,
    useCallback: (callback: unknown) => callback,
    useEffect() {},
    useRef: (current: unknown) => ({ current }),
    useState: () => ["", (message: string) => statuses.push(message)],
    cloneUserPreferences: (value: unknown) => structuredClone(value),
    currentDraftUserId: () => "user:test",
    savePreferences: async () => { writes++; throw new ApiError(); },
    getPreferences: async () => { throw new Error("offline"); },
    MiniappApiError: ApiError,
    setTimeout: (...args: unknown[]) => { timers.push(args); return 1; },
    clearTimeout() {},
    errorMessage: () => "offline",
  });
  assert.equal(await create().syncNow(), false);
  assert.equal(writes, 1);
  assert.equal(timers.length, 0);
  assert.match(statuses.at(-1) ?? "", /无法读取云端最新偏好/);
  assert.equal(state.preferences, preferences);
  assert.equal(state.preferencesRevision, 1);
  assert.equal(state.preferencesDirty, true);
});

test("fresh lower-revision conflict retries the preserved local preference against the server revision", async () => {
  const source = ts.createSourceFile("sync.ts", readFileSync(new URL("./use-preferences-sync.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "usePreferencesSync");
  assert.ok(declaration);
  class Conflict extends Error { code = "CONFLICT"; }
  const timers: Array<() => unknown> = [];
  const writes: number[] = [];
  const state = {
    preferences: { contributionStatusReminder: true }, preferencesDirty: true, preferencesRevision: 5,
    rebasePreferencesAfterConflict(record: { revision: number }) { this.preferencesRevision = record.revision; },
    markPreferencesSynced(record: { preferences: { contributionStatusReminder: boolean }; revision: number }) {
      this.preferences = record.preferences; this.preferencesRevision = record.revision; this.preferencesDirty = false;
    },
  };
  const store = Object.assign((select: (value: unknown) => unknown) => select(state), { getState: () => state });
  const create = vm.runInNewContext(ts.transpileModule(declaration.getText(source).replace(/^export /, "") + "\nusePreferencesSync;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    useAppStore: store, useCallback: (callback: unknown) => callback, useEffect() {},
    useRef: (current: unknown) => ({ current }), useState: () => ["", () => {}],
    cloneUserPreferences: (value: unknown) => structuredClone(value), currentDraftUserId: () => "user:test",
    savePreferences: async (preferences: { contributionStatusReminder: boolean }, revision: number) => {
      writes.push(revision);
      if (revision === 5) throw new Conflict();
      return { data: { preferences, revision: 2 } };
    },
    getPreferences: async () => ({ dataState: "FRESH", data: { preferences: { contributionStatusReminder: false }, revision: 1 } }),
    MiniappApiError: Conflict, setTimeout: (callback: () => unknown) => { timers.push(callback); return timers.length; },
    clearTimeout() {}, errorMessage: () => "unexpected error",
  });
  const hook = create();
  assert.equal(await hook.syncNow(), false);
  assert.equal(state.preferencesRevision, 1);
  assert.equal(state.preferences.contributionStatusReminder, true);
  assert.equal(timers.length, 1);
  timers[0]!();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(writes, [5, 1]);
  assert.equal(state.preferencesDirty, false);
  assert.equal(state.preferencesRevision, 2);
});
