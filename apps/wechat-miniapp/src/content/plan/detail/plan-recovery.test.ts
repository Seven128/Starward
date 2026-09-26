import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { parsePlanDraft } from "./plan-draft";

test("late authentication restores a new draft before default selection without overwriting typing", () => {
  const source = ts.createSourceFile("plan.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback = "";
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" &&
        node.arguments[0]?.getText(source).includes("readDraft(null)")) callback = node.arguments[0].getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(callback);
  for (const editing of [false, true]) {
    for (const hasPlans of [false, true]) {
      const calls: string[] = [];
      const run = vm.runInNewContext(ts.transpileModule(`const run = ${callback}; run;`, {
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
      }).outputText, {
        planQuery: { data: { data: { plans: hasPlans ? [{}] : [] } } },
        requestedPlanId: null, activePlanId: null, newPlanRequested: { current: editing }, editing,
        readDraft: () => ({ notes: "recovered" }),
        startNewPlan: () => calls.push("restore"), applyPlan: () => calls.push("first"),
      });
      run();
      assert.deepEqual(calls, editing ? [] : ["restore"]);
    }
  }
});

test("draft receipt reports missing account and storage failures, then clears only after a successful write", () => {
  const source = ts.createSourceFile("plan.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "retainDraft") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(declaration);
  let account: string | null = null, fail = false, storageFailed = false;
  const writes: unknown[] = [];
  const retain = vm.runInNewContext(ts.transpileModule(declaration + "\nretainDraft;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    appliedContextDefaults: { current: false }, scopedDraftUserId: () => account,
    planDraftKey: (owner: string | null) => owner, activePlanId: null,
    selectedSpotId: null, localDate: "2026-09-09", localTime: "22:00", timing: {}, travel: {}, eventOccurrenceIds: [], reminders: [], notes: "old",
    draftBaseRevision: { current: null }, announce: () => {},
    draftScopePlanId: { current: null }, creationPlanId: { current: null }, creationConfirmed: { current: false }, parsePlanDraft,
    setDraftStorageFailed: (value: boolean) => { storageFailed = value; },
    Taro: { getStorageSync: () => null, setStorageSync: (_key: string, value: unknown) => { if (fail) throw new Error("full"); writes.push(value); } },
  });
  retain({ notes: "new" }); assert.equal(storageFailed, true); assert.equal(writes.length, 0);
  account = "a"; fail = true;
  retain({ notes: "new" }); assert.equal(storageFailed, true); assert.equal(writes.length, 0);
  fail = false;
  retain({ notes: "new" }); assert.equal(storageFailed, false);
  assert.equal((writes[0] as { notes: string }).notes, "new");
});

test("two mounted new editors preserve one reserved identity and cannot erase its confirmed-create fact", () => {
  const source = ts.createSourceFile("plan.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "retainDraft") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source);
  let stored: unknown = null;
  const mount = () => {
    const identity = { current: null as string | null }, confirmed = { current: false };
    const retain = vm.runInNewContext(ts.transpileModule(declaration + "\nretainDraft;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      appliedContextDefaults: { current: false }, scopedDraftUserId: () => "a", planDraftKey: () => "new",
      draftScopePlanId: { current: null }, creationPlanId: identity, creationConfirmed: confirmed, parsePlanDraft,
      selectedSpotId: null, localDate: "2026-09-09", localTime: "22:00", timing: undefined, travel: undefined, eventOccurrenceIds: [], reminders: [], notes: "original",
      draftBaseRevision: { current: null }, announce() {}, setDraftStorageFailed() {},
      Taro: { getStorageSync: () => stored, setStorageSync: (_key: string, value: unknown) => { stored = structuredClone(value); } },
    });
    return { identity, confirmed, retain };
  };
  const a = mount(), b = mount();
  assert.equal(a.retain({ creationPlanId: "plan:shared" }), true);
  assert.equal(b.retain({ notes: "second editor input" }), true);
  assert.equal(b.identity.current, "plan:shared");
  assert.equal(a.retain({ creationConfirmed: true }), true);
  assert.equal(b.retain({ notes: "latest input" }), true);
  assert.equal(parsePlanDraft(stored)?.creationConfirmed, true);
  assert.equal(b.confirmed.current, true);
  assert.equal(b.retain({ creationPlanId: "plan:wrong" }), false);
  assert.equal(parsePlanDraft(stored)?.creationPlanId, "plan:shared");
  assert.equal(parsePlanDraft(stored)?.notes, "latest input");
});

test("cold confirmed creation keeps the original draft scope and input when server hydration arrives", () => {
  const source = ts.createSourceFile("plan.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations: string[] = [];
  let effect = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ["draftScopePlanId", "newPlanRequested", "[activePlanId, setActivePlanId]"].includes(node.name.getText(source))) declarations.push(`const ${node.getText(source)};`);
    if (ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0]?.getText(source).includes("hydratedDraftScope.current === scope")) effect = node.arguments[0].getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert.equal(declarations.length, 3); assert.ok(effect);
  for (const serverPresent of [false, true]) {
    const result = vm.runInNewContext(ts.transpileModule(declarations.join("\n") + `\n(${effect})();\n({ activePlanId, scope: draftScopePlanId.current });`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      initialSelection: { planId: null }, explicitNew: true,
      restoredDraft: { creationPlanId: "plan:reserved", creationConfirmed: true, notes: "cold edited notes", baseRevision: null },
      useRef: (value: unknown) => ({ current: value }), useState: (value: unknown) => [value, () => {}],
      activePlan: serverPresent ? { planId: "plan:reserved", revision: 2, notes: "server original" } : null,
      applyPlan: () => assert.fail("must not hydrate over this new-route draft or move its storage scope"),
    });
    assert.equal(result.activePlanId, "plan:reserved");
    assert.equal(result.scope, null);
  }
});
