import assert from "node:assert/strict";
import test from "node:test";
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
