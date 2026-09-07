import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("history resume cannot overwrite unsaved or unrecovered local content", () => {
  const ast = ts.createSourceFile("form.ts", readFileSync(new URL("./use-contribution-form.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  let handler = "";
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === "resumeDraft") handler = node.initializer.getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.ok(handler);
  const localDraft = { hasUnsavedChanges: true, recovery: null as object | null };
  let applied = 0, warnings = 0;
  const resume = vm.runInNewContext(ts.transpileModule(`const resume = ${handler}; resume;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    localDraft, announce: () => warnings++, applyDraft: () => applied++,
  });
  assert.equal(resume({ submissionId: "saved" }), false);
  assert.equal(applied, 0);
  localDraft.hasUnsavedChanges = false; localDraft.recovery = {};
  assert.equal(resume({ submissionId: "saved" }), false);
  assert.equal(applied, 0); assert.equal(warnings, 2);
  localDraft.recovery = null;
  assert.equal(resume({ submissionId: "saved" }), true);
  assert.equal(applied, 1);
});
