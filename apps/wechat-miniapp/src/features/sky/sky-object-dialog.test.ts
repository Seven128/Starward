import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type * as ReactTypes from "react";

const require = createRequire(import.meta.url);
const React = require(fileURLToPath(new URL("../../../node_modules/react/index.js", import.meta.url))) as typeof ReactTypes;
const jsxRuntime = require(fileURLToPath(new URL("../../../node_modules/react/jsx-runtime.js", import.meta.url)));
Object.assign(globalThis, { ENABLE_INNER_HTML: true, ENABLE_ADJACENT_HTML: false, ENABLE_SIZE_APIS: false,
  ENABLE_TEMPLATE_CONTENT: false, ENABLE_CLONE_NODE: false, ENABLE_CONTAINS: false, ENABLE_MUTATION_OBSERVER: false });
process.env.TARO_ENV = "weapp"; process.env.TARO_PLATFORM = "mini";
const { createRoot } = require("@tarojs/react") as typeof import("@tarojs/react");
const { document } = require("@tarojs/runtime") as typeof import("@tarojs/runtime");

test("the native reading area retains current content when priority and information states change", async () => {
  const previousAct = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const exports: any = {};
  const code = ts.transpileModule(readFileSync(new URL("./sky-object-dialog.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name: string) => {
    if (name === "react/jsx-runtime") return jsxRuntime;
    if (name === "@tarojs/components") return { View: "view", Text: "text", ScrollView: "scroll-view" };
    if (name.endsWith("shared-button-press")) return { SharedButton: "button" };
    if (name.endsWith("semantic-asset")) return { SemanticIcon: () => null };
    if (name === "./sky-overlay-motion") return { SkyDisclosureSurface: ({ children, ...props }: any) => React.createElement("view", props, children) };
    throw new Error(name);
  } });
  const container = document.createElement("root"), root = createRoot(container);
  const render = async (priority: string, children: ReactTypes.ReactNode) => {
    await React.act(async () => { root.render(React.createElement(exports.SkyObjectDialog, {
      title: "Alderamin", subtitle: "恒星 · HR 8162", reference: "HR:8162", onClose() {},
      priority: React.createElement("text", {}, priority),
    }, children), () => {}); });
  };
  try {
    await render("正在计算位置…", React.createElement("text", {}, "正在加载资料…"));
    const body = container.getElementsByTagName("scroll-view")[0]!;
    assert.ok(body, "reading content must enter the native scroll-view");
    assert.match(body.textContent, /正在加载资料/);
    assert.doesNotMatch(body.textContent, /正在计算位置/);
    await render("北353.1° · 49.3°", React.createElement(React.Fragment, {},
      React.createElement("text", {}, "部分资料未加载，已保留其余资料"),
      React.createElement("text", {}, "介绍尚未收录，已提供基本资料"),
      React.createElement("text", {}, "视星等 2.45 mag")));
    assert.equal(container.getElementsByTagName("scroll-view")[0], body, "position readiness does not replace the native reading node");
    assert.match(body.textContent, /部分资料未加载.*介绍尚未收录.*2\.45/s);
    assert.doesNotMatch(body.textContent, /正在加载资料/);
    assert.doesNotMatch(body.textContent, /353\.1/);
  } finally {
    await React.act(async () => root.unmount(() => {}));
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousAct;
  }
});
