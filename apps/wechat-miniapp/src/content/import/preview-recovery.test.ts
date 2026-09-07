import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { importPreviewRecovery } from "./preview-recovery";

test("preview recovery advances through rights, title and body without accepting whitespace", () => {
  const input = { rightsConfirmed: false, title: " ", body: "\n" };
  assert.equal(importPreviewRecovery(input)?.anchor, "import-rights-section");
  input.rightsConfirmed = true;
  assert.equal(importPreviewRecovery(input)?.anchor, "import-title-section");
  input.title = "自写观测说明";
  assert.equal(importPreviewRecovery(input)?.anchor, "import-body-section");
  input.body = "有权使用的自写内容";
  assert.equal(importPreviewRecovery(input), null);
});

test("the page recovery scrolls and focuses after reset but ignores a changed account", () => {
  const source = ts.createSourceFile("import.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "recoverPreview") declaration = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration);
  let owner = true;
  const pageVisible = { current: true }, recoveryGeneration = { current: 0 };
  const anchors: string[] = [], focus: string[] = [], ticks: (() => void)[] = [];
  const recover = vm.runInNewContext(ts.transpileModule(declaration + "\nrecoverPreview;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
    ownerMatches: () => owner, actionBusy: { current: false },
    pageVisible, recoveryGeneration,
    previewRecovery: importPreviewRecovery({ rightsConfirmed: true, title: "", body: "正文" }),
    setRecoveryAnchor: (value: string) => anchors.push(value),
    setEditorFocus: (value: string) => focus.push(value),
    Taro: { nextTick: (callback: () => void) => ticks.push(callback) },
  }) as () => void;
  recover();
  ticks.shift()!();
  assert.deepEqual(anchors, ["", "import-title-section"]);
  assert.deepEqual(focus, anchors);
  recover();
  owner = false;
  ticks.shift()!();
  assert.deepEqual(anchors, ["", "import-title-section", ""]);
  recover();
  assert.equal(ticks.length, 0);
  owner = true;
  recover();
  pageVisible.current = false;
  recoveryGeneration.current++;
  const beforeHide = anchors.length;
  ticks.shift()!();
  assert.equal(anchors.length, beforeHide);
  recover();
  assert.equal(ticks.length, 0);
});
