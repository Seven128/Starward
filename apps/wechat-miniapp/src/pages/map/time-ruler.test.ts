import { createScrollSettlement } from "../../components/scroll-settlement";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { calendarDateInTimezone, clockTimeInTimezone } from "../../utils/zoned-date";

type Element = { type: string; props: Record<string, any>; children: Element[] };
test("map and panel clocks keep midnight in 00–23 hours on the correct date", () => {
  for (const [path, name] of [["./time-ruler.tsx", "formatTime"], ["../../features/spot/spot-detail-page.tsx", "formatObservationTime"]]) {
    const source = ts.createSourceFile("clock.tsx", readFileSync(new URL(path!, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(declaration);
    const format = vm.runInNewContext(
      ts.transpileModule(declaration.getText(source) + `\n${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText,
      { calendarDateInTimezone, clockTimeInTimezone },
    ) as (value: string, timezone: string, compact?: boolean) => string;
    assert.match(format("2026-09-06T16:30:00Z", "Asia/Shanghai", true), /00:30/);
    assert.match(format("2026-09-06T16:00:00Z", "Asia/Shanghai", true), /00:00/);
    assert.match(format("2026-09-06T15:30:00Z", "Asia/Shanghai", true), /23:30/);
    if (name === "formatTime") assert.match(format("2026-09-06T16:30:00Z", "Asia/Shanghai"), /09\/07.*00:30/);
  }
});

function render(disabled = false, selectedAt = "2026-09-06T12:00:00Z", frames: { atUtc: string }[] = [{ atUtc: "2026-09-06T12:00:00Z" }, { atUtc: "2026-09-06T13:00:00Z" }], emptyMessage = "当前日期没有可用的时间切片。") {
  const positions:number[]=[];
  const effects: (() => void | (() => void))[] = [];
  const hooks: any[] = [], dependencies: unknown[][] = [];
  let cursor = 0, effectCursor = 0;
  let pendingEffects: number[] = [];
  let hide = () => {};
  const text = readFileSync(new URL("./time-ruler.tsx", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace("export function", "function");
  const component = vm.runInNewContext(ts.transpileModule(text + "\nMapTimeRuler;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText, {
    useReducedMotion:()=>false,useDidShow:()=>{},createRulerScrollPosition:()=>({move:(value:number)=>positions.push(value),settle:(_from:number,value:number,_reduced:boolean,present:(left:number)=>void)=>{positions.push(value);present(value);},cancel:()=>{}}),createScrollSettlement, Button: "button", ScrollView: "scroll", Text: "text", View: "view",
    React: { createElement: (type: string, props: object, ...children: Element[]) => ({ type, props, children: children.flat() }) },
    useEffect: (effect: () => void | (() => void), deps: unknown[]) => {
      const slot = effectCursor++;
      if (!dependencies[slot] || deps.some((value, i) => value !== dependencies[slot]![i])) pendingEffects.push(slot);
      effects[slot] = effect; dependencies[slot] = deps;
    },
    useDidHide: (callback: () => void) => { hide = callback; },
    useState: (value: unknown) => { const slot = cursor++; if (!(slot in hooks)) hooks[slot] = value; return [hooks[slot], (next: unknown) => { hooks[slot] = next; }]; },
    useRef: (value: unknown) => { const slot = cursor++; if (!(slot in hooks)) hooks[slot] = {current:value}; return hooks[slot]; },
    nearestMapTimeFrameIndex: (rows: {atUtc:string}[], at:string) => Math.max(0,rows.findIndex(row=>row.atUtc===at)),
    calendarDateInTimezone, clockTimeInTimezone,
  });
  const previews: number[] = [], commits: number[] = [];
  let cancelled = 0;
  const props = {
    frames,
    selectedAt, timezone: "UTC", disabled,
    emptyMessage,
    onPreview: (index: number) => previews.push(index), onCommit: (index: number) => commits.push(index),
    onCancel: () => { cancelled++; },
  };
  let root: Element;
  const cleanups: (() => void)[] = [];
  const rerender = (changes: Partial<typeof props> = {}) => {
    Object.assign(props,changes); cursor = 0; effectCursor = 0; pendingEffects = [];
    root = component(props);
    for (const slot of pendingEffects) { const cleanup = effects[slot]!(); if (cleanup) cleanups.push(cleanup); }
  };
  rerender();
  return { positions, get root() { return root; }, get scroll() { return root.children.find(child=>child?.type==="scroll")?.props ?? {}; }, previews, commits, hide: () => hide(), rerender,
    unmount: () => cleanups.forEach((cleanup) => cleanup?.()),
    changeInputs: () => effects[1]!(),
    get cancelled() { return cancelled; } };
}
test("an empty ruler shows its consumer's actual loading, failure or zero-result meaning", () => {
  for (const message of ["正在读取云量时间切片。", "云量时间切片暂不可用，请重试地图数据。", "当前日期没有可用的云量时间切片。"] ) {
    const ruler = render(true, "2026-09-06T12:00:00Z", [], message);
    const tree = JSON.stringify(ruler.root);
    assert.ok(tree.includes(message));
    assert.doesNotMatch(tree, /"暂无数据"/);
  }
  const pending = JSON.stringify(render(true, "", [], "正在读取云量时间切片。").root);
  assert.doesNotMatch(pending, /暂无数据/);
});

test("fractional native progress changes the arc without committing, and own confirmation does not reset settling", () => {
  const ruler = render();
  ruler.scroll.onTouchStart(singleTouch);
  ruler.scroll.onScroll({detail:{scrollLeft:33}}); ruler.rerender();
  const scroll = ruler.root.children.find(child=>child?.type==="scroll")!;
  const first = scroll.children[0]!.children[0]!;
  assert.equal(first.props.style["--ruler-offset"],"0.75px");
  assert.equal(first.props.style["--ruler-opacity"],"0.89");
  assert.deepEqual(ruler.commits,[]);
  scroll.children[0]!.children[1]!.props.onClick();
  const count = ruler.positions.length;
  ruler.rerender({disabled:true});
  ruler.rerender({disabled:false,selectedAt:"2026-09-06T13:00:00Z"});
  assert.equal(ruler.positions.length,count);
  ruler.rerender({selectedAt:"2026-09-06T12:00:00Z"});
  assert.equal(ruler.positions.at(-1),0);
  assert.equal(ruler.positions.length,count+1);
});

test("failed time confirmation restores the committed native position", () => {
  const ruler=render();
  ruler.root.children.find(child=>child?.type==="scroll")!.children[0]!.children[1]!.props.onClick();
  ruler.rerender({disabled:true}); const count=ruler.positions.length;
  ruler.rerender({disabled:false});
  assert.equal(ruler.positions.at(-1),0); assert.equal(ruler.positions.length,count+1);
});
const event = { detail: { scrollLeft: 44 } };
const singleTouch = { touches: [{ identifier: 1 }] };
const twoTouches = { touches: [{ identifier: 1 }, { identifier: 2 }] };

test("adopted shallow arc uses logical pixels and a fixed axis outside the moving track", () => {
  const source = readFileSync(new URL("./time-ruler.tsx", import.meta.url), "utf8");
  const parsed = ts.createSourceFile("ruler.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "rulerPosition")!;
  const project = vm.runInNewContext(ts.transpileModule(declaration.getText(parsed) + "\nrulerPosition;", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText);
  for (const distance of [0, .5, 1, 2, 4, -1]) {
    const actual = project(distance);
    assert.equal(actual.offset, Math.min(12, distance * distance * 3));
    assert.equal(actual.opacity, Math.max(.25, 1 - Math.abs(distance) * .22));
  }
  const ruler = render();
  assert.ok(ruler.root.children.some(child => child?.props?.className === "map-time-ruler__center"));
  assert.match(source, /position\.offset\}px/);
});

test("a second finger cancels preview and cannot submit through scroll completion", t => {
  t.mock.timers.enable({apis:["setTimeout"]});
  for (const phase of ["onTouchStart", "onTouchMove"]) {
    const ruler = render();
    ruler.scroll.onTouchStart(singleTouch);
    ruler.scroll.onScroll(event);
    ruler.scroll[phase](twoTouches);
    ruler.scroll.onScroll(event);
    ruler.scroll.onTouchEnd();ruler.scroll.onScrollEnd(event);
    assert.equal(ruler.cancelled, 1);
    assert.deepEqual(ruler.previews, [1]);
    assert.deepEqual(ruler.commits, []);
    ruler.scroll.onTouchStart(singleTouch);
    ruler.scroll.onScroll(event);
    ruler.scroll.onTouchEnd();ruler.scroll.onScrollEnd(event);
    t.mock.timers.tick(150);
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
    ruler.scroll.onTouchEnd();ruler.scroll.onScrollEnd(event);
    assert.deepEqual(ruler.previews, []);
    assert.deepEqual(ruler.commits, []);
  }
});

test("touching blank ruler space or moving vertically without a scroll cannot submit", t => {
  t.mock.timers.enable({apis:["setTimeout"]});
  const ruler = render();
  ruler.scroll.onTouchStart(singleTouch);
  ruler.scroll.onTouchMove(singleTouch);
  ruler.scroll.onTouchEnd(); ruler.scroll.onDragEnd();
  t.mock.timers.tick(500);
  assert.deepEqual(ruler.previews, []);
  assert.deepEqual(ruler.commits, []);
});

test("touch cancellation rolls back and ignores subsequent momentum completion", () => {
  const ruler = render();
  ruler.scroll.onTouchStart(singleTouch);
  ruler.scroll.onScroll(event);
  assert.deepEqual(ruler.previews, [1]);
  ruler.scroll.onTouchCancel();
  ruler.scroll.onTouchEnd();ruler.scroll.onScrollEnd(event);
  assert.equal(ruler.cancelled, 1);
  assert.deepEqual(ruler.commits, []);
});

test("a completed user scroll commits once", t => {
  t.mock.timers.enable({apis:["setTimeout"]});
  const ruler = render();
  ruler.scroll.onTouchStart(singleTouch);
  ruler.scroll.onScroll(event);
  ruler.scroll.onTouchEnd();ruler.scroll.onScrollEnd(event);
  ruler.scroll.onTouchEnd();ruler.scroll.onScrollEnd(event);
  t.mock.timers.tick(150);
  assert.deepEqual(ruler.commits, [1]);
});

test("the adopted ruler keeps the 66px cadence and omits a duplicate nonempty heading", () => {
  const source = readFileSync(new URL("./time-ruler.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("./index.scss", import.meta.url), "utf8");
  assert.match(source, /const RULER_STEP = 66;/);
  assert.match(styles, /\.map-time-ruler__slice\s*\{[^}]*width:\s*66Px;/s);
  const ruler = render();
  assert.equal(ruler.root.props.className, "map-time-ruler");
  assert.equal(
    ruler.root.children.some((child) => child?.props?.className === "map-time-ruler__heading"),
    false,
  );
  const track = ruler.root.children.find((child) => child?.type === "scroll")!.children[0]!;
  assert.equal(
    track.children.every((slice) => slice.children.some((child) => child?.type === "text")),
    true,
  );
});

test("hide, unmount and changed ruler inputs cancel pending preview", () => {
  for (const action of ["hide", "unmount", "changeInputs"] as const) {
    const ruler = render();
    ruler.scroll.onTouchStart(singleTouch);
    ruler.scroll.onScroll(event);
    ruler[action]();
    ruler.scroll.onTouchEnd();ruler.scroll.onScrollEnd(event);
    assert.equal(ruler.cancelled, 1);
    assert.deepEqual(ruler.commits, []);
  }
});

test('map released native scroll commits once without scrollend and does not fight the drag',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const r=render();
 r.scroll.onTouchStart(singleTouch);r.scroll.onScroll(event);
 t.mock.timers.tick(1000);assert.deepEqual(r.commits,[]);
 assert.equal(r.scroll.scrollLeft,0);
 r.scroll.onTouchEnd();t.mock.timers.tick(150);assert.deepEqual(r.commits,[1]);
 r.scroll.onScrollEnd(event);assert.deepEqual(r.commits,[1]);
});
test('changed map inputs cancel pending inertia submission',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const r=render();
 r.scroll.onTouchStart(singleTouch);r.scroll.onScroll(event);r.scroll.onTouchEnd();r.changeInputs();
 t.mock.timers.tick(1000);assert.deepEqual(r.commits,[]);assert.equal(r.cancelled,1);
});

test('map short drag and cancellation explicitly return to the original native tick',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const r=render();
 r.scroll.onTouchStart(singleTouch);r.scroll.onScroll({detail:{scrollLeft:20}});r.scroll.onTouchEnd();
 t.mock.timers.tick(150);assert.deepEqual(r.commits,[0]);assert.equal(r.positions.at(-1),0);
 const before=r.positions.length;
 r.scroll.onTouchStart(singleTouch);r.scroll.onScroll(event);r.scroll.onTouchCancel();
 assert.equal(r.positions.length,before+1);assert.equal(r.positions.at(-1),0);
});
