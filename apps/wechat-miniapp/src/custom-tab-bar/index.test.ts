import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type { DisplayMode } from "@starward/miniapp-contracts";
import * as contract from "../navigation/primary-navigation";
import { createPrimaryNavigationController } from "../navigation/primary-navigation-controller";

type Data = { route: string | null; pending: string | null; failed: string | null; modeClass: string; covered: boolean;
  layout: string; items: Array<{ dayIcon: string; nightIcon: string; observationIcon: string; label: string }> };
type Bar = { data: Data; writes: number; setData(data: Partial<Data>): void;
  show(route: string): void; hide(): void; sync(): void; cover(owner: string, active: boolean): void;
  open(event: { currentTarget: { dataset: { route: string } } }): void };
type Page = { route: string; getTabBar(): Bar };
type Options = { data: Data; methods: Record<string, Function>; lifetimes: { attached(this: Bar): void; detached(this: Bar): void };
  pageLifetimes: { show(this: Bar): void; hide(this: Bar): void; resize(this: Bar): void } };

function runtime() {
  let options!: Options, page: Page | undefined, mode: DisplayMode = "DAY";
  const listeners = new Set<(state: { mode: DisplayMode }, prior: { mode: DisplayMode }) => void>();
  const switches: string[] = [], rejected: Array<(error: Error) => void> = [];
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./index.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, { exports: {}, Component: (value: Options) => { options = value; },
    require: (name: string) => name === "@tarojs/taro" ? {
      getCurrentPages: () => page ? [page] : [], getWindowInfo: () => ({ windowHeight: 844, screenHeight: 844, safeArea: { bottom: 810 } }),
      switchTab: (url: { url: string }) => { switches.push(url.url); return new Promise((_resolve, reject) => rejected.push(reject)); },
    } : name.endsWith("app-store") ? { useAppStore: {
      getState: () => ({ mode }), subscribe: (listener: typeof listeners extends Set<infer T> ? T : never) => {
        listeners.add(listener); return () => { listeners.delete(listener); };
      },
    } } : name.endsWith("primary-navigation-controller") ? { createPrimaryNavigationController }
      : name.endsWith("primary-navigation") ? contract : {},
  });
  function create(route: string) {
    const bar = { data: structuredClone(options.data), writes: 0,
      setData(data: Partial<Data>) { this.writes++; Object.assign(this.data, data); }, ...options.methods } as Bar;
    const owner = { route, getTabBar: () => bar }; page = owner;
    options.lifetimes.attached.call(bar);
    return { bar, owner, show: () => options.pageLifetimes.show.call(bar), hide: () => options.pageLifetimes.hide.call(bar),
      resize: () => options.pageLifetimes.resize.call(bar), detach: () => options.lifetimes.detached.call(bar) };
  }
  return { create, switches, rejected, listeners, activate: (owner: Page) => { page = owner; },
    mode(next: DisplayMode) { const prior = mode; mode = next; for (const listener of listeners) listener({ mode }, { mode: prior }); },
    tap: (bar: Bar, route: string) => bar.open({ currentTarget: { dataset: { route } } }),
  };
}

test("native Page owns a live bar across child Back and canonical modes; detach retires it", () => {
  const h = runtime(), map = h.create("pages/map/index"), my = h.create("pages/my/index");
  assert.equal(h.listeners.size, 2);
  assert.equal(my.bar.data.route, "pages/my/index");
  assert.equal(my.bar.data.items[1]!.dayIcon, "/assets/b-icons/weapp-tabbar/account-user--day--selected.png");
  assert.match(my.bar.data.layout, /--primary-nav-height:87px/);
  my.hide(); my.bar.hide();
  const child = { route: "content/settings/index", getTabBar: () => my.bar }; h.activate(child);
  h.mode("OBSERVATION"); my.show();
  assert.equal(my.bar.data.route, "pages/my/index", "a child cannot become selected");
  h.activate(my.owner); my.show(); my.resize();
  assert.equal(my.bar.data.modeClass, "theme-observation");
  assert.match(my.bar.data.items[1]!.observationIcon, /tab-my-selected-observation\.png$/);
  h.tap(map.bar, "pages/my/index");
  assert.equal(h.switches.length, 0, "a hidden sibling cannot navigate for this Page");
  h.tap(my.bar, "pages/map/index");
  assert.deepEqual(h.switches, ["/pages/map/index"]);
  my.detach(); const writes = my.bar.writes;
  h.mode("DAY"); my.show(); my.resize(); h.tap(my.bar, "pages/map/index");
  assert.equal(my.bar.writes, writes); assert.equal(h.listeners.size, 1);
  const fresh = h.create("pages/my/index"); fresh.show();
  assert.equal(fresh.bar.data.modeClass, "theme-day");
  assert.equal(fresh.bar.data.route, "pages/my/index");
  fresh.detach(); map.detach(); assert.equal(h.listeners.size, 0);
});

test("native repeated show preserves a pending request and rejection retry; hidden late feedback retires", async () => {
  const h = runtime(), map = h.create("pages/map/index");
  h.tap(map.bar, "pages/my/index"); map.show(); map.resize(); h.tap(map.bar, "pages/my/index");
  assert.equal(h.switches.length, 1); assert.equal(map.bar.data.pending, "pages/my/index");
  h.rejected.shift()!(new Error("controlled switchTab failure")); await Promise.resolve(); await Promise.resolve();
  assert.equal(map.bar.data.route, "pages/map/index"); assert.equal(map.bar.data.failed, "pages/my/index");
  assert.match(map.bar.data.items[1]!.label, /再点重试/);
  map.resize(); assert.equal(map.bar.data.failed, "pages/my/index");
  h.tap(map.bar, "pages/my/index"); map.hide(); map.detach(); const writes = map.bar.writes;
  h.rejected.shift()!(new Error("late native failure")); await Promise.resolve(); await Promise.resolve();
  assert.equal(map.bar.writes, writes); assert.equal(h.listeners.size, 0);
});

test("mounted overlays cover native navigation across resync and independently release without navigating", () => {
  const h = runtime(), map = h.create("pages/map/index");
  assert.equal(map.bar.data.covered, false);
  map.bar.cover("event", true); map.bar.cover("photo", true); map.show(); map.resize(); h.mode("NIGHT");
  assert.equal(map.bar.data.covered, true); assert.equal(map.bar.data.route, "pages/map/index");
  h.tap(map.bar, "pages/my/index"); assert.equal(h.switches.length, 0);
  map.bar.cover("event", false); map.bar.cover("event", false); map.resize();
  assert.equal(map.bar.data.covered, true, "closing one overlay cannot uncover another");
  map.bar.cover("photo", false); assert.equal(map.bar.data.covered, false);
  map.bar.cover("event", true); map.hide();
  const my = h.create("pages/my/index");
  map.bar.cover("event", false);
  assert.equal(my.bar.data.covered, false); assert.equal(my.bar.data.route, "pages/my/index");
  const writes = map.bar.writes; map.detach(); map.bar.cover("event", false); map.show();
  assert.equal(map.bar.writes, writes); my.detach();
});
