import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("link removal cancels on declined confirmation or account change and always releases its lock", async () => {
  const source = ts.createSourceFile("page.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration: ts.VariableDeclaration | undefined;
  const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && node.name.getText(source) === "remove") declaration = node; ts.forEachChild(node, visit); };
  visit(source);
  assert.ok(declaration?.initializer);
  for (const scenario of ["cancel", "confirm-switch", "response-switch", "failure-switch", "refresh-switch", "success"]) {
    let current = "a";
    const mutationBusy = { current: false };
    let mutation: unknown = null;
    let calls = 0;
    let refreshes = 0;
    const notices: string[] = [];
    const remove = vm.runInNewContext(ts.transpileModule(`const remove = ${declaration.initializer.getText(source)}; remove;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      owner: "a", currentDraftUserId: () => current, mutationBusy, setMutation: (value: unknown) => { mutation = value; },
      Taro: { showModal: async () => { if (scenario === "confirm-switch") current = "b"; return { confirm: scenario !== "cancel" }; } },
      deleteProfileLink: async (id: string, owner: string) => { assert.equal(id, "link:one"); assert.equal(owner, "a"); calls++; if (scenario === "response-switch" || scenario === "failure-switch") current = "b"; if (scenario === "failure-switch") throw Error("late failure"); },
      links: { refetch: async () => { refreshes++; if (scenario === "refresh-switch") { current = "b"; throw Error("late refresh"); } } }, announce: (tone: string) => notices.push(tone), errorMessage: String,
    });
    await remove({ profileLinkId: "link:one", displayName: "测试链接" });
    assert.equal(calls, ["success", "response-switch", "failure-switch", "refresh-switch"].includes(scenario) ? 1 : 0);
    assert.equal(refreshes, ["success", "refresh-switch"].includes(scenario) ? 1 : 0);
    assert.deepEqual(notices, ["success", "refresh-switch"].includes(scenario) ? ["success"] : []);
    assert.equal(mutationBusy.current, false);
    assert.equal(mutation, null);
  }
});
