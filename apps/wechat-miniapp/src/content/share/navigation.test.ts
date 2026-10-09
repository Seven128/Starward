import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createAccountOperationOwner } from "../../hooks/account-operation";

type Element = { type: string; props: Record<string, any> };
type Effect = { deps?: unknown[]; clean?: () => void };
function mount(kind: "SPOT" | "PLAN" | "MISSING") {
  const slots: any[] = [], effects: Array<() => void> = [], timers = new Map<number, () => void>();
  let cursor = 0, timerId = 0;
  const show: Array<() => void> = [], hide: Array<() => void> = [];
  let page: object | null = {}, getterThrows = false, dispatchThrows = false;
  let params: Record<string, string> = kind === "SPOT" ? { spotId: "public-spot" } : kind === "PLAN" ? { token: "public-token" } : {};
  let tree: Element;
  const calls: Array<{ url: string; resolve: () => void; reject: () => void }> = [];
  const point = { latitude: 31, longitude: 121 };
  const map = { selectedSpotId: null as string | null, viewport: null as unknown };
  const data = { kind, spotId: "public-spot", spotGcj02: point, name: "Public spot", spotName: "Public plan",
    events: [], expiresAt: new Date(Date.now() + 600_000).toISOString() };
  const actions = { setViewport: (v: unknown) => { map.viewport = v; }, requestSpotOpen: (id: string) => { map.selectedSpotId = id; } };
  const accountState = { ...actions, accountOwnerId: "account:public-reader", mapResetVersion: 0 };
  const appStore = Object.assign((select: (state: typeof accountState) => unknown) => select(accountState), {
    getState: () => accountState, subscribe: () => () => {},
  });
  const react = {
    useState: (initial: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = initial;
      return [slots[i], (next: any) => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef: (initial: unknown) => { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect: (setup: () => (() => void) | undefined, deps: unknown[]) => {
      const i = cursor++, previous: Effect | undefined = slots[i];
      if (!previous || deps.some((d, j) => d !== previous.deps?.[j])) effects.push(() => {
        previous?.clean?.(); slots[i] = { deps, clean: setup() };
      });
    },
  };
  const taro = { getCurrentPages: () => { if (getterThrows) throw Error("page stack unavailable"); return page ? [page] : []; },
    switchTab: ({ url }: { url: string }) => {
      if (dispatchThrows) throw Error("native dispatch unavailable");
      return new Promise<void>((resolve, reject) => calls.push({ url, resolve, reject: () => reject(Error("native rejected")) }));
    } };
  const module = { exports: {} as { default: () => Element } };
  const source = readFileSync(new URL("./index.tsx", import.meta.url), "utf8");
  const load = (source: string, module: { exports: any }) => vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, {
    module, exports: module.exports, Date, AbortController, encodeURIComponent, decodeURIComponent,
    setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; }, clearTimeout: (id: number) => timers.delete(id),
    require: (name: string) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { Fragment: "Fragment", jsx: (type: string, props: any) => ({ type, props }), jsxs: (type: string, props: any) => ({ type, props }) };
      if (name === "@tarojs/taro") return { __esModule: true, default: taro, useRouter: () => ({ params }),
        useDidShow: (fn: () => void) => { show.push(fn); }, useDidHide: (fn: () => void) => { hide.push(fn); }, useShareAppMessage: () => {} };
      if (name.endsWith("use-page-navigation")) {
        const owner = { exports: {} }; load(readFileSync(new URL("../../hooks/use-page-navigation.ts", import.meta.url), "utf8"), owner); return owner.exports;
      }
      if (name.endsWith("use-account-operation")) {
        const owner = { exports: {} }; load(readFileSync(new URL("../../hooks/use-account-operation.ts", import.meta.url), "utf8"), owner); return owner.exports;
      }
      if (name === "./account-operation") return { createAccountOperationOwner };
      if (name === "@tarojs/components") return { View: "View", Text: "Text", Button: "Button", ScrollView: "ScrollView" };
      if (name.endsWith("use-theme")) return { useMotionThemeClass: () => "theme-day" };
      if (name.endsWith("app-store")) return { useAppStore: appStore };
      if (name.endsWith("api-client")) return { getSharedSpot: async () => ({ data }), getSharedPlan: async () => ({ data, generatedAt: new Date().toISOString() }), MiniappApiError: Error,
        currentDraftUserId: () => accountState.accountOwnerId };
      if (name.endsWith("share-lifetime")) return { remainingPublicPlanLifetimeMs: () => 600_000 };
      if (name.endsWith("zoned-date")) return { displayZonedShareExpiry: () => "valid until" };
      if (name.endsWith("public-share-copy")) return { planSpotRiskMessage: () => null };
      if (name.endsWith(".scss")) return {};
      return Object.fromEntries(["SystemMotionProbe", "CustomNav", "FloatingNotificationHost", "Provenance", "StatusPanel", "SharePoster"].map(n => [n, n]));
    },
  });
  load(source, module);
  const render = () => { cursor = 0; show.length = hide.length = 0; tree = module.exports.default(); effects.splice(0).forEach(fn => fn()); };
  const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); render(); };
  const nodes = (node: any): Element[] => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const failure = () => nodes(tree).find(e => e.type === "StatusPanel" && e.props.title === "地图暂未打开");
  const open = () => {
    render(); const button = nodes(tree).find(e => e.type === "Button" && e.props.children === "在地图查看观星点");
    const missing = nodes(tree).find(e => e.type === "StatusPanel" && e.props.title === "分享不可用");
    assert.ok(button || missing); (button?.props.onClick ?? missing!.props.onRecover)(); render();
  };
  render(); show.forEach(fn => fn()); render();
  return { calls, map, point, settle, open, failure, hide: () => { hide.forEach(fn => fn()); render(); }, show: () => { show.forEach(fn => fn()); render(); },
    unmount: () => { slots.forEach(s => s?.clean?.()); }, empty: () => { page = null; }, restore: () => { page = {}; getterThrows = false; dispatchThrows = false; },
    leave: () => { page = {}; }, throwGetter: () => { getterThrows = true; }, throwDispatch: () => { dispatchThrows = true; },
    change: () => { params = {}; render(); }, expire: () => { [...timers.values()].forEach(fn => fn()); render(); } };
}

for (const kind of ["SPOT", "PLAN", "MISSING"] as const) {
  test(`${kind}: current failure explains Map navigation, retry preserves the intended destination`, async () => {
    const h = mount(kind); await h.settle(); h.open(); h.open(); assert.equal(h.calls.length, 1);
    h.calls[0]!.reject(); await h.settle(); assert.ok(h.failure());
    h.failure()!.props.onRecover(); await h.settle(); assert.equal(h.calls.length, 2); assert.equal(h.failure(), undefined);
    assert.equal(h.calls[1]!.url, "/pages/map/index");
    assert.equal(h.map.selectedSpotId, kind === "MISSING" ? null : "public-spot");
    if (kind !== "MISSING") assert.deepEqual(JSON.parse(JSON.stringify(h.map.viewport)), { center: h.point, zoom: 11 });
    h.calls[1]!.resolve(); await h.settle(); assert.equal(h.failure(), undefined); h.unmount();
  });
}
test("sync dispatch, absent page and throwing page lookup recover without duplicate navigation", async () => {
  const h = mount("SPOT"); await h.settle(); h.empty(); h.open(); assert.equal(h.calls.length, 0); assert.ok(h.failure());
  h.throwGetter(); h.open(); assert.equal(h.calls.length, 0); assert.ok(h.failure());
  h.restore(); h.throwDispatch(); h.open(); assert.equal(h.calls.length, 0); assert.ok(h.failure());
  h.restore(); h.open(); assert.equal(h.calls.length, 1); h.calls[0]!.resolve(); await h.settle(); h.unmount();
});
test("hide/show retires old failure and its finalizer cannot unlock the successor", async () => {
  const h = mount("SPOT"); await h.settle(); h.open(); h.hide(); h.show(); await h.settle(); h.open();
  assert.equal(h.calls.length, 2); h.calls[0]!.reject(); await h.settle(); assert.equal(h.failure(), undefined);
  h.open(); assert.equal(h.calls.length, 2); h.calls[1]!.reject(); await h.settle(); assert.ok(h.failure()); h.unmount();
});
test("changed public identity retires old failure and releases the old lock", async () => {
  const h = mount("SPOT"); await h.settle(); h.open(); h.change(); await h.settle(); h.open();
  assert.equal(h.calls.length, 2); h.calls[0]!.reject(); await h.settle(); assert.equal(h.failure(), undefined);
  h.calls[1]!.reject(); await h.settle(); assert.ok(h.failure()); h.unmount();
});
test("expiry permits safe missing-page return; old failure cannot revive the public card", async () => {
  const h = mount("PLAN"); await h.settle(); h.open(); h.expire(); h.open(); assert.equal(h.calls.length, 2);
  h.calls[0]!.reject(); await h.settle(); assert.equal(h.failure(), undefined);
  h.calls[1]!.resolve(); await h.settle(); h.unmount();
});
test("page replacement and unmount suppress late native failure", async () => {
  const h = mount("SPOT"); await h.settle(); h.open(); h.leave(); h.calls[0]!.reject(); await h.settle(); assert.equal(h.failure(), undefined);
  h.open(); h.unmount(); h.calls[1]!.reject(); await h.settle(); assert.equal(h.failure(), undefined);
});
