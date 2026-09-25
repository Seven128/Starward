import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type Node = { type: string; props: Record<string, any>; children: any[] };
const source = ts.createSourceFile("source-page.tsx", readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const page = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "DataSourcePage");
const safe = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "safe");
assert.ok(page && safe);
const code = ts.transpileModule(`${safe.getText(source)}\n${page.getText(source)}`, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, jsxFactory: "jsx", jsxFragmentFactory: "Fragment" } }).outputText;

function render(dataState: string, sources: readonly { id: string; kind: string }[], refreshError = false) {
  const scope = {
    exports: {} as any,
    jsx: (type: string, props: any, ...children: any[]): Node => ({ type, props: props ?? {}, children }),
    Fragment: "Fragment", View: "View", Text: "Text", ScrollView: "ScrollView",
    StatusPanel: "StatusPanel", Provenance: "Provenance", CustomNav: "CustomNav", FloatingNotificationHost: "FloatingNotificationHost",
    useRouter: () => ({ params: { spotId: "spot:a", contextId: "ctx:a" } }),
    useAppStore: (selector: (state: unknown) => unknown) => selector({ observationContext: { contextId: "ctx:a", location: { kind: "FORMAL_SPOT", spotId: "spot:a" } }, notify() {} }),
    useState: (value: unknown) => [value, () => {}], useDidShow() {}, useDidHide() {}, useEffect() {}, useThemeClass: () => "day",
    useResourceQuery: () => ({ isPending: false, isError: false, refreshError: refreshError ? Error("offline") : undefined,
      data: { dataState, data: { spot: { spotId: "spot:a", name: "观星点" }, dataDisclosure: sources } }, refetch: async () => {} }),
    isProductSource: (item: { kind: string }) => item.kind !== "TEST_FIXTURE",
    groupSources: (items: readonly { id: string; kind: string }[]) => items.map(item => ({ kind: item.kind, sources: [item] })),
    SOURCE_KIND_LABEL: { OPEN_DATA: "开放数据" }, Taro: { switchTab: async () => {} },
  };
  vm.runInNewContext(code, scope);
  const tree = scope.exports.default();
  const panels: Node[] = [], sourceCards: Node[] = [];
  function walk(node: any) {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === "object") {
      if (node.type === "StatusPanel") panels.push(node);
      if (node.type === "Provenance") sourceCards.push(node);
      walk(node.children);
    }
  }
  walk(tree);
  return { panels, sourceCards };
}

test("unavailable or partial source envelopes do not claim a confirmed empty result", () => {
  for (const state of ["UNAVAILABLE", "EXPIRED", "PARTIAL"]) {
    const page = render(state, []);
    assert.deepEqual(page.panels.map(panel => panel.props.state), ["PARTIAL"]);
    assert.equal(page.panels[0]?.props.recoveryLabel, "重新获取来源");
    assert.match(page.panels[0]?.props.detail, state === "EXPIRED" ? /已过期.*适用时段/u : /资料尚未齐全/u);
  }
});

test("independent sources remain visible while the overview is incomplete", () => {
  const page = render("UNAVAILABLE", [{ id: "spot-source", kind: "OPEN_DATA" }]);
  assert.deepEqual(page.panels.map(panel => panel.props.state), ["PARTIAL"]);
  assert.equal(page.sourceCards.length, 1);
});

test("confirmed usable zero sources use the empty state; stale refresh keeps recovery", () => {
  assert.deepEqual(render("FRESH", []).panels.map(panel => panel.props.state), ["EMPTY"]);
  assert.deepEqual(render("SAMPLE_DATA", []).panels.map(panel => panel.props.state), ["EMPTY"]);
  assert.deepEqual(render("FRESH", [], true).panels.map(panel => panel.props.state), ["STALE"]);
});
