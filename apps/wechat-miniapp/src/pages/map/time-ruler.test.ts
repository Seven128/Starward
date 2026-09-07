import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type Element = { type: string; props: Record<string, any>; children: Element[] };
test("map and panel clocks keep midnight in 00–23 hours on the correct date", () => {
  for (const [path, name] of [["./time-ruler.tsx", "formatTime"], ["../../features/spot/spot-detail-page.tsx", "formatObservationTime"]]) {
    const source = ts.createSourceFile("clock.tsx", readFileSync(new URL(path!, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(declaration);
    const format = vm.runInNewContext(ts.transpileModule(declaration.getText(source) + `\n${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText) as (value: string, timezone: string, compact?: boolean) => string;
    assert.match(format("2026-09-06T16:30:00Z", "Asia/Shanghai", true), /00:30/);
    assert.match(format("2026-09-06T16:00:00Z", "Asia/Shanghai", true), /00:00/);
    assert.match(format("2026-09-06T15:30:00Z", "Asia/Shanghai", true), /23:30/);
    if (name === "formatTime") assert.match(format("2026-09-06T16:30:00Z", "Asia/Shanghai"), /09\/07.*00:30/);
  }
});

function render(disabled = false, selectedAt = "2026-09-06T12:00:00Z") {
  const effects: (() => void | (() => void))[] = [];
  let hide = () => {};
  const text = readFileSync(new URL("./time-ruler.tsx", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace("export function", "function");
  const component = vm.runInNewContext(ts.transpileModule(text + "\nMapTimeRuler;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText, {
    Button: "button", ScrollView: "scroll", Text: "text", View: "view",
    React: { createElement: (type: string, props: object, ...children: Element[]) => ({ type, props, children: children.flat() }) },
    useEffect: (effect: () => void | (() => void)) => effects.push(effect),
    useDidHide: (callback: () => void) => { hide = callback; },
    useState: (value: unknown) => [value, () => {}],
    useRef: (value: unknown) => ({ current: value }), nearestMapTimeFrameIndex: () => 0,
    MINIAPP_DESIGN: { geometry: { "target-min": 44 } },
  });
  const previews: number[] = [], commits: number[] = [];
  let cancelled = 0;
  const root: Element = component({
    frames: [{ atUtc: "2026-09-06T12:00:00Z" }, { atUtc: "2026-09-06T13:00:00Z" }],
    selectedAt, timezone: "UTC", disabled,
    onPreview: (index: number) => previews.push(index), onCommit: (index: number) => commits.push(index),
    onCancel: () => { cancelled++; },
  });
  const scroll = root.children.find((child) => child?.type === "scroll")!;
  const cleanups = effects.map((effect) => effect());
  return { root, scroll: scroll.props, previews, commits, hide: () => hide(),
    unmount: () => cleanups.forEach((cleanup) => cleanup?.()),
    changeInputs: () => effects.at(-1)!(),
    get cancelled() { return cancelled; } };
}
const event = { detail: { scrollLeft: 44 } };
const singleTouch = { touches: [{ identifier: 1 }] };
const twoTouches = { touches: [{ identifier: 1 }, { identifier: 2 }] };

test("a second finger cancels preview and cannot submit through scroll completion", () => {
  for (const phase of ["onTouchStart", "onTouchMove"]) {
    const ruler = render();
    ruler.scroll.onTouchStart(singleTouch);
    ruler.scroll.onScroll(event);
    ruler.scroll[phase](twoTouches);
    ruler.scroll.onScroll(event);
    ruler.scroll.onScrollEnd(event);
    assert.equal(ruler.cancelled, 1);
    assert.deepEqual(ruler.previews, [1]);
    assert.deepEqual(ruler.commits, []);
    ruler.scroll.onTouchStart(singleTouch);
    ruler.scroll.onScrollEnd(event);
    assert.deepEqual(ruler.commits, [1]);
  }
});

test("an off-cadence committed time never marks a neighboring slice selected", () => {
  const ruler = render(false, "2026-09-06T12:20:00Z");
  const tree = JSON.stringify(ruler.root);
  assert.match(tree, /12:20/);
  assert.doesNotMatch(tree, /已选择|slice--active/);
  assert.deepEqual(ruler.commits, []);
});

test("programmatic scroll and disabled rulers cannot preview or submit", () => {
  for (const disabled of [false, true]) {
    const ruler = render(disabled);
    assert.equal(ruler.scroll.scrollX, !disabled);
    if (disabled) ruler.scroll.onTouchStart(singleTouch);
    ruler.scroll.onScroll(event);
    ruler.scroll.onScrollEnd(event);
    assert.deepEqual(ruler.previews, []);
    assert.deepEqual(ruler.commits, []);
  }
});

test("touch cancellation rolls back and ignores subsequent momentum completion", () => {
  const ruler = render();
  ruler.scroll.onTouchStart(singleTouch);
  ruler.scroll.onScroll(event);
  assert.deepEqual(ruler.previews, [1]);
  ruler.scroll.onTouchCancel();
  ruler.scroll.onScrollEnd(event);
  assert.equal(ruler.cancelled, 1);
  assert.deepEqual(ruler.commits, []);
});

test("a completed user scroll commits once", () => {
  const ruler = render();
  ruler.scroll.onTouchStart(singleTouch);
  ruler.scroll.onScrollEnd(event);
  ruler.scroll.onScrollEnd(event);
  assert.deepEqual(ruler.commits, [1]);
});

test("hide, unmount and changed ruler inputs cancel pending preview", () => {
  for (const action of ["hide", "unmount", "changeInputs"] as const) {
    const ruler = render();
    ruler.scroll.onTouchStart(singleTouch);
    ruler.scroll.onScroll(event);
    ruler[action]();
    ruler.scroll.onScrollEnd(event);
    assert.equal(ruler.cancelled, 1);
    assert.deepEqual(ruler.commits, []);
  }
});
