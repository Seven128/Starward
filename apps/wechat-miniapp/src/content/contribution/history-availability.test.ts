import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type Node = { type: string; props: Record<string, any>; children: any[] };
const source = ts.createSourceFile("history.tsx", readFileSync(new URL("./contribution-media-history.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === "ContributionHistory");
assert.ok(component);
const code = ts.transpileModule(component.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, jsxFactory: "jsx" } }).outputText;

function render(history: Record<string, unknown>) {
  const scope = { exports: {} as any, jsx: (type: string, props: any, ...children: any[]): Node => ({ type, props: props ?? {}, children }), View: "View", Text: "Text", Button: "Button", StatusPanel: "StatusPanel", MiniappApiError: Error, errorMessage: () => "读取失败" };
  vm.runInNewContext(code, scope);
  const tree = scope.exports.ContributionHistory({ form: { history, submissions: [], visibleSubmissions: [], historyFilter: "ALL", setHistoryFilter() {} } });
  const texts: string[] = [], panels: Node[] = [];
  function walk(node: any) { if (typeof node === "string") texts.push(node); else if (Array.isArray(node)) node.forEach(walk); else if (node && typeof node === "object") { if (node.type === "StatusPanel") panels.push(node); walk(node.children); } }
  walk(tree);
  return { texts, panels };
}

test("unloaded contribution history is unknown rather than an empty result", async () => {
  for (const pending of [true, false]) {
    const page = render({ isPending: pending, isError: !pending, error: new Error("offline"), refetch: async () => { throw Error("still offline"); } });
    for (const label of ["全部 —", "待审核 —", "需补充 —"]) assert.ok(page.texts.includes(label));
    assert.ok(!page.texts.includes("暂无符合当前筛选的投稿记录。"));
    assert.ok(page.panels[0]);
    assert.equal(page.panels[0].props.state, pending ? "LOADING" : "EMPTY");
    if (!pending) { page.panels[0].props.onRecover(); await new Promise(resolve => setImmediate(resolve)); }
  }
});

test("real empty results retain zero counts while stale results explain recovery", async () => {
  for (const stale of [false, true]) {
    const page = render({ data: { dataState: "FRESH" }, refreshError: stale ? Error("refresh") : undefined, isPending: false, isError: false, refetch: async () => { throw Error("retry"); } });
    assert.ok(page.texts.includes("全部 0"));
    assert.ok(page.texts.includes("暂无符合当前筛选的投稿记录。"));
    assert.equal(page.panels.length, stale ? 1 : 0);
    if (stale) { assert.ok(page.panels[0]); assert.equal(page.panels[0].props.state, "STALE"); assert.equal(page.panels[0].props.recoveryLabel, "重新获取投稿"); page.panels[0].props.onRecover(); await new Promise(resolve => setImmediate(resolve)); }
  }
});
