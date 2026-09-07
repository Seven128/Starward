import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("post-save list failure warns only the account that performed the import", () => {
  const source = ts.createSourceFile("import.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const callbacks: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "imports.refetch().catch" &&
        node.arguments[0]?.getText(source).includes("列表暂未刷新"))
      callbacks.push(node.arguments[0]!.getText(source));
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(callbacks.length, 2);
  for (const callback of callbacks) {
    for (const matching of [true, false]) {
      let warnings = 0;
      const run = vm.runInNewContext(`(${callback})`, {
        ownerMatches: () => matching,
        announce: () => { warnings++; },
      });
      run();
      assert.equal(warnings, matching ? 1 : 0);
    }
  }
});

test("import recovery cleanup requires review, a fresh list and unchanged owner", async () => {
  const source = ts.createSourceFile("import.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "clearSaveRecovery") handler = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(handler);
  for (const scenario of ["review", "unreviewed-confirm", "offline", "switch", "busy", "success"]) {
    const calls: string[] = [], busy = { current: scenario === "busy" };
    let matching = true;
    const clear = vm.runInNewContext(ts.transpileModule(handler + "\nclearSaveRecovery;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      owner: "a", actionBusy: busy, ownerMatches: () => matching,
      recoveryReviewed: !["review", "unreviewed-confirm"].includes(scenario),
      setAction() {}, setSaveRecoveryError() {}, setRecoveryReviewed() { calls.push("review-state"); },
      errorMessage: () => "offline", announce() {},
      imports: { refetch: async () => {
        calls.push("refresh");
        if (scenario === "offline") throw new Error("offline");
        if (scenario === "switch") matching = false;
      } },
      clearPostImportSaveRecovery: (owner: string) => { assert.equal(owner, "a"); calls.push("clear"); },
    });
    await clear(scenario !== "review");
    assert.equal(calls.includes("clear"), scenario === "success", scenario);
    if (scenario === "busy") assert.deepEqual(calls, []);
    else assert.equal(busy.current, false);
    if (scenario === "success") assert.deepEqual(calls, ["refresh", "clear", "review-state"]);
  }
});
