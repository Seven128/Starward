import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import type { SpotSummary } from "@starward/miniapp-contracts";
import * as presentation from "./viewport-spot-list-state";
import type { ViewportSpotListProps } from "./viewport-spot-list";

type Node = { type: string; props: Record<string, any> };
function find(node: any, predicate: (value: Node) => boolean): Node[] {
  if (node == null || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(value => find(value, predicate));
  return [...(predicate(node) ? [node] : []), ...find(node.props?.children, predicate)];
}
const spot = (id: number): SpotSummary => ({ ...TEST_PUBLISHED_SPOT,
  spotId: `spot:viewport-${id}` as SpotSummary["spotId"], name: `地点${id}` });
const result = (key: string, ids = [1, 2, 3, 4, 5]) => ({ requestKey: key, revision: ids.join(","), spots: ids.map(spot), total: ids.length });
const point = (x: number, y = 0, identifier = 1) => ({ identifier, clientX: x, clientY: y });
const touch = (x: number, y = 0) => ({ touches: [point(x, y)] });
const end = (x: number, y = 0) => ({ touches: [], changedTouches: [point(x, y)] });

function harness() {
  const refs: Array<{ current: unknown }> = [];
  const effects: Array<{ deps: unknown[]; cleanup?: (() => void) | undefined }> = [];
  const pending = new Map<number, () => void>();
  const timers = new Set<() => void>();
  let refIndex = 0, effectIndex = 0;
  let owner!: ReturnType<typeof presentation.createViewportSpotPresentation>;
  const effect = (run: () => (() => void) | void, deps: unknown[]) => {
    const index = effectIndex++, previous = effects[index];
    if (previous && deps.length === previous.deps.length && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
    pending.set(index, () => { previous?.cleanup?.(); effects[index] = { deps, cleanup: run() ?? undefined }; });
  };
  const exports: { ViewportSpotList?: (props: ViewportSpotListProps) => Node } = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./viewport-spot-list.tsx", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require(name: string) {
    if (name === "react/jsx-runtime") return { jsx: (type: string, props: any) => ({ type, props }), jsxs: (type: string, props: any) => ({ type, props }) };
    if (name === "react") return {
      useRef: (initial: unknown) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }),
      useSyncExternalStore: (_: unknown, get: () => unknown) => get(), useEffect: effect, useLayoutEffect: effect,
    };
    if (name === "@tarojs/components") return { ScrollView: "ScrollView", View: "View", Text: "Text" };
    if (name.includes("shared-button-press")) return { SharedButton: "Button" };
    if (name.includes("spot-identity-card")) return { SpotIdentityCard: "SpotIdentityCard" };
    if (name.includes("status-panel")) return { StatusPanel: "StatusPanel" };
    if (name.endsWith("viewport-spot-list-state")) return { ...presentation, createViewportSpotPresentation() {
      owner = presentation.createViewportSpotPresentation({
        setTimeout(run) { timers.add(run); return run; }, clearTimeout(handle) { timers.delete(handle as () => void); },
      });
      return owner;
    } };
    return {};
  } });
  return {
    render(props: ViewportSpotListProps) {
      let tree!: Node;
      for (let pass = 0; pass < 5; pass++) {
        const before = owner?.getSnapshot();
        refIndex = effectIndex = 0;
        tree = exports.ViewportSpotList!(props);
        const tasks = [...pending.values()]; pending.clear(); tasks.forEach(run => run());
        if (before === owner.getSnapshot()) break;
      }
      return tree;
    },
    finish() {
      const state = owner.getSnapshot();
      presentation.viewportSpotPage(state).forEach((_, index) => owner.animationEnded(state.transition, state.phase, index));
    },
    state: () => owner.getSnapshot(),
    unmount() { effects.forEach(value => value.cleanup?.()); assert.equal(timers.size, 0); },
  };
}

test("native vertical card scrolling stays separate from horizontal pagination, including a diagonal release", () => {
  const h = harness(), selected: SpotSummary[] = [];
  const props: ViewportSpotListProps = { requestKey: "a", result: result("a"), active: true, reducedMotion: true,
    loading: false, failed: false, onSelect: value => selected.push(value) };
  let tree = h.render(props);
  const scroller = find(tree, value => value.type === "ScrollView")[0]!;
  assert.equal(scroller.props.scrollY, true);
  assert.equal(find(scroller, value => value.props.className === "map-viewport-spots__heading").length, 0);
  assert.equal(find(scroller, value => value.props.className === "map-viewport-spots__pagination").length, 0);
  tree.props.onTouchStart(touch(120)); tree.props.onTouchMove(touch(116, 40)); tree.props.onTouchEnd(end(20, 60));
  tree = h.render(props);
  assert.equal(h.state().page, 0, "a vertical scroll cannot become a page swipe at release");
  find(tree, value => value.type === "SpotIdentityCard")[0]!.props.onSelect();
  assert.equal(selected.length, 0, "drag release does not select the underlying place");
  find(tree, value => value.props.ariaLabel === "第2页")[0]!.props.onClick();
  assert.equal(h.state().page, 0, "a scroll ending on a pagination button does not page through a synthetic click");
  tree.props.onTouchStart(touch(120)); tree.props.onTouchMove(touch(60, 3)); tree.props.onTouchEnd(end(20, 6));
  tree = h.render(props);
  assert.equal(h.state().page, 1);
  tree.props.onTouchStart(touch(20)); tree.props.onTouchEnd(end(20));
  find(tree, value => value.type === "SpotIdentityCard")[0]!.props.onSelect();
  assert.equal(selected[0], props.result!.spots[4]);
  h.unmount();
});

test("a multi-finger card gesture cannot paginate or select, but a later single-finger tap works", () => {
  const h = harness(), selected: SpotSummary[] = [];
  const props: ViewportSpotListProps = { requestKey: "a", result: result("a"), active: true, reducedMotion: true,
    loading: false, failed: false, onSelect: value => selected.push(value) };
  let tree = h.render(props);
  tree.props.onTouchStart(touch(120));
  tree.props.onTouchStart({ touches: [point(120), point(20, 0, 2)] });
  tree.props.onTouchEnd({ touches: [point(120)], changedTouches: [point(20, 0, 2)] });
  tree.props.onTouchMove(touch(20)); tree.props.onTouchEnd(end(20));
  tree = h.render(props);
  assert.equal(h.state().page, 0);
  find(tree, value => value.type === "SpotIdentityCard")[0]!.props.onSelect();
  assert.equal(selected.length, 0);
  tree.props.onTouchStart(touch(20)); tree.props.onTouchEnd(end(20));
  find(tree, value => value.type === "SpotIdentityCard")[0]!.props.onSelect();
  assert.equal(selected[0], props.result!.spots[0]);
  h.unmount();
});

test("after old cards have left, pending and failed views show recovery instead of transparent stale cards", () => {
  const h = harness();
  const initial: ViewportSpotListProps = { requestKey: "a", result: result("a"), active: true, reducedMotion: false,
    loading: false, failed: false, onSelect() {} };
  h.render(initial);
  h.render({ ...initial, requestKey: "b", result: result("b", [6]) });
  const waiting = { ...initial, requestKey: "c", result: null, loading: true };
  h.render(waiting); h.finish();
  let tree = h.render(waiting);
  assert.equal(tree.props["data-phase"], "waiting");
  assert.equal(find(tree, value => value.type === "SpotIdentityCard").length, 0);
  assert.equal(find(tree, value => value.type === "StatusPanel")[0]!.props.state, "LOADING");
  let retries = 0;
  tree = h.render({ ...waiting, failed: true, loading: false, onRetry() { retries++; } });
  assert.equal(find(tree, value => value.type === "SpotIdentityCard").length, 0);
  assert.equal(find(tree, value => value.type === "StatusPanel")[0]!.props.state, "ERROR");
  find(tree, value => value.props.className === "map-viewport-spots__retry")[0]!.props.onClick();
  assert.equal(retries, 1);
  tree = h.render({ ...waiting, result: result("c", [7]), loading: false });
  assert.equal(tree.props["data-phase"], "entering");
  assert.equal(find(tree, value => value.type === "StatusPanel").length, 0);
  assert.equal(find(tree, value => value.type === "SpotIdentityCard")[0]!.props.spot.spotId, "spot:viewport-7");
  h.unmount();
});
