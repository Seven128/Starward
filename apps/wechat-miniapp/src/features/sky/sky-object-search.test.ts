import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("sky-object-search.tsx",
  readFileSync(new URL("./sky-object-search.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) &&
  node.name?.text === "SkyObjectSearch") as ts.FunctionDeclaration;
assert.ok(declaration);
const code = ts.transpileModule(`${declaration.getText(source).replace(/^export\s+/, "")}\nSkyObjectSearch;`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;

type Element = { type: string; props: Record<string, any>; children: unknown[] };
function find(tree: unknown, type: string): Element | undefined {
  if (Array.isArray(tree)) return tree.map(child => find(child, type)).find(Boolean);
  if (!tree || typeof tree !== "object") return;
  const node = tree as Element;
  return node.type === type ? node : find(node.children ?? [], type);
}

/** Keep event callbacks on their committed render while native input runs ahead. */
function search(queryOwner = { value: "" }) {
  const state: unknown[] = [];
  const selected: unknown[] = [];
  let cursor = 0, timerId = 0, cleanup: (() => void) | undefined;
  const timers = new Map<number, () => void>();
  const component = vm.runInNewContext(code, {
    React: { createElement: (type: string, props: Record<string, unknown>, ...children: unknown[]) =>
      ({ type, props: props ?? {}, children }) },
    Taro: { hideKeyboard: async () => undefined },
    View: "View", Text: "Text", Input: "Input", ScrollView: "ScrollView", Button: "Button", SemanticIcon: "SemanticIcon", SkySearchResults: "Results",
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (value: unknown) => { state[index] = value; }];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      if (!(index in state)) state[index] = { current: initial };
      return state[index];
    },
    useEffect(effect: () => () => void) { cleanup?.(); cleanup = effect(); },
    setTimeout(callback: () => void) { timers.set(++timerId, callback); return timerId; },
    clearTimeout(id: number) { timers.delete(id); },
  });
  const render = () => { cursor = 0; return component({ children: "catalog", query: queryOwner.value,
    onQueryChange(value: string) { queryOwner.value = value; },
    onSelect(object: unknown) { selected.push(object); } }); };
  return { render, selected, timers, dispose: () => cleanup?.(),
    flush() { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()); } };
}

test("returning to a remounted search restores the page's query and matching results", () => {
  const queryOwner = { value: "" };
  const leaving = search(queryOwner);
  find(leaving.render(), "Input")!.props.onInput({ detail: { value: "Polaris" } });
  leaving.render();
  leaving.flush();
  assert.equal(find(leaving.render(), "Results")?.props.query, "Polaris");
  leaving.dispose();

  const returned = search(queryOwner);
  assert.equal(find(returned.render(), "Input")?.props.value, "Polaris");
  assert.equal(find(returned.render(), "Results")?.props.query, "Polaris");
  returned.dispose();
});

test("keyboard search commits the native final text before React input state catches up", () => {
  const screen = search();
  const input = find(screen.render(), "Input")!;
  input.props.onInput({ detail: { value: "M5" } });
  input.props.onConfirm({ detail: { value: " M51 " } });
  const committed = screen.render();
  assert.equal(find(committed, "Input")?.props.value, " M51 ");
  assert.equal(find(committed, "Results")?.props.query, "M51");
  screen.flush();
  assert.equal(find(screen.render(), "Results")?.props.query, "M51");
  screen.dispose();
});

test("confirming an empty native field cancels an older pending search", () => {
  const screen = search();
  find(screen.render(), "Input")!.props.onInput({ detail: { value: "Alioth" } });
  const input = find(screen.render(), "Input")!;
  input.props.onConfirm({ detail: { value: "" } });
  assert.equal(find(screen.render(), "Results"), undefined);
  screen.flush();
  const cleared = screen.render();
  assert.equal(find(cleared, "Input")?.props.value, "");
  assert.equal(find(cleared, "Results"), undefined);
  screen.dispose();
});

test("ordinary edits debounce only the latest query and closing cancels its timer", () => {
  const screen = search();
  find(screen.render(), "Input")!.props.onInput({ detail: { value: "HR" } });
  find(screen.render(), "Input")!.props.onInput({ detail: { value: " HR 4905 " } });
  assert.equal(find(screen.render(), "Results"), undefined);
  screen.flush();
  assert.equal(find(screen.render(), "Results")?.props.query, "HR 4905");
  screen.dispose();
  assert.equal(screen.timers.size, 0);
});

test("a result from the previous query cannot select after native input advances before React rerenders", () => {
  const screen = search();
  find(screen.render(), "Input")!.props.onInput({ detail: { value: "织女星" } });
  screen.render();
  screen.flush();
  const committed = screen.render();
  const oldResult = find(committed, "Results")!;
  const vega = { reference: "HR:7001", displayName: "Vega", kind: "STAR" };
  oldResult.props.onSelect(vega);
  assert.deepEqual(screen.selected, [vega]);
  find(committed, "Input")!.props.onInput({ detail: { value: "木星" } });
  oldResult.props.onSelect(vega);
  assert.deepEqual(screen.selected, [vega]);
  screen.render();
  screen.flush();
  const currentResult = find(screen.render(), "Results")!;
  const jupiter = { reference: "PLANET:JUPITER", displayName: "木星", kind: "PLANET" };
  currentResult.props.onSelect(jupiter);
  assert.deepEqual(screen.selected, [vega, jupiter]);
  screen.dispose();
});

test("the fixed input stays outside result scrolling; only a different query issues a top reset", () => {
  const screen = search();
  const original = screen.render(), originalScroll = find(original, "ScrollView")!;
  assert.ok(find(original, "Input")); assert.equal(find(originalScroll, "Input"), undefined);
  const top = originalScroll.props.scrollIntoView;
  assert.equal(find(screen.render(), "ScrollView")!.props.scrollIntoView, top, "ordinary rerender or information Back preserves scrolling");
  find(original, "Input")!.props.onInput({detail: {value: "M"}});
  const first = find(screen.render(), "ScrollView")!.props.scrollIntoView;
  assert.notEqual(first, top); screen.flush();
  assert.equal(find(screen.render(), "ScrollView")!.props.scrollIntoView, first, "result arrival does not reset scroll a second time");
  find(screen.render(), "Input")!.props.onInput({detail: {value: "M5"}});
  const second = find(screen.render(), "ScrollView")!.props.scrollIntoView; assert.notEqual(second, first);
  find(screen.render(), "Input")!.props.onInput({detail: {value: "M"}});
  const returned = find(screen.render(), "ScrollView")!.props.scrollIntoView;
  assert.notEqual(returned, first, "returning to an older query still issues a new native reset command");
  assert.equal(find(screen.render(), "ScrollView")!.props.scrollWithAnimation, false);
  screen.dispose();
});
