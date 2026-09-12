import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("plan recovery cleanup requires review, a successful refresh and the same mounted account", async () => {
  const ast = ts.createSourceFile("plan.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let text = "";
  const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "clearSaveRecovery") text = `const ${node.getText(ast)};`; ts.forEachChild(node, visit); };
  visit(ast); assert.ok(text);
  for (const scenario of ["review", "offline", "changed", "busy", "success"]) {
    let owner: string | null = "a";
    const calls: string[] = [], busy = { current: scenario === "busy" };
    const clear = vm.runInNewContext(ts.transpileModule(text + "\nclearSaveRecovery;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      scopedDraftUserId: () => owner, mutationBusy: busy, saveRecoveryReviewed: scenario !== "review",
      setSaving() {}, setSaveRecoveryReviewed() {}, setSaveRecoveryError() {}, announce() {}, errorMessage: () => "offline",
      planQuery: { refetch: async () => { calls.push("refresh"); if (scenario === "offline") throw new Error("offline"); if (scenario === "changed") owner = null; } },
      clearObservationPlanSaveRecovery: (value: string) => { assert.equal(value, "a"); calls.push("clear"); },
    });
    await clear();
    assert.deepEqual(calls, scenario === "busy" ? [] : scenario === "success" ? ["refresh", "clear"] : ["refresh"]);
    if (scenario !== "busy") assert.equal(busy.current, false);
  }
});
