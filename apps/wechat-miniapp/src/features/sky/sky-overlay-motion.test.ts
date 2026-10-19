import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { skyRetainedLayerStyle } from "./sky-retained-layer";
import { localParts } from "@starward/miniapp-contracts";
import { createSkyTimeRepeat, skyCivilInstant, skyTimeInputAllowed, stepSkyCivilTime } from "./sky-time-input";
import { createSkyObservationTime } from "./sky-observation-time";

function harness(component = "useSkyOverlayMotion") {
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

function controls(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(controls);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...controls(tree.children)];
}

test("actual six-field controls keep inside holds, stop outside, apply current text and reject future or retired input", () => {
  const ui = harness("SkyTimeControls"), previews: string[] = [], applied: string[] = [];
  let current = true;
  const props = { at: "2026-10-16T12:00:00.000Z", timezone: "Asia/Shanghai", active: true, playing: false, canPlay: true,
    current: () => current, onPreview: (at: string) => { previews.push(at); return true; },
    onApply: (at: string) => applied.push(at), onPause() {}, onTogglePlay() {} };
  let tree = ui.render(props);
  const find = (label: string) => controls(tree).find(node => node.props?.ariaLabel === label)!;
  assert.equal(controls(tree).filter(node => node.type === "Input").length, 6);
  const up = find("增加秒"); up.props.onTouchStart(); tree = ui.tick();
  assert.equal(previews.at(-1), "2026-10-16T12:00:01.000Z");
  up.props.onTouchMove({ touches: [{ clientX: 20, clientY: 20 }] }); assert.equal(ui.timers, 1);
  tree = ui.advance(380); assert.equal(previews.at(-1), "2026-10-16T12:00:02.000Z");
  up.props.onTouchMove({ touches: [{ clientX: 45, clientY: 20 }] }); assert.equal(ui.timers, 0);
  up.props.onTouchEnd(); up.props.onClick(); assert.equal(previews.length, 2);
  find("年").props.onInput({ detail: { value: "2099" } }); tree = ui.render();
  find("应用所选时刻").props.onClick(); assert.equal(applied.length, 0);
  find("年").props.onInput({ detail: { value: "2026" } });
  find("分").props.onInput({ detail: { value: "05" } }); tree = ui.render();
  find("应用所选时刻").props.onClick(); assert.deepEqual(applied, ["2026-10-16T12:05:02.000Z"]);
  tree = ui.render(); find("增加秒").props.onTouchStart(); ui.hide(); assert.equal(ui.timers, 0);
  current = false; const count = previews.length;
  find("应用所选时刻").props.onClick(); find("增加秒").props.onTouchStart();
  assert.equal(applied.length, 1); assert.equal(previews.length, count); assert.equal(ui.timers, 0);
  ui.unmount();
});

test("an arrow consumes the current keyboard draft and an ensuing old blur cannot replace its result", () => {
  const ui = harness("SkyTimeControls"), previews: string[] = [];
  const props = { at: "2026-10-16T12:00:00.000Z", timezone: "UTC", active: true, playing: false, canPlay: true,
    current: () => true, onPreview: (at: string) => { previews.push(at); return true; }, onApply() {}, onPause() {}, onTogglePlay() {} };
  let tree = ui.render(props);
  const find = (label: string) => controls(tree).find(node => node.props?.ariaLabel === label)!;
  const input = find("时"); input.props.onInput({ detail: { value: "11" } }); tree = ui.render();
  const up = find("增加时"); up.props.onTouchStart();
  assert.equal(previews.at(-1), props.at, "11 o'clock plus one is 12, not the old 12 plus one");
  input.props.onBlur({ detail: { value: "11" } });
  assert.equal(previews.at(-1), props.at, "the blur from the consumed edit must not undo the arrow");
  up.props.onTouchEnd(); up.props.onClick(); assert.equal(previews.length, 1);
  ui.unmount();
});

test("applying without a field edit preserves the public instant's milliseconds", () => {
  const ui = harness("SkyTimeControls"), applied: string[] = [];
  const at = "2026-10-16T12:00:00.750Z";
  const tree = ui.render({ at, timezone: "UTC", active: true, playing: false, canPlay: true, current: () => true,
    onPreview: () => true, onApply: (value: string) => applied.push(value), onPause() {}, onTogglePlay() {} });
  controls(tree).find(node => node.props?.ariaLabel === "应用所选时刻")!.props.onClick();
  assert.deepEqual(applied, [at]); ui.unmount();
});

test("play consumes a pending keyboard value once and a second native tap still pauses the live owner", () => {
  const ui = harness("SkyTimeControls"), owner = createSkyObservationTime();
  const at = "2026-10-16T12:00:00.000Z";
  owner.bind("current", at, { startAt: "2026-10-16T10:00:00.000Z", endAt: "2026-10-16T15:00:00.000Z" });
  let tree = ui.render({ at, timezone: "UTC", active: true, playing: false, canPlay: true, current: () => true,
    onPreview: (value: string) => { owner.preview(value); return true; }, onApply() {}, onPause: owner.pause,
    onTogglePlay: () => owner.snapshot().mode === "PLAYING" ? owner.pause() : owner.play(0) });
  const find = (label: string) => controls(tree).find(node => node.props?.ariaLabel === label)!;
  const input = find("分"); input.props.onInput({ detail: { value: "05" } }); tree = ui.render();
  const play = find("1倍播放"); play.props.onClick();
  assert.equal(owner.snapshot().at, "2026-10-16T12:05:00.000Z"); assert.equal(owner.snapshot().mode, "PLAYING");
  input.props.onBlur({ detail: { value: "05" } });
  assert.equal(owner.snapshot().mode, "PLAYING", "late blur must not retire the newly started play run");
  play.props.onClick(); assert.equal(owner.snapshot().mode, "PAUSED", "rapid repeat uses the live parent mode");
  ui.unmount();
});

test("closing an out-of-coverage draft restores normal playback when the retained time surface reopens", () => {
  const ui = harness("SkyTimeControls"), owner = createSkyObservationTime(), at = "2026-10-16T12:00:00.000Z";
  owner.bind("current", at, { startAt: "2026-10-16T10:00:00.000Z", endAt: "2026-10-16T15:00:00.000Z" });
  const props = { at, timezone: "UTC", active: true, playing: false, canPlay: true, current: () => true,
    onPreview: () => false, onApply() {}, onPause: owner.pause, onTogglePlay: () => owner.play(0) };
  let tree = ui.render(props);
  const find = (label: string) => controls(tree).find(node => node.props?.ariaLabel === label)!;
  find("日").props.onInput({ detail: { value: "15" } }); tree = ui.render();
  find("1倍播放").props.onClick(); assert.equal(owner.snapshot().mode, "FIXED");
  ui.render({ ...props, active: false }); tree = ui.render({ ...props, active: true });
  find("1倍播放").props.onClick(); assert.equal(owner.snapshot().mode, "PLAYING");
  ui.unmount();
});

test("opening waits for a target commit; exit retains the surface while disabling its actions", () => {
  const ui = harness();
  assert.equal(ui.render(false, true, false).present, false);
  const initial = ui.render(true, true, false);
  assert.equal(initial.present, true); assert.equal(initial.phase, "opening");
  ui.tick(); assert.equal(ui.advance(16).phase, "open");
  const closing = ui.render(false, true, false);
  assert.equal(closing.present, true); assert.equal(closing.active, false);
  assert.equal(ui.advance(179).present, true);
  assert.equal(ui.advance(1).present, false); assert.equal(ui.timers, 0);
});

test("time preparation is unscaled and transparent before the original center scale/fade begins", () => {
  const ui = harness();
  const preparing = ui.render(true, true, false, false);
  assert.equal(preparing.phase, "preparing"); assert.equal(preparing.active, true);
  ui.tick(); ui.advance(1000);
  assert.equal(ui.render().phase, "preparing", "elapsed time is not a native-position receipt");
  assert.equal(ui.timers, 0);
  assert.equal(ui.render(true, true, false, true).phase, "opening");
  ui.tick(); assert.equal(ui.advance(16).phase, "open", "the original reveal begins after prepared content is installed");
  ui.render(false, true, false, true); ui.advance(90);
  assert.equal(ui.render(true, true, false, true).phase, "open", "a retained close reverses from its live presentation without preparation");
  const css = readFileSync(new URL("./sky-overlay-motion.scss", import.meta.url), "utf8");
  assert.match(css, /--preparing[^\n]*opacity: 0; transform: none; transition: none/);
  assert.match(css, /--opening[^\n]*transition: none/, "preparation cannot tween the invisible starting scale before its reveal");
  assert.match(css, /transform-origin: center center/);
  assert.match(css, /transform: scale\(\.76\)/);
  ui.unmount();
  const reduced = harness();
  assert.equal(reduced.render(true, true, true, false).phase, "preparing");
  assert.equal(reduced.render(true, true, true, true).phase, "open");
  assert.equal(reduced.timers, 0);
});

test("layout readiness follows the real surface endpoint, including reversal, retirement and immediate motion", () => {
  const ui = harness("useSkyOverlayLayoutReady");
  const opening = { active: true, phase: "opening" };
  let frame = ui.render(opening, false), oldEnd = frame.finish;
  assert.equal(frame.ready, false); oldEnd(); assert.equal(ui.render().ready, false);
  frame = ui.render({ active: true, phase: "open" }, false);
  assert.equal(frame.ready, false, "open begins the existing 180ms CSS transition");
  oldEnd(); assert.equal(ui.render().ready, false);
  frame.finish(); assert.equal(ui.render().ready, true);
  oldEnd = frame.finish;
  assert.equal(ui.render({ active: false, phase: "closing" }, false).ready, false);
  frame = ui.render({ active: true, phase: "open" }, false);
  oldEnd(); assert.equal(ui.render().ready, false, "a reversed close requires its own endpoint");
  frame.finish(); assert.equal(ui.render().ready, true);
  assert.equal(ui.timers, 0, "no guessed animation delay or polling");
  ui.unmount();
  const retired = harness("useSkyOverlayLayoutReady");
  const late = retired.render({ active: true, phase: "open" }, false).finish;
  retired.unmount(); late(); assert.equal(retired.render().ready, false);
  const immediate = harness("useSkyOverlayLayoutReady");
  assert.equal(immediate.render({ active: true, phase: "open" }, true).ready, true);
  assert.equal(immediate.render({ active: false, phase: "closed" }, true).ready, false);
});

test("outside drag and cancellation keep a disclosure open; internal controls stop bubbling and time leaves the sky usable", () => {
  const ui = harness("SkyDisclosureSurface"); let closes = 0, stopped = 0;
  const props = { kind: "object", label: "天体说明", onClose: () => closes++, children: "long-content" };
  const frame = ui.render(props), outside = frame.children[0], panel = frame.children[1];
  outside.props.onTouchStart(); outside.props.onTouchMove(); outside.props.onClick(); assert.equal(closes, 0);
  outside.props.onTouchStart(); outside.props.onTouchCancel(); outside.props.onClick(); assert.equal(closes, 0);
  outside.props.onTouchStart(); outside.props.onClick(); assert.equal(closes, 1);
  panel.props.onClick({ stopPropagation() { stopped++; } }); assert.equal(stopped, 1);
  assert.equal(ui.render({ ...props, kind: "time" }).children[0], null, "time adds no full-screen gesture interception");
});

test("only the disclosure surface's transition endpoint can qualify layout", () => {
  const ui = harness("SkyDisclosureSurface"); let ends = 0;
  const panel = ui.render({ kind: "time", label: "天空时间", id: "time-surface", onClose() {},
    onMotionEnd: () => ends++, children: "ruler" }).children[1];
  panel.props.onTransitionEnd({ target: { id: "tick" }, currentTarget: { id: "time-surface" } });
  assert.equal(ends, 0);
  panel.props.onTransitionEnd({ target: { id: "time-surface" }, currentTarget: { id: "time-surface" } });
  assert.equal(ends, 1);
});

test("the retained time surface gates layout with live activity throughout its closing scale", () => {
  const source = ts.createSourceFile("sky.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression = "";
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "OrientationTimeRuler") {
      const attribute = node.attributes.properties.find(value => ts.isJsxAttribute(value) && value.name.getText(source) === "layoutReady");
      assert(attribute && ts.isJsxAttribute(attribute) && attribute.initializer && ts.isJsxExpression(attribute.initializer));
      expression = attribute.initializer.expression!.getText(source);
    }
    ts.forEachChild(node, visit);
  };
  visit(source); assert(expression, "actual time-surface layout admission");
  const child = (timeLayout: { ready: boolean }) => (active: boolean) =>
    vm.runInNewContext(`(${expression})`, { timeLayout, timeMotion: { phase: "open" }, active });
  const ui = harness("SkyOverlayMotion"), motion = { present: true, active: true, phase: "open", style: {} };
  assert.equal(ui.render({ motion, kind: "time", children: child({ ready: true }) }).children[0], true);
  assert.equal(ui.render({ motion: { ...motion, active: false, phase: "closing" }, kind: "time",
    children: child({ ready: false }) }).children[0], false, "retained closure must consume its live inactive argument");
});

test("browse rotor locks repeated taps until its current endpoint and retires delayed unlock on hide", () => {
  const ui = harness("SkyBrowseControl"); let toggles = 0;
  const props = { following: false, editing: false, active: true, disabled: false, canCalibrate: true,
    reducedMotion: false, onToggle: () => toggles++, onCalibrate() {} };
  let frame = ui.render(props), button = frame.children[1], oldEnd = button.children[0].children[0].props.onTransitionEnd;
  button.props.onClick(); button.props.onClick(); assert.equal(toggles, 1);
  frame = ui.render({ ...props, following: true }); assert.equal(frame.children[1].props.disabled, true);
  oldEnd(); assert.equal(ui.render().children[1].props.disabled, true, "an old transition cannot unlock the replacement");
  frame.children[1].children[0].children[0].props.onTransitionEnd();
  frame = ui.render(); assert.equal(frame.children[1].props.disabled, false); assert.equal(ui.timers, 0);
  frame.children[1].props.onClick(); assert.equal(toggles, 2); ui.hide(); assert.equal(ui.timers, 0); ui.unmount();
});

test("reopening reverses the mounted surface and retires the old close", () => {
  const ui = harness(); ui.render(true, true, false); ui.tick(); ui.advance(16);
  ui.render(false, true, false); ui.advance(90);
  assert.equal(ui.render(true, true, false).phase, "open");
  assert.equal(ui.advance(180).present, true, "the old close cannot remove the new disclosure");
  ui.render(false, true, false); ui.unmount(); assert.equal(ui.timers, 0);
});

test("page retirement drops pending entry; the existing immediate-motion branch has no timers", () => {
  const ui = harness(); ui.render(false, true, false); ui.render(true, true, false);
  assert.equal(ui.render(true, false, false).present, false);
  ui.tick(); assert.equal(ui.timers, 0, "late native nextTick cannot resurrect a hidden page");
  const immediate = harness(); assert.equal(immediate.render(true, true, true).phase, "open");
  assert.equal(immediate.render(false, true, true).present, false); assert.equal(immediate.timers, 0);
});

test("a covered retained search keeps its content while hidden and passes inactive to its resource owner", () => {
  const ui = harness("SkyOverlayMotion"), active: boolean[] = [];
  const content = (value: boolean) => { active.push(value); return "same-query-and-scroll"; };
  const motion = { present: true, active: true, phase: "open", style: {} };
  ui.render({ motion, kind: "search", keepMounted: true, children: content });
  const hidden = ui.render({ motion: { ...motion, present: false, active: false, phase: "closed" },
    kind: "search", keepMounted: true, children: () => "new-closed-props" });
  assert.equal(hidden.props.style.display, "none"); assert.equal(hidden.children[0], "same-query-and-scroll");
  assert.deepEqual(active, [true, false]);
});
