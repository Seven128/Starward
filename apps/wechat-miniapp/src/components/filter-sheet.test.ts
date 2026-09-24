import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("unavailable filter remains unselectable when a disabled button dispatches click", () => {
  const source = ts.createSourceFile("filter-sheet.tsx", readFileSync(new URL("./filter-sheet.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "FilterSheet");
  assert.ok(declaration);
  const toggles: string[] = [];
  const draft = { LIGHT_POLLUTION: [], LESS_CLOUD: [] };
  const state = { draftFilters: draft, toggleDraftFilter: (id: string) => toggles.push(id), clearDraftFilters() {}, cancelFilters() {}, applyFilters() {} };
  const component = vm.runInNewContext(ts.transpileModule(`${declaration.getText(source).replace(/^export /, "")}; FilterSheet;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, {
    FILTER_OPTIONS: [
      { id: "lightPollution", label: "光害", group: "LIGHT_POLLUTION", category: "OBSERVATION" },
      { id: "lessCloud", label: "少云", group: "LESS_CLOUD", category: "OBSERVATION" },
    ],
    CATEGORIES: [{ id: "OBSERVATION", label: "观测条件" }],
    countAppliedFilters: () => 0,
    useAppStore: (selector: (value: typeof state) => unknown) => selector(state),
    useState: (initial: string) => [initial, () => {}], useEffect() {},
    Button: "Button", ScrollView: "ScrollView", Text: "Text", View: "View", SemanticIcon: "SemanticIcon", SelectedCardStar: "SelectedCardStar",
    React: { createElement: (type: string, props: Record<string, unknown>, ...children: unknown[]) => ({ type, props, children }) },
  });
  const tree = component({ capabilities: { LIGHT_POLLUTION: { state: "UNAVAILABLE" }, LESS_CLOUD: { state: "AVAILABLE" } } });
  const find = (value: any, label: string): any => Array.isArray(value) ? value.map(item => find(item, label)).find(Boolean)
    : value?.props?.ariaLabel?.startsWith(label) ? value : value?.children ? find(value.children, label) : null;
  const unavailable = find(tree, "光害");
  const available = find(tree, "少云");
  assert.equal(unavailable.props.disabled, true);
  unavailable.props.onClick();
  assert.deepEqual(toggles, []);
  available.props.onClick();
  assert.deepEqual(toggles, ["lessCloud"]);
});
