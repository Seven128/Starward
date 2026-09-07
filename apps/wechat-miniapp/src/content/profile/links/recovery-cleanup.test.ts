import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("recovery cleanup requires a fresh list, affirmative choice and unchanged account", async () => {
  const source = ts.createSourceFile("links.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "clearSaveRecovery") handler = `const ${node.getText(source)};`;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(handler);
  for (const scenario of ["offline", "cancel", "switch-before-modal", "switch-after-modal", "success"]) {
    let current = "a";
    const calls: string[] = [], busy = { current: false };
    const clear = vm.runInNewContext(ts.transpileModule(handler + "\nclearSaveRecovery;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      owner: "a", mutationBusy: busy, currentDraftUserId: () => current,
      setMutation() {}, setSaveRecoveryError() {}, errorMessage: () => "offline", announce() {},
      links: { refetch: async () => {
        calls.push("refresh");
        if (scenario === "offline") throw new Error("offline");
        if (scenario === "switch-before-modal") current = "b";
      } },
      Taro: { showModal: async () => {
        calls.push("confirm");
        if (scenario === "switch-after-modal") current = "b";
        return { confirm: scenario !== "cancel" };
      } },
      clearProfileLinkSaveRecovery: (owner: string) => { assert.equal(owner, "a"); calls.push("clear"); },
    });
    await clear();
    assert.equal(busy.current, false);
    assert.equal(calls.includes("clear"), scenario === "success", scenario);
    if (scenario === "success") assert.deepEqual(calls, ["refresh", "confirm", "clear"]);
    if (scenario === "offline" || scenario === "switch-before-modal") assert.deepEqual(calls, ["refresh"]);
  }
});
