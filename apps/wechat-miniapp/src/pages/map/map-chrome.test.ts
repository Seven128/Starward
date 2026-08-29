import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const hookCode = ts.transpileModule(
  readFileSync(new URL("./use-map-chrome.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;

// Exercise the real hook's native-query/lifecycle boundary; this is not a render test.
function mount(width = 375, safeTop: number | undefined = 92) {
  const styles: Record<string, string>[] = [];
  const selectors: string[] = [];
  let tick!: () => void;
  let cleanup!: () => void;
  let receive!: (rects: unknown) => void;
  let shown!: () => void;
  let resized!: () => void;
  let revisions = 0;
  let stateIndex = 0;
  const query = {
    select(selector: string) { selectors.push(selector); return query; },
    boundingClientRect() { return query; },
    exec(callback: typeof receive) { receive = callback; },
  };
  const native = {
    getWindowInfo: () => ({ windowWidth: width }),
    nextTick(callback: () => void) { tick = callback; },
    createSelectorQuery: () => query,
    useDidShow(callback: () => void) { shown = callback; },
    useResize(callback: () => void) { resized = callback; },
  };
  const exports: Record<string, unknown> = {};
  vm.runInNewContext(hookCode, { exports, require(name: string) {
    if (name === "@tarojs/taro") return { default: native, ...native };
    if (name === "@/theme/native-metrics") return { nativeNavigationInsets: () => ({ safeTop }) };
    if (name === "react") return {
      useState(initial: unknown) { return [initial, stateIndex++ === 0
        ? () => { revisions++; } : (style: Record<string, string>) => styles.push(style)]; },
      useEffect(effect: () => () => void) { cleanup = effect(); },
    };
    throw new Error(`unexpected test dependency: ${name}`);
  } }, { timeout: 1000 });
  (exports.useMapChrome as (key: string) => unknown)("day:idle");
  return { styles, selectors, tick: () => tick(), cleanup: () => cleanup(),
    receive: (rects: unknown) => receive(rects), shown: () => shown(),
    resized: () => resized(), revisions: () => revisions };
}

test("map chrome places controls after measured wrapped content with flat native offsets", () => {
  for (const width of [320, 375, 390, 430]) {
    const view = mount(width);
    view.tick();
    assert.deepEqual(view.selectors, [".map-finder-anchor", ".map-conditions-anchor"]);
    for (const [finderHeight, conditionsHeight] of [[92, 44], [148, 76]] as const) {
      view.receive([{ height: finderHeight }, { height: conditionsHeight }]);
      const style = view.styles.at(-1)!;
      const finderTop = parseFloat(style["--map-finder-top"]!);
      const conditionsTop = parseFloat(style["--map-conditions-top"]!);
      const bottom = parseFloat(style["--map-chrome-bottom"]!);
      assert.equal(finderTop, 92 + 16 * width / 750);
      assert.ok(conditionsTop > finderTop + finderHeight);
      assert.ok(bottom > conditionsTop + conditionsHeight);
      assert.ok(Object.values(style).every(value => /^\d+(\.\d+)?px$/.test(value)));
    }
    view.shown(); view.resized();
    assert.equal(view.revisions(), 2);
  }
});

test("failed queries retain fallbacks and unmounted queries cannot write layout", () => {
  const view = mount(); view.tick();
  const first = { ...view.styles[0] };
  view.receive([null, { height: NaN }]);
  assert.deepEqual({ ...view.styles.at(-1) }, first);
  const count = view.styles.length;
  view.cleanup(); view.receive([{ height: 900 }, { height: 900 }]);
  assert.equal(view.styles.length, count);
  const beforeTick = mount(); beforeTick.cleanup(); beforeTick.tick();
  assert.equal(beforeTick.selectors.length, 0);
  const missing = mount(NaN); missing.tick(); missing.receive([]);
  assert.equal(Object.keys(missing.styles.at(-1)!).length, 0);
});
