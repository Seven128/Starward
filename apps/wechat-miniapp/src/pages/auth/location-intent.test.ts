import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { primaryPageNativeRuntimeForTest } from "../../navigation/primary-page-navigation-test-support";

type Node = { type: string; props: Record<string, any> };
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}

function mount() {
  const values: any[] = [], refs: any[] = [], cleanups: Array<() => void> = [];
  let valueIndex = 0, refIndex = 0, initialized = false;
  let load!: (options?: object) => void, hide!: () => void, show!: () => void;
  let intent: ((action: unknown) => void) | undefined;
  const locationCalls: ReturnType<typeof deferred<any>>[] = [];
  const permissionCalls: ReturnType<typeof deferred<any>>[] = [];
  let readbacks = 0;
  const notifications: any[] = [];
  const listeners = new Set<(state: any, previous: any) => void>();
  let state = { accountOwnerId: "owner", mapResetVersion: 0, locationState: "DEFAULT_REGION" };
  const change = (next: Partial<typeof state>) => {
    const previous = state; state = { ...state, ...next };
    listeners.forEach(listener => listener(state, previous));
  };
  const store = Object.assign((selector: (s: any) => any) => selector(store.getState()), {
    getState: () => ({ ...state, setLocationState: (locationState: string) => change({ locationState }),
      resetMapToDefaultRegion: () => change({ mapResetVersion: state.mapResetVersion + 1, locationState: "DEFAULT_REGION" }),
      notify: (entry: unknown) => notifications.push(entry) }),
    subscribe: (listener: (state: any, previous: any) => void) => { listeners.add(listener); return () => listeners.delete(listener); },
  });
  const page = { route: "pages/auth/index", getOpenerEventChannel: () => ({ once: (_name: string, listener: (action: unknown) => void) => { intent = listener; } }) };
  const navigation = primaryPageNativeRuntimeForTest([page]);
  const taro = { ...navigation.taro,
    openSetting: () => { const pending = deferred<any>(); permissionCalls.push(pending); return pending.promise; },
    getSetting: async () => { readbacks++; return { authSetting: { "scope.userLocation": true } }; },
  };
  const module = { exports: {} as any };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./index.tsx", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, {
    module, exports: module.exports,
    require: (name: string) => {
      if (name === "react/jsx-runtime") return { jsx: (type: string, props: object) => ({ type, props }), jsxs: (type: string, props: object) => ({ type, props }) };
      if (name === "react") return {
        useState: (initial: any) => { const i = valueIndex++; if (!initialized) values[i] = initial; return [values[i], (value: any) => { values[i] = value; }]; },
        useRef: (initial: any) => { const i = refIndex++; return refs[i] ??= { current: initial }; },
        useEffect: (setup: () => () => void) => { if (!initialized) cleanups.push(setup()); },
      };
      if (name === "@tarojs/taro") return { __esModule: true,
        useLoad: (callback: typeof load) => { if (!initialized) load = callback; },
        useDidHide: (callback: typeof hide) => { hide = callback; }, useDidShow: (callback: typeof show) => { show = callback; },
        default: taro,
      };
      if (name.endsWith("primary-page-navigation")) return navigation.dispatcher;
      if (name === "@/state/app-store") return { useAppStore: store };
      if (name === "@/hooks/use-theme") return { useMotionThemeClass: () => "theme-day" };
      if (name === "@/services/one-shot-location") return { requestOneShotLocation: () => {
        const pending = deferred<any>(); locationCalls.push(pending); return pending.promise;
      } };
      if (name.endsWith(".scss")) return {};
      return new Proxy({}, { get: (_target, key) => key });
    },
  });
  const render = () => { valueIndex = refIndex = 0; const tree = module.exports.default(); initialized = true; return tree; };
  const find = (predicate: (node: Node) => boolean): Node => {
    const visit = (node: any): Node | undefined => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) { for (const child of node) { const found = visit(child); if (found) return found; } return; }
      if (predicate(node)) return node;
      return visit(node.props?.children);
    };
    const found = visit(render()); assert.ok(found); return found;
  };
  render();
  return { locationCalls, permissionCalls, notifications, load,
    send: (action: unknown) => { const next = intent; intent = undefined; next?.(action); },
    click: (label: string) => find(node => node.props?.label === label).props.onClick(),
    cancel: () => find(node => node.type === "StatusPanel").props.onRecover(),
    status: () => find(node => node.type === "StatusPanel").props,
    hide: () => hide(), show: () => show(), unmount: () => cleanups.forEach(cleanup => cleanup()),
    change, navigation, leave: () => { navigation.setStack([{ route: "content/article/detail/index" }]); },
    get state() { return state; }, get readbacks() { return readbacks; }, get navigations() { return navigation.calls.length; },
  };
}

test("permission-page URLs never request location; its opener command is consumed once", async () => {
  const page = mount(); page.load({ action: "locate" }); page.show();
  assert.equal(page.locationCalls.length, 0); assert.equal(page.permissionCalls.length, 0);
  assert.equal(page.status().state, "READY");
  page.send("locate"); page.send("locate"); page.click("请求一次当前位置");
  assert.equal(page.locationCalls.length, 1); assert.equal(page.status().recoveryLabel, "取消");
  page.locationCalls[0]!.resolve({ state: "GRANTED", center: { latitude: 20, longitude: 110 } }); await tick();
  assert.equal(page.state.locationState, "GRANTED");
  assert.match(page.status().detail, /地图未移动/);
  assert.equal(page.navigations, 0);
});

test("cancel, hide, unmount and changed account/reset retire late GPS results", async () => {
  for (const retire of ["cancel", "hide", "unmount", "owner", "reset"] as const) {
    const page = mount(); page.load(); page.send("locate");
    if (retire === "owner") page.change({ accountOwnerId: "later", locationState: "DEFAULT_REGION" });
    else if (retire === "reset") page.change({ mapResetVersion: 1, locationState: "DEFAULT_REGION" });
    else page[retire]();
    if (retire === "hide") page.show();
    const before = JSON.stringify({ state: page.state, notices: page.notifications });
    page.locationCalls[0]!.resolve({ state: "GRANTED", center: { latitude: 20, longitude: 110 } }); await tick();
    assert.equal(JSON.stringify({ state: page.state, notices: page.notifications }), before, retire);
    assert.notEqual(page.state.locationState, "REQUESTING");
  }
  const page = mount(); page.load(); page.hide(); page.show(); page.send("locate");
  assert.equal(page.locationCalls.length, 0, "a delayed opener command cannot revive after hide");
});

test("old GPS completion cannot release a newer request; manual default region remains usable", async () => {
  const page = mount(); page.load(); page.send("locate"); page.cancel(); page.click("请求一次当前位置");
  page.locationCalls[0]!.resolve({ state: "DENIED" }); await tick();
  assert.equal(page.state.locationState, "REQUESTING"); assert.equal(page.status().recoveryLabel, "取消");
  page.click("不获取位置，返回深圳试点地图"); await tick();
  assert.equal(page.navigations, 1); assert.equal(page.state.locationState, "DEFAULT_REGION");
  assert.equal(page.navigation.calls[0]?.kind, "reLaunch");
  assert.equal(page.navigation.calls[0]?.url, "/pages/map/index");
  page.navigation.calls[0]!.resolve(); await tick();
  page.click("不获取位置，返回深圳试点地图");
  assert.equal(page.navigations, 1, "acceptance does not finish the handoff or permit a second Map root");
  const map = { route: "pages/map/index" };
  page.hide(); page.navigation.setStack([map]); assert.equal(page.navigation.showMap(map), true); await tick();
  assert.equal(page.navigation.dispatcher.isPagePresentationForeground(map), true);
  page.locationCalls[1]!.resolve({ state: "GRANTED", center: { latitude: 20, longitude: 110 } }); await tick();
  assert.equal(page.state.locationState, "DEFAULT_REGION"); assert.equal(page.notifications.length, 0);
  page.navigation.dispose();
});

test("native permission handoff reads permission on return without requesting GPS", async () => {
  const page = mount(); page.load(); page.send("settings");
  assert.equal(page.permissionCalls.length, 1);
  page.hide(); page.show(); await tick();
  assert.equal(page.readbacks, 1); assert.equal(page.state.locationState, "AUTHORIZED");
  page.permissionCalls[0]!.resolve({ authSetting: { "scope.userLocation": false } }); await tick();
  assert.equal(page.state.locationState, "AUTHORIZED", "the old native callback cannot replace fresh return readback");
  assert.equal(page.locationCalls.length, 0);
  assert.match(page.status().detail, /尚未获取.*位置/);
});
