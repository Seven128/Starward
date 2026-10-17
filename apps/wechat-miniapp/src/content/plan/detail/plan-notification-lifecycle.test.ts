import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function runtime() {
  const source = ts.createSourceFile("page.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fragments: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "announce") fragments.push(`const ${node.getText(source)};`);
    if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && ["useDidShow", "useDidHide"].includes(node.expression.expression.getText(source))) fragments.push(node.getText(source));
    ts.forEachChild(node, visit);
  };
  visit(source); assert.equal(fragments.length, 3);
  const notificationVisibility = { current: { mounted: true, visible: true } };
  const notices: unknown[] = [], cleared: string[] = [];
  let show!: () => void, hide!: () => void;
  const announce = vm.runInNewContext(ts.transpileModule(fragments.join("\n") + "\nannounce;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    notificationVisibility, notify: (value: unknown) => notices.push(value),
    useDidShow: (callback: () => void) => { show = callback; }, useDidHide: (callback: () => void) => { hide = callback; },
    setPageVisible() {}, setStatusReminderId() {}, refreshIdentity() {},
    useAppStore: { getState: () => ({ clearNotifications: (owner: string) => cleared.push(owner) }) },
  }) as (...args: string[]) => void;
  return { notificationVisibility, notices, cleared, show, hide, announce };
}

test("plan notification uses live native visibility even before a React state update", () => {
  const page = runtime();
  page.announce("error", "current failure", "retry remains available");
  assert.equal(page.notices.length, 1);
  page.hide();
  page.announce("success", "native callback before show", "operation may finish");
  page.announce("error", "hidden failure", "draft remains");
  assert.equal(page.notices.length, 1); assert.deepEqual(page.cleared, ["plan"]);
  page.show(); page.announce("warning", "current visible result", "verify result");
  assert.equal(page.notices.length, 2);
});

test("an unmounted plan page cannot publish a late notification even if a late show callback fires", () => {
  const page = runtime(); page.notificationVisibility.current.mounted = false;
  page.show(); page.announce("error", "late result", "must remain quiet");
  assert.equal(page.notices.length, 0);
});
