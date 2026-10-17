import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createNativeEditorLeaveGuardController } from "./editor-leave-guard-controller";

test("programmatic leave suspends the native prompt and restores it only after failure", () => {
  const calls: string[] = [];
  const controller = createNativeEditorLeaveGuardController({
    enableAlertBeforeUnload: ({ message }) => calls.push(`enable:${message}`),
    disableAlertBeforeUnload: () => calls.push("disable"),
  });

  controller.configure(true, "unsaved");
  controller.suspendForProgrammaticLeave();
  controller.suspendForProgrammaticLeave();
  controller.restoreAfterFailedProgrammaticLeave();
  controller.restoreAfterFailedProgrammaticLeave();

  assert.deepEqual(calls, ["enable:unsaved", "disable", "enable:unsaved"]);
});

test("clean editors never create a native prompt during programmatic navigation", () => {
  const calls: string[] = [];
  const controller = createNativeEditorLeaveGuardController({
    enableAlertBeforeUnload: ({ message }) => calls.push(`enable:${message}`),
    disableAlertBeforeUnload: () => calls.push("disable"),
  });

  controller.configure(false, "unused");
  controller.suspendForProgrammaticLeave();
  controller.restoreAfterFailedProgrammaticLeave();

  assert.deepEqual(calls, ["disable"]);
});

test("native rejection stays handled through configure, suspend, restore and release", async () => {
  const calls: string[] = [];
  let failing = true;
  const result = () => failing ? Promise.reject(new Error("native prompt unavailable")) : Promise.resolve();
  const controller = createNativeEditorLeaveGuardController({
    enableAlertBeforeUnload: ({ message }) => { calls.push(`enable:${message}`); return result(); },
    disableAlertBeforeUnload: () => { calls.push("disable"); return result(); },
  });
  controller.configure(true, "unsaved");
  controller.suspendForProgrammaticLeave();
  controller.restoreAfterFailedProgrammaticLeave();
  controller.release();
  controller.configure(false, "clean");
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ["enable:unsaved", "disable", "enable:unsaved", "disable", "disable"]);
  failing = false;
  controller.configure(true, "current changes");
  controller.suspendForProgrammaticLeave();
  controller.restoreAfterFailedProgrammaticLeave();
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual(calls.slice(-3), ["enable:current changes", "disable", "enable:current changes"]);
});

test("synchronous native failure does not escape leave handling or prevent a later request", () => {
  let failing = true;
  const calls: string[] = [];
  const controller = createNativeEditorLeaveGuardController({
    enableAlertBeforeUnload: ({ message }) => { if (failing) throw new Error("native unavailable"); calls.push(message); },
    disableAlertBeforeUnload: () => { if (failing) throw new Error("native unavailable"); calls.push("disable"); },
  });
  assert.doesNotThrow(() => {
    controller.configure(true, "old"); controller.suspendForProgrammaticLeave();
    controller.restoreAfterFailedProgrammaticLeave(); controller.release(); controller.configure(false, "clean");
  });
  failing = false;
  controller.configure(true, "current");
  controller.suspendForProgrammaticLeave(); controller.restoreAfterFailedProgrammaticLeave();
  assert.deepEqual(calls, ["current", "disable", "current"]);
});

test("late native rejection cannot rearm a cleaned or released editor", async () => {
  const calls: string[] = [];
  const rejectPending: ((reason: Error) => void)[] = [];
  const pending = () => new Promise<void>((_resolve, reject) => { rejectPending.push(reject); });
  const controller = createNativeEditorLeaveGuardController({
    enableAlertBeforeUnload: ({ message }) => { calls.push(`enable:${message}`); return pending(); },
    disableAlertBeforeUnload: () => { calls.push("disable"); return pending(); },
  });
  controller.configure(true, "old"); controller.configure(false, "clean"); controller.release();
  for (const reject of rejectPending) reject(new Error("late native failure"));
  await new Promise<void>(resolve => setImmediate(resolve));
  controller.restoreAfterFailedProgrammaticLeave();
  assert.deepEqual(calls, ["enable:old", "disable", "disable"]);
});

function mountHook() {
  const calls: string[] = [];
  const reference = { current: null as unknown }, module = { exports: {} as { useNativeEditorLeaveGuard: (dirty: boolean, message: string) => {
    suspendForProgrammaticLeave: () => void; restoreAfterFailedProgrammaticLeave: () => void;
  } } };
  let show: () => void = () => {}, cleanup: (() => void) | undefined, dependencies: unknown[] | undefined;
  const bridge = { enableAlertBeforeUnload: ({ message }: { message: string }) => calls.push(`enable:${message}`),
    disableAlertBeforeUnload: () => calls.push("disable") };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("./use-editor-leave-guard.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, {
    module, exports: module.exports, require: (name: string) => name === "@tarojs/taro" ? {
      __esModule: true, default: bridge, useDidShow: (callback: () => void) => { show = callback; },
    } : name === "react" ? { useRef: () => reference, useEffect: (setup: () => () => void, deps: unknown[]) => {
      if (!dependencies || deps.some((value, i) => value !== dependencies![i])) { cleanup?.(); cleanup = setup(); dependencies = deps; }
    } } : { createNativeEditorLeaveGuardController },
  });
  return { calls, render: (dirty = true, message = "unsaved") => module.exports.useNativeEditorLeaveGuard(dirty, message),
    show: () => show(), unmount: () => cleanup!() };
}

test("a returning dirty editor rearms its current guard without an old navigation failure callback", () => {
  const h = mountHook(), guard = h.render();
  guard.suspendForProgrammaticLeave(); assert.equal(h.calls.at(-1), "disable");
  h.show(); assert.equal(h.calls.at(-1), "enable:unsaved");
  guard.suspendForProgrammaticLeave(); h.render(true, "current changes"); h.show();
  assert.equal(h.calls.at(-1), "enable:current changes"); h.unmount();
});

test("a clean returning editor and a released old guard cannot restore a dirty prompt", () => {
  const h = mountHook(), old = h.render(); old.suspendForProgrammaticLeave();
  h.render(false); h.show(); const enables = h.calls.filter(call => call.startsWith("enable:")).length;
  old.restoreAfterFailedProgrammaticLeave(); assert.equal(h.calls.filter(call => call.startsWith("enable:")).length, enables);
  h.unmount(); old.restoreAfterFailedProgrammaticLeave(); assert.equal(h.calls.at(-1), "disable");
});
