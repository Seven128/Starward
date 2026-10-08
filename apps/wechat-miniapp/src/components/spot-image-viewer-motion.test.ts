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
  const queries: Array<{ selectors: string[]; callback: (rows: unknown[]) => void }> = [];
  const resizeListeners = new Set<() => void>();
  let s = 0, r = 0, e = 0, reduced = false, now = 0, id = 0, closed = 0;
  const exports: any = {}, jsx = (type: unknown, props: any) => ({ type, props });
  const taro = { getWindowInfo: () => ({ windowWidth: 390, windowHeight: 762, statusBarHeight: 47 }),
    getMenuButtonBoundingClientRect: () => ({ bottom: 83 }),
    onWindowResize: (run: () => void) => resizeListeners.add(run), offWindowResize: (run: () => void) => resizeListeners.delete(run),
    hideTabBar: async () => {}, showTabBar: async () => {}, nextTick: (run: () => void) => run(),
    createSelectorQuery() { const selectors: string[] = []; const q = { select: (selector: string) => { selectors.push(selector); return q; }, boundingClientRect: () => q,
      exec: (callback: (rows: unknown[]) => void) => queries.push({ selectors, callback }) }; return q; },
  };
  const nativeMetrics: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../theme/native-metrics.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, { exports: nativeMetrics, require: () => ({ __esModule: true, default: taro }) });
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
      : name.includes("spot-image-viewer-gesture") ? gesture
      : name.includes("native-metrics") ? nativeMetrics : {},
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
    load(width = 1600, height = 1000) { const image = find(render(), node => node.props?.className === "spot-media-viewer__image")[0]; assert.ok(image); image.props.onLoad({ detail: { width, height } }); },
    close() { const button = find(render(), node => node.props?.ariaLabel === "关闭照片查看器")[0]; assert.ok(button); button.props.onClick(); },
    deliver(viewport = { left: 0, top: 0, width: 390.4, height: 844 }) {
      const query = queries.shift(); assert.ok(query, "actual query must have been dispatched");
      const source = { left: 12, top: 60, width: 296, height: 116 };
      query.callback(query.selectors.map(selector => selector === ".spot-media-viewer" ? viewport : source));
    },
    resize() { for (const listener of resizeListeners) listener(); },
    captionHalfHeight: () => find(render(), node => node.props?.className === "spot-media-viewer__content")[0].props.style["--viewer-image-half-height"],
    setCaption(value: string) { props.media[0]!.caption = value; },
    flight: () => find(render(), node => String(node.props?.className).split(" ").includes("spot-media-viewer__flight")).length,
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

test("caption and flight use the measured fullscreen viewport independently of the shorter page and caption length", () => {
  const h = harness(); h.render(); h.flush(); h.deliver(); h.render(); h.flush(); h.load(640, 360); h.render(); h.flush();
  assert.equal(h.captionHalfHeight(), "109.8px");
  h.setCaption("A long provenance description ".repeat(100));
  assert.equal(h.captionHalfHeight(), "109.8px");
  h.advance(24);
  const flight = find(h.render(), node => String(node.props?.className).startsWith("spot-media-viewer__flight"))[0];
  assert.equal(flight.props.style.top, "312.2px");
  assert.equal(flight.props.style.height, "219.6px");
  h.advance(400); h.resize(); h.deliver({ left: 0, top: 0, width: 320, height: 700 });
  assert.equal(h.captionHalfHeight(), "90px");
  h.unmount(); assert.equal(h.pending(), 0);
});

test("reduced-motion and portrait photographs still position the caption under the fitted image", () => {
  const h = harness(); h.reduce(true); h.deliver({ left: 0, top: 0, width: 320, height: 700 });
  h.load(400, 800); h.render(); h.flush();
  assert.equal(h.captionHalfHeight(), "230px");
  assert.equal(h.flight(), 0);
  h.resize(); h.unmount(); h.deliver(); assert.equal(h.pending(), 0);
});

test("viewport change retires an opening flight and ignores an older geometry response", () => {
  const h = harness(); h.render(); h.flush(); h.deliver(); h.render(); h.flush(); h.load(); h.render(); h.flush();
  h.advance(24); assert.equal(h.flight(), 1);
  h.resize(); h.resize();
  h.deliver({ left: 0, top: 0, width: 390.4, height: 844 });
  h.deliver({ left: 0, top: 0, width: 320, height: 700 });
  assert.equal(h.captionHalfHeight(), "100px");
  h.advance(1000); assert.equal(h.flight(), 0); assert.equal(h.closed(), 0);
  h.unmount(); assert.equal(h.pending(), 0);
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

test("dragged close starts at the image center in the actual fullscreen viewport", () => {
  const h = harness(); h.render(); h.flush(); h.deliver(); h.render(); h.flush(); h.load(640, 360); h.render(); h.flush(); h.advance(400);
  const stage = find(h.render(), node => node.props?.className === "spot-media-viewer__stage")[0];
  stage.props.onTouchStart({ touches: [{ clientX: 180, clientY: 380 }] });
  stage.props.onTouchMove({ touches: [{ clientX: 180, clientY: 500 }] });
  h.close(); h.deliver();
  const flight = find(h.render(), node => String(node.props?.className).split(" ").includes("spot-media-viewer__flight"))[0];
  const center = Number.parseFloat(flight.props.style.top) + Number.parseFloat(flight.props.style.height) / 2;
  assert.ok(Math.abs(center - 542) < .001, `live image center is 542, close started at ${center}`);
  h.advance(400); assert.equal(h.closed(), 1); assert.equal(h.pending(), 0);
});

test("a cancelled drag keeps chrome hidden for the adopted 220ms rebound, with no travel delay under reduction", () => {
  for (const reduced of [false, true]) {
    const h = harness(); h.render(); h.flush(); h.deliver(); h.render(); h.flush(); h.load(640, 360); h.render(); h.flush(); h.advance(400);
    if (reduced) h.reduce(true);
    const stage = find(h.render(), node => node.props?.className === "spot-media-viewer__stage")[0];
    stage.props.onTouchStart({ touches: [{ clientX: 180, clientY: 380 }] });
    stage.props.onTouchMove({ touches: [{ clientX: 180, clientY: 428 }] });
    stage.props.onTouchCancel();
    const hidden = () => find(h.render(), node => String(node.props?.className).startsWith("spot-media-viewer "))[0].props.className.includes("spot-media-viewer--chrome-hidden");
    if (reduced) assert.equal(hidden(), false);
    else {
      h.advance(219); assert.equal(hidden(), true, "controls must not appear while the adopted rebound is still moving");
      h.advance(1); assert.equal(hidden(), false);
    }
    h.unmount(); assert.equal(h.pending(), 0);
  }
});
