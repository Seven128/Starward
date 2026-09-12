import assert from "node:assert/strict";
import test from "node:test";
import { confirmPlanEditorLeave } from "./leave-editor";

test("busy, cancel and failed confirmation keep edits in place; clean and approved exits proceed", async () => {
  assert.equal(await confirmPlanEditorLeave({ busy: true, dirty: false, confirm: async () => assert.fail() }), false);
  assert.equal(await confirmPlanEditorLeave({ busy: false, dirty: false, confirm: async () => assert.fail() }), true);
  for (const answer of [false, true]) assert.equal(await confirmPlanEditorLeave({ busy: false, dirty: true, confirm: async () => answer }), answer);
  assert.equal(await confirmPlanEditorLeave({ busy: false, dirty: true, confirm: async () => { throw new Error("dialog_failed"); } }), false);
});
