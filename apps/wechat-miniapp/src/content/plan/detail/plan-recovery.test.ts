import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("late authentication restores a new draft before default selection without overwriting typing", () => {
  const source = ts.createSourceFile("plan.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
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
