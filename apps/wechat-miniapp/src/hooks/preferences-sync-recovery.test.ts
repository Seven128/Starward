import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

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
