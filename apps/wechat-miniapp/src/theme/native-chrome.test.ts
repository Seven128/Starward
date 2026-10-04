import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type { DisplayMode } from "@starward/miniapp-contracts";
import { NATIVE_CHROME_THEME } from "./design-tokens";

function chromeHarness(failure?: { errMsg: string }, initialRoute = "pages/map/index", navigateDuringStyle = false, failureMethod = "style", beforeComplete?: (method: string, values: Record<string, unknown>) => Promise<void>, synchronousFailure?: { method: string; color: string; error: unknown }) {
  const source = readFileSync(new URL("./native-chrome.ts", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace(/^export /gm, "");
  const calls: { method: string; values: Record<string, unknown> }[] = [];
  const applied: typeof calls = [];
  let route = initialRoute;
  const native = (method: string) => (values: Record<string, unknown>) => {
    calls.push({ method, values });
    if (method === synchronousFailure?.method && values.backgroundColor === synchronousFailure.color) throw synchronousFailure.error;
    return (async () => {
      if (beforeComplete) await beforeComplete(method, values);
      if (method === failureMethod && failure) throw failure;
      applied.push({ method, values });
      if (method === "style" && navigateDuringStyle) route = "spot/search/index";
    })();
  };
  const sync = vm.runInNewContext(ts.transpileModule(source + "\nsyncNativeChrome;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, { NATIVE_CHROME_THEME, Taro: {
    getCurrentPages: () => route ? [{ route }] : [],
    setBackgroundColor: native("background"),
    setNavigationBarColor: native("navigation"),
    setTabBarStyle: native("style"),
    setTabBarItem: native("item"),
  } }) as (mode: DisplayMode) => Promise<void>;
  return { sync, calls, applied, setRoute(value: string) { route = value; } };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

test("a late day native completion cannot leave day chrome after observation was requested", async () => {
  const oldStyle = deferred();
  const h = chromeHarness(undefined, "pages/map/index", false, "style", async (method, values) => {
    if (method === "style" && values.color === NATIVE_CHROME_THEME.DAY.color) await oldStyle.promise;
  });
  const day = h.sync("DAY");
  const observation = h.sync("OBSERVATION");
  await new Promise(resolve => setImmediate(resolve));
  oldStyle.resolve();
  await Promise.all([day, observation]);
  assert.equal(h.applied.filter(call => call.method === "style").at(-1)!.values.color, NATIVE_CHROME_THEME.OBSERVATION.color);
  const icons = h.calls.filter(call => call.method === "item");
  assert.equal(icons.length, 2);
  assert.ok(icons.every(call => String(call.values.iconPath).endsWith("-observation.png")));
});

test("a synchronous native throw cannot abandon writes already dispatched by that batch", async () => {
  const oldNavigation = deferred(), failure = { errMsg: "setBackgroundColor:fail unavailable" };
  const h = chromeHarness(undefined, "pages/map/index", false, "style", async (method, values) => {
    if (method === "navigation" && values.backgroundColor === NATIVE_CHROME_THEME.DAY.canvas) await oldNavigation.promise;
  }, { method: "background", color: NATIVE_CHROME_THEME.DAY.canvas, error: failure });
  const day = h.sync("DAY").catch(error => error), observation = h.sync("OBSERVATION");
  await new Promise(resolve => setImmediate(resolve));oldNavigation.resolve();
  assert.equal(await day, failure);await observation;
  assert.equal(h.applied.filter(call => call.method === "navigation").at(-1)!.values.backgroundColor, "#000000");
});

test("a failed native batch waits for its other writes then applies only the latest pending mode", async () => {
  const oldBackground = deferred();
  const failure = { errMsg: "setTabBarStyle:fail unavailable" };
  const h = chromeHarness(undefined, "pages/map/index", false, "style", async (method, values) => {
    if (method === "background" && values.backgroundColor === NATIVE_CHROME_THEME.DAY.canvas) await oldBackground.promise;
    if (method === "style" && values.color === NATIVE_CHROME_THEME.DAY.color) throw failure;
  });
  const day = h.sync("DAY").catch(error => error);
  const night = h.sync("NIGHT");
  const observation = h.sync("OBSERVATION");
  await new Promise(resolve => setImmediate(resolve));
  oldBackground.resolve();
  assert.equal(await day, failure);
  await Promise.all([night, observation]);
  assert.equal(h.calls.some(call => call.values.backgroundColor === NATIVE_CHROME_THEME.NIGHT.canvas), false);
  assert.equal(h.applied.filter(call => call.method === "background").at(-1)!.values.backgroundColor, NATIVE_CHROME_THEME.OBSERVATION.canvas);
});

test("queued chrome applies to the current child route without obsolete tab icons", async () => {
  const oldStyle = deferred();
  const h = chromeHarness(undefined, "pages/map/index", false, "style", async (method, values) => {
    if (method === "style" && values.color === NATIVE_CHROME_THEME.DAY.color) await oldStyle.promise;
  });
  const day = h.sync("DAY");
  h.setRoute("content/settings/index");
  const observation = h.sync("OBSERVATION");
  oldStyle.resolve();
  await Promise.all([day, observation]);
  assert.equal(h.calls.filter(call => call.method === "style").length, 1);
  assert.equal(h.calls.some(call => call.method === "item"), false);
  assert.equal(h.applied.filter(call => call.method === "background").at(-1)!.values.backgroundColor, "#000000");
});

test("native chrome uses the selected Field Signal palette and adopted day icons", async () => {
  const expected = {
    DAY: ["#FFFFFF", "#5E655F", "#4859B8", "#FFFFFF", ""],
    NIGHT: ["#11120F", "#989E94", "#D1D7FF", "#181A17", "-night"],
    OBSERVATION: ["#000000", "#D84A3C", "#FF6B58", "#110000", "-observation"],
  } as const;
  for (const mode of Object.keys(expected) as DisplayMode[]) {
    const h = chromeHarness();
    await h.sync(mode);
    const [canvas, color, selectedColor, backgroundColor, suffix] = expected[mode];
    const background = h.calls.find((call) => call.method === "background")!.values;
    const navigation = h.calls.find((call) => call.method === "navigation")!.values;
    assert.equal(navigation.frontColor, mode === "DAY" ? "#000000" : "#ffffff");
    assert.equal(navigation.backgroundColor, canvas);
    assert.deepEqual(Object.values(background), [canvas, canvas, canvas]);
    const style = h.calls.find((call) => call.method === "style")!.values;
    assert.equal(style.color, color);
    assert.equal(style.selectedColor, selectedColor);
    assert.equal(style.backgroundColor, backgroundColor);
    const icons = h.calls.filter((call) => call.method === "item");
    assert.equal(icons.length, 2);
    for (const [index, name] of ["map", "my"].entries()) {
      assert.equal(icons[index]!.values.index, index);
      const dayName = name === "map" ? "map" : "account-user";
      assert.equal(icons[index]!.values.iconPath, mode === "DAY" ? `assets/b-icons/weapp-tabbar/${dayName}--day--default.png` : `assets/icons/tab-${name}${suffix}.png`);
      assert.equal(icons[index]!.values.selectedIconPath, mode === "DAY" ? `assets/b-icons/weapp-tabbar/${dayName}--day--selected.png` : `assets/icons/tab-${name}-selected${suffix}.png`);
    }
  }
});

test("dark sky keeps readable native chrome in every mode without changing day Map", async () => {
  for (const mode of ["DAY", "NIGHT", "OBSERVATION"] as const) {
    const h = chromeHarness(undefined, "sky/detail/index");
    await h.sync(mode);
    const nav = h.calls.find(call => call.method === "navigation")!.values;
    assert.equal(nav.frontColor, "#ffffff");
    assert.equal(nav.backgroundColor, mode === "OBSERVATION" ? "#000000" : "#080D17");
    assert.equal(h.calls.some(call => call.method === "style"), false);
  }
  const map = chromeHarness();
  await map.sync("DAY");
  assert.equal(map.calls.find(call => call.method === "navigation")!.values.frontColor, "#000000");
});

test("a child route updates its background without unsupported tab item calls", async () => {
  const h = chromeHarness({ errMsg: "setTabBarStyle:fail not TabBar page" });
  await h.sync("OBSERVATION");
  assert.equal(h.calls.filter((call) => call.method === "background").length, 1);
  assert.equal(h.calls.some((call) => call.method === "item"), false);
});

test("non-tab routes and navigation during theme sync never request tab icons", async () => {
  for (const route of ["spot/search/index", "content/settings/index", ""]) {
    const h = chromeHarness(undefined, route);
    await h.sync("NIGHT");
    assert.deepEqual(h.calls.map(call => call.method).sort(), ["background", "navigation"]);
  }
  const h = chromeHarness(undefined, "pages/map/index", true);
  await h.sync("NIGHT");
  assert.equal(h.calls.filter(call => call.method === "style").length, 1);
  assert.equal(h.calls.some(call => call.method === "item"), false);
});

test("unexpected tab bar failure is still observable", async () => {
  const failure = { errMsg: "setTabBarStyle:fail unavailable" };
  const h = chromeHarness(failure);
  await assert.rejects(h.sync("DAY"), (error: unknown) => error === failure);
  assert.equal(h.calls.some((call) => call.method === "item"), false);
});

test("navigation after icon dispatch tolerates only the native non-tab-page rejection", async () => {
  const expected = chromeHarness({ errMsg: "setTabBarItem:fail not TabBar page" }, "pages/map/index", false, "item");
  await expected.sync("NIGHT");
  assert.equal(expected.calls.filter(call => call.method === "item").length, 2);
  const failure = { errMsg: "setTabBarItem:fail unavailable" };
  await assert.rejects(chromeHarness(failure, "pages/map/index", false, "item").sync("NIGHT"), (error: unknown) => error === failure);
});

test("a tolerated icon failure cannot hide another item's unexpected failure", async () => {
  const secondItem = deferred(), unexpected = { errMsg: "setTabBarItem:fail unavailable" };
  const h = chromeHarness(undefined, "pages/map/index", false, "item", async (method, values) => {
    if (method !== "item") return;
    if (values.index === 0) throw { errMsg: "setTabBarItem:fail not TabBar page" };
    await secondItem.promise;
    throw unexpected;
  });
  let settled = false;
  const result = h.sync("DAY").then(() => { settled = true; }, error => { settled = true; return error; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  assert.equal(h.calls.filter(call => call.method === "item").length, 2);
  secondItem.resolve();
  assert.equal(await result, unexpected);
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
