import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

test("confirmation cancellation or failure releases the shared account-action lock without duplicate work", async () => {
  const source = ts.createSourceFile("settings.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ["deleteAccount", "downloadAccountData"].includes(node.name.getText(source))) declarations.push("const " + node.getText(source) + ";");
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(declarations.length, 2);
  for (const failure of ["cancel-first", "cancel-final", "fail-first", "fail-final"]) {
    let settle!: (result: { confirm: boolean }) => void;
    let reject!: (error: Error) => void;
    let modals = 0;
    const notices: Array<{ title: string }> = [];
    const busy: unknown[] = [];
    const lock = { current: false };
    const actions = vm.runInNewContext(ts.transpileModule(declarations.join("\n") + "\n({deleteAccount, downloadAccountData});", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      accountActionPending: lock, setDataAction: (value: unknown) => busy.push(value),
      deleteAccountThroughApi: () => assert.fail("unconfirmed deletion"),
      exportAccountData: () => assert.fail("export while confirming deletion"),
      notify: (notice: { title: string }) => notices.push(notice), errorMessage: () => "确认窗口未打开",
      Taro: { showModal: () => {
        modals++;
        return new Promise<{ confirm: boolean }>((resolve, fail) => { settle = resolve; reject = fail; });
      } },
    });
    const pending = actions.deleteAccount();
    await actions.deleteAccount();
    await actions.downloadAccountData();
    assert.equal(modals, 1);
    assert.equal(lock.current, true);
    if (failure.endsWith("final")) {
      settle({ confirm: true });
      await new Promise<void>(resolve => setImmediate(resolve));
      assert.equal(modals, 2);
    }
    if (failure.startsWith("fail")) reject(Error("native modal failed"));
    else settle({ confirm: false });
    await pending;
    assert.equal(lock.current, false);
    assert.deepEqual(busy, ["DELETE", null]);
    assert.equal(notices.length, failure.startsWith("fail") ? 1 : 0);
    if (notices[0]) assert.equal(notices[0].title, "账户未删除");
    const retry = actions.deleteAccount();
    settle({ confirm: false });
    await retry;
    assert.equal(lock.current, false);
  }
});
