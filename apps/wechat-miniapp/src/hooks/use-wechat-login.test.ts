import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createAccountOperationOwner } from "./account-operation";

function harness() {
  const slots: any[] = [];
  let cursor = 0, hide = () => {};
  const cleanup: Array<() => void> = [];
  const state = { userId: null as string | null, ownerId: null as string | null, reset: 0, page: {}, target: "wechat-login" };
  const pending: Array<{ signal: AbortSignal; resolve(value: { userId: string }): void; reject(error: Error): void }> = [];
  const notices: unknown[] = [];
  let operation!: ReturnType<typeof createAccountOperationOwner>;
  const module = { exports: {} as any };
  const jsx = (type: unknown, props: any) => ({ type, props });
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./use-wechat-login.tsx", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports: module.exports, module, AbortController,
    require(name: string) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "react") return {
        useRef(initial: unknown) { const i = cursor++; return slots[i] ??= { current: initial }; },
        useState(initial: unknown) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (value: unknown) => { slots[i] = value; }]; },
        useEffect(effect: () => (() => void) | undefined) { const i = cursor++; if (!slots[i]) { slots[i] = true; const fn = effect(); if (fn) cleanup.push(fn); } },
      };
      if (name === "@tarojs/taro") return { useDidHide: (fn: () => void) => { hide = fn; } };
      if (name.endsWith("api-client")) return { currentDraftUserId: () => state.userId,
        loginWithWechat: (signal: AbortSignal) => new Promise((resolve, reject) => pending.push({ signal, resolve, reject })) };
      if (name.endsWith("app-store")) return { useAppStore: { getState: () => ({ notify: (n: unknown) => notices.push(n) }) } };
      if (name.endsWith("components/wechat-login")) return { WechatLogin: "login" };
      if (name.endsWith("use-account-operation")) return { useAccountOperation: (_target: string, onBusy: (value: boolean) => void) => {
        operation ??= createAccountOperationOwner(() => ({ ...state }), onBusy); return operation;
      } };
      throw Error(name);
    },
  });
  const render = () => { cursor = 0; return module.exports.useWechatLogin(); };
  return { render, state, pending, notices,
    bind(owner: string) { state.userId = state.ownerId = owner; state.reset++; operation.observe(); },
    hide() { operation.hide(); hide(); },
    unmount() { operation.dispose(); cleanup.forEach(fn => fn()); },
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test("shortcut login resumes its original valid task once after the account bootstrap", async () => {
  const h = harness(), runs: string[] = [];
  h.render().requireAccount((id: string) => runs.push(id));
  const login = h.render().dialog;
  login.props.onLogin(); login.props.onLogin();
  assert.equal(h.pending.length, 1);
  h.bind("a"); h.pending[0]!.resolve({ userId: "a" }); await settle();
  assert.deepEqual(runs, ["a"]);
  assert.equal(h.render().open, false);
  assert.equal(h.notices.length, 1);
});

test("cancel, hide, unmount and changed task each prevent a late login from running the old action", async () => {
  for (const reason of ["cancel", "hide", "unmount", "changed-task"]) {
    const h = harness(); let calls = 0, relevant = true;
    h.render().requireAccount(() => calls++, () => relevant);
    h.render().dialog.props.onLogin();
    if (reason === "cancel") h.render().close();
    if (reason === "hide") h.hide();
    if (reason === "unmount") h.unmount();
    if (reason === "changed-task") relevant = false;
    if (reason !== "changed-task") assert.equal(h.pending[0]!.signal.aborted, true);
    h.pending[0]!.resolve({ userId: "a" }); await settle();
    assert.equal(calls, 0, reason);
    assert.equal(h.notices.length, 0, reason);
  }
});

test("failed shortcut login stays retryable without running its task", async () => {
  const h = harness(); let calls = 0;
  h.render().requireAccount(() => calls++);
  h.render().dialog.props.onLogin(); h.pending[0]!.reject(Error("unavailable")); await settle();
  assert.equal(h.render().dialog.props.failed, true);
  assert.equal(h.render().dialog.props.busy, false);
  h.render().dialog.props.onLogin();
  h.bind("a"); h.pending[1]!.resolve({ userId: "a" }); await settle();
  assert.equal(calls, 1);
});
