import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { planChecklistBelongsTo, planChecklistStorageKey, readOwnedPlanChecklist } from "./plan-checklist";

test("checklist keys isolate exact account and plan identities", () => {
  assert.notEqual(planChecklistStorageKey("one", "a"), planChecklistStorageKey("one", "ab"));
  assert.notEqual(planChecklistStorageKey("one", "a"), planChecklistStorageKey("two", "a"));
  assert.equal(planChecklistBelongsTo(planChecklistStorageKey("one", "a"), "a"), true);
  assert.equal(planChecklistBelongsTo(planChecklistStorageKey("one", "ab"), "a"), false);
  assert.equal(planChecklistBelongsTo("starward:plan-checklist:one", "a"), false);
  assert.equal(planChecklistBelongsTo("starward:plan-checklist:v2:bad", "a"), false);
});
test("actual checklist action rejects stale owners and does not run during plan mutations", () => {
  const ast = ts.createSourceFile("plan.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "toggleChecklistItem") handler = `const ${node.getText(ast)};`;
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.ok(handler);
  for (const scenario of ["same", "changed", "deferred-change", "busy"]) {
    let owner: string | null = scenario === "changed" ? null : "a";
    let value = { route: false };
    const writes: string[] = [];
    const toggle = vm.runInNewContext(ts.transpileModule(handler + "\ntoggleChecklistItem;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      scopedDraftUserId: () => owner, mutationBusy: { current: scenario === "busy" }, activePlanId: "one", planChecklistStorageKey,
      setChecklist: (update: (input: typeof value) => typeof value) => { if (scenario === "deferred-change") owner = null; value = update(value); },
      Taro: { setStorageSync: (key: string) => writes.push(key) },
    });
    toggle("route");
    assert.equal(value.route, scenario === "same");
    assert.deepEqual(writes, scenario === "same" ? [planChecklistStorageKey("one", "a")] : []);
  }
});

test("legacy preparation progress migrates only after server ownership is established and scoped data wins", () => {
  const values = new Map<string, unknown>([["starward:plan-checklist:one", { route: true, conditions: true, unknown: "excluded" }]]);
  const storage = { getStorageSync: (key: string) => values.get(key), setStorageSync: (key: string, value: unknown) => { values.set(key, value); }, removeStorageSync: (key: string) => { values.delete(key); } };
  assert.equal(readOwnedPlanChecklist(storage, "one", "b", false).route, false);
  assert.equal(values.size, 1);
  const migrated = readOwnedPlanChecklist(storage, "one", "a", true);
  assert.equal(migrated.route, true); assert.equal(migrated.conditions, true);
  assert.equal("unknown" in migrated, false);
  assert.equal(values.has("starward:plan-checklist:one"), false);
  values.set("starward:plan-checklist:one", { route: false });
  assert.equal(readOwnedPlanChecklist(storage, "one", "a", true).route, true);
  assert.equal(values.has("starward:plan-checklist:one"), true);
  values.delete(planChecklistStorageKey("one", "a"));
  assert.throws(() => readOwnedPlanChecklist({ ...storage, setStorageSync() { throw new Error("full"); } }, "one", "a", true), /full/);
  assert.equal(values.has("starward:plan-checklist:one"), true);
});
