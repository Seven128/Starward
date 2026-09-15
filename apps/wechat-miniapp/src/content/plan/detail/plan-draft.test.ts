import assert from "node:assert/strict";
import test from "node:test";
import { clearPlanDraft, createDraftOwner, parsePlanDraft, planDraftKey } from "./plan-draft";

test("selected departure metadata survives a serialized draft restart and explicit clearing", () => {
  const draft = { selectedSpotId: null, localDate: "2026-09-15", localTime: "22:00", notes: "",
    travel: { origin: "出发地点", mode: "DRIVING", originLocation: { source: "WECHAT_CHOOSE_LOCATION", address: "出发地址",
      wgs84: { system: "WGS84", latitude: 22.5, longitude: 113.5 } } } };
  assert.deepEqual(parsePlanDraft(JSON.parse(JSON.stringify(draft)))?.travel, draft.travel);
  assert.equal(parsePlanDraft({ ...draft, travel: { ...draft.travel, origin: "改为手填", originLocation: null } })?.travel?.originLocation, null);
  assert.equal(parsePlanDraft({ ...draft, travel: { ...draft.travel, originLocation: { ...draft.travel.originLocation, wgs84: { system: "WGS84", latitude: 95, longitude: 0 } } } }), null);
});

test("unfinished reminder edits survive restart without accepting corrupt identities", () => {
  const reminders = [{ reminderId: "reminder:1", title: " ", hoursBeforeDeparture: 0, notifyOnWechat: false,
    items: [{ itemId: "item:1", text: "", completed: true }] }];
  const draft = { selectedSpotId: null, localDate: "2026-09-06", localTime: "22:00", notes: "", reminders };
  assert.deepEqual(parsePlanDraft(structuredClone(draft)), draft);
  assert.equal(parsePlanDraft({ ...draft, reminders: [...reminders, ...reminders] }), null);
});

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
  assert.equal(parsePlanDraft({ ...draft, notes: "字".repeat(2000) })?.notes.length, 2000);
  for (const value of [null, "bad", {}, { ...draft, notes: "x".repeat(2001) }, { ...draft, selectedSpotId: 42 }, { ...draft, localTime: "bad" }]) assert.equal(parsePlanDraft(value), null);
});

test("restoration preserves the edit's original revision instead of adopting a newer server version", () => {
  const draft = { selectedSpotId: null, localDate: "2026-09-06", localTime: "22:00", notes: "edited against revision 2", baseRevision: 2 };
  assert.equal(parsePlanDraft(draft)?.baseRevision, 2);
  for (const baseRevision of [-1, 0.5, "2", NaN]) assert.equal(parsePlanDraft({ ...draft, baseRevision }), null);
  assert.equal(parsePlanDraft({ ...draft, baseRevision: null })?.baseRevision, null);
});

test("partial interval editing survives draft restoration without adopting another plan's times", () => {
  const timing = { endLocalDate: "2026-09-07", endLocalTime: "", departureLocalDate: "2026-09-06", departureLocalTime: "20:00" };
  const draft = { selectedSpotId: null, localDate: "2026-09-06", localTime: "22:00", notes: "", timing, baseRevision: 2 };
  assert.deepEqual(parsePlanDraft(draft), draft);
  assert.equal(parsePlanDraft({ ...draft, timing: null }), null);
  assert.equal(parsePlanDraft({ ...draft, timing: { ...timing, endLocalTime: 25 } }), null);
});

test("partial departure arrangement survives draft restoration", () => {
  const draft = { selectedSpotId: null, localDate: "2026-09-06", localTime: "22:00", notes: "",
    travel: { origin: "", mode: "TRANSIT" as const } };
  assert.deepEqual(parsePlanDraft(draft)?.travel, draft.travel);
  assert.equal(parsePlanDraft({ ...draft, travel: { origin: "深圳", mode: "FLYING" } }), null);
});
