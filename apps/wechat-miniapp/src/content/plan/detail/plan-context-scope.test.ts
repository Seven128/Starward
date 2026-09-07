import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const ast = ts.createSourceFile("plan.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function findText(predicate: (node: ts.Node) => boolean) {
  let found = "";
  const visit = (node: ts.Node) => { if (predicate(node)) found = node.getText(ast); ts.forEachChild(node, visit); };
  visit(ast); assert.ok(found); return found;
}
const compile = (text: string) => ts.transpileModule(`const run = ${text}; run;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;

test("context restoration binds its response to the editor owner and rejects late results after account change", async () => {
  const property = findText(node => ts.isPropertyAssignment(node) && node.name.getText(ast) === "queryFn" && node.getText(ast).includes("requestingOwner"));
  const callback = property.slice(property.indexOf(":") + 1);
  for (const changed of [false, true]) {
    let owner: string | null = "a", calls = 0;
    const restore = vm.runInNewContext(compile(callback), {
      scopedDraftUserId: () => owner, planOwner: "a", planSnapshot: null, observationContext: { contextId: "before" },
      useAppStore: { getState: () => ({ observationContext: { contextId: "before" } }) },
      restoreObservationContext: async () => { calls++; if (changed) owner = null; return { data: { contextId: "restored" } }; },
    });
    if (changed) await assert.rejects(restore(), /账号已变化/);
    else assert.equal((await restore()).owner, "a");
    owner = null;
    await assert.rejects(restore(), /账号已变化/);
    assert.equal(calls, 1);
  }
});
test("only a matching context receipt can update the shared observation context", () => {
  const call = findText(node => ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect" && node.arguments[0]?.getText(ast).includes("contextQuery.data?.owner") === true);
  const parsed = ts.createSourceFile("effect.ts", call, ts.ScriptTarget.Latest, true);
  const expression = (parsed.statements[0] as ts.ExpressionStatement).expression as ts.CallExpression;
  for (const owner of ["a", "b", null]) {
    let updates = 0;
    const apply = vm.runInNewContext(compile(expression.arguments[0]!.getText(parsed)), {
      scopedDraftUserId: () => owner, contextQuery: { data: { owner: "a", expectedContext: {} } }, activeContext: {},
      useAppStore: { getState: () => ({ observationContext: {} }) },
      canApplyContextRestore: () => true, sameContextVersion: () => false, setObservationContext: () => { updates++; },
    });
    apply(); assert.equal(updates, owner === "a" ? 1 : 0);
  }
});
