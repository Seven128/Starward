import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("article and source routes reject a missing, different, or nonformal observation location", () => {
  for (const path of ["./index.tsx", "../../content/article/detail/index.tsx"]) {
    const source = ts.createSourceFile(path, readFileSync(new URL(path, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let expression = "";
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && node.name.getText(source) === "validRoute") expression = node.initializer!.getText(source);
      ts.forEachChild(node, visit);
    };
    visit(source);
    assert.ok(expression);
    const script = ts.transpileModule(`Boolean(${expression});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
    const check = (context: unknown) => vm.runInNewContext(script, { context, spotId: "spot:a", contextId: "ctx:a", articleId: "article:a" });
    assert.equal(check(null), false);
    assert.equal(check({ contextId: "ctx:old", location: { kind: "FORMAL_SPOT", spotId: "spot:a" } }), false);
    assert.equal(check({ contextId: "ctx:a", location: { kind: "FORMAL_SPOT", spotId: "spot:b" } }), false);
    assert.equal(check({ contextId: "ctx:a", location: { kind: "MAP_POINT" } }), false);
    assert.equal(check({ contextId: "ctx:a", location: { kind: "FORMAL_SPOT", spotId: "spot:a" } }), true);
  }
});
