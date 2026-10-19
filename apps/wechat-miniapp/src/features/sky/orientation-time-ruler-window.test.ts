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
  presentedAt: string; isPreviewing: boolean; saving?: boolean; playing?: boolean; layoutReady?: boolean };

// Run the production component through successive renders. Hook slots persist;
// changed passive effects run in declaration order before their state updates
// trigger another render. Native commands are observed independently of the
// declarative scrollLeft prop: equal props do not undo an imperative scrollTo.
function rulerFixture(initial: Props, windowWidth = 750) {
  const source = ts.createSourceFile("sky.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
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
  let measurementCount = 0;
  const query = { select() { return query; }, boundingClientRect() { return query; }, scrollOffset() { return query; },
    exec(callback: (values: readonly unknown[]) => void) { measurementCount++; layoutReads.push(callback); } };
  let cursor = 0, dirty = false, tree: Element, props = initial, cancels = 0;
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
    Taro: { getSystemInfoSync: () => ({ windowWidth }), nextTick: (callback: () => void) => nextTicks.push(callback),
      createSelectorQuery: () => query }, clockTimeInTimezone, createOrientationRulerLayout,
    createSkyTimeRulerSettlement, createRulerScrollPosition: () => ({ move: (value: number) => positions.push(value), cancel() {} }),
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
  const flush = () => {
    let renders = 0;
    do {
      assert(++renders < 20, "component effects converge");
      cursor = 0; dirty = false; effects = [];
      tree = component({ ...props, timezone: "Asia/Shanghai", saving: props.saving ?? false, reducedMotion: false,
        onPreview: (index: number) => previews.push(index), onCommit: (index: number) => commits.push(index),
        onCancel: () => { cancels++; }, onScrubChange: (active: boolean) => scrubs.push(active) });
      for (const effect of effects) slots[effect.index].cleanup?.();
      for (const effect of effects) slots[effect.index].cleanup = effect.create();
    } while (dirty);
  };
  flush();
  return {
    positions, previews, commits, scrubs,
    get cancels() { return cancels; },
    get measurementCount() { return measurementCount; },
    get scroll() { return tree.children.find(child => child?.type === "scroll")!.props; },
    get cancel() { return tree.children.find(child => child?.type === "soft")!.props; },
    render(next: Props) { props = next; flush(); }, flush,
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
  assert.equal(r.scroll.scrollLeft, 33 * stepPx, "the new window must retain its selected row, not clamp missing committed time to row zero");
  assert.equal(r.scroll["aria-valuenow"], 33);
  assert.equal(r.positions.at(-1), 33 * stepPx, "native and declarative positions have the same owner");
  r.render(windowProps(earlier, "2026-10-16T20:30:17.123Z"));
  assert.equal(r.scroll.scrollLeft, 33 * stepPx); assert.equal(r.positions.at(-1), 33 * stepPx);
  assert.equal(r.cancels, 0, "a new supplied window does not cancel a non-drag preview");
  r.unmount();
});

test("cancel restores the committed window when its precise instant lies between supplied ticks", () => {
  const r = rulerFixture(windowProps(previous, "2026-10-17T20:30:17.123Z"));
  r.cancel.onClick();
  r.render(windowProps(original, committedAt));
  assert.equal(r.cancels, 1); assert.deepEqual(r.commits, []);
  assert.equal(r.scroll.scrollLeft, 33 * stepPx, "restoration follows the original window's actual active row");
  assert.equal(r.scroll["aria-valuenow"], 33); assert.equal(r.positions.at(-1), 33 * stepPx);
  r.unmount();
});

test("48-row report and 49-row geometry keep the final native command aligned through cancellation", () => {
  const reportRows = original.slice(0, 48), at = reportRows[33]!.at;
  const r = rulerFixture(windowProps(reportRows, at, at));
  r.render(windowProps(previous, previous[33]!.at, at));
  assert.equal(r.scroll.scrollLeft, 33 * stepPx);
  assert.equal(r.positions.at(-1), 33 * stepPx, "a batched equal final scrollLeft cannot undo a stale native command");
  r.cancel.onClick(); r.render(windowProps(reportRows, at, at));
  assert.equal(r.cancels, 1); assert.equal(r.positions.at(-1), 33 * stepPx);
  assert.equal(r.scroll.scrollLeft, 33 * stepPx); assert.deepEqual(r.commits, []);
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
  assert.equal(r.scroll.scrollLeft, 33 * stepPx); assert.equal(r.positions.at(-1), 33 * stepPx);
  assert.equal(r.cancels, 0, "an inactive ruler does not replace the page's lifecycle decision");
  r.render(windowProps(original, exact, exact));
  r.show();
  assert.equal(r.scroll.scrollLeft, 20 * stepPx); assert.equal(r.positions.at(-1), 20 * stepPx,
    "the page's cancellation returns both positions to the committed row");
  r.render({ ...props, committedIndex: 33, isPreviewing: false, playing: false });
  assert.equal(r.scroll.scrollLeft, 33 * stepPx); assert.deepEqual(r.previews, []); assert.deepEqual(r.commits, []);
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
  assert.equal(r.positions.at(-1), 20 * stepPx); assert.equal(r.scroll.scrollLeft, 20 * stepPx);
  r.unmount();
});

const nativeSample = [{ left: 194.7, width: 1 }, { left: -396, width: 17 },
  { left: -379, width: 17 }, { scrollLeft: 583.200012 }];
const near = (actual: number, expected: number, message = `${actual} != ${expected}`) => assert.ok(Math.abs(actual - expected) < 1e-9, message);

test("surface scale entry cannot qualify scroll units; its endpoint measures once and retires an older read", () => {
  const props = windowProps(original, original[33]!.at, original[33]!.at);
  const r = rulerFixture({ ...props, layoutReady: false }, 390);
  assert.equal(r.takeLayoutRead(), undefined, "opening must not observe a scaled rect");
  near(r.scroll.scrollLeft, 583.44);
  r.render({ ...props, layoutReady: true });
  const old = r.takeLayoutRead()!;
  r.render({ ...props, layoutReady: false });
  old(nativeSample); r.flush();
  near(r.scroll.scrollLeft, 583.44, "an endpoint from the retired disclosure cannot rebase its replacement");
  assert.equal(r.takeLayoutRead(), undefined);
  r.render({ ...props, layoutReady: true });
  r.takeLayoutRead()!(nativeSample); r.flush();
  near(r.scroll.scrollLeft, 561.500012);
  assert.equal(r.measurementCount, 2);
  r.unmount();
});

test("production ruler corrects native cadence and uses it for fractional drag and window restoration", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const props = windowProps(original, original[33]!.at, original[33]!.at);
  const r = rulerFixture(props, 390);
  near(r.scroll.scrollLeft, 583.44, "nominal conversion before layout");
  r.takeLayoutRead()!(nativeSample); r.flush();
  near(r.scroll.scrollLeft, 561.500012); near(r.positions.at(-1)!, 561.500012);
  r.scroll.onTouchStart(one); r.scroll.onScroll({ detail: { scrollLeft: 565.750012 } }); r.flush();
  near(r.previews.at(-1)!, 33.25);
  r.scroll.onTouchEnd(); t.mock.timers.tick(150); r.flush();
  assert.deepEqual(r.commits, [33]); near(r.positions.at(-1)!, 561.500012);
  const beforePlayback = r.measurementCount;
  for (let frame = 1; frame <= 120; frame++) r.render({ ...props, playing: true,
    presentedAt: new Date(Date.parse(props.presentedAt) + frame * 16).toISOString() });
  assert.equal(r.takeLayoutRead(), undefined); assert.equal(r.measurementCount, beforePlayback);
  r.render(windowProps(previous, previous[33]!.at, original[33]!.at));
  r.takeLayoutRead()!(nativeSample); r.flush();
  near(r.positions.at(-1)!, 561.500012);
  r.cancel.onClick(); r.render(props);
  r.takeLayoutRead()!(nativeSample); r.flush();
  near(r.positions.at(-1)!, 561.500012); near(r.scroll.scrollLeft, 561.500012);
  r.unmount();
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
