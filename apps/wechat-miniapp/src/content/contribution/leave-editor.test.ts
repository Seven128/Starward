import assert from "node:assert/strict";
import test from "node:test";
import { confirmContributionEditorLeave } from "./leave-editor.ts";

test("contribution leave guard preserves busy or declined edits and permits clean or discarded edits", async () => {
  let discarded = 0;
  const discard = () => { discarded++; return true; };
  assert.equal(await confirmContributionEditorLeave({ busy: true, dirty: false, confirm: async () => true, discard }), false);
  assert.equal(await confirmContributionEditorLeave({ busy: false, dirty: false, confirm: async () => false, discard }), true);
  assert.equal(await confirmContributionEditorLeave({ busy: false, dirty: true, confirm: async () => false, discard }), false);
  assert.equal(await confirmContributionEditorLeave({ busy: false, dirty: true, confirm: async () => { throw new Error("dialog failed"); }, discard }), false);
  assert.equal(discarded, 0, "clean, busy, cancelled or failed confirmation must never discard anything");
  assert.equal(await confirmContributionEditorLeave({ busy: false, dirty: true, confirm: async () => true, discard }), true);
  assert.equal(discarded, 1, "only confirmed dirty input is discarded");
  assert.equal(await confirmContributionEditorLeave({ busy: false, dirty: true, confirm: async () => true, discard: () => false }), false, "failed local removal cannot authorize leaving");
});
