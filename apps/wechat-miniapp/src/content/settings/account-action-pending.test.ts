import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

test("one pending data action excludes cache, export and deletion duplicates and always releases its lock", async () => {
  const source = ts.createSourceFile("settings.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations: string[] = [];
  const names = ["clearCache", "deleteAccount", "downloadAccountData"];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(source))) declarations.push("const " + node.getText(source) + ";");
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(declarations.length, 3);
  let rejectDelete!: (error: Error) => void;
  const calls: string[] = [], busy: unknown[] = [], sheets: unknown[] = [];
  const lock = { current: false };
  const actions = vm.runInNewContext(ts.transpileModule(declarations.join("\n") + "\n({clearCache,deleteAccount,downloadAccountData});", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    accountActionPending: lock,
    setDataAction: (value: unknown) => busy.push(value),
    setSheet: (value: unknown) => sheets.push(value),
    deleteAccountThroughApi: () => { calls.push("delete"); return new Promise((_, reject) => { rejectDelete = reject; }); },
    exportAccountData: () => { calls.push("export"); throw Error("unexpected export"); },
    clearTemporaryApiCache: () => { calls.push("cache"); throw Error("unexpected cache"); },
    clearLocalCache: () => true,
    notify: () => {}, errorMessage: () => "失败", resetAfterAccountDeletion: () => true,
    Taro: { env: {}, showModal: async () => ({ confirm: true }), reLaunch: async () => {}, shareFileMessage: async () => {} },
  });
  const pending = actions.deleteAccount();
  await actions.deleteAccount();
  await actions.downloadAccountData();
  await actions.clearCache();
  assert.equal(lock.current, true);
  assert.deepEqual(calls, ["delete"]);
  rejectDelete(Error("network"));
  await pending;
  assert.equal(lock.current, false);
  assert.deepEqual(busy, ["DELETE", null]);
  assert.deepEqual(sheets, [null]);
});
