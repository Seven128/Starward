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
      assert.equal(result.capsuleBottom, bottom);
      assert.equal(result.safeTop, Math.max(bottom + 4, statusBarHeight + windowWidth * 96 / 750));
    }
  }
});

test("missing or invalid native metrics preserve CSS fallbacks independently", () => {
  const missing = () => { throw new Error("unavailable"); };
  assert.deepEqual({ ...nativeNavigationInsets({ getWindowInfo: missing, getMenuButtonBoundingClientRect: missing }) },
    { statusBarHeight: undefined, capsuleBottom: undefined, safeTop: undefined });
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

const nativeMenuClearancePx = moduleExports.nativeMenuClearancePx as typeof NativeMetrics.nativeMenuClearancePx;
test("title clearance follows the actual capsule edge and rejects unavailable geometry", () => {
  for (const windowWidth of [320, 375, 390, 430]) {
    const left = windowWidth - 87;
    assert.equal(nativeMenuClearancePx({ getWindowInfo: () => ({ windowWidth }),
      getMenuButtonBoundingClientRect: () => ({ left }) }), 95);
  }
  for (const left of [0, -1, NaN, Infinity, 320, 100]) {
    assert.equal(nativeMenuClearancePx({ getWindowInfo: () => ({ windowWidth: 320 }),
      getMenuButtonBoundingClientRect: () => ({ left }) }), undefined);
  }
  assert.equal(nativeMenuClearancePx({ getWindowInfo: () => { throw new Error("unavailable"); },
    getMenuButtonBoundingClientRect: () => ({ left: 230 }) }), undefined);
});

test("map consumers can use safeTop as the conservative search-field inset", () => {
  const metrics = nativeNavigationInsets({
    getWindowInfo: () => ({ windowWidth: 390, statusBarHeight: 20 }),
    getMenuButtonBoundingClientRect: () => ({ bottom: 44 }),
  });
  assert.equal(metrics.capsuleBottom, 44);
  assert.equal(metrics.safeTop, 69.92);
  assert.ok(metrics.safeTop! > metrics.capsuleBottom! + 4);
});
