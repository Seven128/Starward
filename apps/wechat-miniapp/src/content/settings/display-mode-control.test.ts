import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as gesture from "./display-mode-gesture";

function harness() {
  const refs: any[] = [], states: any[] = [], effects: { deps: unknown[]; cleanup: (() => void) | undefined }[] = [];
  const selected: string[] = [];
  let r = 0, s = 0, e = 0, shown = () => {}, hidden = () => {};
  const jsx = (type: unknown, props: any) => ({ type, props }), exports: any = {};
  const taro = {
    nextTick() {},
    createSelectorQuery() {
      const query = { select: () => query, boundingClientRect: () => query, exec() {} };
      return query;
    },
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./display-mode-control.tsx", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: (name: string) => name === "react/jsx-runtime" ? { jsx, jsxs: jsx }
    : name === "react" ? {
      useRef: (value: unknown) => refs[r++] ?? (refs[r - 1] = { current: value }),
      useState: (value: unknown) => { const index = s++; if (!(index in states)) states[index] = value;
        return [states[index], (next: unknown) => { states[index] = next; }]; },
      useEffect: (run: () => void | (() => void), deps: unknown[]) => {
        const index = e++, previous = effects[index];
        if (previous && deps.length === previous.deps.length && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
        previous?.cleanup?.(); effects[index] = { deps, cleanup: run() ?? undefined };
      },
    } : name === "@tarojs/taro" ? { __esModule: true, default: taro,
      useDidShow: (fn: () => void) => { shown = fn; }, useDidHide: (fn: () => void) => { hidden = fn; } }
      : name === "@tarojs/components" ? { Button: "Button", View: "View", Text: "Text" }
      : name === "./display-mode-gesture" ? gesture
      : name.includes("acceptance-diagnostics") ? { recordAcceptanceDiagnostic() {} } : {},
  });
  const render = () => { r = s = e = 0; return exports.DisplayModeControl({ mode: "NIGHT",
    onSelect: (value: string) => selected.push(value), onGestureCapture() {} }); };
  const track = () => render().props.children[1];
  const choice = (mode: string) => track().props.children[1].find((node: any) => node.props.id === `settings-mode-${mode}`);
  render(); shown();
  return { selected, track, click: (mode: string) => choice(mode).props.onClick(),
    hide: () => hidden(), show: () => shown(), unmount: () => effects.forEach(item => item.cleanup?.()) };
}

test("a returned Settings page accepts its first direct choice without touch events", () => {
  const h = harness(); h.hide(); h.show(); h.click("observation");
  assert.deepEqual(h.selected, ["OBSERVATION"]); h.unmount();
});

test("hidden or disposed controls reject repeated late direct choices", () => {
  const h = harness(); h.hide(); h.click("observation"); h.click("day");
  assert.deepEqual(h.selected, []);
  h.show(); h.click("day"); assert.deepEqual(h.selected, ["DAY"]);
  h.unmount(); h.click("observation"); h.click("day"); assert.deepEqual(h.selected, ["DAY"]);
});

test("cancelling a live touch still suppresses its click, and the next fresh touch can choose", () => {
  const h = harness(); h.track().props.onTouchCancel(); h.click("observation"); assert.deepEqual(h.selected, []);
  h.track().props.onTouchStart({ touches: [{ clientX: 80, clientY: 20 }] });
  h.track().props.onTouchEnd(); h.click("observation"); assert.deepEqual(h.selected, ["OBSERVATION"]); h.unmount();
});
