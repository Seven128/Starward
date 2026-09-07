import assert from "node:assert/strict";
import test from "node:test";
import { planDraftBelongsTo, planDraftKey } from "./local-draft-keys";

test("account cleanup matches exact draft owners without prefix collisions", () => {
  assert.equal(planDraftBelongsTo(planDraftKey("a", "plan")!, "a"), true);
  assert.equal(planDraftBelongsTo(planDraftKey("a", null)!, "a"), true);
  assert.equal(planDraftBelongsTo(planDraftKey("ab", "plan")!, "a"), false);
  assert.equal(planDraftBelongsTo("starward.plan-draft.v1:bad", "a"), false);
  assert.equal(planDraftBelongsTo("unrelated", "a"), false);
});
