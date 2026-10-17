import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import type * as ReactTypes from "react";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
// App tsconfig maps bare React to its declarations for type checking. Pin the
// installed runtime explicitly so the same test runs from root and app cwd.
const React = require(fileURLToPath(new URL("../../node_modules/react/index.js", import.meta.url))) as typeof ReactTypes;
const jsxRuntime = require(fileURLToPath(new URL("../../node_modules/react/jsx-runtime.js", import.meta.url)));
const { act } = React;
// Taro's bundled compile-time switches, matching the existing WEAPP harness.
Object.assign(globalThis, { ENABLE_INNER_HTML: true, ENABLE_ADJACENT_HTML: false,
  ENABLE_SIZE_APIS: false, ENABLE_TEMPLATE_CONTENT: false, ENABLE_CLONE_NODE: false,
  ENABLE_CONTAINS: false, ENABLE_MUTATION_OBSERVER: false });
process.env.TARO_ENV = "weapp";
process.env.TARO_PLATFORM = "mini";
const { createRoot } = require("@tarojs/react") as typeof import("@tarojs/react");
const { document } = require("@tarojs/runtime") as typeof import("@tarojs/runtime");

// Real React mounting/effects; only the native PageContainer and page events
// are ports. This tests ownership, not WEAPP's physical navigation stack.
async function mountBoundary(initial: { active: boolean; onBack: () => void | Promise<void>; nativeMapContent?: ReactTypes.ReactNode }) {
  const previousAct = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const hide = new Set<() => void>(), show = new Set<() => void>();
  let current: any = null, mounts = 0;
  const warnings: string[] = [];
  function PageContainer(props: any) {
    const identity = React.useRef<object | null>(null);
    if (!identity.current) { identity.current = {}; mounts++; }
    current = { ...props, identity: identity.current };
    React.useEffect(() => () => { if (current?.identity === identity.current) current = null; }, []);
    return React.createElement("div", { "data-native-container": true }, props.children);
  }
  const lifecycle = (set: Set<() => void>) => (callback: () => void) => {
    React.useLayoutEffect(() => { set.add(callback); return () => { set.delete(callback); }; }, [callback]);
  };
  const module = { exports: {} as any };
  const source = readFileSync(process.env.NATIVE_BACK_BOUNDARY_SOURCE ?? new URL("./native-back-boundary.tsx", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, { module, exports: module.exports, require: (name: string) =>
    name === "@tarojs/components" ? { PageContainer, View: "div" }
      : name === "@tarojs/taro" ? { useDidHide: lifecycle(hide), useDidShow: lifecycle(show) }
        : name === "react" ? React : name === "react/jsx-runtime" ? jsxRuntime
          : require(name), setTimeout, clearTimeout, console: { warn: (message: string) => warnings.push(message) } });
  const root = createRoot(document.createElement("root"));
  const render = async (props: typeof initial) => { await act(async () => { root.render(React.createElement(module.exports.NativeBackBoundary, props), () => {}); }); };
  await render(initial);
  return {
    get current() { return current; }, get mounts() { return mounts; }, warnings, render,
    async event(action: () => void) { await act(async () => action()); },
    async settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 45)); }); },
    async hide() { await act(async () => { for (const callback of [...hide]) callback(); }); },
    async show() { await act(async () => { for (const callback of [...show]) callback(); }); },
    async cycle(beforeCommit: () => void) { await act(async () => {
      for (const callback of [...hide]) callback();
      for (const callback of [...show]) callback();
      beforeCommit();
    }); },
    async close() { await act(async () => root.unmount(() => {}));
      (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousAct; },
  };
}

test("auxiliary Back mounts shown, consumes one leave and remounts a fresh shown native layer", async () => {
  let commands = 0, complete!: () => void;
  const pending = new Promise<void>(resolve => { complete = resolve; });
  const props = { active: true, onBack: () => { commands++; return pending; } };
  const owner = await mountBoundary(props);
  try {
    const first = owner.current;
    assert.equal(first.style.position, "fixed", "the invisible Back slot stays outside the caller's flex layout");
    assert.equal(first?.show, true, "the first mounted native frame must already be shown");
    await owner.event(() => { first.onBeforeLeave(); first.onAfterLeave(); });
    assert.equal(commands, 1);
    assert.equal(Boolean(owner.current), false, "consumed auxiliary layer unmounts while the command is pending");
    await owner.event(complete); await owner.settle();
    assert.equal(owner.current?.show, true);
    assert.notEqual(owner.current.identity, first.identity);
    await owner.event(() => first.onAfterLeave());
    assert.equal(commands, 1, "a late event from the retired layer cannot consume its replacement");
    await owner.render({ ...props, active: false });
    assert.equal(Boolean(owner.current), false);
  } finally { await owner.close(); }
});

test("hidden auxiliary pages retire pending commands and can return to one fresh boundary", async () => {
  let commands = 0, complete!: () => void;
  const pending = new Promise<void>(resolve => { complete = resolve; });
  const owner = await mountBoundary({ active: true, onBack: () => { commands++; return pending; } });
  try {
    const first = owner.current;
    await owner.event(() => first.onBeforeLeave());
    await owner.hide(); await owner.event(complete); await owner.settle();
    assert.equal(Boolean(owner.current), false);
    await owner.event(() => first.onAfterLeave()); assert.equal(commands, 1);
    await owner.show(); await owner.settle();
    assert.equal(owner.current?.show, true);
    assert.notEqual(owner.current.identity, first.identity);
  } finally { await owner.close(); }
});

test("inactive/reactivated auxiliary owners cannot be rearmed by an old command", async () => {
  let complete!: () => void, commands = 0;
  const pending = new Promise<void>(resolve => { complete = resolve; });
  const props = { active: true, onBack: () => { commands++; return pending; } };
  const owner = await mountBoundary(props);
  try {
    const first = owner.current;
    await owner.event(() => first.onBeforeLeave());
    await owner.render({ ...props, active: false });
    await owner.render(props);
    const next = owner.current;
    await owner.event(complete); await owner.settle();
    assert.equal(owner.current.identity, next.identity);
    await owner.event(() => first.onAfterLeave()); assert.equal(commands, 1);
  } finally { await owner.close(); }
});

test("Map preserves its foreground child and before-leave protocol through close and rearm", async () => {
  let childMounts = 0, childUnmounts = 0, commands = 0;
  function Content() { React.useEffect(() => { childMounts++; return () => { childUnmounts++; }; }, []); return React.createElement("span", null, "event"); }
  const props = { active: false, onBack: () => { commands++; }, nativeMapContent: React.createElement(Content) };
  const owner = await mountBoundary(props);
  try {
    const identity = owner.current.identity;
    assert.equal(owner.current.show, false);
    await owner.render({ ...props, active: true }); await owner.settle();
    const open = owner.current;
    assert.equal(open.show, true); assert.equal(open.position, "center"); assert.equal(open.zIndex, 1200);
    assert.equal(typeof open.onAfterLeave, "function");
    await owner.event(() => { open.onBeforeLeave(); open.onBeforeLeave(); });
    assert.equal(commands, 1); await owner.settle();
    assert.equal(owner.current.show, false, "Map waits for native exit as well as the command");
    await owner.event(() => open.onAfterLeave()); await owner.settle();
    assert.equal(owner.current.show, true); assert.equal(owner.current.identity, identity);
    await owner.event(() => owner.current.onBeforeLeave());
    assert.equal(commands, 1, "delayed leave remains fenced until native entry is acknowledged");
    await owner.event(() => owner.current.onAfterEnter());
    await owner.render(props); await owner.settle();
    assert.equal(owner.current.show, false); assert.equal(owner.current.identity, identity);
    assert.equal(childMounts, 1); assert.equal(childUnmounts, 0);
  } finally { await owner.close(); }
  assert.equal(childUnmounts, 1);
});

test("failed commands report no private error detail and unmount cancels pending rearm", async () => {
  const owner = await mountBoundary({ active: true, onBack: () => { throw new Error("private detail"); } });
  try {
    await owner.event(() => owner.current.onBeforeLeave());
    await owner.settle();
    assert.deepEqual(owner.warnings, ["native_back_command_failed"]);
    assert.equal(owner.current?.show, true);
  } finally { await owner.close(); }
});

for (const map of [false, true]) test(`${map ? "Map" : "auxiliary"} rapid hide/show fences old leave before React commits`, async () => {
  let commands = 0;
  const owner = await mountBoundary({ active: true, onBack: () => { commands++; },
    ...(map ? { nativeMapContent: React.createElement("span", null, "event") } : {}) });
  try {
    await owner.settle();
    const old = owner.current;
    await owner.cycle(() => old.onBeforeLeave());
    assert.equal(commands, 0, "synchronous lifecycle ownership precedes the next render");
    await owner.settle();
    const current = owner.current;
    await owner.event(() => old.onBeforeLeave());
    assert.equal(commands, 0, "retained callbacks stay retired after show");
    assert.equal(current.show, true);
    assert.equal(current.identity === old.identity, map, "only Map preserves its foreground subtree");
    await owner.event(() => current.onBeforeLeave());
    assert.equal(commands, 1);
  } finally { await owner.close(); }
});
