import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("draft recovery is offered only before a server draft is adopted", () => {
  const source = ts.createSourceFile("sections.tsx", readFileSync(new URL("./contribution-form-sections.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let condition: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isConditionalExpression(node) && node.whenTrue.getText(source).includes('data-od-id="contribution-draft-recovery"')) condition = node.condition;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(condition);
  const visible = vm.runInNewContext(`(form) => Boolean(${condition.getText(source)})`);
  const stored = { submissionId: "draft:existing", revision: 3 };
  assert.equal(visible({ draft: null, matchingDraft: stored }), true);
  assert.equal(visible({ draft: null, matchingDraft: null }), false);
  assert.equal(visible({ draft: stored, matchingDraft: stored }), false);
  assert.equal(visible({ draft: stored, matchingDraft: { submissionId: "draft:other" } }), false);
});

test("saving cannot overwrite a matching draft that the user has not restored", async () => {
  const source = ts.createSourceFile("commands.ts", readFileSync(new URL("./use-contribution-commands.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "createSaveDraft");
  assert.ok(declaration);
  const create = vm.runInNewContext(ts.transpileModule(declaration.getText(source) + "\ncreateSaveDraft;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText);
  const notices: string[] = [];
  const stored = { submissionId: "draft:existing", detail: "之前保留的完整现场记录", revision: 8 };
  const form = {
    draft: null, matchingDraft: stored,
    formInput() { assert.fail("unrestored draft cannot be replaced by current input"); },
    announce(_tone: string, title: string) { notices.push(title); },
  };
  assert.equal(await create(form, () => {})(false), null);
  assert.equal(await create(form, () => {})(true), null);
  assert.deepEqual(notices, ["请先继续已有草稿", "请先继续已有草稿"]);
  assert.equal(stored.detail, "之前保留的完整现场记录");
  assert.equal(stored.revision, 8);
});
