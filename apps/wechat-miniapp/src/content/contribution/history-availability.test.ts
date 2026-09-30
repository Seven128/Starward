import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type Node = { type: string; props: Record<string, unknown> & { onRecover?: () => void }; children: unknown[] };
const source = ts.createSourceFile("records.tsx", readFileSync(new URL("./contribution-records.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "ContributionRecords");
assert.ok(component);
const code = ts.transpileModule(component.getText(source).replace("export ", "") + "\nContributionRecords;", {
  compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, jsxFactory: "jsx", jsxFragmentFactory: "Fragment" },
}).outputText;

function render(history: Record<string, unknown>) {
  const panels: Node[] = [];
  const scope = {
    jsx: (type: string, props: Node["props"] | null, ...children: unknown[]): Node => ({ type, props: props ?? {}, children }),
    Fragment: "Fragment", View: "View", Text: "Text", Button: "Button", StatusPanel: "StatusPanel", SelectionTabs: "Tabs",
    useState: (value: unknown) => [value, () => {}], useRef: (current: unknown) => ({ current }), useEffect() {},
  };
  const tree = vm.runInNewContext(code, scope)({ form: { history, submissions: [] } });
  function walk(value: unknown) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object" && "children" in value) {
      const node = value as Node;
      if (node.type === "StatusPanel") panels.push(node);
      walk(node.children);
    }
  }
  walk(tree);
  return panels;
}

test("current contribution records distinguish an unread result from a confirmed empty list and retry failures", () => {
  for (const pending of [true, false]) {
    let retried = 0;
    const panels = render({ isPending: pending, isError: !pending, refetch: async () => { retried++; } });
    assert(!panels.some(panel => panel.props.state === "EMPTY"));
    assert.equal(panels[0]?.props.state, pending ? "LOADING" : "ERROR");
    if (!pending) { panels[0]!.props.onRecover?.(); assert.equal(retried, 1); }
  }
});

test("current contribution records do not turn stale or failed refresh into a true empty result", () => {
  for (const stale of [false, true]) {
    let retried = 0;
    const panels = render({ data: { dataState: stale ? "STALE_USABLE" : "FRESH" }, refreshError: stale ? Error("refresh") : undefined,
      refetch: async () => { retried++; } });
    assert.equal(panels.length, 1);
    assert.equal(panels[0]?.props.state, stale ? "STALE" : "EMPTY");
    if (stale) { panels[0]!.props.onRecover?.(); assert.equal(retried, 1); }
    else assert.equal(panels[0]?.props.emptyLevel, "page");
  }
});
