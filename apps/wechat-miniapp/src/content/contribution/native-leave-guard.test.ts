import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createNativeEditorLeaveGuardController } from "../../hooks/editor-leave-guard-controller";

const contributionSource = readFileSync(new URL("./contribution-editor.tsx", import.meta.url), "utf8");
const formalFeedbackSource = readFileSync(new URL("../spot-feedback/index.tsx", import.meta.url), "utf8");
const planSource = readFileSync(new URL("../plan/detail/plan-editor-page.tsx", import.meta.url), "utf8");
const sharedSource = readFileSync(new URL("../../hooks/use-editor-leave-guard.ts", import.meta.url), "utf8");

test("standalone editors guard both custom and native Back while dirty", () => {
  assert.match(sharedSource, /suspendForProgrammaticLeave/u);
  assert.match(sharedSource, /restoreAfterFailedProgrammaticLeave/u);
  assert.match(contributionSource, /useNativeEditorLeaveGuard\(!embedded && form\.hasUnsavedChanges/u);
  assert.match(contributionSource, /beforeBack=\{confirmLeave\} onBackAuthorized=\{nativeLeaveGuard\.suspendForProgrammaticLeave\} onBackFailure=\{nativeLeaveGuard\.restoreAfterFailedProgrammaticLeave\}/u);
  assert.match(formalFeedbackSource, /useNativeEditorLeaveGuard\(hasChanges && !noRemainingChanges && !submitted && !ownerChanged/u);
  assert.match(formalFeedbackSource, /beforeBack=\{ownerChanged \? undefined : confirmLeave\} onBackAuthorized=\{nativeLeaveGuard\.suspendForProgrammaticLeave\} onBackFailure=\{nativeLeaveGuard\.restoreAfterFailedProgrammaticLeave\}/u);
  assert.match(planSource, /useNativeEditorLeaveGuard\(editing && isDirty/u);
  assert.match(planSource, /beforeBack=\{beforeLeavingEditor\}/u);
  assert.match(planSource, /onBackAuthorized=\{nativeLeaveGuard\.suspendForProgrammaticLeave\}/u);
  assert.match(planSource, /onBackFailure=\{nativeLeaveGuard\.restoreAfterFailedProgrammaticLeave\}/u);
  assert.match(planSource, /nativeLeaveGuard\.suspendForProgrammaticLeave\(\);[\s\S]*?Taro\.getCurrentPages\(\)\.length > 1;[\s\S]*?Taro\.navigateBack\(\)\.catch\(openSavedPlan\);[\s\S]*?nativeLeaveGuard\.restoreAfterFailedProgrammaticLeave\(\)/u);
});

test("confirmed draft withdrawal leaves without another native unsaved-input prompt", async () => {
  const source = ts.createSourceFile("editor.tsx", contributionSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback = "";
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === "leaveAfterWithdrawal") callback = node.initializer!.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(callback);
  for (const embedded of [false, true]) {
    let enabled = false, extraPrompts = 0, returned = 0, closed = 0;
    const nativeLeaveGuard = createNativeEditorLeaveGuardController({
      enableAlertBeforeUnload: () => { enabled = true; },
      disableAlertBeforeUnload: () => { enabled = false; },
    });
    nativeLeaveGuard.configure(true, "未保存输入");
    const leave = vm.runInNewContext(ts.transpileModule(`(${callback});`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
      embedded, managesRecords: false, nativeLeaveGuard, onClose: () => { closed++; },
      Taro: {
        getCurrentPages: () => [{}, {}],
        navigateBack: async () => { if (enabled) extraPrompts++; else returned++; },
        switchTab: async () => { if (enabled) extraPrompts++; else returned++; },
      },
      form: { kind: "NEW_SPOT_PROPOSAL", selectKind() {}, announce() {} },
    });
    leave(); await Promise.resolve();
    assert.equal(extraPrompts, 0, "deletion confirmation already authorizes discarding this draft's unsaved input");
    assert.equal(returned, embedded ? 0 : 1);
    assert.equal(closed, embedded ? 1 : 0);
    assert.equal(enabled, embedded, "embedded close must not change a standalone page's native protection");
  }
});
