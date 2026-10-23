import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const miniRequire = createRequire(new URL("../../package.json", import.meta.url));
const sourceRoot = new URL("../", import.meta.url);
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));
type NativePage = { route: string };
type NativeOptions = { url?: string; delta?: number; success?: (result: any) => void };
export type PresentationNativeCall = {
  kind: "navigateTo" | "navigateBack" | "reLaunch";
  url: string | undefined;
  options: NativeOptions;
  succeed(result?: unknown): void;
  fail(): void;
};

/** Actual installed React/Taro and whole production owners; only native, remote,
 * account storage and unrelated visual leaves are ports. No fake hook lifecycle. */
export async function pagePresentationForTest(options: {
  route?: string;
  primary?: "map" | "my";
  state?: Record<string, any>;
  modules?: Record<string, any>;
  params?: Record<string, string>;
  sourceOverrides?: Record<string, string>;
} = {}) {
  const previousEnv = { NODE_ENV: process.env.NODE_ENV, TARO_PLATFORM: process.env.TARO_PLATFORM, TARO_ENV: process.env.TARO_ENV };
  const flags = ["ENABLE_INNER_HTML", "ENABLE_ADJACENT_HTML", "ENABLE_CLONE_NODE", "ENABLE_CONTAINS", "ENABLE_SIZE_APIS", "ENABLE_TEMPLATE_CONTENT", "ENABLE_MUTATION_OBSERVER"];
  const previousFlags = new Map(flags.map(flag => [flag, Object.getOwnPropertyDescriptor(globalThis, flag)]));
  Object.assign(process.env, { NODE_ENV: "production", TARO_PLATFORM: "mini", TARO_ENV: "weapp" });
  for (const flag of flags) Object.assign(globalThis, { [flag]: false });
  // Explicit runtime paths avoid this workspace's declaration-only TS aliases.
  const React = miniRequire("./node_modules/react/index.js");
  const jsxRuntime = miniRequire("./node_modules/react/jsx-runtime.js");
  const runtime = miniRequire("@tarojs/runtime");
  const modules = { ...options.modules };
  const loaded = new Map<string, any>();
  const events = { show: new Set<() => void>(), hide: new Set<() => void>(), resize: new Set<() => void>() };
  const nativePage = { route: options.primary ? "pages/map/index" : options.route ?? "pages/my/index" };
  let stack: NativePage[] = [nativePage], getterThrows = false, dispatchThrows = false;
  let identity: string | null = Object.hasOwn(options.state ?? {}, "accountOwnerId") ? options.state!.accountOwnerId : "a";
  let params = options.params ?? {};
  const calls: PresentationNativeCall[] = [];
  const notices: unknown[] = [];
  const warnings: unknown[][] = [];
  const listeners = new Set<(...args: any[]) => void>();
  const timers = new Map<number, { callback: () => void; delay: number | undefined }>();
  let timerId = 0, mounted = false, disposed = false;
  const store = miniRequire("zustand/vanilla").createStore(() => ({
    accountOwnerId: identity, mapResetVersion: 0, preferences: {}, mode: "DAY", notifications: [],
    locationState: "DEFAULT_REGION", notify: (notice: unknown) => notices.push(notice),
    ...options.state,
  }));
  let useStore: any;
  const useAppStore = (selector: (state: any) => unknown) => {
    useStore ??= compile(readFileSync(miniRequire.resolve("zustand/react"), "utf8"), name => name === "react" ? React : miniRequire(name)).useStore;
    return useStore(store, selector);
  };
  Object.assign(useAppStore, { getState: store.getState, subscribe(listener: (...args: any[]) => void) {
    listeners.add(listener);
    const unsubscribe = store.subscribe(listener);
    return () => { listeners.delete(listener); unsubscribe(); };
  } });
  const lifecycle = (set: Set<() => void>, callback: () => void) => {
    const latest = React.useRef(callback); latest.current = callback;
    React.useLayoutEffect(() => { const run = () => latest.current(); set.add(run); return () => set.delete(run); }, []);
  };
  const dispatch = (kind: PresentationNativeCall["kind"], nativeOptions: NativeOptions) => {
    if (dispatchThrows) throw Error("native dispatch unavailable");
    return new Promise<void>((resolve, reject) => calls.push({ kind, url: nativeOptions.url, options: nativeOptions,
      succeed(result = {}) { nativeOptions.success?.(result); resolve(); },
      fail() { reject(Error("native navigation rejected")); },
    }));
  };
  const taro = {
    getCurrentInstance: () => ({ page: nativePage }),
    getCurrentPages: () => { if (getterThrows) throw Error("page stack unavailable"); return stack; },
    useDidShow: (fn: () => void) => lifecycle(events.show, fn),
    useDidHide: (fn: () => void) => lifecycle(events.hide, fn),
    useResize: (fn: () => void) => lifecycle(events.resize, fn),
    nextTick: (fn: () => void) => queueMicrotask(fn),
    useRouter: () => ({ params }), useShareAppMessage() {},
    navigateTo: (value: NativeOptions) => dispatch("navigateTo", value),
    navigateBack: (value: NativeOptions = {}) => dispatch("navigateBack", value),
    reLaunch: (value: NativeOptions) => dispatch("reLaunch", value),
  };
  function compile(source: string, resolve: (name: string) => any, nativeTimers = false) {
    const compiled = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    }, reportDiagnostics: true });
    assert.equal(compiled.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
    const module = { exports: {} as any };
    vm.runInNewContext("(function(exports,require,module){" + compiled.outputText + "\n})", {
      process, console: { ...console, warn: (...args: unknown[]) => warnings.push(args) }, queueMicrotask, performance, AbortController, Date,
      setTimeout: nativeTimers ? setTimeout : (callback: () => void, delay?: number) => {
        const id = ++timerId; timers.set(id, { callback, delay }); return id;
      },
      clearTimeout: nativeTimers ? clearTimeout : (id: number) => { timers.delete(id); },
    })(module.exports, resolve, module);
    return module.exports;
  }
  function load(path: string): any {
    if (loaded.has(path)) return loaded.get(path);
    const url = new URL(path, sourceRoot);
    const result = compile(options.sourceOverrides?.[path] ?? readFileSync(url, "utf8"), name => {
      if (Object.hasOwn(modules, name)) return modules[name];
      if (name === "react") return React;
      if (name === "react/jsx-runtime") return jsxRuntime;
      if (name === "@tarojs/taro") return { __esModule: true, default: taro, ...taro };
      if (name === "@tarojs/components") return { View: "view", Text: "text", ScrollView: "scroll-view", Button: "button" };
      if (name === "@/state/app-store") return { useAppStore };
      if (name === "@/services/api-client") return { currentDraftUserId: () => identity, ...modules.api };
      if (name.endsWith(".scss")) return {};
      const dependency = name.startsWith("@/") ? new URL(name.slice(2), sourceRoot) : name.startsWith(".") ? new URL(name, url) : null;
      if (!dependency) throw Error(`Unprovided presentation port: ${name} (${path})`);
      if (dependency.pathname.endsWith(".json")) return JSON.parse(readFileSync(dependency, "utf8"));
      for (const extension of [".ts", ".tsx"]) {
        const file = new URL(dependency.href + extension);
        if (existsSync(file)) return load(file.href.slice(sourceRoot.href.length));
      }
      throw Error(`Missing presentation dependency: ${name} (${path})`);
    });
    loaded.set(path, result); return result;
  }
  const renderer = compile(readFileSync(miniRequire.resolve("@tarojs/react"), "utf8"), name => name === "react" ? React : miniRequire(name), true);
  const root = runtime.document.createElement("root");
  root.ctx = { setData(_data: unknown, callback?: () => void) { callback?.(); } };
  const dispatcher = load("navigation/primary-page-navigation.ts");
  const presentation = load("navigation/page-presentation.tsx");
  const controller = load("navigation/primary-navigation-controller.ts").createPrimaryNavigationController({ currentPage: () => taro.getCurrentPages().at(-1) });
  let detach: (() => void) | undefined;
  if (options.primary) { detach = dispatcher.registerPrimaryMapHost(controller); controller.show(nativePage); if (options.primary === "my") controller.openMy(); }
  const my = presentation.createPrimaryPagePresentation(controller, "pages/my/index", presentation.createPresentedPageBack());
  const Provider = ({ children }: { children: unknown }) => {
    React.useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
    return React.createElement(presentation.PagePresentationProvider, { value: my.snapshot() }, children);
  };
  let Component: any;
  const tree = () => options.primary === "my" ? React.createElement(Provider, null, React.createElement(Component)) : React.createElement(Component);
  const settle = async () => { await tick(); await tick(); };
  const update = async (action: () => void) => { renderer.flushSync(action); await settle(); };
  const render = async (component?: any) => {
    if (component) Component = component;
    if (disposed || !Component) return;
    renderer.flushSync(() => renderer.render(tree(), root)); mounted = true; await settle();
  };
  const unmount = async () => {
    if (!mounted) return;
    renderer.flushSync(() => renderer.unmountComponentAtNode(root)); mounted = false; await settle();
  };
  const leaves = new Map<string, any[]>();
  const leaf = (name: string) => (props: any) => {
    React.useLayoutEffect(() => {
      const values = leaves.get(name) ?? []; values.push(props); leaves.set(name, values);
      return () => { const index = values.indexOf(props); if (index >= 0) values.splice(index, 1); };
    });
    return React.createElement("view", { "data-fixture-leaf": name }, props.children);
  };
  return { React, create: React.createElement, root, load, modules, leaf, leaves, render, update, settle,
    nativePage, calls, notices, warnings, listeners, store, controller, dispatcher, timers, taro, unmount,
    setStack(value: NativePage[]) { stack = value; },
    emptyStack() { stack = []; },
    restoreStack() { stack = [nativePage]; getterThrows = dispatchThrows = false; },
    replacePage() { stack = [{ route: nativePage.route }]; },
    mismatchIdentity(value: string | null) { identity = value; },
    throwGetter(value = true) { getterThrows = value; },
    throwDispatch(value = true) { dispatchThrows = value; },
    async changeState(patch: Record<string, any>) { await update(() => store.setState(patch)); },
    async bind(owner: string | null) {
      identity = owner;
      await update(() => store.setState({ accountOwnerId: owner, mapResetVersion: store.getState().mapResetVersion + 1 }));
    },
    async params(value: Record<string, string>) { params = value; await render(); },
    async hide() { await update(() => { if (options.primary) controller.hide(); for (const fn of [...events.hide]) fn(); }); },
    async show() { await update(() => { if (options.primary) controller.show(nativePage); for (const fn of [...events.show]) fn(); }); },
    async resize() { await update(() => { for (const fn of [...events.resize]) fn(); }); },
    async cycle(beforeCommit: () => void) {
      await update(() => {
        if (options.primary) controller.hide();
        for (const fn of [...events.hide]) fn();
        if (options.primary) controller.show(nativePage);
        for (const fn of [...events.show]) fn();
        beforeCommit();
      });
    },
    async arriveMap() {
      await update(() => {
        if (!detach) detach = dispatcher.registerPrimaryMapHost(controller);
        const map = nativePage.route === "pages/map/index" ? nativePage : { route: "pages/map/index" };
        stack = [map]; controller.show(map);
      });
    },
    async fire(timer: number) { await update(() => { const entry = timers.get(timer); timers.delete(timer); entry?.callback(); }); },
    async expire() { await update(() => { for (const [id, entry] of [...timers]) { timers.delete(id); entry.callback(); } }); },
    async dispose() {
      if (disposed) return;
      disposed = true; await unmount(); detach?.(); controller.dispose();
      for (const [name, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
      for (const [name, descriptor] of previousFlags) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
    },
  };
}
