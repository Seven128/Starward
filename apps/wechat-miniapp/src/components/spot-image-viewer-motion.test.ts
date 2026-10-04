import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as gesture from "./spot-image-viewer-gesture";

function find(node: any, match: (node: any) => boolean): any[] {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(child => find(child, match));
  return [...(match(node) ? [node] : []), ...find(node.props?.children, match)];
}
function harness() {
  const states: any[] = [], refs: any[] = [], effects: { deps: unknown[]; cleanup: (() => void) | undefined }[] = [];
  const pending = new Map<number, () => void>(), timers = new Map<number, { at: number; run: () => void }>();
  const queries: Array<(rows: unknown[]) => void> = [];
  let s = 0, r = 0, e = 0, reduced = false, now = 0, id = 0, closed = 0;
  const exports: any = {}, jsx = (type: unknown, props: any) => ({ type, props });
  const taro = { getWindowInfo: () => ({ windowWidth: 390, windowHeight: 844 }),
    hideTabBar: async () => {}, showTabBar: async () => {}, nextTick: (run: () => void) => run(),
    createSelectorQuery() { const q = { select: () => q, boundingClientRect: () => q,
      exec: (callback: (rows: unknown[]) => void) => queries.push(callback) }; return q; },
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./spot-image-viewer.tsx", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports,
    setTimeout: (run: () => void, delay: number) => { timers.set(++id, { at: now + delay, run }); return id; }, clearTimeout: (key: number) => timers.delete(key),
    require: (name: string) => name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name === "react" ? {
      useRef: (value: unknown) => refs[r++] ?? (refs[r - 1] = { current: value }),
      useState: (value: unknown) => { const at = s++; if (!(at in states)) states[at] = value;
        return [states[at], (next: any) => { states[at] = typeof next === "function" ? next(states[at]) : next; }]; },
      useEffect: effect, useLayoutEffect: effect,
    } : name === "@tarojs/taro" ? { __esModule: true, default: taro }
      : name === "@tarojs/components" ? { Button: "Button", Image: "Image", View: "View", Text: "Text", RootPortal: "RootPortal" }
      : name.includes("use-reduced-motion") ? { useReducedMotion: () => reduced }
      : name.includes("spot-image-viewer-gesture") ? gesture : {},
  });
  function effect(run: () => (() => void) | void, deps: unknown[]) {
    const at = e++, old = effects[at];
    if (old && old.deps.length === deps.length && deps.every((v, i) => Object.is(v, old.deps[i]))) return;
    pending.set(at, () => { old?.cleanup?.(); effects[at] = { deps, cleanup: run() ?? undefined }; });
  }
  const props = { name: "test", media: [{ id: "photo", src: "https://example.invalid/test.jpg", alt: "test", caption: "test", state: "ready" }], index: 0,
    onIndexChange() {}, onClose() { closed++; } };
  const render = () => { s = r = e = 0; return exports.SpotImageViewer(props); };
  const flush = () => { const tasks = [...pending.values()]; pending.clear(); for (const run of tasks) run(); };
  return { render, flush, queries,
    reduce(value: boolean) { reduced = value; render(); flush(); },
    load() { const image = find(render(), node => node.props?.className === "spot-media-viewer__image")[0]; assert.ok(image); image.props.onLoad({ detail: { width: 1600, height: 1000 } }); },
    close() { const button = find(render(), node => node.props?.ariaLabel === "关闭照片查看器")[0]; assert.ok(button); button.props.onClick(); },
    deliver() { const query = queries.shift(); assert.ok(query, "actual query must have been dispatched"); query([{ left: 12, top: 60, width: 296, height: 116 }]); },
    flight: () => find(render(), node => String(node.props?.className).startsWith("spot-media-viewer__flight")).length,
    advance(ms: number) { const end = now + ms; for (;;) { const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break; now = next[1].at; timers.delete(next[0]); next[1].run(); } now = end; },
    unmount() { for (const item of effects) item?.cleanup?.(); }, closed: () => closed, pending: () => timers.size,
  };
}

test("a late opening source query cannot restart flight after system reduction", () => {
  const h = harness(); h.render(); h.flush(); h.load();
  assert.equal(h.queries.length, 1);
  h.reduce(true); h.deliver(); h.render(); h.flush();
  assert.equal(h.flight(), 0); h.advance(1000); assert.equal(h.flight(), 0);
  assert.equal(h.closed(), 0); assert.equal(h.pending(), 0);
});

test("system reduction retires a dispatched close query and closes only once", () => {
  const h = harness(); h.render(); h.flush(); h.deliver(); h.render(); h.flush(); h.load(); h.render(); h.flush();
  h.advance(400); h.close(); assert.equal(h.queries.length, 1);
  h.reduce(true); assert.equal(h.closed(), 1);
  h.deliver(); h.advance(1000); assert.equal(h.closed(), 1); assert.equal(h.pending(), 0);
});

test("unmount retires a close query; a current normal close still completes", () => {
  for (const retired of [false, true]) {
    const h = harness(); h.render(); h.flush(); h.deliver(); h.render(); h.flush(); h.load(); h.render(); h.flush();
    h.advance(400); h.close(); if (retired) h.unmount();
    h.deliver(); h.advance(1000); assert.equal(h.closed(), retired ? 0 : 1); assert.equal(h.pending(), 0);
  }
});
