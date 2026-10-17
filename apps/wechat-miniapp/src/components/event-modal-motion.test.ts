import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as eventModel from "../content/event/event-model";

type Node = { type: unknown; props: any };
function find(node: any, match: (node: Node) => boolean): Node[] {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(child => find(child, match));
  return [...(match(node) ? [node] : []), ...find(node.props?.children, match)];
}
const meteor = { occurrenceId: "urs", kind: "METEOR_SHOWER", code: "URS", displayName: "小熊座流星雨", sourceId: "gmn",
  peakDate: "2026-12-22", activeStartDate: "2026-12-21", activeEndDate: "2026-12-24", annualReference: {}, nominalPeakZhr: null, velocityKmPerSecond: null };
const eclipse = { ...meteor, occurrenceId: "solar", kind: "SOLAR_ECLIPSE", displayName: "日全食", peakDate: "2026-08-13" };

function harness() {
  const states: any[] = [], refs: any[] = [], effects: { deps: unknown[]; cleanup?: (() => void) | undefined }[] = [];
  const pending = new Map<number, () => void>(), timers = new Map<number, { at: number; run: () => void }>();
  let stateIndex = 0, refIndex = 0, effectIndex = 0, systemReduced = false, now = 0, timerId = 0;
  const exports: any = {}, jsx = (type: unknown, props: any) => ({ type, props });
  const catalog = { data: { data: { events: [meteor, eclipse], sources: [], catalogVersion: "v1" }, dataState: "FRESH" }, isPending: false, isError: false, refetch() {} };
  const store = Object.assign((select: any) => select({ mode: "DAY", preferences: { reducedMotion: false }, notify() {} }), {
    getState: () => ({ clearNotifications() {} }),
  });
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./astronomical-event-modal.tsx", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports,
    setTimeout: (run: () => void, delay: number) => { timers.set(++timerId, { at: now + delay, run }); return timerId; },
    clearTimeout: (id: number) => timers.delete(id),
    require: (name: string) => name === "react/jsx-runtime" ? { jsx, jsxs: jsx, Fragment: "Fragment" } : name === "react" ? {
      forwardRef: (component: any) => component, useImperativeHandle() {}, useMemo: (compute: () => unknown) => compute(),
      useRef: (value: unknown) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: value }),
      useState: (initial: unknown) => { const index = stateIndex++; if (!(index in states)) states[index] = initial;
        return [states[index], (next: any) => { states[index] = typeof next === "function" ? next(states[index]) : next; }]; },
      useEffect: (effect: () => (() => void) | void, deps: unknown[]) => {
        const index = effectIndex++, previous = effects[index];
        if (previous && deps.length === previous.deps.length && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
        pending.set(index, () => { previous?.cleanup?.(); effects[index] = { deps, cleanup: effect() ?? undefined }; });
      },
    } : name === "@tarojs/components" ? { Button: "Button", View: "View", Text: "Text", ScrollView: "ScrollView", RootPortal: "RootPortal" }
      : name === "@tarojs/taro" ? { __esModule: true, default: { getCurrentPages: () => [] }, useDidShow() {}, useDidHide() {} }
      : name.includes("event-model") ? eventModel : name.includes("use-reduced-motion") ? { useReducedMotion: () => systemReduced }
      : name.includes("primary-navigation-cover") ? { retainPrimaryNavigationCover: () => () => {} }
      : name.includes("app-store") ? { useAppStore: store } : name.includes("use-resource-query") ? {
        useResourceQuery: (options: any) => options.queryKey[0] === "astronomical-events" ? catalog : { isPending: false, isError: false, refetch() {} },
      } : name.includes("source-presentation") ? { productSourceNames: () => "", isProductSource: () => false } : {},
  });
  return {
    system(value: boolean) { systemReduced = value; },
    render(props: object) { stateIndex = refIndex = effectIndex = 0; return exports.AstronomicalEventModal(props, null); },
    flush() { const tasks = [...pending.values()]; pending.clear(); for (const run of tasks) run(); },
    advance(ms: number) { const end = now + ms; for (;;) { const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break; now = next[1].at; timers.delete(next[0]); next[1].run(); } now = end; },
    unmount() { for (const effect of effects) effect?.cleanup?.(); },
    pending: () => timers.size,
  };
}
function button(tree: unknown, label: string) {
  const result = find(tree, node => node.type === "Button" && node.props.ariaLabel === label)[0];
  assert.ok(result, `actual rendered button: ${label}`); return result;
}

test("system changes preserve an open event modal's staged choice and detail", () => {
  const h = harness(), props = { open: true, mode: "select-one", context: null, initialOccurrenceIds: ["solar"], onClose() {} };
  h.render(props); h.flush(); h.advance(16);
  button(h.render(props), "选择小熊座流星雨").props.onClick();
  button(h.render(props), "查看小熊座流星雨详情").props.onClick();
  for (const reduced of [true, false, true]) {
    h.system(reduced); h.render(props); h.flush(); h.advance(16);
    const tree = h.render(props);
    button(tree, "返回事件列表"); button(tree, "已选择小熊座流星雨");
    assert.ok(find(tree, node => String(node.props.className).includes("event-modal--open")).length);
  }
  h.unmount(); assert.equal(h.pending(), 0);
});

test("system changes preserve browse preview date and closing retires old timers", () => {
  const h = harness(), context = { localDate: "2026-12-22", location: { kind: "FORMAL_SPOT" } };
  const props = { open: true, mode: "browse", context, initialDetailId: "urs", onClose() {} };
  h.render(props); h.flush(); h.advance(16);
  const detail = find(h.render(props), node => typeof node.type === "function" && node.props.event?.occurrenceId === "urs")[0];
  assert.ok(detail); detail.props.onPreviewDate("2026-12-23");
  h.system(true); h.render(props); h.flush(); h.advance(0);
  const changed = find(h.render(props), node => typeof node.type === "function" && node.props.event?.occurrenceId === "urs")[0];
  assert.equal(changed?.props.previewDate, "2026-12-23");
  h.system(false); h.render({ ...props, open: false }); h.flush(); h.advance(80);
  h.system(true); h.render({ ...props, open: false }); h.flush(); h.advance(0);
  assert.equal(h.render({ ...props, open: false }), null);
  h.advance(1000); assert.equal(h.render({ ...props, open: false }), null); assert.equal(h.pending(), 0);
});
