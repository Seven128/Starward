import assert from "node:assert/strict";
import test from "node:test";
import { confirmContributionEditorLeave } from "./leave-editor.ts";

test("contribution leave guard preserves busy or declined edits and permits clean or discarded edits", async () => {
  assert.equal(await confirmContributionEditorLeave({ busy: true, dirty: false, confirm: async () => true }), false);
  assert.equal(await confirmContributionEditorLeave({ busy: false, dirty: false, confirm: async () => false }), true);
  assert.equal(await confirmContributionEditorLeave({ busy: false, dirty: true, confirm: async () => false }), false);
  assert.equal(await confirmContributionEditorLeave({ busy: false, dirty: true, confirm: async () => true }), true);
  assert.equal(await confirmContributionEditorLeave({ busy: false, dirty: true, confirm: async () => { throw new Error("dialog failed"); } }), false);
});
