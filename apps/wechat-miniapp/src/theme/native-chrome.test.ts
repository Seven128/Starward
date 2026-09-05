import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type { DisplayMode } from "@starward/miniapp-contracts";

function chromeHarness(failure?: { errMsg: string }) {
  const source = readFileSync(new URL("./native-chrome.ts", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace("export async function", "async function");
  const calls: { method: string; values: Record<string, unknown> }[] = [];
  const native = (method: string) => async (values: Record<string, unknown>) => {
    calls.push({ method, values });
    if (method === "style" && failure) throw failure;
  };
  const sync = vm.runInNewContext(ts.transpileModule(source + "\nsyncNativeChrome;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, { Taro: {
    setBackgroundColor: native("background"),
    setTabBarStyle: native("style"),
    setTabBarItem: native("item"),
  } }) as (mode: DisplayMode) => Promise<void>;
  return { sync, calls };
}

test("native chrome uses the selected Field Signal palette and existing mode icons", async () => {
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
    assert.deepEqual(Object.values(background), [canvas, canvas, canvas]);
    const style = h.calls.find((call) => call.method === "style")!.values;
    assert.equal(style.color, color);
    assert.equal(style.selectedColor, selectedColor);
    assert.equal(style.backgroundColor, backgroundColor);
    const icons = h.calls.filter((call) => call.method === "item");
    assert.equal(icons.length, 2);
    for (const [index, name] of ["map", "my"].entries()) {
      assert.equal(icons[index]!.values.index, index);
      assert.equal(icons[index]!.values.iconPath, `assets/icons/tab-${name}${suffix}.png`);
      assert.equal(icons[index]!.values.selectedIconPath, `assets/icons/tab-${name}-selected${suffix}.png`);
    }
  }
});

test("a child route updates its background without unsupported tab item calls", async () => {
  const h = chromeHarness({ errMsg: "setTabBarStyle:fail not TabBar page" });
  await h.sync("OBSERVATION");
  assert.equal(h.calls.filter((call) => call.method === "background").length, 1);
  assert.equal(h.calls.some((call) => call.method === "item"), false);
});

test("unexpected tab bar failure is still observable", async () => {
  const failure = { errMsg: "setTabBarStyle:fail unavailable" };
  const h = chromeHarness(failure);
  await assert.rejects(h.sync("DAY"), (error: unknown) => error === failure);
  assert.equal(h.calls.some((call) => call.method === "item"), false);
});

test("returning to a page reapplies the current mode, not its mounted mode", async () => {
  const source = readFileSync(new URL("../hooks/use-theme.ts", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "").replace("export function", "function");
  let mode: DisplayMode = "DAY";
  let onShow: (() => void) | undefined;
  const synced: DisplayMode[] = [];
  const state = () => ({ mode, preferences: { largeText: false, reducedMotion: false }, hydrate() {} });
  const store = Object.assign((selector: (value: ReturnType<typeof state>) => unknown) => selector(state()), { getState: state });
  const hook = vm.runInNewContext(ts.transpileModule(source + "\nuseThemeClass;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    useEffect() {}, useDidShow(callback: () => void) { onShow = callback; },
    useAppStore: store, syncNativeChrome: async (value: DisplayMode) => { synced.push(value); }, console,
  }) as () => string;
  assert.equal(hook(), "theme-page theme-day");
  mode = "OBSERVATION";
  assert.ok(onShow);
  onShow();
  await Promise.resolve();
  assert.deepEqual(synced, ["OBSERVATION"]);
});
