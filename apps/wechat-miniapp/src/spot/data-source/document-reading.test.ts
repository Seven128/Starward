import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import type * as ReactTypes from "react";
import * as sources from "../../utils/source-document";

const require = createRequire(import.meta.url);
const React = require(fileURLToPath(new URL("../../../node_modules/react/index.js", import.meta.url))) as typeof ReactTypes;
const jsxRuntime = require(fileURLToPath(new URL("../../../node_modules/react/jsx-runtime.js", import.meta.url)));
Object.assign(globalThis, { ENABLE_INNER_HTML: true, ENABLE_ADJACENT_HTML: false, ENABLE_SIZE_APIS: false,
  ENABLE_TEMPLATE_CONTENT: false, ENABLE_CLONE_NODE: false, ENABLE_CONTAINS: false, ENABLE_MUTATION_OBSERVER: false });
process.env.TARO_ENV = "weapp"; process.env.TARO_PLATFORM = "mini";
const { createRoot } = require("@tarojs/react") as typeof import("@tarojs/react");
const { document } = require("@tarojs/runtime") as typeof import("@tarojs/runtime");

async function mount() {
  const previousAct = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  let state = { accountOwnerId: null as string | null, selectedSpotId: null, mapResetVersion: 0, observationContext: null };
  const hides = new Set<() => void>(), changes = new Set<() => void>();
  let receive: ((value: unknown) => void) | undefined, reading: any = null, released = 0;
  const useAppStore = Object.assign((select: (state: any) => any) => React.useSyncExternalStore(
    callback => { changes.add(callback); return () => { changes.delete(callback); }; }, () => select(state)), { getState: () => state });
  const page = { getOpenerEventChannel: () => ({ once(_name: string, callback: (value: unknown) => void) { receive = callback; }, off() { released++; } }) };
  const code = ts.transpileModule(readFileSync(new URL("./document-reading.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports: any = {};
  vm.runInNewContext(code, { exports, require: (name: string) => {
    if (name === "react") return React;
    if (name === "react/jsx-runtime") return jsxRuntime;
    if (name === "@tarojs/taro") return { default: { getCurrentPages: () => [page] },
      useLoad(callback: () => void) { React.useLayoutEffect(callback, []); },
      useDidHide(callback: () => void) { React.useEffect(() => { hides.add(callback); return () => { hides.delete(callback); }; }, [callback]); } };
    if (name.endsWith("app-store")) return { useAppStore };
    if (name.endsWith("source-document")) return sources;
    if (name.endsWith("source-page")) return { SourcePage: (props: any) => React.createElement("div", null, props.children) };
    if (name.endsWith("source-document-content")) return { SourceDocumentContent: (props: any) => {
      React.useEffect(() => { reading = props.document; return () => { reading = null; }; }, [props.document]);
      return React.createElement("div", null, props.document.title);
    } };
    if (name.endsWith("status-panel")) return { StatusPanel: () => React.createElement("div", null, "unavailable") };
    throw new Error(name);
  } });
  const root = createRoot(document.createElement("root"));
  await React.act(async () => { root.render(React.createElement(exports.SourceDocumentReadingPage), () => {}); });
  const payload = () => ({ identity: sources.sourceReadingIdentity(state), document: {
    title: "当前地区来源", sources: [], sections: [{ kind: "text", paragraphs: ["当前可见资料，不离线回退"] }],
  } });
  return { get reading() { return reading; }, get released() { return released; }, payload,
    async emit(value = payload()) { await React.act(async () => { receive?.(value); }); },
    async hide() { await React.act(async () => { for (const hide of hides) hide(); }); },
    async account(owner: string | null) { await React.act(async () => { state = { ...state, accountOwnerId: owner }; for (const change of changes) change(); }); },
    async dispose() { await React.act(async () => root.unmount(() => {})); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousAct; },
  };
}

test("a native reading receives only its current document and releases live reading on hide, including a late delivery", async () => {
  const h = await mount();
  try {
    assert.equal(h.reading, null, "direct entry must not fill from another reading");
    const payload = h.payload();
    await h.emit(payload);
    assert.deepEqual(h.reading, payload.document);
    await h.hide(); assert.equal(h.reading, null);
    await h.emit(payload); assert.equal(h.reading, null, "hidden live data cannot be revived");
  } finally { await h.dispose(); }
  assert.equal(h.released, 1);
});

test("an account switch retires the reading and switching back cannot restore that old payload", async () => {
  const h = await mount();
  try {
    const payload = h.payload();
    await h.emit(payload); assert.ok(h.reading);
    await h.account("other"); assert.equal(h.reading, null);
    await h.account(null); await h.emit(payload); assert.equal(h.reading, null);
  } finally { await h.dispose(); }
});
