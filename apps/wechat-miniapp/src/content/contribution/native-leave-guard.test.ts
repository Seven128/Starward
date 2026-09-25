import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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
