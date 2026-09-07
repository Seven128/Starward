import assert from "node:assert/strict";
import test from "node:test";
import { clearPlanDraft, createDraftOwner, parsePlanDraft, planDraftKey } from "./plan-draft";

test("saved drafts cannot restore after removal fails but invalidation succeeds", () => {
  let stored: unknown = { selectedSpotId: null, localDate: "2026-09-06", localTime: "22:00", notes: "saved" };
  assert.equal(clearPlanDraft({
    removeStorageSync() { throw new Error("remove failed"); },
    setStorageSync(_key, value) { stored = value; },
  }, "draft"), true);
  assert.equal(parsePlanDraft(stored), null);
  assert.equal(clearPlanDraft({
    removeStorageSync() { throw new Error("offline storage"); },
    setStorageSync() { throw new Error("offline storage"); },
  }, "draft"), false);
});

test("a mounted draft cannot move to another account after logout or expiry", () => {
  const scope = createDraftOwner(null);
  assert.equal(scope(null), null);
  assert.equal(scope("a"), "a");
  assert.equal(scope(null), null);
  assert.equal(scope("b"), null);
  assert.equal(scope("a"), "a");
});

test("draft storage is separated by account, plan and new-plan identity", () => {
  const keys = [planDraftKey("a", "x"), planDraftKey("b", "x"), planDraftKey("a", "y"), planDraftKey("a", null), planDraftKey("a", "null")];
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(planDraftKey(null, "x"), null);
});

test("draft restoration rejects malformed storage and retains editable text verbatim", () => {
  const draft = { selectedSpotId: null, localDate: "2026-09-06", localTime: "22:00", notes: " 第一行\n第二行 " };
  assert.deepEqual(parsePlanDraft(draft), draft);
  for (const value of [null, "bad", {}, { ...draft, notes: "x".repeat(801) }, { ...draft, selectedSpotId: 42 }, { ...draft, localTime: "bad" }]) assert.equal(parsePlanDraft(value), null);
});

test("restoration preserves the edit's original revision instead of adopting a newer server version", () => {
  const draft = { selectedSpotId: null, localDate: "2026-09-06", localTime: "22:00", notes: "edited against revision 2", baseRevision: 2 };
  assert.equal(parsePlanDraft(draft)?.baseRevision, 2);
  for (const baseRevision of [-1, 0.5, "2", NaN]) assert.equal(parsePlanDraft({ ...draft, baseRevision }), null);
  assert.equal(parsePlanDraft({ ...draft, baseRevision: null })?.baseRevision, null);
});
