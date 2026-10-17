import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { terrainHorizonChart } from "./terrain-horizon-chart";

function mount() {
  const source = ts.createSourceFile("horizon.tsx", readFileSync(new URL("./spot-terrain-horizon.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "SpotTerrainHorizon")!;
  const states: any[] = [], memos: any[] = [], effects: any[] = [], ticks: (() => void)[] = [], reads: { id: string; deliver(value: any): void }[] = [], drawings: any[] = [];
  let si = 0, mi = 0, ei = 0, layout: (() => void)[] = [], hide = () => {}, show = () => {}, resize = () => {};
  let mode = "DAY", retries = 0;
  const equal = (a: any[], b: any[]) => a?.length === b.length && b.every((value, i) => Object.is(value, a[i]));
  const component = vm.runInNewContext(ts.transpileModule("let canvasSequence = 0;\n" + declaration.getText(source).replace(/^export /, "") + ";SpotTerrainHorizon;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, {
    terrainHorizonChart, drawTerrainHorizon: (...values: any[]) => drawings.push(values),
    useAppStore: (selector: any) => selector({ mode }),
    useState(initial: any) { const i = si++; if (!(i in states)) states[i] = initial;
      return [states[i], (value: any) => { states[i] = typeof value === "function" ? value(states[i]) : value; }]; },
    useMemo(fn: () => any, deps: any[]) { const i = mi++; if (!equal(memos[i]?.deps, deps)) memos[i] = { deps, value: fn() }; return memos[i].value; },
    useLayoutEffect(fn: () => any, deps: any[]) { const i = ei++, old = effects[i]; if (!equal(old?.deps, deps)) layout.push(() => { old?.cleanup?.(); effects[i] = { deps, cleanup: fn() }; }); },
    useDidHide: (fn: () => void) => { hide = fn; }, useDidShow: (fn: () => void) => { show = fn; }, useResize: (fn: () => void) => { resize = fn; },
    Taro: { nextTick: (fn: () => void) => ticks.push(fn), getWindowInfo: () => ({ pixelRatio: 2 }),
      createSelectorQuery() { let id = ""; const value = { select(selector: string) { id = selector; return value; },
        fields(_fields: any, deliver: (value: any) => void) { reads.push({ id, deliver }); return value; }, exec() {} }; return value; } },
    Canvas: "Canvas", Text: "Text", View: "View", SourceDisclosure: "SourceDisclosure", StatusPanel: "StatusPanel", SoftButton: "SoftButton",
    React: { createElement: (type: string, props: any, ...children: any[]) => ({ type, props, children }) },
  });
  let query: any = { isPending: false, isError: false, isFetching: false, refetch: () => { retries++; } };
  const render = (visible = true) => { si = mi = ei = 0; layout = []; const tree = component({ query, visible }); layout.forEach(fn => fn()); return tree; };
  return { render, reads, drawings, get retries() { return retries; },
    set(data: any, patch: any = {}) { query = { ...query, data: data ? { data } : undefined, ...patch }; },
    setMode(value: string) { mode = value; }, tick() { while (ticks.length) ticks.shift()!(); },
    hide: () => hide(), show: () => show(), resize: () => resize(), unmount: () => effects.forEach(value => value.cleanup?.()) };
}
const data = () => ({ state: "AVAILABLE", publicationId: "test", coverageLabel: "test", limitations: [], source: null,
  model: { knownSectors: 360, radiusM: 20_000, sectors: Array.from({ length: 360 }, (_, bearingDegrees) => ({ bearingDegrees, elevationDegrees: 4, sampleCount: 1 })) } });
const canvas = () => ({ width: 1, height: 1, getContext: () => ({ setTransform() {} }) });
function nodes(value: any): any[] { return Array.isArray(value) ? value.flatMap(nodes) : value && typeof value === "object" ? [value, ...nodes(value.children)] : []; }

test("a late selector from the previous station cannot draw or release the next canvas", () => {
  const h = mount(); h.set(data()); h.render(); h.tick(); const first = h.reads[0]!;
  h.set(data()); h.render(); h.tick(); const second = h.reads[1]!;
  assert.notEqual(first.id, second.id);
  const obsolete = canvas(), current = canvas();
  first.deliver({ node: obsolete, width: 326, height: 140 }); assert.equal(h.drawings.length, 0); assert.equal(obsolete.width, 1);
  second.deliver({ node: current, width: 326, height: 140 }); assert.equal(h.drawings.length, 1); assert.equal(current.width, 652);
  assert.equal(nodes(h.render()).some(node => node.type === "StatusPanel"), false);
  h.unmount(); assert.equal(current.width, 0); assert.equal(current.height, 0);
});

test("page hiding releases the bitmap and returning draws the same data in the current mode", () => {
  const h = mount(); h.set(data()); h.render(); h.tick(); const old = canvas();
  h.reads[0]!.deliver({ node: old, width: 326, height: 140 });
  h.hide(); h.render(); h.tick(); assert.equal(old.width, 0); assert.equal(h.reads.length, 1);
  h.setMode("OBSERVATION"); h.show(); h.render(); h.tick();
  h.reads[1]!.deliver({ node: canvas(), width: 326, height: 140 }); assert.equal(h.drawings.at(-1)![2], "OBSERVATION");
  assert.equal(h.retries, 0, "redrawing a valid profile does not reacquire its elevation source");
});

test("unavailable canvas acquisition retries once and manual redisplay preserves valid data", () => {
  const h = mount(); h.set(data()); h.render(); h.tick(); h.reads[0]!.deliver(null); h.tick(); h.reads[1]!.deliver(null);
  h.tick(); assert.equal(h.reads.length, 2);
  const status = nodes(h.render()).find(node => node.type === "StatusPanel");
  assert.equal(status.props.state, "ERROR"); assert.equal(status.props.recoveryLabel, "重新显示"); status.props.onRecover();
  h.render(); h.tick(); h.reads[2]!.deliver({ node: canvas(), width: 326, height: 140 });
  assert.equal(nodes(h.render()).some(node => node.type === "StatusPanel"), false); assert.equal(h.retries, 0);
});
