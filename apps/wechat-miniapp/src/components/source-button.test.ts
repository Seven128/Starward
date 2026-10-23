import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import type * as ReactTypes from "react";
import * as sources from "../utils/source-document";

const require = createRequire(import.meta.url);
const React = require(fileURLToPath(new URL("../../node_modules/react/index.js", import.meta.url))) as typeof ReactTypes;
const jsxRuntime = require(fileURLToPath(new URL("../../node_modules/react/jsx-runtime.js", import.meta.url)));
Object.assign(globalThis, { ENABLE_INNER_HTML: true, ENABLE_ADJACENT_HTML: false, ENABLE_SIZE_APIS: false,
  ENABLE_TEMPLATE_CONTENT: false, ENABLE_CLONE_NODE: false, ENABLE_CONTAINS: false, ENABLE_MUTATION_OBSERVER: false });
process.env.TARO_ENV = "weapp"; process.env.TARO_PLATFORM = "mini";
const { createRoot } = require("@tarojs/react") as typeof import("@tarojs/react");
const { document } = require("@tarojs/runtime") as typeof import("@tarojs/runtime");

async function mount(prepare?: (id?: string) => Promise<boolean | void>) {
  const previousAct = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const hides = new Set<() => void>();
  const state = { accountOwnerId: null as string | null, selectedSpotId: null, mapResetVersion: 0, observationContext: null,
    notify: () => { notices++; } };
  let control: any, navigations = 0, notices = 0;
  const exports: any = {};
  const code = ts.transpileModule(readFileSync(new URL("./source-button.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name: string) => {
    if (name === "react") return React;
    if (name === "react/jsx-runtime") return jsxRuntime;
    if (name === "@tarojs/taro") return {
      useDidHide(callback: () => void) { React.useEffect(() => { hides.add(callback); return () => { hides.delete(callback); }; }, [callback]); },
      useDidShow() {},
    };
    if (name.endsWith("app-store")) return { useAppStore: { getState: () => state } };
    if (name.endsWith("source-document")) return sources;
    if (name.endsWith("source-navigation")) return { navigateToSource: async () => { navigations++; } };
    if (name.endsWith("shared-button-press")) return { SharedButton: (props: any) => { control = props; return null; } };
    if (name.endsWith("semantic-asset")) return { SemanticIcon: () => null };
    if (name.endsWith(".scss")) return {};
    throw new Error(name);
  } });
  const root = createRoot(document.createElement("root"));
  const button = React.createElement(exports.SourceButton, { id: "moon-source", route: "/sky/sources/index" });
  await React.act(async () => { root.render(prepare ? React.createElement(exports.SourceNavigationPreparation.Provider, { value: prepare }, button) : button, () => {}); });
  return { state, get control() { return control; }, get navigations() { return navigations; }, get notices() { return notices; },
    async click() { await React.act(async () => { control.onClick(); }); },
    async hide() { await React.act(async () => { hides.forEach(callback => callback()); }); },
    async dispose() { await React.act(async () => root.unmount(() => {})); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousAct; },
  };
}

test("ordinary source buttons navigate without a document preparation provider", async () => {
  const h = await mount();
  try { await h.click(); assert.equal(h.navigations, 1); assert.equal(h.control.disabled, false); }
  finally { await h.dispose(); }
});

test("source preparation is single-flight and a hidden or changed owner cannot navigate afterward", async () => {
  for (const retired of ["hide", "identity"] as const) {
    let release!: () => void, preparations = 0, entrance: string | undefined;
    const h = await mount(id => { preparations++; entrance = id; return new Promise<void>(resolve => { release = resolve; }); });
    try {
      await h.click(); await h.click();
      assert.equal(preparations, 1); assert.equal(entrance, "moon-source"); assert.equal(h.control.disabled, true);
      if (retired === "hide") await h.hide(); else h.state.mapResetVersion++;
      await React.act(async () => { release(); });
      assert.equal(h.navigations, 0);
      assert.equal(h.notices, retired === "hide" ? 0 : 1);
      assert.equal(h.control.disabled, false);
    } finally { await h.dispose(); }
  }
});

test("a superseding gesture cancels source preparation without an error notification", async () => {
  let release!: (result: boolean) => void;
  const h = await mount(() => new Promise<boolean>(resolve => { release = resolve; }));
  try {
    await h.click();
    await React.act(async () => { release(false); });
    assert.equal(h.navigations, 0); assert.equal(h.notices, 0); assert.equal(h.control.disabled, false);
  } finally { await h.dispose(); }
});
