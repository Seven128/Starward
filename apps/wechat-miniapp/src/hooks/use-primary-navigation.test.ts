import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { primaryNavigationLayout } from "../navigation/primary-navigation";
import { createPrimaryNavigationController } from "../navigation/primary-navigation-controller";
import { primaryPageNavigationForTest } from "../navigation/primary-page-navigation-test-support";

type HookResult = ReturnType<typeof import("./use-primary-navigation").usePrimaryNavigation>;
type WindowMetrics = { windowHeight?: number; screenHeight?: number; safeArea?: { bottom: number } };
const styleValue = (result: HookResult, name: string): unknown => Object.getOwnPropertyDescriptor(result.style, name)?.value;

/** Execute the real hook, controller and dispatcher; replace React scheduling and native ports only. */
function mount() {
  const map = { route: "pages/map/index" }, child = { route: "content/settings/index" };
  let current: typeof map | undefined = map;
  let metrics: WindowMetrics | null = { windowHeight: 844, screenHeight: 844, safeArea: { bottom: 810 } };
  let reduced = false, refIndex = 0, stateIndex = 0, effectIndex = 0, dirty = false, unmounted = false;
  let now = 0, sequence = 0, result!: HookResult;
  let show!: () => void, hide!: () => void, resize!: () => void;
  const refs: Array<{ current: unknown }> = [], states: unknown[] = [];
  const effects: Array<{ deps: readonly unknown[]; cleanup?: (() => void) | undefined }> = [];
  const pending = new Map<number, () => void>();
  const timers = new Map<number, { at: number; run(): void }>();
  const taro = {
    getCurrentInstance: () => ({ page: current }),
    getCurrentPages: () => current === map ? [map] : current ? [map, current] : [],
    getWindowInfo: () => { if (!metrics) throw new Error("native metrics unavailable"); return metrics; },
  };
  const navigation = primaryPageNavigationForTest(taro);
  function effect(setup: () => (() => void) | void, deps: readonly unknown[]) {
    const index = effectIndex++, prior = effects[index];
    if (prior && deps.length === prior.deps.length && deps.every((value, i) => Object.is(value, prior.deps[i]))) return;
    pending.set(index, () => { prior?.cleanup?.(); effects[index] = { deps, cleanup: setup() ?? undefined }; });
  }
  const module = { exports: {} as typeof import("./use-primary-navigation") };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./use-primary-navigation.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, { module, exports: module.exports,
    setTimeout: (run: () => void, delay: number) => { timers.set(++sequence, { at: now + delay, run }); return sequence; },
    clearTimeout: (id: number) => timers.delete(id),
    require: (name: string) => {
      if (name === "react") return {
        useRef: (initial: unknown) => refs[refIndex++] ??= { current: initial },
        useState: (initial: () => unknown) => {
          const index = stateIndex++;
          if (!(index in states)) states[index] = initial();
          return [states[index], (next: unknown) => { if (!unmounted && !Object.is(states[index], next)) { states[index] = next; dirty = true; } }];
        },
        useEffect: effect, useLayoutEffect: effect,
        useSyncExternalStore: (subscribe: (listener: () => void) => () => void, getSnapshot: () => unknown) => {
          effect(() => subscribe(() => { dirty = true; }), [subscribe]);
          return getSnapshot();
        },
      };
      if (name === "@tarojs/taro") return { __esModule: true, default: taro,
        useDidShow: (callback: () => void) => { show = callback; },
        useDidHide: (callback: () => void) => { hide = callback; },
        useResize: (callback: () => void) => { resize = callback; },
      };
      if (name === "@/navigation/primary-navigation") return { primaryNavigationLayout };
      if (name === "@/navigation/primary-navigation-controller") return { createPrimaryNavigationController };
      if (name === "@/navigation/primary-page-navigation") return navigation;
      if (name === "./use-reduced-motion") return { useReducedMotion: () => reduced };
      throw new Error(`Unexpected primary hook dependency: ${name}`);
    },
  });
  function render() {
    if (unmounted) return result;
    for (let turns = 0; turns < 20; turns++) {
      refIndex = stateIndex = effectIndex = 0; dirty = false;
      result = module.exports.usePrimaryNavigation("pages/map/index");
      const tasks = [...pending.values()]; pending.clear(); tasks.forEach(run => run());
      if (!dirty && !pending.size) return result;
    }
    throw new Error("Primary hook did not settle");
  }
  render();
  return {
    map, child, navigation, render,
    activate(page: typeof map | undefined) { current = page; },
    show() { show(); return render(); }, hide() { hide(); return render(); },
    resize(next: WindowMetrics | null) { metrics = next; resize(); return render(); },
    reduce(value: boolean) { reduced = value; return render(); },
    pending: () => timers.size,
    scheduled: () => [...timers.values()].map(timer => timer.run),
    advance(ms: number) {
      const end = now + ms;
      for (;;) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        now = next[1].at; timers.delete(next[0]); next[1].run(); render();
      }
      now = end; return render();
    },
    unmount() {
      if (unmounted) return;
      unmounted = true; effects.forEach(item => item.cleanup?.()); pending.clear();
    },
  };
}

test("the exact Map host survives native child Back without a hidden rerender claiming another Page", async () => {
  for (const hiddenCurrent of ["child", "empty"] as const) {
    const h = mount(), first = h.show();
    assert.equal(first.page, h.map); assert.equal(first.controller.isForeground("pages/map/index"), true);
    await h.navigation.openPrimaryPage("/pages/my/index"); h.render(); h.advance(240);
    const identity = first.controller.presentationIdentity("pages/my/index");
    h.hide(); h.activate(hiddenCurrent === "child" ? h.child : undefined); h.render();
    h.resize({ windowHeight: 762, screenHeight: 844, safeArea: { bottom: 810 } }); h.show();
    assert.equal(first.controller.isForeground("pages/my/index"), false);
    assert.equal(first.controller.owns(h.child), false);
    assert.equal(first.controller.presentationIdentity("pages/my/index"), identity);
    assert.equal(first.controller.closeMy(), false, "a hidden native host cannot accept a primary action");
    h.activate(h.map); h.show();
    assert.equal(first.controller.isForeground("pages/my/index"), true);
    assert.equal(first.controller.presentationIdentity("pages/my/index"), identity);
    await h.navigation.openPrimaryPage("/pages/map/index"); h.render();
    assert.equal(first.controller.getSnapshot().phase, "closing");
    h.advance(240); assert.equal(first.controller.isForeground("pages/map/index"), true);
    h.unmount();
  }
});

test("native window geometry fills the page through resize, with an explicit unavailable-metrics fallback", () => {
  const h = mount();
  assert.equal(h.show().pageHeight, 844);
  const resized = h.resize({ windowHeight: 762, screenHeight: 844, safeArea: { bottom: 810 } });
  assert.equal(resized.pageHeight, 762, "screen height and safe-area bottom cannot reintroduce bar reservation");
  assert.equal(styleValue(resized, "--primary-page-height"), "762px");
  assert.deepEqual(Object.keys(resized.style).sort(), ["--primary-my-transition-duration", "--primary-page-height"]);
  assert.equal(h.resize({ windowHeight: 430, screenHeight: 844 }).pageHeight, 430);
  const unavailable = h.resize(null);
  assert.equal(unavailable.pageHeight, undefined); assert.equal(styleValue(unavailable, "--primary-page-height"), "100vh");
  assert.equal(styleValue(h.resize({ windowHeight: 0 }), "--primary-page-height"), "100vh");
  h.unmount();
});

test("reverse input replaces a transition ticket; late completion and system reduction preserve the current presentation", () => {
  const h = mount(), { controller } = h.show();
  controller.openMy(); const opening = h.render();
  assert.equal(opening.presentation.phase, "opening"); assert.equal(h.pending(), 1);
  assert.equal(styleValue(opening, "--primary-my-transition-duration"), "240ms");
  const lateOpening = h.scheduled()[0]!;
  controller.closeMy(); const closing = h.render();
  assert.notEqual(closing.presentation.transitionTicket, opening.presentation.transitionTicket);
  assert.equal(h.pending(), 1, "retargeting retires the original timer");
  lateOpening();
  assert.equal(controller.getSnapshot().phase, "closing");
  const lateClosing = h.scheduled()[0]!;
  controller.openMy(); h.render();
  const reduced = h.reduce(true);
  assert.equal(reduced.presentation.phase, "open"); assert.equal(reduced.presentation.transitionTicket, null);
  assert.equal(styleValue(reduced, "--primary-my-transition-duration"), "0ms"); assert.equal(h.pending(), 0);
  lateClosing(); assert.equal(controller.getSnapshot().route, "pages/my/index");
  assert.equal(controller.getSnapshot().phase, "open");
  h.reduce(false); assert.equal(h.pending(), 0);
  h.unmount();
});

test("a root timer may settle while its native child is foreground without resuming the hidden Map or My", () => {
  const h = mount(), { controller } = h.show();
  controller.openMy(); h.render(); const identity = controller.presentationIdentity("pages/my/index");
  h.hide(); h.activate(h.child); h.advance(240);
  assert.equal(controller.getSnapshot().phase, "open");
  assert.equal(controller.getSnapshot().foregroundRoute, null);
  assert.equal(controller.isForeground("pages/my/index"), false);
  h.activate(h.map); h.show();
  assert.equal(controller.isForeground("pages/my/index"), true);
  assert.equal(controller.presentationIdentity("pages/my/index"), identity);
  h.unmount();
});

test("unmount releases the actual Map registration, native ownership and pending completion exactly once", () => {
  const h = mount(), { controller } = h.show();
  controller.openMy(); h.render(); const late = h.scheduled()[0]!;
  assert.equal(h.navigation.getPrimaryMapPresentationSnapshot(), controller.getSnapshot());
  h.unmount(); h.unmount();
  const terminal = controller.getSnapshot();
  assert.equal(terminal.disposed, true); assert.equal(terminal.nativeVisible, false);
  assert.equal(terminal.foregroundRoute, null); assert.equal(terminal.transitionTicket, null);
  assert.equal(h.navigation.getPrimaryMapPresentationSnapshot(), null); assert.equal(h.pending(), 0);
  assert.equal(controller.owns(h.map), false);
  late(); h.show(); h.resize({ windowHeight: 900 });
  assert.equal(controller.getSnapshot(), terminal);
});
