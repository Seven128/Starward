import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import type * as NativeMetrics from "./native-metrics";

// Run the actual module with only its native platform import substituted.
// Node cannot load the WEAPP runtime's compile-time globals.
const moduleExports: Record<string, unknown> = {};
vm.runInNewContext(ts.transpileModule(
  readFileSync(new URL("./native-metrics.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText, { exports: moduleExports, require: () => ({}) }, { timeout: 1000 });
const nativeNavigationInsets = moduleExports.nativeNavigationInsets as typeof NativeMetrics.nativeNavigationInsets;

test("navigation clears both native status bar and capsule across device widths", () => {
  for (const windowWidth of [320, 375, 390, 430]) {
    for (const statusBarHeight of [0, 20, 44, 59]) {
      const bottom = statusBarHeight + 40;
      const result = nativeNavigationInsets({
        getWindowInfo: () => ({ windowWidth, statusBarHeight }),
        getMenuButtonBoundingClientRect: () => ({ bottom }),
      });
      assert.equal(result.statusBarHeight, statusBarHeight);
      assert.equal(result.safeTop, Math.max(bottom + 4, statusBarHeight + windowWidth * 96 / 750));
    }
  }
});

test("missing or invalid native metrics preserve CSS fallbacks independently", () => {
  const missing = () => { throw new Error("unavailable"); };
  assert.deepEqual({ ...nativeNavigationInsets({ getWindowInfo: missing, getMenuButtonBoundingClientRect: missing }) },
    { statusBarHeight: undefined, safeTop: undefined });
  assert.equal(nativeNavigationInsets({ getWindowInfo: missing,
    getMenuButtonBoundingClientRect: () => ({ bottom: 92 }) }).safeTop, 96);
  assert.equal(nativeNavigationInsets({ getWindowInfo: () => ({ windowWidth: 375, statusBarHeight: 44 }),
    getMenuButtonBoundingClientRect: missing }).safeTop, 92);
  for (const invalid of [NaN, Infinity, -1]) {
    assert.equal(nativeNavigationInsets({
      getWindowInfo: () => ({ windowWidth: invalid, statusBarHeight: invalid }),
      getMenuButtonBoundingClientRect: () => ({ bottom: invalid }),
    }).safeTop, undefined);
  }
  assert.equal(nativeNavigationInsets({ getWindowInfo: missing,
    getMenuButtonBoundingClientRect: () => ({ bottom: 0 }) }).safeTop, undefined);
});
