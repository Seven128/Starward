import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const ast = ts.createSourceFile("plan.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
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
      scopedDraftUserId: () => owner, planOwner: "a", planSnapshot: null, requestedSpotId: null, observationContext: { contextId: "before" },
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
test("plan context restoration remains local and never commits to the opener map", async () => {
  const property = findText(node => ts.isPropertyAssignment(node) && node.name.getText(ast) === "queryFn" && node.getText(ast).includes("requestingOwner"));
  let writes = 0;
  const mapContext = { contextId: "map-before", selectedAtUtc: "2026-09-09T12:00:00Z" };
  const restore = vm.runInNewContext(compile(property.slice(property.indexOf(":") + 1)), {
    scopedDraftUserId: () => "a", planOwner: "a", planSnapshot: null, requestedSpotId: null,
    observationContext: mapContext,
    useAppStore: { getState: () => ({ observationContext: mapContext, setObservationContext: () => { writes++; } }) },
    setObservationContext: () => { writes++; },
    restoreObservationContext: async () => ({ data: { contextId: "plan-local" } }),
  });
  const result = await restore();
  assert.equal(result.data.contextId, "plan-local");
  assert.equal(mapContext.contextId, "map-before");
  assert.equal(writes, 0);
  const commits: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && /setObservationContext$/.test(node.expression.getText(ast))) commits.push(node.getText(ast));
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.deepEqual(commits, []);
});
