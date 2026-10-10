import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as planEntry from "./plan-entry";

function harness() {
  const states: any[] = [], refs: any[] = [], effects: { deps: unknown[]; cleanup: (() => void) | undefined }[] = [];
  const pending = new Map<number, () => void>(), resize = new Set<() => void>();
  const queries: { selector: string; callback: (rows: any) => void }[] = [];
  let s = 0, r = 0, e = 0, hidden = () => {}, shown = () => {}, unmounted = false, writesAfterUnmount = 0, opened = 0;
  let throwQuery = false;
  const store = { mode: "DAY", accountOwnerId: "owner-a", mapResetVersion: 1, preferences: { largeText: false } };
  const jsx = (type: unknown, props: any) => ({ type, props }), exports: any = {};
  const taro = {
    onWindowResize: (callback: () => void) => resize.add(callback), offWindowResize: (callback: () => void) => resize.delete(callback),
    createSelectorQuery: () => {
      if (throwQuery) throw new Error("native query unavailable");
      let selector = "";
      const query = { select: (value: string) => { selector = value; return query; }, boundingClientRect: () => query,
        exec: (callback: (rows: any) => void) => queries.push({ selector, callback }) };
      return query;
    },
  };
  function effect(run: () => void | (() => void), deps: unknown[]) {
    const index = e++, previous = effects[index];
    if (previous && previous.deps.length === deps.length && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
    pending.set(index, () => { previous?.cleanup?.(); effects[index] = { deps, cleanup: run() ?? undefined }; });
  }
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./my-plan-card.tsx", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: (name: string) => name === "react/jsx-runtime" ? { jsx, jsxs: jsx } : name === "react" ? {
    createElement: (type: unknown, props: any, ...children: any[]) => jsx(type, { ...props, children: children.length === 1 ? children[0] : children }),
    useId: () => ":card1:", useRef: (value: unknown) => refs[r++] ?? (refs[r - 1] = { current: value }),
    useState: (value: unknown) => { const index = s++; if (!(index in states)) states[index] = value;
      return [states[index], (next: any) => { if (unmounted) writesAfterUnmount++; states[index] = typeof next === "function" ? next(states[index]) : next; }]; },
    useEffect: effect, useLayoutEffect: effect,
  } : name === "@tarojs/taro" ? { __esModule: true, default: taro, useDidHide: (callback: () => void) => { hidden = callback; }, useDidShow: (callback: () => void) => { shown = callback; } }
    : name === "@tarojs/components" ? { Button: "Button", View: "View", Text: "Text", Image: "Image" }
    : name === "./plan-entry" ? planEntry : name.includes("app-store") ? { useAppStore: (select: (state: any) => unknown) => select(store) } : {},
  });
  const props = { plans: [] as any[], spots: [], now: new Date("2026-10-10T01:00:00Z"), loading: false, unavailable: false,
    onOpen: () => { opened++; }, onOpenAll: () => { opened++; } };
  const render = () => { s = r = e = 0; return exports.MyPlanCard(props); };
  const flush = () => { const work = [...pending.values()]; pending.clear(); for (const run of work) run(); };
  render(); flush();
  return { render, flush, queries, store, props,
    deliver(rect: any = { left: 24, top: 200, width: 344, height: 140 }) { const query = queries.shift(); assert.ok(query, "production must query actual geometry"); query.callback([rect]); },
    hide: () => hidden(), show: () => shown(), resize: () => { for (const callback of resize) callback(); },
    unmount: () => { unmounted = true; for (const item of effects) item.cleanup?.(); },
    writesAfterUnmount: () => writesAfterUnmount, listeners: () => resize.size, opened: () => opened,
    queryFailure: () => { throwQuery = true; },
  };
}
const touch = (clientX = 110, clientY = 235, identifier = 7) => ({ touches: [{ identifier, clientX, clientY }] });
const light = (card: any) => card.props.children.find((child: any) => child?.props?.className === "my-plan-card__touch");
const active = (h: ReturnType<typeof harness>) => h.render().props.className.split(" ").includes("my-plan-card--pressed") ? "true" : "false";

test("adopted press places the rendered highlight at the actual touch point without opening a plan", () => {
  const h = harness(), card = h.render();
  assert.equal(typeof card.props.onTouchStart, "function");
  card.props.onTouchStart(touch()); assert.equal(active(h), "false");
  assert.equal(h.queries.length, 1); const query = h.queries[0]; assert.ok(query); assert.equal(query.selector, "#" + card.props.id);
  h.deliver(); assert.equal(active(h), "true");
  const glow = light(h.render()); assert.ok(glow); assert.equal(glow.props.style["--touch-x"], "25%"); assert.equal(glow.props.style["--touch-y"], "25%");
  assert.equal(h.opened(), 0);
  h.render().props.onTouchEnd(); assert.equal(active(h), "false");
  assert.equal(light(h.render()).props.style["--touch-x"], "25%", "release fades at the original point");
  h.render().props.children.find((child: any) => child?.props?.className === "my-plan-card__header focus-ring").props.onClick();
  assert.equal(h.opened(), 1); h.unmount();
});

test("touch cancellation and release before native readback cannot revive a highlight", () => {
  for (const end of ["onTouchEnd", "onTouchCancel"]) {
    const h = harness(); h.render().props.onTouchStart(touch()); h.render().props[end](); h.deliver(); assert.equal(active(h), "false"); h.unmount();
  }
});

test("a replaced press rejects its old native result and copies the original touch coordinates", () => {
  const h = harness(), original = touch(); h.render().props.onTouchStart(original);
  const point = original.touches[0]; assert.ok(point); point.clientX = 330;
  h.deliver(); assert.equal(light(h.render()).props.style["--touch-x"], "25%", "native events cannot mutate the retained origin");
  h.render().props.onTouchEnd(); h.render().props.onTouchStart(touch());
  h.render().props.onTouchStart(touch(282, 305, 8)); h.deliver(); assert.equal(active(h), "false");
  h.deliver(); assert.equal(active(h), "true"); assert.equal(light(h.render()).props.style["--touch-x"], "75%");
  h.unmount();
});

test("leaving the card before or after readback retires the feedback", () => {
  for (const before of [true, false]) {
    const h = harness(); h.render().props.onTouchStart(touch()); if (!before) h.deliver();
    h.render().props.onTouchMove(touch(369, 235)); if (before) h.deliver(); assert.equal(active(h), "false"); h.unmount();
  }
});

test("multiple fingers, a changed touch identity and invalid coordinates cannot own press feedback", () => {
  const h = harness();
  for (const event of [{}, { touches: null }, { touches: "invalid" }, { touches: [null] }, { touches: [{ identifier: 7 }] }]) {
    h.render().props.onTouchStart(event); assert.equal(h.queries.length, 0);
  }
  h.render().props.onTouchStart({ touches: [touch().touches[0], touch(110, 235, 8).touches[0]] }); assert.equal(h.queries.length, 0);
  h.render().props.onTouchStart(touch(NaN)); assert.equal(h.queries.length, 0);
  h.render().props.onTouchStart(touch()); h.deliver(); h.render().props.onTouchMove(touch(110, 235, 8)); assert.equal(active(h), "false"); h.unmount();
});

test("layout changes and account generations reject pending and visible feedback", () => {
  const changes = [(h: ReturnType<typeof harness>) => { h.store.mode = "NIGHT"; },
    (h: ReturnType<typeof harness>) => { h.store.accountOwnerId = h.store.accountOwnerId === "owner-a" ? "owner-b" : "owner-a"; }, (h: ReturnType<typeof harness>) => { h.store.mapResetVersion++; },
    (h: ReturnType<typeof harness>) => { h.store.preferences.largeText = !h.store.preferences.largeText; }, (h: ReturnType<typeof harness>) => { h.props.plans = []; }];
  for (const change of changes) {
    const h = harness(); h.render().props.onTouchStart(touch()); change(h); h.render(); h.flush(); h.deliver(); assert.equal(active(h), "false");
    h.store.mode = "DAY"; h.render(); h.flush(); h.render().props.onTouchStart(touch()); h.deliver(); assert.equal(active(h), "true");
    change(h); h.render(); h.flush(); assert.equal(active(h), "false"); h.unmount(); assert.equal(h.listeners(), 0);
  }
});

test("tab hide and resize retire feedback and their pending query without blocking a fresh press", () => {
  const h = harness(); h.render().props.onTouchStart(touch()); h.hide(); h.deliver(); assert.equal(active(h), "false");
  h.render().props.onTouchStart(touch()); assert.equal(h.queries.length, 0); h.show();
  h.render().props.onTouchStart(touch()); h.resize(); h.deliver(); assert.equal(active(h), "false");
  h.render().props.onTouchStart(touch()); h.deliver(); assert.equal(active(h), "true"); h.hide(); assert.equal(active(h), "false"); h.unmount();
});

test("native failure keeps existing navigation usable and unmount releases the listener and stale query", () => {
  for (const rect of [null, { left: 24, top: 200, width: 0, height: 140 }, { left: NaN, top: 200, width: 344, height: 140 }]) {
    const h = harness(); h.render().props.onTouchStart(touch()); h.deliver(rect); assert.equal(active(h), "false"); h.unmount();
  }
  const failed = harness(); failed.queryFailure(); failed.render().props.onTouchStart(touch()); assert.equal(active(failed), "false");
  failed.render().props.children.find((child: any) => child?.props?.className === "my-plan-card__header focus-ring").props.onClick(); assert.equal(failed.opened(), 1); failed.unmount();
  const late = harness(); late.render().props.onTouchStart(touch()); assert.equal(late.listeners(), 1); late.unmount(); late.deliver();
  assert.equal(late.listeners(), 0); assert.equal(late.writesAfterUnmount(), 0);
});

test("clock-driven visible plan changes retire pending and active feedback without interrupting an unchanged second", () => {
  const plans = [{ planId: "clock-plan", spotId: "clock-spot", localDate: "2026-10-10", localTime: "08:59",
    timing: { endLocalDate: "2026-10-10", endLocalTime: "09:01" },
    contextSnapshot: { timezone: "Asia/Shanghai", selectedAtUtc: "2026-10-10T00:59:00Z" } }];
  const rows = (h: ReturnType<typeof harness>) => h.render().props.children.flat().filter((child: any) => child?.props?.className === "my-plan-card__row focus-ring");
  for (const pending of [false, true]) {
    const h = harness(); h.props.plans = plans; h.render(); h.flush(); assert.equal(rows(h).length, 1);
    h.render().props.onTouchStart(touch()); if (!pending) h.deliver();
    h.props.now = new Date("2026-10-10T01:00:01Z"); h.render(); h.flush();
    assert.equal(active(h), pending ? "false" : "true", "an unchanged rendered second must preserve its gesture");
    h.props.now = new Date("2026-10-10T01:01:00Z"); h.render(); h.flush();
    assert.equal(h.props.plans, plans); assert.equal(rows(h).length, 0, "the real selector retires the ended plan");
    if (pending) h.deliver();
    assert.equal(active(h), "false", "an old rectangle cannot outlive the changed document"); h.unmount();
  }
});
