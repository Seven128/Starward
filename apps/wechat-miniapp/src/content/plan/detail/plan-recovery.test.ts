import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

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
    setDraftStorageFailed: (value: boolean) => { storageFailed = value; },
    Taro: { setStorageSync: (_key: string, value: unknown) => { if (fail) throw new Error("full"); writes.push(value); } },
  });
  retain({ notes: "new" }); assert.equal(storageFailed, true); assert.equal(writes.length, 0);
  account = "a"; fail = true;
  retain({ notes: "new" }); assert.equal(storageFailed, true); assert.equal(writes.length, 0);
  fail = false;
  retain({ notes: "new" }); assert.equal(storageFailed, false);
  assert.equal((writes[0] as { notes: string }).notes, "new");
});
