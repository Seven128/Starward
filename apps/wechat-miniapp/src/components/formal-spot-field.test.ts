import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type Element = { type: string; props: Record<string, any>; children: unknown[] };
function render({ query = "山", debounced = query, disabled = false, failed = false, stale = false, savedId = "saved-spot", knownSpot }: {
  query?: string; debounced?: string; disabled?: boolean; failed?: boolean; stale?: boolean; savedId?: string; knownSpot?: { spotId: string; name: string };
} = {}) {
  const source = readFileSync(new URL("./formal-spot-field.tsx", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace("export function", "function");
  const state = [query, debounced, null];
  let cursor = 0, retries = 0;
  const changes: string[] = [];
  let enabled: boolean | undefined;
  const component = vm.runInNewContext(ts.transpileModule(source + "\nFormalSpotField;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText, {
    Button: "button", Input: "input", Text: "text", View: "view", StatusPanel: "status",
    React: { createElement: (type: string, props: object, ...children: unknown[]) => ({ type, props, children: children.flat() }) },
    useEffect() {}, useState: () => [state[cursor++], () => {}],
    useResourceQuery: (options: { enabled: boolean; queryKey: string[] }) => {
      if (options.queryKey[0] === "formal-spot-identity") return {
        data: { data: { spot: { spotId: savedId, name: "已保存的山地" } } },
      };
      enabled = options.enabled;
      return { isError: failed, isPending: false, refreshError: stale ? new Error("offline") : undefined, refetch: () => { retries++; },
        data: { data: { formalSpots: [{ spotId: "formal-a", name: "正式山地" }],
          ordinaryPlaces: [{ name: "普通地点" }], candidates: [{ name: "候选区域" }] } } };
    },
  }) as (props: object) => Element;
  const root = component({ value: "saved-spot", knownSpot, disabled, onChange: (id: string) => changes.push(id) });
  const elements: Element[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object" || !("type" in value)) return;
    const element = value as Element;
    elements.push(element);
    element.children.forEach(visit);
  };
  visit(root);
  return { elements, changes, enabled, get retries() { return retries; } };
}

test("the association field offers only formal results and commits their real identity", () => {
  const field = render();
  const buttons = field.elements.filter((element) => element.type === "button");
  assert.equal(buttons.length, 1);
  assert.deepEqual(Array.from(buttons[0]!.children), ["正式山地"]);
  assert.deepEqual(field.changes, []);
  buttons[0]!.props.onClick();
  assert.deepEqual(field.changes, ["formal-a"]);
});

test("old-keyword results and disabled fields cannot offer a selection", () => {
  for (const options of [{ query: "新", debounced: "旧" }, { disabled: true }]) {
    const field = render(options);
    assert.equal(field.elements.filter((element) => element.type === "button").length, 0);
    assert.deepEqual(field.changes, []);
  }
  assert.equal(render({ disabled: true }).enabled, false);
});

test("search failure preserves association and provides a real retry callback", () => {
  const field = render({ failed: true });
  const status = field.elements.find((element) => element.type === "status")!;
  assert.match(status.props.detail, /原有关联已保留/);
  status.props.onRecover();
  assert.equal(field.retries, 1);
  assert.deepEqual(field.changes, []);
});

test("restored names must match the saved association identity", () => {
  const captions = (savedId: string) => render({ savedId }).elements
    .filter((element) => element.type === "text").flatMap((element) => element.children).join(" ");
  assert.match(captions("saved-spot"), /已选择：已保存的山地/);
  assert.doesNotMatch(captions("previous-spot"), /已保存的山地/);
  assert.match(captions("previous-spot"), /已保留地点关联/);
});

test("failed refresh labels cached results without changing the saved association", () => {
  const field = render({ stale: true });
  const status = field.elements.find(element => element.type === "status")!;
  assert.equal(status.props.state, "STALE");
  assert.equal(field.elements.filter(element => element.type === "button").length, 1);
  assert.deepEqual(field.changes, []);
  status.props.onRecover();
  assert.equal(field.retries, 1);
  for (const options of [{ stale: true, disabled: true }, { stale: true, query: "新", debounced: "旧" }]) {
    assert.equal(render(options).elements.filter(element => element.type === "status").length, 0);
  }
});


test("a matching known name survives unavailable overview without borrowing another identity", () => {
  const captions = (spotId: string) => render({ savedId: "unavailable", knownSpot: { spotId, name: "草稿地点" } }).elements
    .filter(element => element.type === "text").flatMap(element => element.children).join(" ");
  assert.match(captions("saved-spot"), /已选择：草稿地点/);
  assert.doesNotMatch(captions("another-spot"), /草稿地点/);
  assert.match(captions("another-spot"), /已保留地点关联/);
});
