import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("./plan-reference.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("plan-reference.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let component: ts.FunctionDeclaration | undefined;
ts.forEachChild(ast, node => {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "PlanReference") component = node;
});
assert.ok(component);
const compiled = ts.transpileModule(component.getText(ast).replace(/^export /, ""), { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;

test("failed sky request keeps plan reference error and retry separate from genuine missing facts", () => {
  let retried = false;
  const render = vm.runInNewContext(`${compiled}\nPlanReference`, {
    React: { createElement: (type: string, props: Record<string, unknown>, ...children: unknown[]) => ({ type, props, children }) },
    View: "View", Text: "Text", SemanticIcon: "SemanticIcon", StatusPanel: "StatusPanel",
    ForecastCoverageNote: "ForecastCoverageNote", SourceAttribution: "SourceAttribution",
    planReference: () => ({ nightRange: null, dusk: "暂无数据", dawn: "暂无数据", moonrise: "暂无数据", moonset: "暂无数据",
      illumination: "暂无数据", cloud: "暂无数据", wind: "暂无数据", temperature: "暂无数据", weatherStarts: [] }),
  }) as (props: Record<string, unknown>) => unknown;
  const base = { plan: { contextSnapshot: { timezone: "Asia/Shanghai" }, planId: "p", revision: 1 }, report: null,
    loading: false, onRetry: () => { retried = true; } };
  const flatten = (node: any): any[] => node == null ? [] : Array.isArray(node) ? node.flatMap(flatten)
    : typeof node === "object" ? [node, ...flatten(node.children)] : [node];
  const failed = flatten(render({ ...base, failed: true }));
  const panel = failed.find(node => node.type === "StatusPanel");
  assert.equal(panel?.props.state, "ERROR");
  assert.equal(panel?.props.recoveryLabel, "重试动态条件");
  assert.equal(failed.filter(node => node === "暂无数据").length, 0);
  panel.props.onRecover();
  assert.equal(retried, true);
  const missing = flatten(render({ ...base, failed: false }));
  assert.equal(missing.some(node => node.type === "StatusPanel"), false);
  assert.ok(missing.includes("天文资料暂无数据"));
});
