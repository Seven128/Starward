import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { primaryNavigationLayout } from "@/navigation/primary-navigation";

const source = readFileSync(new URL("./map-layer-sheet.tsx", import.meta.url), "utf8");
function harness(rows: unknown[], input = source) {
  let height: number | null = null;
  const callbacks: Array<(rows: unknown[]) => void> = [], cleanup: Array<() => void> = [];
  const query = { select() { return query; }, boundingClientRect() { return query; },
    exec(callback: (values: unknown[]) => void) { callbacks.push(callback); } };
  const render = vm.runInNewContext(ts.transpileModule(input.replace(/^import .*;\r?\n/gm, "").replace(/^export /gm, "") + "\nMapLayerSheet;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText, {
    React: { createElement() { return null; } }, View: "view", ScrollView: "scroll-view",
    useId: () => "test", useRef: (current: unknown) => ({ current }),
    useState: () => [height, (next: (value: number | null) => number | null) => { height = next(height); }],
    useCallback: (callback: unknown) => callback,
    useEffect(callback: () => () => void) { cleanup.push(callback()); }, useResize() {},
    primaryNavigationLayout,
    Taro: { nextTick(callback: () => void) { callback(); }, createSelectorQuery: () => query,
      getWindowInfo: () => ({ windowHeight: 844, screenHeight: 844, safeArea: { bottom: 810 } }) },
  }) as (props: Record<string, unknown>) => unknown;
  render({ cloud: true, children: null, footer: null, revision: "initial" });
  return { height: () => height, complete: () => callbacks.forEach(callback => callback(rows)),
    unmount: () => cleanup.forEach(callback => callback()) };
}

test("real workspace bounds long layer content; using full native window escapes the regression", () => {
  const rows = [{ height: 1000 }, { height: 50 }, { bottom: 100 }, { bottom: 410 }];
  const actual = harness(rows); actual.complete(); assert.equal(actual.height(), 298);
  const marker = "let viewport = rows?.[3]?.bottom;"; assert.equal(source.split(marker).length, 2);
  const mutant = harness(rows, source.replace(marker, "let viewport = Taro.getWindowInfo().windowHeight;"));
  mutant.complete(); assert.equal(mutant.height(), 560);
  assert.throws(() => assert.equal(mutant.height(), 298), "the prior full-window cap must fail the same requirement");
});

test("natural height and shared safe-area fallback stay bounded; retired measurements cannot commit", () => {
  const natural = harness([{ height: 200 }, { height: 50 }, { bottom: 100 }, { bottom: 756 }]);
  natural.complete(); assert.equal(natural.height(), 252);
  const fallback = harness([{ height: 1000 }, { height: 50 }, { bottom: 600 }, null]);
  fallback.complete(); assert.equal(fallback.height(), 144, "shared Map available height is 756, not native 844");
  const retired = harness([{ height: 1000 }, { height: 50 }, { bottom: 100 }, { bottom: 410 }]);
  retired.unmount(); retired.complete(); assert.equal(retired.height(), null);
});
