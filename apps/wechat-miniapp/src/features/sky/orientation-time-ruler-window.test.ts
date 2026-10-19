import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { clockTimeInTimezone } from "../../utils/zoned-date";
import { createSkyTimeRulerSettlement } from "./sky-time-ruler-settlement";
import { createOrientationRulerLayout } from "./orientation-ruler-layout";
import type { SkyTimeRulerRow } from "./sky-time-presentation";

type Element = { type: string; props: Record<string, any>; children: Element[] };
type Props = { rows: readonly SkyTimeRulerRow[]; activeIndex: number; committedIndex: number;
  presentedAt: string; isPreviewing: boolean; saving?: boolean; playing?: boolean; layoutReady?: boolean; selectionReady?: boolean;
  preparing?: boolean; interactionLocked?: boolean; reducedMotion?: boolean; onEntryReady?: (ready: boolean) => void };

// Run the production component through successive renders. Hook slots persist;
// changed passive effects run in declaration order before their state updates
// trigger another render. The real native-position owner runs against delayed
// node/offset callbacks; command return and actual offset remain separate.
function rulerFixture(initial: Props, windowWidth = 750, deferNative = false, deferPosition = false, sourceText?: string) {
  const source = ts.createSourceFile("sky.tsx", sourceText ?? readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ["clampIndex", "orientationRulerStepPx", "orientationRulerLabel", "orientationRulerDistance",
    "formatTime", "formatTimeWithSeconds", "OrientationTimeRuler"];
  const declarations = names.map(name => {
    const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert(declaration, name); return declaration.getText(source);
  });
  const step = source.statements.filter(ts.isVariableStatement).find(statement =>
    statement.declarationList.declarations.some(declaration => declaration.name.getText(source) === "ORIENTATION_RULER_STEP_RPX"));
  assert(step);
  const slots: any[] = [], positions: number[] = [], previews: number[] = [], commits: number[] = [], scrubs: boolean[] = [];
  const nextTicks: Array<() => void> = [], layoutReads: Array<(values: readonly unknown[]) => void> = [];
  const nodeReads: Array<(values: readonly unknown[]) => void> = [], offsetReads: Array<(values: readonly unknown[]) => void> = [];
  let measurementCount = 0, nextTickCount = 0;
  const createSelectorQuery = () => {
    let kind = "offset";
    const query = { select() { return query; }, boundingClientRect() { kind = "layout"; return query; },
      scrollOffset() { return query; }, node() { kind = "node"; return query; },
      exec(callback: (values: readonly unknown[]) => void) {
        if (kind === "layout") { measurementCount++; layoutReads.push(callback); }
        else (kind === "node" ? nodeReads : offsetReads).push(callback);
      } };
    return query;
  };
  let cursor = 0, dirty = false, tree: Element, props = initial, cancels = 0;
  let nativeLeft = 0, installedRows = "", installedScrollLeft: number | undefined;
  let nativeAnimationTarget: number | null = null;
  const nativeCommands: Array<{ left: number; animated: boolean }> = [];
  const nativePositionSource = readFileSync(new URL("../../components/ruler-scroll-position.ts", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace("export function", "function");
  const platform = { getSystemInfoSync: () => ({ windowWidth }),
    nextTick: (callback: () => void) => { nextTickCount++; nextTicks.push(callback); }, createSelectorQuery };
  const createRulerScrollPosition = vm.runInNewContext(ts.transpileModule(nativePositionSource + "\ncreateRulerScrollPosition;",
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { Taro: platform, setTimeout, clearTimeout, Date });
  let effects: Array<{ index: number; create: () => void | (() => void) }> = [];
  let hide = () => {}, show = () => {}, resize = () => {};
  const changed = (before: readonly unknown[] | undefined, next: readonly unknown[] | undefined) =>
    !before || !next || before.length !== next.length || next.some((value, index) => !Object.is(value, before[index]));
  const memo = (make: () => unknown, deps: readonly unknown[]) => {
    const index = cursor++, old = slots[index];
    if (!old || changed(old.deps, deps)) slots[index] = { value: make(), deps };
    return slots[index].value;
  };
  const component = vm.runInNewContext(ts.transpileModule([step.getText(source), ...declarations, "OrientationTimeRuler;"].join("\n"),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText, {
    React: { createElement: (type: string, elementProps: object, ...children: unknown[]) =>
      ({ type, props: elementProps, children: children.flat() }) },
    View: "view", Text: "text", Button: "button", ScrollView: "scroll", SoftButton: "soft",
    Taro: platform, clockTimeInTimezone, createOrientationRulerLayout,
    createSkyTimeRulerSettlement, createRulerScrollPosition,
    useState: (initialValue: unknown) => {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initialValue === "function" ? initialValue() : initialValue,
        set: (next: unknown) => {
          const value = typeof next === "function" ? next(slots[index].value) : next;
          if (!Object.is(slots[index].value, value)) { slots[index].value = value; dirty = true; }
        } };
      return [slots[index].value, slots[index].set];
    },
    useRef: (value: unknown) => slots[cursor++] ??= { current: value },
    useCallback: (callback: () => unknown, deps: readonly unknown[]) => memo(() => callback, deps),
    useEffect: (create: () => void | (() => void), deps?: readonly unknown[]) => {
      const index = cursor++, old = slots[index];
      if (!old || changed(old.deps, deps)) {
        effects.push({ index, create }); slots[index] = { deps, cleanup: old?.cleanup };
      }
    },
    useDidHide: (callback: () => void) => { hide = callback; },
    useDidShow: (callback: () => void) => { show = callback; },
    useResize: (callback: () => void) => { resize = callback; },
  });
  const nativeNode = { scrollTo: ({ left, animated }: { left: number; animated: boolean }) => {
    positions.push(left); nativeCommands.push({ left, animated });
    if (deferPosition || animated) nativeAnimationTarget = left;
    else { nativeLeft = left; nativeAnimationTarget = null; }
  } };
  const drainNative = () => {
    while (nodeReads.length || offsetReads.length) {
      while (nodeReads.length) nodeReads.shift()!([{ node: nativeNode }]);
      while (offsetReads.length) offsetReads.shift()!([{ scrollLeft: nativeLeft }]);
    }
  };
  const nativeReady = () => {
    const rowIdentity = props.rows.map(row => row.at).join("|");
    // A native child replacement may reset the live position. An unchanged
    // declarative prop is not a new command. Taro's update completion runs
    // after React effects, before the queued nextTick node operations.
    if (rowIdentity !== installedRows) nativeLeft = 0;
    installedRows = rowIdentity;
    const scroll = tree.children.find(child => child?.type === "scroll")?.props;
    const left = scroll?.scrollLeft;
    if (left !== undefined && !Object.is(left, installedScrollLeft)) {
      // ScrollView's documented animation applies to declarative positioning
      // too. Before that animation finishes, native zero is still observable;
      // an explicit animated:false scrollTo can supersede it independently.
      if (scroll?.scrollWithAnimation) nativeAnimationTarget = left;
      else { nativeLeft = left; nativeAnimationTarget = null; }
    }
    installedScrollLeft = left;
    while (nextTicks.length) nextTicks.shift()!();
    drainNative();
  };
  const renderComponent = () => {
    cursor = 0; dirty = false; effects = [];
    tree = component({ ...props, timezone: "Asia/Shanghai", saving: props.saving ?? false, reducedMotion: props.reducedMotion ?? false,
      onPreview: (index: number) => previews.push(index), onCommit: (index: number) => commits.push(index),
      onCancel: () => { cancels++; }, onScrubChange: (active: boolean) => scrubs.push(active) });
  };
  const flush = () => {
    let renders = 0;
    do {
      do {
        assert(++renders < 20, "component effects converge");
        renderComponent();
        for (const effect of effects) slots[effect.index].cleanup?.();
        for (const effect of effects) slots[effect.index].cleanup = effect.create();
      } while (dirty);
      if (!deferNative) nativeReady();
    } while (dirty);
  };
  flush();
  return {
    positions, previews, commits, scrubs, nativeCommands,
    get cancels() { return cancels; },
    get nativeLeft() { return nativeLeft; },
    get nativeAnimationTarget() { return nativeAnimationTarget; },
    get measurementCount() { return measurementCount; },
    get nextTickCount() { return nextTickCount; },
    get scroll() { return tree.children.find(child => child?.type === "scroll")!.props; },
    get positionState() { return tree.children.find(child => child?.props.className === "sky-orientation-time-ruler__position-state"); },
    get cancel() { return tree.children.find(child => child?.type === "soft")!.props; },
    render(next: Props) { props = next; flush(); }, flush, nativeReady,
    renderBeforeEffects(next: Props) { props = next; renderComponent();
      return tree.children.find(child => child?.type === "scroll")!.props; },
    arrive(left: number) { nativeLeft = left; nativeAnimationTarget = null;
      tree.children.find(child => child?.type === "scroll")!.props.onScroll({ detail: { scrollLeft: left } }); flush(); },
    readOffset(values?: any[]) { offsetReads.shift()?.(values ?? [{ scrollLeft: nativeLeft }]); },
    takeNodeRead() { return nodeReads.shift(); },
    hide() { hide(); flush(); }, show() { show(); flush(); },
    resize() { resize(); flush(); },
    takeLayoutRead() { while (nextTicks.length) nextTicks.shift()!(); return layoutReads.shift(); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

const rowsFor = (start: string): SkyTimeRulerRow[] => Array.from({ length: 49 }, (_, index) =>
  ({ at: new Date(Date.parse(start) + index * 30 * 60_000).toISOString() }));
const original = rowsFor("2026-10-18T04:00:00.000Z");
const previous = rowsFor("2026-10-17T04:00:00.000Z");
const earlier = rowsFor("2026-10-16T04:00:00.000Z");
const committedAt = "2026-10-18T20:30:17.123Z";
const windowProps = (rows: readonly SkyTimeRulerRow[], at: string, committed = committedAt): Props => {
  // These are the page's supplied-row semantics: exact committed row or -1,
  // and the latest real row at/before the actual observation-time intention.
  const committedIndex = rows.findIndex(row => row.at === committed);
  const activeIndex = rows.reduce((index, row, position) => Date.parse(row.at) <= Date.parse(at) ? position : index, committedIndex);
  return { rows, activeIndex, committedIndex, presentedAt: at, isPreviewing: at !== committed };
};
const stepPx = 34;
const one = { touches: [{ identifier: 1 }] };

test("equal-length geometry windows follow the selected real row even when the committed instant is outside", () => {
  const r = rulerFixture(windowProps(original, committedAt));
  const at = "2026-10-17T20:30:17.123Z", next = windowProps(previous, at);
  assert.equal(next.activeIndex, 33); assert.equal(next.committedIndex, -1);
  r.render(next);
  assert.equal(r.nativeLeft, 33 * stepPx, "the new window must retain its selected row, not clamp missing committed time to row zero");
  assert.equal(r.scroll["aria-valuenow"], 33);
  assert.equal(r.positions.at(-1), 33 * stepPx, "native and declarative positions have the same owner");
  r.render(windowProps(earlier, "2026-10-16T20:30:17.123Z"));
  assert.equal(r.nativeLeft, 33 * stepPx); assert.equal(r.positions.at(-1), 33 * stepPx);
  assert.equal(r.cancels, 0, "a new supplied window does not cancel a non-drag preview");
  r.unmount();
});

test("cancel restores the committed window when its precise instant lies between supplied ticks", () => {
  const r = rulerFixture(windowProps(previous, "2026-10-17T20:30:17.123Z"));
  r.cancel.onClick();
  r.render(windowProps(original, committedAt));
  assert.equal(r.cancels, 1); assert.deepEqual(r.commits, []);
  assert.equal(r.nativeLeft, 33 * stepPx, "restoration follows the original window's actual active row");
  assert.equal(r.scroll["aria-valuenow"], 33); assert.equal(r.positions.at(-1), 33 * stepPx);
  r.unmount();
});

test("48-row report and 49-row geometry keep the final native command aligned through cancellation", () => {
  const reportRows = original.slice(0, 48), at = reportRows[33]!.at;
  const r = rulerFixture(windowProps(reportRows, at, at));
  r.render(windowProps(previous, previous[33]!.at, at));
  assert.equal(r.nativeLeft, 33 * stepPx);
  assert.equal(r.positions.at(-1), 33 * stepPx, "a batched equal final scrollLeft cannot undo a stale native command");
  r.cancel.onClick(); r.render(windowProps(reportRows, at, at));
  assert.equal(r.cancels, 1); assert.equal(r.positions.at(-1), 33 * stepPx);
  assert.equal(r.nativeLeft, 33 * stepPx); assert.deepEqual(r.commits, []);
  r.unmount();
});

test("same-row playback adds no native commands and ruler lifecycle follows the supplied time owner", () => {
  const exact = original[20]!.at;
  const props = { ...windowProps(original, original[33]!.at, exact), playing: true };
  const r = rulerFixture(props), initialCommands = r.positions.length;
  for (let index = 1; index <= 120; index++) r.render({ ...props, rows: original.map(row => ({ ...row })),
    presentedAt: new Date(Date.parse(props.presentedAt) + index * 16).toISOString() });
  assert.equal(r.positions.length, initialCommands, "same row identities/index do not add per-frame imperative scroll work");
  // The page/observation-time owner decides whether hiding cancels or pauses.
  // With no ruler drag, this component must follow whichever time it supplies.
  r.render({ ...props, playing: false }); r.hide(); r.show();
  assert.equal(r.nativeLeft, 33 * stepPx); assert.equal(r.positions.at(-1), 33 * stepPx);
  assert.equal(r.cancels, 0, "an inactive ruler does not replace the page's lifecycle decision");
  r.render(windowProps(original, exact, exact));
  r.show();
  assert.equal(r.nativeLeft, 20 * stepPx); assert.equal(r.positions.at(-1), 20 * stepPx,
    "the page's cancellation returns both positions to the committed row");
  r.render({ ...props, committedIndex: 33, isPreviewing: false, playing: false });
  assert.equal(r.nativeLeft, 33 * stepPx); assert.deepEqual(r.previews, []); assert.deepEqual(r.commits, []);
  r.unmount();
});

test("drag owns fractional position until a changed supply retires it and ignores late settlement", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const props = windowProps(original, original[20]!.at, original[20]!.at);
  const r = rulerFixture(props), commands = r.positions.length;
  r.scroll.onTouchStart(one); r.scroll.onScroll({ detail: { scrollLeft: 21.25 * stepPx } }); r.flush();
  r.render({ ...props, activeIndex: 21, presentedAt: original[21]!.at, isPreviewing: true });
  assert.equal(r.scroll["aria-valuenow"], 21); assert.equal(r.positions.length, commands, "external following must not seize a held drag");
  r.scroll.onTouchEnd();
  r.render(windowProps(previous, previous[21]!.at, original[20]!.at));
  assert.equal(r.cancels, 1); assert.deepEqual(r.scrubs, [true, false]);
  r.scroll.onScroll({ detail: { scrollLeft: 40 * stepPx } }); r.scroll.onScrollEnd();
  t.mock.timers.tick(1000); assert.deepEqual(r.commits, []);
  r.render(props);
  assert.equal(r.positions.at(-1), 20 * stepPx); assert.equal(r.nativeLeft, 20 * stepPx);
  r.unmount();
});

const nativeSample = [{ left: 194.7, width: 1 }, { left: -396, width: 17 },
  { left: -379, width: 17 }, { scrollLeft: 583.200012 }];
const near = (actual: number, expected: number, message = `${actual} != ${expected}`) => assert.ok(Math.abs(actual - expected) < 1e-9, message);

test("entry observes its selected native position before its first ticks become visible", () => {
  const props = windowProps(original, original[33]!.at, original[33]!.at);
  const ready: boolean[] = [];
  const r = rulerFixture({ ...props, preparing: true, onEntryReady: value => ready.push(value) }, 390, false, true);
  assert.equal(r.positions.length, 0, "transparent unscaled preparation must not send a nominal scroll");
  assert.equal(r.scroll.scrollLeft, undefined, "React is not a second positioning writer");
  assert.equal(r.scroll.scrollWithAnimation, undefined);
  assert.equal(r.scroll.style.visibility, "hidden");
  r.takeLayoutRead()!(nativeSample); r.flush();
  near(r.nativeCommands.at(-1)!.left, 561.500012);
  assert.equal(r.nativeCommands.at(-1)!.animated, false, "the native entry command cannot traverse unrelated times");
  assert.equal(r.scroll.style.visibility, "hidden", "command return and a still-old actual offset do not reveal ticks");
  assert.equal(r.positionState?.children[0], "时间尺定位中，重试", "an early old offset is pending, not unavailable");
  assert.deepEqual(ready, [true], "six fields can be revealed even if the ruler offset is still pending");
  r.render({ ...props, layoutReady: false, onEntryReady: value => ready.push(value) });
  r.arrive(561.4222412109375);
  assert.equal(r.scroll.style.visibility, "visible", "the native event can qualify measured indicator overlap during the reveal");
  assert.deepEqual(r.previews, []); assert.deepEqual(r.commits, [], "program positioning is not a time intention");
  r.unmount();
});

test("missing entry layout exposes a recoverable ruler state and a later retry uses the same native owner", () => {
  const ready: boolean[] = [], props = { ...windowProps(original, original[33]!.at, original[33]!.at),
    preparing: true, onEntryReady: (value: boolean) => ready.push(value) };
  const r = rulerFixture(props, 390);
  r.takeLayoutRead()!([]); assert.deepEqual(ready, [], "a first uninstalled layout is not failure");
  r.takeLayoutRead()!([]); r.flush();
  assert.deepEqual(ready, [true], "six-field disclosure can open with the bounded failure");
  assert.equal(r.positionState?.children[0], "时间尺暂不可用，重试");
  assert.equal(r.positions.length, 0, "missing native layout does not display a guessed target");
  r.positionState!.props.onClick(); r.flush();
  r.takeLayoutRead()!(nativeSample); r.flush();
  near(r.nativeLeft, 561.500012);
  assert.equal(r.scroll.style.visibility, "visible");
  assert.equal(r.positionState, undefined); assert.deepEqual(r.commits, []);
  r.unmount();
});

test("pending geometry does not hide the six-field entry and a changed selection cannot expose an old tick during reveal", () => {
  const ready: boolean[] = [], props = windowProps(original, original[33]!.at, original[33]!.at);
  const waiting = rulerFixture({ ...props, selectionReady: false, preparing: true, onEntryReady: value => ready.push(value) }, 390);
  assert.deepEqual(ready, [true]); assert.equal(waiting.scroll.style.visibility, "hidden");
  assert.deepEqual(waiting.positions, []); waiting.unmount();
  const r = rulerFixture({ ...props, preparing: true }, 390);
  r.takeLayoutRead()!(nativeSample); r.flush(); assert.equal(r.scroll.style.visibility, "visible");
  r.render({ ...props, activeIndex: 32, layoutReady: false });
  assert.equal(r.scroll.style.visibility, "hidden", "new digits cannot reuse the old selected tick before their command is admitted");
  r.render({ ...props, activeIndex: 32, layoutReady: true });
  r.takeLayoutRead()!(nativeSample); r.flush();
  assert.equal(r.scroll.style.visibility, "visible"); near(r.nativeLeft, 544.500012);
  r.unmount();
});

test("new entry targets and lifecycle retirement reject late position receipts", () => {
  const props = { ...windowProps(original, original[33]!.at, original[33]!.at), preparing: true };
  for (const boundary of ["target", "gesture", "closing", "hide", "unmount"] as const) {
    const ready: boolean[] = [], r = rulerFixture({ ...props, onEntryReady: value => ready.push(value) }, 390, true);
    r.nativeReady(); r.takeLayoutRead()!(nativeSample);
    const late = r.takeNodeRead()!;
    assert(late, "the real position owner's node callback is pending");
    if (boundary === "target") r.render({ ...props, activeIndex: 32, onEntryReady: value => ready.push(value) });
    else if (boundary === "gesture") r.scroll.onTouchStart(one);
    else if (boundary === "closing") r.render({ ...props, layoutReady: false, interactionLocked: true,
      onEntryReady: value => ready.push(value) });
    else r[boundary]();
    let commands = 0;
    late([{ node: { scrollTo() { commands++; } } }]);
    assert.equal(commands, 0, boundary);
    assert(!ready.includes(true), `${boundary} cannot publish the retired receipt`);
    r.unmount();
  }
});

test("an old installed offset cannot admit replacement rows before their native update", () => {
  const props = windowProps(original, original[33]!.at, original[33]!.at);
  const r = rulerFixture(props, 390, true);
  r.nativeReady(); r.takeLayoutRead()!(nativeSample); r.nativeReady(); r.flush();
  assert.equal(r.scroll.style.visibility, "visible");
  const oldLeft = r.nativeLeft, commands = r.positions.length;
  r.render(windowProps(previous, previous[33]!.at, original[33]!.at));
  assert.equal(r.positions.length, commands, "the new native update has not been crossed");
  assert.equal(r.scroll.style.visibility, "hidden");
  r.scroll.onScroll({ detail: { scrollLeft: oldLeft } });
  r.readOffset([{ scrollLeft: oldLeft }]); r.flush();
  assert.equal(r.scroll.style.visibility, "hidden", "an old offset matching the new index is still from the old installation");
  r.nativeReady(); r.flush();
  assert.equal(r.scroll.style.visibility, "visible", "the current native command and observed position can admit the replacement");
  r.unmount();
});

test("an uninstalled A to B to A replacement cannot reuse A's old native installation", () => {
  const props = windowProps(original, original[33]!.at, original[33]!.at);
  const r = rulerFixture(props, 390, true);
  r.nativeReady(); r.takeLayoutRead()!(nativeSample); r.nativeReady(); r.flush();
  r.render(windowProps(previous, previous[33]!.at, original[33]!.at));
  r.render(props);
  assert.equal(r.takeNodeRead(), undefined, "returning to the old row identity still waits for the latest child update");
  assert.equal(r.scroll.style.visibility, "hidden");
  r.nativeReady(); r.flush();
  assert.equal(r.scroll.style.visibility, "visible");
  r.unmount();
});

test("an A to B to A render cannot expose retired ticks before passive effects", () => {
  const props = windowProps(original, original[33]!.at, original[33]!.at);
  const r = rulerFixture(props, 390, true);
  r.nativeReady(); r.takeLayoutRead()!(nativeSample); r.nativeReady(); r.flush();
  assert.equal(r.scroll.style.visibility, "visible");
  const next = windowProps(previous, previous[33]!.at, original[33]!.at);
  assert.equal(r.renderBeforeEffects(next).style.visibility, "hidden");
  assert.equal(r.renderBeforeEffects(props).style.visibility, "hidden",
    "retiring the native installation must hide ticks in render, before effects can retire the old alignment state");
  r.unmount();
});

test("an established window has one native motion owner while drag and reduced motion stay direct", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const props = windowProps(original, original[33]!.at, original[33]!.at), r = rulerFixture(props, 390);
  r.takeLayoutRead()!(nativeSample); r.flush();
  const before = r.nextTickCount;
  r.render({ ...props, activeIndex: 34 });
  assert.equal(r.nativeCommands.at(-1)!.animated, true);
  assert.equal(r.scroll.scrollLeft, undefined); assert.equal(r.scroll.scrollWithAnimation, undefined);
  r.arrive(578.500012);
  r.scroll.onTouchStart(one); r.scroll.onScroll({ detail: { scrollLeft: 580.200012 } }); r.scroll.onTouchEnd();
  t.mock.timers.tick(150); r.flush();
  assert.equal(r.nextTickCount, before, "the installed-window snap adds no nextTick wait");
  assert.deepEqual(r.commits, [34]);
  r.render({ ...props, activeIndex: 32, reducedMotion: true });
  assert.equal(r.nativeCommands.at(-1)!.animated, false); r.unmount();
});

test("surface scale entry cannot qualify scroll units; its endpoint measures once and retires an older read", () => {
  const props = windowProps(original, original[33]!.at, original[33]!.at);
  const r = rulerFixture({ ...props, layoutReady: false }, 390);
  assert.equal(r.takeLayoutRead(), undefined, "opening must not observe a scaled rect");
  near(r.nativeLeft, 0, "no nominal declarative writer is installed during a scaled opening");
  r.render({ ...props, layoutReady: true });
  const old = r.takeLayoutRead()!;
  r.render({ ...props, layoutReady: false, interactionLocked: true });
  old(nativeSample); r.flush();
  near(r.nativeLeft, 0, "an endpoint from the retired disclosure cannot rebase its replacement");
  assert.equal(r.takeLayoutRead(), undefined);
  r.render({ ...props, layoutReady: true });
  r.takeLayoutRead()!(nativeSample); r.flush();
  near(r.nativeLeft, 561.500012);
  assert.equal(r.measurementCount, 2);
  r.unmount();
});

test("production ruler corrects native cadence and uses it for fractional drag and window restoration", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const props = windowProps(original, original[33]!.at, original[33]!.at);
  const r = rulerFixture(props, 390);
  near(r.nativeLeft, 583.44, "nominal conversion before layout");
  r.takeLayoutRead()!(nativeSample); r.flush();
  near(r.nativeLeft, 561.500012); near(r.positions.at(-1)!, 561.500012);
  const beforeDragTicks = r.nextTickCount;
  r.scroll.onTouchStart(one); r.scroll.onScroll({ detail: { scrollLeft: 565.750012 } }); r.flush();
  near(r.previews.at(-1)!, 33.25);
  r.scroll.onTouchEnd(); t.mock.timers.tick(150); r.flush();
  assert.deepEqual(r.commits, [33]); near(r.positions.at(-1)!, 561.500012);
  assert.equal(r.nextTickCount, beforeDragTicks, "snapping installed rows does not add a nextTick wait");
  const beforePlayback = r.measurementCount;
  for (let frame = 1; frame <= 120; frame++) r.render({ ...props, playing: true,
    presentedAt: new Date(Date.parse(props.presentedAt) + frame * 16).toISOString() });
  assert.equal(r.takeLayoutRead(), undefined); assert.equal(r.measurementCount, beforePlayback);
  r.render(windowProps(previous, previous[33]!.at, original[33]!.at));
  r.takeLayoutRead()!(nativeSample); r.flush();
  near(r.positions.at(-1)!, 561.500012);
  r.cancel.onClick(); r.render(props);
  r.takeLayoutRead()!(nativeSample); r.flush();
  near(r.positions.at(-1)!, 561.500012); near(r.nativeLeft, 561.500012);
  r.unmount();
});

test("window replacement retains measured cadence and positions the installed native rows after cancellation", () => {
  const props = windowProps(original, original[33]!.at, original[33]!.at);
  const r = rulerFixture(props, 390);
  r.takeLayoutRead()!(nativeSample); r.flush();
  near(r.nativeLeft, 561.500012);
  r.render(windowProps(previous, previous[33]!.at, original[33]!.at));
  near(r.nativeLeft, 561.500012, "time identities do not change an already measured tick cadence");
  near(r.nativeLeft, 561.500012, "the command must follow the native row replacement even when the prop is unchanged");
  r.takeLayoutRead()!([]); r.takeLayoutRead()!([]); r.flush();
  near(r.nativeLeft, 561.500012, "a missing replacement read must not discard the last valid layout");
  r.cancel.onClick(); r.render(props);
  near(r.nativeLeft, 561.500012);
  near(r.nativeLeft, 561.500012, "the transient missing committed row must not leave the restored native window at zero");
  r.unmount();
});

test("waiting for a selected geometry window never positions an unrelated first or last row", () => {
  const props = windowProps(original, original[33]!.at, original[33]!.at);
  const r = rulerFixture(props, 390);
  r.takeLayoutRead()!(nativeSample); r.flush();
  const at = previous[33]!.at, commands = r.positions.length;
  r.render({ ...windowProps(original, at, original[33]!.at), selectionReady: false });
  near(r.nativeLeft, 561.500012); near(r.nativeLeft, 561.500012);
  assert.equal(r.scroll["aria-valuenow"], 33, "the old window's selected marker also remains at its valid displayed time");
  assert.equal(r.positions.length, commands, "the old window's clamped first row is not the selected time");
  r.render(windowProps(previous, at, original[33]!.at));
  near(r.nativeLeft, 561.500012);
  const beforeCancel = r.positions.length;
  r.cancel.onClick();
  assert.equal(r.positions.length, beforeCancel, "a missing committed tick cannot produce an intermediate zero command");
  r.render({ ...windowProps(previous, original[33]!.at, original[33]!.at), selectionReady: false });
  near(r.nativeLeft, 561.500012); near(r.nativeLeft, 561.500012);
  assert.equal(r.scroll["aria-valuenow"], 33);
  assert.equal(r.positions.length, beforeCancel, "the previous day's final row cannot impersonate the restored instant");
  r.render(props);
  near(r.nativeLeft, 561.500012); assert.equal(r.cancels, 1);
  r.unmount();
});

test("deferred native targets are retired by a new gesture, closing, resize, hide and unmount", () => {
  const props = windowProps(original, original[33]!.at, original[33]!.at);
  for (const boundary of ["gesture", "closing", "resize", "hide", "unmount"] as const) {
    const r = rulerFixture(props, 390, true);
    assert.equal(r.positions.length, 0, "React effects cannot command an uninstalled native row");
    if (boundary === "gesture") r.scroll.onTouchStart(one);
    else if (boundary === "closing") r.render({ ...props, layoutReady: false });
    else r[boundary]();
    r.nativeReady();
    assert.equal(r.positions.length, 0, boundary);
    r.unmount();
  }
});

test("late layout cannot take a drag, hide, replacement or unmounted component; resize recovers after release", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const props = windowProps(original, original[33]!.at, original[33]!.at);
  const r = rulerFixture(props, 390), late = r.takeLayoutRead()!;
  r.scroll.onTouchStart(one); const heldCommands = r.positions.length;
  late(nativeSample); r.flush();
  assert.equal(r.positions.length, heldCommands);
  r.scroll.onTouchEnd(); r.takeLayoutRead()!(nativeSample); r.flush();
  r.scroll.onTouchStart(one); r.resize(); const resizeCommands = r.positions.length;
  assert.equal(r.takeLayoutRead(), undefined, "no layout query while the original settlement owns the drag");
  r.scroll.onScroll({ detail: { scrollLeft: 565.750012 } }); r.flush();
  near(r.previews.at(-1)!, 33.25); assert.equal(r.positions.length, resizeCommands);
  r.scroll.onTouchEnd(); t.mock.timers.tick(150); r.flush();
  assert.deepEqual(r.commits, [33], "resize cannot discard the held projection before converting its final offset");
  near(r.previews.at(-1)!, 33.25);
  const resized = r.takeLayoutRead()!;
  resized([{ left: 194.7, width: 1 }, { left: -396, width: 17.25 },
    { left: -378.75, width: 17.25 }, { scrollLeft: 583.075012 }]); r.flush();
  near(r.positions.at(-1)!, 569.750012);
  r.resize(); const hidden = r.takeLayoutRead()!; r.hide(); const afterHide = r.positions.length;
  hidden(nativeSample); r.flush(); assert.equal(r.positions.length, afterHide);
  r.show(); const replaced = r.takeLayoutRead()!;
  r.render(windowProps(previous, previous[33]!.at, original[33]!.at)); const afterReplace = r.positions.length;
  replaced(nativeSample); r.flush(); assert.equal(r.positions.length, afterReplace);
  const unmounted = r.takeLayoutRead()!; r.unmount(); const afterUnmount = r.positions.length;
  unmounted(nativeSample); assert.equal(r.positions.length, afterUnmount);
});
