import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const miniRequire = createRequire(new URL("../../package.json", import.meta.url));
const sourceRoot = new URL("../", import.meta.url);
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/** Complete production modules and the installed renderer; only native/remote ports are controlled. */
async function harness() {
  const previousEnv = { NODE_ENV: process.env.NODE_ENV, TARO_PLATFORM: process.env.TARO_PLATFORM, TARO_ENV: process.env.TARO_ENV };
  const flags = ["ENABLE_INNER_HTML", "ENABLE_ADJACENT_HTML", "ENABLE_CLONE_NODE", "ENABLE_CONTAINS", "ENABLE_SIZE_APIS", "ENABLE_TEMPLATE_CONTENT", "ENABLE_MUTATION_OBSERVER"];
  const previousFlags = new Map(flags.map(flag => [flag, Object.getOwnPropertyDescriptor(globalThis, flag)]));
  Object.assign(process.env, { NODE_ENV: "production", TARO_PLATFORM: "mini", TARO_ENV: "weapp" });
  for (const flag of flags) Object.assign(globalThis, { [flag]: false });
  // npm workspace tests load this tsconfig, whose React paths point to types.
  // Select installed package bytes explicitly instead of asking tsx to resolve
  // a bare React name from an authoring file.
  const packageFile = (name: string, file: string) => fileURLToPath(new URL(file, pathToFileURL(miniRequire.resolve(name + "/package.json"))));
  const React = miniRequire(packageFile("react", "index.js")), runtime = miniRequire("@tarojs/runtime");
  let jsxRuntime: any, reconciler: any;
  const loaded = new Map<string, any>();
  const events = { show: new Set<() => void>(), hide: new Set<() => void>() };
  const map = { route: "pages/map/index" }, child = { route: "content/settings/index" };
  let stack: Array<{ route: string }> = [map];
  const timers = new Map<number, { callback: () => void; delay: number }>();
  let timerId = 0;
  const store = miniRequire("zustand/vanilla").createStore(() => ({
    userId: "a", accountOwnerId: "a", mapResetVersion: 0, notifications: [] as any[],
    dismissNotification(id: string) { store.setState((s: any) => ({ notifications: s.notifications.filter((n: any) => n.id !== id) })); },
  }));
  // The workspace root has a different React; bind the installed Zustand adapter
  // to this Mini Program renderer's React, as the WEAPP bundler does.
  let useStore: any;
  const useAppStore = (selector: (state: any) => unknown) => {
    useStore ??= compile(readFileSync(miniRequire.resolve("zustand/react"), "utf8"), name => name === "react" ? React : miniRequire(name)).useStore;
    return useStore(store, selector);
  };
  Object.assign(useAppStore, { getState: store.getState, subscribe: store.subscribe });
  const lifecycle = (set: Set<() => void>, callback: () => void) => {
    const latest = React.useRef(callback); latest.current = callback;
    React.useLayoutEffect(() => { const run = () => latest.current(); set.add(run); return () => set.delete(run); }, []);
  };
  const taro = {
    getCurrentInstance: () => ({ page: map }), getCurrentPages: () => stack,
    useDidShow: (fn: () => void) => lifecycle(events.show, fn),
    useDidHide: (fn: () => void) => lifecycle(events.hide, fn),
    useResize: () => {}, nextTick: (fn: () => void) => queueMicrotask(fn),
    createIntersectionObserver: () => ({ relativeTo() { return this; }, relativeToViewport() { return this; },
      observe(_selector: string, callback: (value: { intersectionRatio: number }) => void) { callback({ intersectionRatio: 1 }); }, disconnect() {} }),
  };
  const environment = { process, console, queueMicrotask, performance, AbortController,
    setTimeout(callback: () => void, delay: number) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id: number) { timers.delete(id); } };
  function compile(source: string, resolve: (name: string) => any, nativeTimers = false) {
    const compiled = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    }, reportDiagnostics: true });
    assert.equal(compiled.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
    const module = { exports: {} as any };
    vm.runInNewContext("(function(exports,require,module){" + compiled.outputText + "\n})", {
      ...environment, ...(nativeTimers ? { setTimeout, clearTimeout } : {}),
    })(module.exports, resolve, module);
    return module.exports;
  }
  function load(path: string): any {
    if (loaded.has(path)) return loaded.get(path);
    const url = new URL(path, sourceRoot);
    const result = compile(readFileSync(url, "utf8"), name => {
      if (name === "react") return React;
      if (name === "react/jsx-runtime") return jsxRuntime ??= compile(readFileSync(packageFile("react", "cjs/react-jsx-runtime.production.min.js"), "utf8"), name => name === "react" ? React : miniRequire(name));
      if (name === "@tarojs/taro") return { __esModule: true, default: taro, ...taro };
      if (name === "@tarojs/components") return { View: "view", Text: "text", ScrollView: "scroll-view", PageContainer: "page-container" };
      if (name === "@/state/app-store") return { useAppStore };
      if (name === "@/services/api-client") return { currentDraftUserId: () => store.getState().userId };
      if (name === "@/theme/native-metrics") return { nativeNavigationInsets: () => ({ safeTop: 24 }) };
      if (name.endsWith("shared-button-press")) return { SharedButton: "button" };
      if (name.endsWith("semantic-asset")) return { SemanticIcon: "icon" };
      if (name.startsWith("@/")) return load(name.slice(2) + (name.endsWith("page-presentation") ? ".tsx" : ".ts"));
      const dependency = new URL(name, url);
      if (dependency.pathname.endsWith(".json")) return JSON.parse(readFileSync(dependency, "utf8"));
      const relative = dependency.href.slice(sourceRoot.href.length);
      for (const extension of [".ts", ".tsx"]) {
        try { readFileSync(new URL(relative + extension, sourceRoot)); }
        catch { continue; }
        return load(relative + extension);
      }
      throw Error(`Unexpected presentation dependency: ${name}`);
    });
    loaded.set(path, result); return result;
  }
  const renderer = compile(readFileSync(miniRequire.resolve("@tarojs/react"), "utf8"), name => {
    if (name === "react") return React;
    if (name === "react-reconciler") return reconciler ??= compile(readFileSync(packageFile("react-reconciler", "cjs/react-reconciler.production.min.js"), "utf8"), name => name === "react" ? React : miniRequire(name), true);
    return miniRequire(name);
  }, true);
  const root = runtime.document.createElement("root");
  root.ctx = { setData(_data: unknown, callback?: () => void) { callback?.(); } };
  const dispatcher = load("navigation/primary-page-navigation.ts");
  const controller = load("navigation/primary-navigation-controller.ts").createPrimaryNavigationController({ currentPage: () => stack.at(-1) });
  const detach = dispatcher.registerPrimaryMapHost(controller);
  controller.show(map);
  const presentation = load("navigation/page-presentation.tsx");
  const back = presentation.createPresentedPageBack();
  const my = presentation.createPrimaryPagePresentation(controller, "pages/my/index", back);
  const create = React.createElement;
  const render = async (Component: any) => {
    renderer.flushSync(() => renderer.render(create(Component), root));
    await tick(); await tick();
  };
  const update = async (action: () => void) => { renderer.flushSync(action); await tick(); await tick(); };
  const Provider = ({ children }: { children: unknown }) => {
    React.useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
    return create(presentation.PagePresentationProvider, { value: my.snapshot() }, children);
  };
  return { React, create, render, update, Provider, load, controller, dispatcher, presentation, back, map, child, root, timers, store,
    element: (id: string) => runtime.eventSource.get(id),
    setStack(value: Array<{ route: string }>) { stack = value; },
    async hide() { await update(() => { controller.hide(); for (const fn of [...events.hide]) fn(); }); },
    async show() { await update(() => { controller.show(map); for (const fn of [...events.show]) fn(); }); },
    async dispose() {
      renderer.flushSync(() => renderer.unmountComponentAtNode(root)); await tick(); detach(); controller.dispose();
      for (const [name, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
      for (const [name, descriptor] of previousFlags) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
    },
  };
}

test("real React lifecycle suspends a mounted My, preserves native-child epoch and retires logical navigation", async () => {
  const h = await harness();
  try {
    const lifecycle: string[] = [];
    let page: any, navigation: any;
    const usePageNavigation = h.load("hooks/use-page-navigation.ts").usePageNavigation;
    function Consumer() {
      page = h.presentation.usePresentedPageLifecycle({ show: () => lifecycle.push("show"), hide: () => lifecycle.push("hide") });
      navigation = usePageNavigation();
      return h.create("view", { id: "presented-my" });
    }
    function Fixture() { return h.create(h.Provider, null, h.create(Consumer)); }
    await h.render(Fixture);
    assert.equal(page.visible, false); assert.deepEqual(lifecycle, []);
    await h.update(() => h.controller.openMy());
    assert.equal(page.isCurrent(), true); assert.deepEqual(lifecycle, ["show"]);
    const epoch = page.identity(), accepted = navigation.begin(); assert(accepted?.active());
    h.setStack([h.map, h.child]); await h.hide();
    assert.equal(page.visible, false); assert.equal(page.identity(), epoch);
    assert.equal(accepted.active(), false); assert.equal(accepted.completed(), true);
    h.setStack([h.map]); await h.show();
    assert.equal(page.identity(), epoch); assert.equal(accepted.completed(), true);
    accepted.release();
    const retired = navigation.begin(); assert(retired?.active());
    await h.update(() => h.controller.closeMy());
    assert.equal(retired.completed(), false);
    assert.equal(h.controller.isForeground("pages/map/index"), false, "Map stays suspended through My exit");
    await h.update(() => h.controller.openMy());
    assert.notEqual(page.identity(), epoch); assert.equal(retired.completed(), false);
    assert.deepEqual(lifecycle, ["show", "hide", "show", "hide", "show"]);
  } finally { await h.dispose(); }
});

test("known native media callback before didShow keeps the same My account operation", async () => {
  const h = await harness();
  try {
    let operations: any;
    const busy: boolean[] = [];
    const useAccountOperation = h.load("hooks/use-account-operation.ts").useAccountOperation;
    function Consumer() { operations = useAccountOperation("avatar", (value: boolean) => busy.push(value)); return h.create("view"); }
    function Fixture() { return h.create(h.Provider, null, h.create(Consumer)); }
    await h.update(() => h.controller.openMy()); await h.render(Fixture);
    const operation = operations.begin(); assert(operation?.isCurrent());
    let resolve!: (value: string) => void;
    const native = operation.native(() => new Promise<string>(done => { resolve = done; }));
    await h.hide();
    resolve("chosen"); assert.equal(await native, "chosen");
    assert.equal(operation.isCurrent(), true, "known native() may callback before the real didShow");
    await h.show(); assert.equal(operation.isCurrent(), true); operation.release();
    assert.deepEqual(busy, [true, false]);
  } finally { await h.dispose(); }
});

test("logical My edit Back registers at the one native owner and consumes one active task", async () => {
  const h = await harness();
  try {
    const NativeBackBoundary = h.load("components/native-back-boundary.tsx").NativeBackBoundary;
    let setEdit!: (open: boolean) => void, closeCalls = 0;
    function Child() {
      const [editing, update] = h.React.useState(true); setEdit = update;
      return h.create(NativeBackBoundary, { active: editing, onBack: () => { closeCalls++; update(false); } });
    }
    function Fixture() { return h.create(h.Provider, null, h.create(Child)); }
    await h.update(() => h.controller.openMy()); await h.render(Fixture);
    assert.equal(h.root.childNodes.length, 0, "the My edit must not add a second PageContainer");
    let handled!: Promise<boolean>, duplicate!: Promise<boolean>;
    await h.update(() => { handled = h.back.handle(); duplicate = h.back.handle(); });
    assert.equal(handled, duplicate); assert.equal(await handled, true); assert.equal(closeCalls, 1);
    assert.equal(await h.back.handle(), false, "committed editor close leaves My for the next Back");
    await h.update(() => setEdit(true)); assert.equal(await h.back.handle(), true); assert.equal(closeCalls, 2);
    assert.equal(h.controller.getSnapshot().route, "pages/my/index");
  } finally { await h.dispose(); }
});

test("retained native allowance cannot begin hidden work or revive a changed logical/native Page", async () => {
  for (const reason of ["native-child", "logical-switch"]) {
    const h = await harness();
    try {
      let operations: any;
      const useAccountOperation = h.load("hooks/use-account-operation.ts").useAccountOperation;
      function Consumer() { operations = useAccountOperation("avatar", () => {}); return h.create("view"); }
      function Fixture() { return h.create(h.Provider, null, h.create(Consumer)); }
      await h.update(() => h.controller.openMy()); await h.render(Fixture);
      const operation = operations.begin(); assert(operation?.isCurrent());
      let resolve!: () => void;
      const native = operation.native(() => new Promise<void>(done => { resolve = done; }));
      await h.hide(); assert.equal(operations.begin(), undefined, "native return allowance never authorizes a new hidden intent");
      if (reason === "native-child") h.setStack([h.map, h.child]);
      else {
        await h.show(); await h.update(() => h.controller.closeMy()); await h.update(() => h.controller.openMy());
      }
      assert.equal(operation.isCurrent(), false, reason);
      resolve(); await native; h.setStack([h.map]); await h.show();
      assert.equal(operation.isCurrent(), false, reason + " stays retired after return");
    } finally { await h.dispose(); }
  }
});

test("same-account renewal uses actual subscriptions without retiring the retained My operation", async () => {
  const h = await harness();
  try {
    let operations: any;
    const useAccountOperation = h.load("hooks/use-account-operation.ts").useAccountOperation;
    function Consumer() { operations = useAccountOperation("nickname", () => {}); return h.create("view"); }
    function Fixture() { return h.create(h.Provider, null, h.create(Consumer)); }
    await h.update(() => h.controller.openMy()); await h.render(Fixture);
    const operation = operations.begin(); assert(operation?.isCurrent());
    await operation.renewSession(async () => {
      await h.update(() => h.store.setState({ userId: null, accountOwnerId: null, mapResetVersion: 1 }));
      assert.equal(operation.isCurrent(), true);
      await h.update(() => h.store.setState({ userId: "a", accountOwnerId: "a", mapResetVersion: 2 }));
      assert.equal(operation.isCurrent(), true);
    });
    assert.equal(operation.isCurrent(), true); operation.release();
  } finally { await h.dispose(); }
});

test("one foreground notification host owns the current route and its visible timer", async () => {
  const h = await harness();
  try {
    const FloatingNotificationHost = h.load("components/notification.tsx").FloatingNotificationHost;
    const route = h.load("state/notification-page-route.ts").currentNotificationPageRoute;
    const notifications = h.load("state/notification.ts");
    let queue: any[] = [];
    for (const [id, pageRoute] of [["map-review", "pages/map/index"], ["my-review", "pages/my/index"]]) {
      queue = notifications.enqueueNotification(queue, { id, pageRoute, placement: "floating", owner: "review", tone: "info", title: id, body: "" }, 1);
    }
    h.store.setState({ notifications: queue });
    function Fixture() { return h.create(h.React.Fragment, null,
      h.create(FloatingNotificationHost), h.create(h.Provider, null, h.create(FloatingNotificationHost))); }
    const visibleTimerCount = () => [...h.timers.values()].filter(timer => timer.delay === 3000).length;
    await h.render(Fixture);
    assert.equal(route(), "pages/map/index"); assert(h.element("notification-floating-map-review"));
    assert.equal(h.element("notification-floating-my-review"), undefined); assert.equal(visibleTimerCount(), 1);
    await h.update(() => h.controller.openMy());
    assert.equal(route(), "pages/my/index"); assert(h.element("notification-floating-my-review"));
    assert.equal(h.element("notification-floating-map-review"), undefined); assert.equal(visibleTimerCount(), 1);
    await h.hide(); assert.equal(visibleTimerCount(), 0); assert.equal(h.element("notification-floating-my-review"), undefined);
    await h.show(); assert.equal(visibleTimerCount(), 1); assert.equal(route(), "pages/my/index");
    await h.update(() => h.controller.closeMy()); assert.equal(visibleTimerCount(), 0);
    await h.update(() => h.controller.finishTransition(h.controller.getSnapshot().transitionTicket));
    assert.equal(route(), "pages/map/index"); assert.equal(visibleTimerCount(), 1);
    assert.equal(h.store.getState().notifications.length, 2, "hiding does not dismiss unread queued messages");
  } finally { await h.dispose(); }
});
