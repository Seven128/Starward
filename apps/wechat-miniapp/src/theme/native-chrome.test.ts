import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type { DisplayMode } from "@starward/miniapp-contracts";
import { NATIVE_CHROME_THEME } from "./design-tokens";

function chromeHarness(options: {
  route?: string;
  beforeComplete?(method: string, values: Record<string, unknown>): Promise<void>;
  synchronousFailure?: { method: string; color: string; error: unknown };
} = {}) {
  const source = readFileSync(new URL("./native-chrome.ts", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace(/^export /gm, "");
  const calls: { method: string; values: Record<string, unknown> }[] = [], applied: typeof calls = [];
  let route = options.route ?? "pages/map/index";
  const native = (method: string) => (values: Record<string, unknown>) => {
    calls.push({ method, values });
    if (method === options.synchronousFailure?.method && values.backgroundColor === options.synchronousFailure.color) throw options.synchronousFailure.error;
    return (async () => { await options.beforeComplete?.(method, values); applied.push({ method, values }); })();
  };
  const api = vm.runInNewContext(ts.transpileModule(source + "\n({sync: syncNativeChrome, retain: retainPhotoViewerNativeChrome});", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, { NATIVE_CHROME_THEME, Taro: {
    getCurrentPages: () => route ? [{ route }] : [],
    setBackgroundColor: native("background"), setNavigationBarColor: native("navigation"),
    // The official custom bar owns its rendering. Any retired native-bar call fails.
    setTabBarStyle() { throw new Error("retired native tab-bar owner"); },
    setTabBarItem() { throw new Error("retired native tab-bar owner"); },
  } }) as { sync(mode: DisplayMode): Promise<void>; retain(): { ready: Promise<void>; release(): Promise<void> } };
  return { ...api, calls, applied, setRoute(value: string) { route = value; } };
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

test("photo viewers use readable dark native chrome and restore each current page palette", async () => {
  for (const mode of ["DAY", "NIGHT", "OBSERVATION"] as const) {
    const h = chromeHarness(); await h.sync(mode);
    const viewer = h.retain(); await viewer.ready;
    const last = () => h.applied.filter(call => call.method === "navigation").at(-1)!.values;
    assert.equal(last().frontColor, "#ffffff"); assert.equal(last().backgroundColor, mode === "OBSERVATION" ? "#000000" : "#131419");
    await viewer.release();
    assert.equal(last().frontColor, mode === "DAY" ? "#000000" : "#ffffff");
    assert.equal(last().backgroundColor, NATIVE_CHROME_THEME[mode].canvas);
  }
});

test("theme changes beneath a viewer retain readable chrome then restore the latest mode", async () => {
  const h = chromeHarness({ route: "contribution/record/index" }); await h.sync("DAY");
  const viewer = h.retain(); await viewer.ready; await h.sync("NIGHT"); await h.sync("OBSERVATION");
  assert.equal(h.applied.filter(call => call.method === "navigation").at(-1)!.values.backgroundColor, "#000000");
  await viewer.release();
  assert.equal(h.applied.filter(call => call.method === "navigation").at(-1)!.values.backgroundColor, "#000000");
});

test("a viewer retired while native writes are pending cannot leave dark chrome on day Map", async () => {
  const oldNavigation = deferred();
  const h = chromeHarness({ beforeComplete: async (method, values) => {
    if (method === "navigation" && values.frontColor === "#000000") await oldNavigation.promise;
  } });
  const day = h.sync("DAY"), viewer = h.retain(), released = viewer.release();
  oldNavigation.resolve(); await Promise.all([day, viewer.ready, released]);
  const last = h.applied.filter(call => call.method === "navigation").at(-1)!.values;
  assert.equal(last.frontColor, "#000000"); assert.equal(last.backgroundColor, "#FFFFFF");
});

test("old or repeated viewer cleanup cannot clear a newer photo surface", async () => {
  const h = chromeHarness(); await h.sync("DAY");
  const first = h.retain(); await first.ready; const second = h.retain(); await second.ready;
  await first.release(); const count = h.calls.length; await first.release(); assert.equal(h.calls.length, count);
  assert.equal(h.applied.filter(call => call.method === "navigation").at(-1)!.values.frontColor, "#ffffff");
  await second.release(); assert.equal(h.applied.filter(call => call.method === "navigation").at(-1)!.values.frontColor, "#000000");
});

test("a failed viewer native write remains visible and cleanup restores day", async () => {
  const failure = { errMsg: "setNavigationBarColor:fail unavailable" }; let fail = true;
  const h = chromeHarness({ beforeComplete: async (method, values) => {
    if (fail && method === "navigation" && values.frontColor === "#ffffff") { fail = false; throw failure; }
  } });
  await h.sync("DAY"); const viewer = h.retain(); await assert.rejects(viewer.ready, error => error === failure);
  await viewer.release(); assert.equal(h.applied.filter(call => call.method === "navigation").at(-1)!.values.frontColor, "#000000");
  const next = h.retain(); await next.ready; assert.equal(h.applied.filter(call => call.method === "navigation").at(-1)!.values.frontColor, "#ffffff"); await next.release();
});

test("a late day completion cannot leave day native chrome after observation was requested", async () => {
  const oldBackground = deferred();
  const h = chromeHarness({ beforeComplete: async (method, values) => {
    if (method === "background" && values.backgroundColor === "#FFFFFF") await oldBackground.promise;
  } });
  const day = h.sync("DAY"), observation = h.sync("OBSERVATION");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls.some(call => call.values.backgroundColor === "#000000"), false, "pending mode waits for all dispatched day writes");
  oldBackground.resolve(); await Promise.all([day, observation]);
  assert.equal(h.applied.filter(call => call.method === "background").at(-1)!.values.backgroundColor, "#000000");
  assert.equal(h.applied.filter(call => call.method === "navigation").at(-1)!.values.backgroundColor, "#000000");
});

test("a synchronous native throw cannot abandon writes already dispatched by that batch", async () => {
  const oldNavigation = deferred(), failure = { errMsg: "setBackgroundColor:fail unavailable" };
  const h = chromeHarness({ beforeComplete: async (method, values) => {
    if (method === "navigation" && values.backgroundColor === "#FFFFFF") await oldNavigation.promise;
  }, synchronousFailure: { method: "background", color: "#FFFFFF", error: failure } });
  const day = h.sync("DAY").catch(error => error), observation = h.sync("OBSERVATION");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls.some(call => call.values.backgroundColor === "#000000"), false);
  oldNavigation.resolve(); assert.equal(await day, failure); await observation;
  assert.equal(h.applied.filter(call => call.method === "navigation").at(-1)!.values.backgroundColor, "#000000");
});

test("a failed native batch waits for other writes and applies only the latest pending mode", async () => {
  const oldBackground = deferred(), failure = { errMsg: "setNavigationBarColor:fail unavailable" };
  const h = chromeHarness({ beforeComplete: async (method, values) => {
    if (method === "background" && values.backgroundColor === "#FFFFFF") await oldBackground.promise;
    if (method === "navigation" && values.backgroundColor === "#FFFFFF") throw failure;
  } });
  const day = h.sync("DAY").catch(error => error), night = h.sync("NIGHT"), observation = h.sync("OBSERVATION");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls.some(call => call.values.backgroundColor === "#000000"), false);
  oldBackground.resolve(); assert.equal(await day, failure); await Promise.all([night, observation]);
  assert.equal(h.calls.some(call => call.values.backgroundColor === "#11120F"), false);
  assert.equal(h.applied.filter(call => call.method === "background").at(-1)!.values.backgroundColor, "#000000");
});

test("queued native chrome uses the current child route and selected canvas without native tab writes", async () => {
  const oldBackground = deferred();
  const h = chromeHarness({ beforeComplete: async (method, values) => {
    if (method === "background" && values.backgroundColor === "#FFFFFF") await oldBackground.promise;
  } });
  const day = h.sync("DAY"); h.setRoute("content/settings/index"); const observation = h.sync("OBSERVATION");
  oldBackground.resolve(); await Promise.all([day, observation]);
  assert.equal(h.applied.filter(call => call.method === "background").at(-1)!.values.backgroundColor, "#000000");
  for (const route of ["pages/map/index", "pages/my/index", "spot/search/index", "content/settings/index", ""]) {
    for (const mode of ["DAY", "NIGHT", "OBSERVATION"] as const) {
      const current = chromeHarness({ route }); await current.sync(mode);
      const canvas = NATIVE_CHROME_THEME[mode].canvas;
      assert.deepEqual(current.calls.map(call => call.method).sort(), ["background", "navigation"]);
      const nav = current.applied.find(call => call.method === "navigation")!.values;
      assert.equal(nav.backgroundColor, canvas); assert.equal(nav.frontColor, mode === "DAY" ? "#000000" : "#ffffff");
      assert.deepEqual(Object.values(current.applied.find(call => call.method === "background")!.values), [canvas, canvas, canvas]);
    }
  }
});

test("dark sky keeps readable native chrome in every mode without changing day Map", async () => {
  for (const mode of ["DAY", "NIGHT", "OBSERVATION"] as const) {
    const h = chromeHarness({ route: "sky/detail/index" }); await h.sync(mode);
    const nav = h.calls.find(call => call.method === "navigation")!.values;
    assert.equal(nav.frontColor, "#ffffff"); assert.equal(nav.backgroundColor, mode === "OBSERVATION" ? "#000000" : "#080D17");
  }
  const map = chromeHarness(); await map.sync("DAY");
  assert.equal(map.calls.find(call => call.method === "navigation")!.values.frontColor, "#000000");
});

test("deferred theme effects and returning pages apply the current mode, not the mounted mode", async () => {
  const source = readFileSync(new URL("../hooks/use-theme.ts", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace(/^export function/gm, "function");
  let mode: DisplayMode = "DAY";
  let onShow: (() => void) | undefined;
  const effects: Array<() => void> = [];
  const synced: DisplayMode[] = [];
  const state = () => ({ mode, preferences: { largeText: false, reducedMotion: false }, hydrate() {} });
  const store = Object.assign((selector: (value: ReturnType<typeof state>) => unknown) => selector(state()), { getState: state });
  const hook = vm.runInNewContext(ts.transpileModule(source + "\nuseThemeClass;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    useEffect(callback: () => void) { effects.push(callback); }, useDidShow(callback: () => void) { onShow = callback; },
    useAppStore: store, syncNativeChrome: async (value: DisplayMode) => { synced.push(value); }, console,
  }) as () => string;
  assert.equal(hook(), "theme-page theme-day");
  mode = "OBSERVATION";
  for (const effect of effects) effect();
  assert.ok(onShow);
  onShow();
  await Promise.resolve();
  assert.deepEqual(synced, ["OBSERVATION", "OBSERVATION"]);
});
