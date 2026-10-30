import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type * as ReactTypes from "react";
import { localParts } from "@starward/miniapp-contracts";
import * as timeInput from "./sky-time-input";

// Use the installed production renderer and FormElement/setData path. Only
// native scheduling and the final WeChat setData sink are supplied here.
const require = createRequire(import.meta.url);
const React = require(fileURLToPath(new URL("../../../node_modules/react/index.js", import.meta.url))) as typeof ReactTypes;
const jsxRuntime = require(fileURLToPath(new URL("../../../node_modules/react/jsx-runtime.js", import.meta.url)));
Object.assign(globalThis, { ENABLE_INNER_HTML: true, ENABLE_ADJACENT_HTML: false, ENABLE_SIZE_APIS: false,
  ENABLE_TEMPLATE_CONTENT: false, ENABLE_CLONE_NODE: false, ENABLE_CONTAINS: false, ENABLE_MUTATION_OBSERVER: false });
process.env.TARO_ENV = "weapp"; process.env.TARO_PLATFORM = "mini";
const { createRoot } = require("@tarojs/react") as typeof import("@tarojs/react");
const { document, eventHandler, FormElement, getComponentsAlias } = require("@tarojs/runtime") as typeof import("@tarojs/runtime");

function load(file: string, modules: Record<string, unknown> = {}) {
  const exports: Record<string, any> = {};
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, setTimeout, clearTimeout, require: (name: string) => {
    if (name === "react") return React;
    if (name === "react/jsx-runtime") return jsxRuntime;
    if (name === "@tarojs/components") return { Input: "input", View: "view", Text: "text", ScrollView: "scroll-view" };
    if (name in modules) return modules[name];
    throw new Error(name);
  } });
  return exports;
}
const inputModule = load("./sky-controlled-input.tsx");

function mount() {
  const previousAct = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("root"), root = createRoot(container);
  const payloads: Record<string, unknown>[] = [], tasks: Array<() => void> = [];
  Object.assign(container, {
    ctx: { setData(data: Record<string, unknown>, done: () => void) { payloads.push(data); done(); } },
    scheduleTask(callback: () => void) { tasks.push(callback); },
  });
  const flush = () => { while (tasks.length) tasks.shift()!(); };
  return { container, payloads,
    async render(component: any, props: object) {
      await React.act(async () => { root.render(React.createElement(component, props), () => {}); }); flush();
    },
    async event(input: any, type: string, value: string) {
      let result: unknown;
      await React.act(async () => { result = eventHandler({ type, detail: { value },
        target: { id: input.uid, dataset: {} }, currentTarget: { id: input.uid, dataset: {} } }); }); flush(); return result;
    },
    async dispose() {
      await React.act(async () => root.unmount(() => {})); flush();
      (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousAct;
    },
  };
}

test("the real Taro value publication stops for unchanged Sky inputs, with current event callbacks", async () => {
  const h = mount();
  try {
    let received = "";
    const props = { id: "sky-field", value: "21", active: true, editingGeneration: 0, type: "number" };
    await h.render(inputModule.SkyControlledInput, { ...props, onInput: () => { received = "old"; } });
    const input = h.container.getElementsByTagName("input")[0]!;
    assert.ok(input instanceof FormElement);
    h.payloads.length = 0;
    for (let frame = 0; frame < 12; frame++) {
      await h.render(inputModule.SkyControlledInput, { ...props, onInput: () => { received = `frame-${frame}`; } });
    }
    assert.equal(h.payloads.length, 0, "new owner callbacks alone do not republish the unchanged native value");
    await h.event(input, "input", "22");
    assert.equal(received, "frame-11", "the memoized host does not retain an old owner callback");
    assert.equal((input as any).value, "21", "a rejected native edit restores the controlled value");
    assert.ok(h.payloads.some(data => Object.values(data).includes("21")));
    assert.equal(h.container.getElementsByTagName("input")[0], input, "input reconciliation preserves native identity");

    h.payloads.length = 0;
    await h.render(inputModule.SkyControlledInput, { ...props, active: false, editingGeneration: 1,
      onInput: () => { received = "retired"; }, onConfirm: () => "confirmed", onBlur: () => "blurred" });
    assert.ok(h.payloads.some(data => Object.values(data).includes("21")), "an owner transition reconciles even equal text");
    // This isolated renderer does not install the platform's event-return
    // hook. Inspect the actual registered proxy's return, not that missing hook.
    await React.act(async () => {
      assert.equal((input as any).__handlers.confirm[0]({ detail: { value: "22" } }), "confirmed");
      assert.equal((input as any).__handlers.blur[0]({ detail: { value: "22" } }), "blurred");
    });
    assert.equal(h.container.getElementsByTagName("input")[0], input);
  } finally { await h.dispose(); }
});

test("the production six fields publish only changed displayed text and retain exact Apply time", async () => {
  const controls = load("./sky-time-controls.tsx", {
    "@/components/shared-button-press": { SharedButton: "button" },
    "@/components/semantic-asset": { SemanticIcon: () => null },
    "@starward/miniapp-contracts": { localParts }, "./sky-time-input": timeInput,
    "./sky-controlled-input": inputModule,
    "@tarojs/taro": { default: {}, useDidHide() {} },
  }).SkyTimeControls;
  const h = mount(), applied: string[] = [];
  const props = { at: "2026-10-16T13:00:00.750Z", timezone: "Asia/Shanghai", active: true,
    playing: true, canPlay: true, editingGeneration: 0, current: () => true, editingCurrent: () => true,
    onPreview: () => true, onApply: (at: string) => applied.push(at), onPause() {}, onTogglePlay() {} };
  try {
    await h.render(controls, props);
    const fields = h.container.getElementsByTagName("input");
    assert.equal(fields.length, 6);
    h.payloads.length = 0;
    for (let frame = 0; frame < 12; frame++) await h.render(controls, { ...props, onPause() {}, onTogglePlay() {} });
    assert.equal(h.payloads.length, 0, "unrelated frame updates cannot repeat the six native values");
    const nextAt = "2026-10-16T13:00:01.875Z";
    await h.render(controls, { ...props, at: nextAt });
    const valueAlias = getComponentsAlias().input.value ?? "value";
    const publishedValues = h.payloads.flatMap(data => Object.entries(data).filter(([path]) => path.endsWith(`.${valueAlias}`)));
    assert.deepEqual(publishedValues.map(([, value]) => value), ["01"], "only seconds changed visually");
    assert.ok(fields.every((field, index) => h.container.getElementsByTagName("input")[index] === field));
    const apply = h.container.getElementsByTagName("button").find(button => (button as any).props.ariaLabel === "应用所选时刻")!;
    assert.ok(apply);
    await h.event(apply, "tap", "");
    assert.deepEqual(applied, [nextAt], "memoizing displayed fields never truncates the authoritative millisecond instant");
  } finally { await h.dispose(); }
});

test("the renderer control still republishes an ordinary Input's unchanged value", async () => {
  const h = mount();
  try {
    await h.render("input", { value: "21", onInput() {} }); h.payloads.length = 0;
    await h.render("input", { value: "21", onInput() {} });
    assert.ok(h.payloads.some(data => Object.values(data).includes("21")), "countercheck reaches the original Taro forced-value path");
  } finally { await h.dispose(); }
});

test("the retained search input uses current activity and reconciles rejected native edits", async () => {
  const Search = load("./sky-object-search.tsx", {
    "@/components/shared-button-press": { SharedButton: "button" },
    "@/components/semantic-asset": { SemanticIcon: () => null },
    "@/features/sky/sky-status-panel": { SkyStatusPanel: () => null },
    "@/hooks/use-resource-query": { useResourceQuery: () => ({ isPending: false, isError: false,
      data: { dataState: "FRESH", data: { results: [], truncated: false, unavailableCatalogs: [] } } }) },
    "@/services/sky-celestial-client": { searchCelestialObjects() {} },
    "@starward/miniapp-contracts": { SKY_LUMINARY_CATALOG_VERSION: "current" },
    "./sky-object-picking": { skyObjectKindLabel: () => "恒星" }, "./sky-search-row": { SkySearchRow: () => null },
    "./sky-controlled-input": inputModule, "@tarojs/taro": { default: { hideKeyboard: async () => {} } },
  }).SkyObjectSearch;
  let committed = "SAO 20467";
  function Owner({ active }: { active: boolean }) {
    const [query, setQuery] = React.useState(committed);
    return React.createElement(Search, { active, query, children: "catalog", onSelect() {},
      onQueryChange(value: string) { committed = value; setQuery(value); } });
  }
  const h = mount();
  try {
    await h.render(Owner, { active: true });
    const input = h.container.getElementsByTagName("input")[0]!;
    await h.render(Owner, { active: false }); h.payloads.length = 0;
    await h.event(input, "input", "M31");
    assert.equal(committed, "SAO 20467");
    assert.equal((input as any).value, "SAO 20467", "inactive search rejects the edit without leaving native text ahead");
    await h.render(Owner, { active: true });
    await h.event(input, "input", "M51");
    assert.equal(committed, "M51"); assert.equal((input as any).value, "M51");
    await h.event(input, "confirm", " M51 ");
    assert.equal(committed, " M51 ", "confirmation retains the latest native text");
    assert.equal((input as any).value, " M51 ");
    assert.equal(h.container.getElementsByTagName("input")[0], input, "hide/recovery and text updates do not remount the field");
  } finally { await h.dispose(); }
});
