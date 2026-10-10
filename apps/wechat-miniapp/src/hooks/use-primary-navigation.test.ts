import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { primaryNavigationLayout } from "../navigation/primary-navigation";
import { createPrimaryNavigationController, type PrimaryNavigationState } from "../navigation/primary-navigation-controller";

function mount() {
  const parent = { route: "pages/my/index", getTabBar: () => bar }, child = { route: "content/settings/index", getTabBar: () => bar };
  let active: typeof parent | undefined = parent, refIndex = 0;
  const refs: Array<{ current: unknown }> = [], ticks: Array<() => void> = [];
  const changes: PrimaryNavigationState[] = [], switches: string[] = [], shown: object[] = [];
  const controller = createPrimaryNavigationController({ currentPage: () => active,
    switchTab: async url => { switches.push(url); throw new Error("controlled native rejection"); },
    changed: value => changes.push(value) });
  const bar = { show(...args: unknown[]) {
    structuredClone(args); // Native Component calls must not carry a Page's functions.
    shown.push(parent); controller.show(active!);
  }, hide: () => controller.hide() };
  let show!: () => void, hide!: () => void, resize!: () => void;
  let layout: unknown, cleanup: (() => void) | undefined;
  const module = { exports: {} as { usePrimaryNavigation: (route: string) => unknown } };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./use-primary-navigation.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, { module, exports: module.exports,
    require: (name: string) => name === "react" ? {
      useState: (initial: () => unknown) => [layout ??= initial(), (value: unknown) => { layout = value; }],
      useRef: (current: unknown) => refs[refIndex++] ??= { current },
      useEffect: (setup: () => () => void) => { cleanup ??= setup(); },
    } : name === "@tarojs/taro" ? { __esModule: true,
      useDidShow: (callback: () => void) => { show = callback; },
      useDidHide: (callback: () => void) => { hide = callback; },
      useResize: (callback: () => void) => { resize = callback; },
      default: { getCurrentInstance: () => ({ page: active }), getCurrentPages: () => active ? [active] : [],
        getWindowInfo: () => ({ windowHeight: 844, screenHeight: 844, safeArea: { bottom: 810 } }),
        // Taro's React adapter can retain a disposed instance after child Back.
        // The official native bar is owned by the actual Page instead.
        getTabBar: () => ({ show() {}, hide() {} }),
        nextTick: (callback: () => void) => { ticks.push(callback); } },
    } : { primaryNavigationLayout },
  });
  const render = () => { refIndex = 0; return module.exports.usePrimaryNavigation("pages/my/index"); };
  render();
  return { parent, child, changes, switches, shown, controller, render,
    activate: (page: typeof parent | undefined) => { active = page; }, show: () => show(), hide: () => hide(),
    resize: () => resize(), flush: () => ticks.splice(0).forEach(callback => callback()), unmount: () => cleanup!() };
}

test("a hidden parent rerender cannot acquire its child page; returning restores real navigation", async () => {
  for (const hiddenCurrent of ["child", "empty"] as const) {
    const h = mount(); h.show(); h.flush(); h.hide();
    h.activate(hiddenCurrent === "child" ? h.child : undefined); h.render(); h.resize();
    h.activate(h.parent); h.show(); h.flush();
    await h.controller.open("pages/map/index");
    assert.equal(h.switches.length, 1, "returning to My must enable its actual Map button");
    assert.equal(h.changes.at(-1)!.failed, "pages/map/index");
    assert.ok(h.shown.every(page => page === h.parent), "only the mounted native page owns this bar");
    h.unmount();
  }
});

test("queued first-mount resync and resize cannot claim a hidden or unmounted page", () => {
  const h = mount(); h.show(); const initial = h.shown.length;
  h.hide(); h.activate(h.child); h.render(); h.flush(); h.resize();
  assert.equal(h.shown.length, initial);
  h.activate(h.parent); h.show(); const returned = h.shown.length;
  h.unmount(); h.flush(); h.resize();
  assert.equal(h.shown.length, returned);
});
