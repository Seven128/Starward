import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as model from "./astronomical-event-banner-model";
import { createEventBannerMotion } from "./astronomical-event-banner-motion";
import type { AstronomicalEventOccurrence } from "@starward/miniapp-contracts";

const meteor = { occurrenceId: "ori", displayName: "猎户座流星雨", kind: "METEOR_SHOWER", code: "ORI",
  peakDate: "2026-10-22", activeStartDate: "2026-10-11", activeEndDate: "2026-11-07", annualReference: {} } as AstronomicalEventOccurrence;
const later = { ...meteor, occurrenceId: "leo", displayName: "狮子座流星雨", peakDate: "2026-11-17", activeStartDate: "2026-11-06", activeEndDate: "2026-11-27" };

type Node = { type: any; props: any };
function find(node: any, predicate: (node: Node) => boolean): Node[] {
  if (node == null || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(item => find(item, predicate));
  return [...(predicate(node) ? [node] : []), ...find(node.props.children, predicate)];
}
function harness() {
  const states: any[] = [], refs: any[] = [];
  const effects: Array<{ deps: unknown[]; cleanup?: (() => void) | undefined }> = [], pending = new Map<number, () => void>();
  const timers = new Map<number, { at: number; run: () => void; interval?: number }>();
  let si = 0, ri = 0, ei = 0, reduced = false, reads = 0, now = 0, timerId = 0;
  const clock = { later: (run: () => void, delay: number) => { timers.set(++timerId, { at: now + delay, run }); return timerId; }, cancel: (id: unknown) => timers.delete(id as number) };
  let resource: any = { data: { dataState: "FRESH", data: { events: [later, meteor] } }, isPending: false, isError: false };
  const exports: any = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./astronomical-event-banner.tsx", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports,
    setInterval: (run: () => void, delay: number) => { timers.set(++timerId, { at: now + delay, run, interval: delay }); return timerId; },
    clearInterval: (id: number) => timers.delete(id), require: (name: string) => {
    if (name === "react/jsx-runtime") return { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }) };
    if (name === "react") return {
      useMemo: (fn: () => unknown) => fn(), useRef: (initial: unknown) => refs[ri++] ?? (refs[ri - 1] = { current: initial }),
      useState: (initial: unknown) => { const index = si++; if (!(index in states)) states[index] = initial; return [states[index], (next: unknown) => { states[index] = next; }]; },
      useEffect: (effect: () => (() => void) | void, deps: unknown[]) => {
        const index = ei++, previous = effects[index];
        if (previous && deps.length === previous.deps.length && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
        pending.set(index, () => { previous?.cleanup?.(); effects[index] = { deps, cleanup: effect() ?? undefined }; });
      },
    };
    if (name === "@tarojs/components") return { Swiper: "Swiper", SwiperItem: "SwiperItem", View: "View", Text: "Text" };
    if (name === "@tarojs/taro") return { useResize() {} };
    if (name.includes("use-astronomical-event-catalog")) return { useAstronomicalEventCatalog: () => { reads++; return resource; } };
    if (name.includes("use-reduced-motion")) return { useReducedMotion: () => reduced };
    if (name.includes("native-metrics")) return { nativeNavigationInsets: () => ({ safeTop: 88 }) };
    if (name.includes("shared-button-press")) return { SharedButton: "Button" };
    if (name.includes("semantic-asset")) return { SemanticIcon: "SemanticIcon" };
    if (name.endsWith("banner-model")) return model;
    if (name.endsWith("banner-motion")) return { createEventBannerMotion: (ids: string[], id: string | null, publish: any) => createEventBannerMotion(ids, id, publish, clock) };
    return {};
  } });
  return {
    resource(next: any) { resource = next; }, reduced(next: boolean) { reduced = next; }, reads: () => reads,
    pending: () => timers.size,
    advance(ms: number) {
      const end = now + ms;
      for (;;) {
        const first = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!first || first[1].at > end) break;
        now = first[1].at; timers.delete(first[0]);
        if (first[1].interval) timers.set(first[0], { ...first[1], at: now + first[1].interval });
        first[1].run();
      }
      now = end;
    },
    unmount() { for (const effect of effects) effect?.cleanup?.(); },
    render(props: object) {
      si = ri = ei = 0;
      const host = exports.AstronomicalEventBanner(props);
      const tree = host ? host.type(host.props) : null;
      const tasks = [...pending.values()]; pending.clear(); for (const run of tasks) run();
      return tree;
    },
  };
}
const point = (x: number, y = 0, identifier = 1) => ({ identifier, clientX: x, clientY: y });
const touch = (x: number, y = 0) => ({ touches: [point(x, y)], stopPropagation() {} });
const touchEnd = (x: number, y = 0) => ({ touches: [], changedTouches: [point(x, y)], stopPropagation() {} });

test("banner uses real directory chronology and preserves reference-date precision", () => {
  const events = model.orderedBannerEvents([later, meteor]);
  assert.deepEqual(events.map(event => event.occurrenceId), ["ori", "leo"]);
  assert.equal(model.initialBannerIndex(events, "2026-10-27"), 0);
  assert.equal(model.initialBannerIndex(events, "2026-11-15"), 1);
  assert.equal(model.initialBannerIndex(events, "2027-01-01"), 1);
  assert.equal(model.eventBannerCaption(meteor, "2026-10-27"), "常年参考日（UTC） · 10月22日");
  assert.match(model.eventBannerCaption(meteor, "2027-01-01"), /2026\.10\.22/);
});

test("banner loops at five seconds with adopted exit/entry phases, pauses for a swipe, and never opens from that swipe", () => {
  const h = harness(), opened: unknown[] = [];
  const props = { visible: true, localDate: "2026-10-27", onOpen: (month: unknown) => opened.push(month) };
  let tree = h.render(props);
  const copy = (value: Node) => find(value, node => String(node.props.className).startsWith("event-banner__copy"))[0]!;
  const title = (value: Node) => find(value, node => node.props.className === "event-banner__title")[0]!.props.children;
  h.advance(4999); assert.equal(title(h.render(props)), meteor.displayName);
  h.advance(1); tree = h.render(props);
  assert.equal(copy(tree).props.className, "event-banner__copy event-banner__copy--out");
  assert.equal(copy(tree).props.style.transform, "translateX(-28px)");
  h.advance(130); tree = h.render(props);
  assert.equal(title(tree), later.displayName); assert.equal(copy(tree).props.style.transform, "translateX(28px)");
  h.advance(16); assert.equal(copy(h.render(props)).props.className, "event-banner__copy event-banner__copy--in");
  h.advance(180); assert.equal(copy(h.render(props)).props.className, "event-banner__copy event-banner__copy--idle");
  tree.props.onTouchStart(touch(120)); tree.props.onTouchMove(touch(20));
  h.render(props); assert.equal(h.pending(), 0, "holding the banner stops autoplay");
  tree.props.onTouchEnd(touchEnd(20));
  tree = h.render(props); tree.props.onClick(touch(20));
  assert.deepEqual(opened, []);
  h.advance(326); tree = h.render(props); assert.equal(title(tree), meteor.displayName, "last card loops back to the first real occurrence");
  tree.props.onTouchStart(touch(20)); tree.props.onTouchEnd(touchEnd(20)); tree.props.onClick(touch(20));
  assert.deepEqual(opened, ["2026-10"]);
  h.reduced(true);
  h.render(props); assert.equal(h.pending(), 0);
  h.unmount(); assert.equal(h.pending(), 0);
});

test("a second finger cancels the whole banner gesture and autoplay waits for every finger to leave", () => {
  const h = harness(), opened: unknown[] = [];
  const props = { visible: true, localDate: "2026-10-27", onOpen: (month: unknown) => opened.push(month) };
  const title = (tree: Node) => find(tree, node => node.props.className === "event-banner__title")[0]!.props.children;
  let tree = h.render(props);
  tree.props.onTouchStart(touch(120)); h.render(props);
  tree.props.onTouchStart({ touches: [point(120), point(40, 0, 2)], stopPropagation() {} });
  tree.props.onTouchEnd({ touches: [point(120)], changedTouches: [point(40, 0, 2)], stopPropagation() {} });
  tree = h.render(props);
  assert.equal(h.pending(), 0, "the unmoved first finger still holds the banner");
  h.advance(6000); assert.equal(title(h.render(props)), meteor.displayName);
  tree.props.onTouchEnd(touchEnd(120));
  tree = h.render(props); tree.props.onClick(touch(120));
  assert.deepEqual(opened, [], "the cancelled multi-finger gesture cannot open the page");
  h.advance(4999); assert.equal(title(h.render(props)), meteor.displayName);
  h.advance(327); assert.equal(title(h.render(props)), later.displayName);
  tree = h.render(props);
  tree.props.onTouchStart(touch(20)); tree.props.onTouchEnd(touchEnd(20)); tree.props.onClick(touch(20));
  assert.deepEqual(opened, ["2026-11"], "a fresh single-finger tap still works");
  h.unmount();
});

test("hidden banner has no query consumer or carousel, and unavailable catalog is not a false empty result", () => {
  const h = harness(), props = { visible: true, localDate: "2026-10-27", onOpen() {} };
  h.render(props); const reads = h.reads();
  assert.equal(h.render({ ...props, visible: false }), null); assert.equal(h.reads(), reads);
  h.resource({ data: { dataState: "UNAVAILABLE", data: { events: [meteor] } }, isError: false, isPending: false });
  const unavailable = h.render(props);
  assert.equal(find(unavailable, node => String(node.props.className).includes("event-banner__copy--")).length, 0);
  assert.equal(find(unavailable, node => node.type === "Text" && node.props.children === "目录暂不可用，点击查看").length, 1);
  assert.equal(find(unavailable, node => node.type === "Text" && node.props.children === "当前目录暂无事件").length, 0);
  h.unmount(); assert.equal(h.pending(), 0);
});

test("new catalog identity and unmount retire in-flight banner transitions", () => {
  const h = harness(), props = { visible: true, localDate: "2026-10-27", onOpen() {} };
  h.render(props); h.advance(5000);
  h.resource({ data: { dataState: "FRESH", data: { events: [{ ...later, occurrenceId: "replacement" }] } }, isError: false, isPending: false });
  h.render(props); assert.equal(h.pending(), 0);
  h.advance(500); const tree = h.render(props);
  assert.equal(find(tree, node => node.props.className === "event-banner__title")[0]!.props.children, later.displayName);
  assert.equal(find(tree, node => node.props.className === "event-banner__copy event-banner__copy--idle").length, 1);
  h.unmount(); assert.equal(h.pending(), 0);
});
