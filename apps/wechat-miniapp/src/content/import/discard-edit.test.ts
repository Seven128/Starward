import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("discard needs an explicit second action and successful local cleanup before resetting the form", () => {
  const ast = ts.createSourceFile("import.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "discardCurrentEdit") handler = `const ${node.getText(ast)};`;
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.ok(handler);
  for (const scenario of ["first", "success", "storage-error", "wrong-owner", "busy", "clean"]) {
    const calls: string[] = [], dirty = { current: scenario !== "clean" }, revision = { current: 3 };
    const discard = vm.runInNewContext(ts.transpileModule(handler + "\ndiscardCurrentEdit;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      ownerMatches: () => scenario !== "wrong-owner", actionBusy: { current: scenario === "busy" }, dirtyEdit: dirty,
      restoredRevision: revision, discardEditConfirmed: scenario !== "first",
      setDiscardEditConfirmed() { calls.push("confirmation"); }, setEditStorageError() {}, announce() {}, errorMessage: () => "storage error",
      localStore: { clear() { calls.push("clear"); if (scenario === "storage-error") throw new Error("storage"); } },
      beginAnotherImport() { calls.push("reset"); },
    });
    discard();
    assert.equal(calls.includes("reset"), scenario === "success");
    if (scenario === "first") assert.deepEqual(calls, ["confirmation"]);
    if (scenario === "success") { assert.equal(dirty.current, false); assert.equal(revision.current, null); }
    if (scenario === "storage-error") { assert.equal(dirty.current, true); assert.equal(revision.current, 3); }
    if (["wrong-owner", "busy", "clean"].includes(scenario)) assert.deepEqual(calls, []);
  }
});
