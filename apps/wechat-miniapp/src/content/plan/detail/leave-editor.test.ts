import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { confirmPlanEditorLeave } from "./leave-editor";

test("busy, cancel and failed confirmation keep edits in place; clean and approved exits proceed", async () => {
  assert.equal(await confirmPlanEditorLeave({ busy: true, dirty: false, confirm: async () => assert.fail() }), false);
  assert.equal(await confirmPlanEditorLeave({ busy: false, dirty: false, confirm: async () => assert.fail() }), true);
  for (const answer of [false, true]) assert.equal(await confirmPlanEditorLeave({ busy: false, dirty: true, confirm: async () => answer }), answer);
  assert.equal(await confirmPlanEditorLeave({ busy: false, dirty: true, confirm: async () => { throw new Error("dialog_failed"); } }), false);
});

test("the real keep-and-exit action leaves only after the current draft is durably retained", async () => {
  const source = ts.createSourceFile("page.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "beforeLeavingEditor") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(declaration);
  for (const scenario of ["cancel", "storage-failed", "kept"] as const) {
    let retains = 0;
    const leave = vm.runInNewContext(ts.transpileModule(declaration + "\nbeforeLeavingEditor;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText,
      { confirmPlanEditorLeave, mutationBusy: { current: false }, editing: true, isDirty: true,
        Taro: { showModal: async (options: { confirmText: string }) => { assert.equal(options.confirmText, "保留并退出"); return { confirm: scenario !== "cancel" }; } },
        retainDraft: () => { retains++; return scenario === "kept"; } });
    assert.equal(await leave(), scenario === "kept");
    assert.equal(retains, scenario === "cancel" ? 0 : 1);
  }
});
