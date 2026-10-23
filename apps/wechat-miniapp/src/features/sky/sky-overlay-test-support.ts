import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { skyRetainedLayerStyle } from "./sky-retained-layer";
import { localParts } from "@starward/miniapp-contracts";
import { createSkyTimeRepeat, skyCivilInstant, skyTimeInputAllowed, stepSkyCivilTime } from "./sky-time-input";

export function harness(component = "useSkyOverlayMotion") {
  const source = readFileSync(new URL(component === "SkyTimeControls" ? "./sky-time-controls.tsx" : component === "SkyBrowseControl" ? "./sky-menu.tsx" : "./sky-overlay-motion.tsx", import.meta.url), "utf8")
    .replace(/^import .*;\r?$/gm, "").replace(/^export /gm, "");
  const slots: any[] = [], ticks: (() => void)[] = [], effects: (() => void)[] = [];
  const timers = new Map<number, { at: number; callback: () => void }>();
  let cursor = 0, clock = 0, serial = 0, dirty = false, args: any[] = [];
  let hidden: (() => void) | undefined;
  const names = component === "SkyTimeControls" ? "SkyTimeControls" : component === "SkyBrowseControl" ? "SkyBrowseControl" : "useSkyOverlayMotion,useSkyOverlayLayoutReady,SkyOverlayMotion,SkyDisclosureSurface";
  const memo = (create: () => any, deps: any[]) => {
    const index = cursor++, previous = slots[index];
    if (!previous || deps.some((value, i) => value !== previous.deps[i])) slots[index] = { deps, value: create() };
    return slots[index].value;
  };
  const exports = vm.runInNewContext(ts.transpileModule(source + `\n({${names}});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, {
    React: { createElement: (type: any, props: any, ...children: any[]) => ({ type, props, children }) }, View: "View", Button: "Button", Input: "Input", Text: "Text", SemanticIcon: "SemanticIcon",
    useDidHide: (callback: () => void) => { hidden = callback; },
    skyRetainedLayerStyle, localParts, createSkyTimeRepeat, skyCivilInstant, skyTimeInputAllowed, stepSkyCivilTime,
    Date: class extends Date { static now() { return Date.parse("2026-10-17T12:00:00.000Z") + clock; } },
    Taro: { nextTick: (callback: () => void) => ticks.push(callback), createSelectorQuery: () => {
      const query = { select: () => query, boundingClientRect: () => query,
        exec: (callback: (values: unknown[]) => void) => callback([{ left: 0, right: 44, top: 0, bottom: 44 }]) }; return query;
    } },
    useMemo: memo, useCallback: (callback: () => any, deps: any[]) => memo(() => callback, deps),
    useRef: (value: any) => { const index = cursor++; return slots[index] ??= { current: value }; },
    useState: (value: any) => {
      const index = cursor++; if (!(index in slots)) slots[index] = value;
      return [slots[index], (next: any) => { if (slots[index] !== next) { slots[index] = next; dirty = true; } }];
    },
    useEffect: (callback: () => void | (() => void), deps: any[]) => {
      const index = cursor++, previous = slots[index];
      if (previous && deps.every((value, i) => value === previous.deps[i])) return;
      effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: callback() }; });
    },
    setTimeout: (callback: () => void, delay: number) => {
      const id = ++serial; timers.set(id, { at: clock + delay, callback }); return id;
    },
    clearTimeout: (id: number) => timers.delete(id),
  });
  const render = (...next: any[]) => {
    if (next.length) args = next;
    let result: any, passes = 0;
    do {
      assert.ok(passes++ < 12, "effects must settle without a render loop");
      dirty = false; cursor = 0; result = exports[component](...args);
      while (effects.length) effects.shift()!();
    } while (dirty);
    return result;
  };
  return { render,
    tick() { while (ticks.length) ticks.shift()!(); return render(); },
    advance(ms: number) {
      clock += ms;
      for (const [id, timer] of timers) if (timer.at <= clock) { timers.delete(id); timer.callback(); }
      return render();
    },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
    hide() { hidden?.(); return render(); },
    get timers() { return timers.size; },
  };
}

export function controls(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(controls);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...controls(tree.children)];
}
