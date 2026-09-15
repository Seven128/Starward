import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("hidden feedback rejects late notices and clears only its own notifications", () => {
  const source = ts.createSourceFile("form.ts", readFileSync(new URL("./use-contribution-form.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ["hideNotifications", "announce"].includes(node.name.getText(source))) declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(declarations.length, 2);
  const visible = { current: true };
  const notices: Array<{ owner: string; placement: string }> = [];
  const cleared: string[] = [];
  const pageVisibility: boolean[] = [];
  const runtime = vm.runInNewContext(ts.transpileModule(declarations.join("\n") + "\n({hideNotifications,announce});", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    notificationVisible: visible,
    setPageVisible: (value: boolean) => pageVisibility.push(value),
    notify: (notice: { owner: string; placement: string }) => notices.push(notice),
    useAppStore: { getState: () => ({ clearNotifications: (owner: string) => cleared.push(owner) }) },
  });
  runtime.announce("error", "缺少内容", "请填写现场说明");
  assert.equal(notices[0]?.placement, "floating");
  runtime.hideNotifications();
  runtime.announce("success", "已保存", "迟到响应");
  assert.equal(notices.length, 1);
  assert.deepEqual(cleared, ["contribution"]);
  assert.deepEqual(pageVisibility, [false]);
  visible.current = true;
  runtime.announce("warning", "请核对", "返回页面后的操作");
  assert.equal(notices.length, 2);
});
