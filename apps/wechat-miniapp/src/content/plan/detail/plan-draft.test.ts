import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { clearPlanDraft, clearUnchangedPlanDraft, createDraftOwner, parsePlanDraft, planDraftKey, planDraftMatchesInput, type PlanDraft } from "./plan-draft";

test("the actual editor leaves an unchanged recovered plan without treating nested property order as edits", () => {
  const source = ts.createSourceFile("plan.tsx", readFileSync(new URL("./plan-editor-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ["remindersDirty", "eventsDirty", "isDirty"].includes(node.name.getText(source)) && node.initializer)
      declarations.push(`const ${node.name.getText(source)} = ${node.initializer.getText(source)};`);
    ts.forEachChild(node, visit);
  };
  visit(source);assert.ok(declarations.some(text => text.startsWith("const isDirty =")));
  const saved: PlanDraft = { selectedSpotId: "spot:journey" as PlanDraft["selectedSpotId"], localDate: "2026-10-05", localTime: "22:00", notes: "原计划保留",
    timing: { departureLocalTime: "21:00", endLocalDate: "2026-10-06", endLocalTime: "01:00", departureLocalDate: "2026-10-05" },
    travel: { originLocation: null, mode: "DRIVING", origin: "隔离测试出发地" },
    reminders: [{ notifyOnWechat: false, items: [{ completed: true, text: "检查照明", itemId: "item:1" }], reminderId: "reminder:1", title: "准备", hoursBeforeDeparture: 1 }],
    eventOccurrenceIds: ["event-occurrence:009-dra:2026"] };
  const restored = parsePlanDraft(saved)!;assert.deepEqual(restored, saved);
  assert.notEqual(JSON.stringify(restored.travel), JSON.stringify(saved.travel));
  const program = ts.transpileModule(declarations.join("\n") + "\nisDirty", {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  const dirty = (current: PlanDraft, activePlan: unknown = { ...saved, spotId: saved.selectedSpotId }, recoveredLocalDraft = true) => vm.runInNewContext(program, {
    ...current, activePlan, recoveredLocalDraft, initialDraft: {current: {...restored, reminders: []}}, planDraftMatchesInput,
    emptyPlanTiming: () => ({endLocalDate:"", endLocalTime:"", departureLocalDate:"", departureLocalTime:""}),
  });
  assert.equal(dirty(restored), false, "viewing/cancelling an event must not turn an equivalent recovered draft into unsaved edits");
  for (const changed of [
    {...restored, notes: "新备注"}, {...restored, localTime: "23:00"}, {...restored, eventOccurrenceIds: []},
    {...restored, timing: {...restored.timing!, endLocalTime: "02:00"}},
    {...restored, travel: {...restored.travel!, origin: "另一出发地"}},
    {...restored, reminders: [{...restored.reminders![0]!, items: [{...restored.reminders![0]!.items[0]!, completed: false}]}]},
  ]) assert.equal(dirty(changed), true, "actual authored changes must still require the leave decision");
  const newInput = {...restored, reminders: []};
  assert.equal(dirty(newInput, null, false), false);
  assert.equal(dirty(newInput, null, true), true, "an unsaved new-plan recovery still needs protection");
});

test("a saved service plan owns its equivalent parsed draft regardless of nested field order", () => {
  const submitted: PlanDraft = { selectedSpotId: "spot:journey" as PlanDraft["selectedSpotId"],
    localDate: "2026-10-06", localTime: "22:00", notes: "原文保留", baseRevision: 2,
    timing: { departureLocalTime: "21:00", endLocalTime: "01:00", endLocalDate: "2026-10-07", departureLocalDate: "2026-10-06" },
    travel: { mode: "DRIVING", origin: "隔离测试出发地", originLocation: null },
    reminders: [{ items: [{ completed: true, text: "检查手电", itemId: "item:1" }], title: "器材",
      reminderId: "reminder:1", notifyOnWechat: false, hoursBeforeDeparture: 1 }], eventOccurrenceIds: [] };
  const restored = parsePlanDraft(JSON.parse(JSON.stringify(submitted)))!;
  assert.deepEqual(restored, submitted);
  assert.equal(planDraftMatchesInput(restored, submitted), true);
  assert.equal(planDraftMatchesInput(restored, { ...submitted, notes: "后来修改" }), false);
  assert.equal(planDraftMatchesInput(restored, { ...submitted, baseRevision: 3 }), false);
  assert.equal(planDraftMatchesInput(restored, { ...submitted, reminders: [{ ...submitted.reminders![0]!,
    items: [{ ...submitted.reminders![0]!.items[0]!, completed: false }] }] }), false);
});

test("late save completion cannot delete another editor's newer draft or new plan", () => {
  const original = { creationPlanId: "plan:a", notes: "old" };
  let stored: unknown = original;
  const storage = { getStorageSync: () => stored, setStorageSync: (_key: string, value: unknown) => { stored = value; }, removeStorageSync: () => { stored = null; } };
  const version = JSON.stringify(original);
  for (const newer of [{ ...original, notes: "unsaved later input" }, { creationPlanId: "plan:b", notes: "new draft" }]) {
    stored = newer;
    assert.equal(clearUnchangedPlanDraft(storage, "draft", version), false);
    assert.deepEqual(stored, newer);
  }
  stored = original;
  assert.equal(clearUnchangedPlanDraft(storage, "draft", version), true);
  assert.equal(stored, null);
});

test("creation identity and confirmed deletion boundary survive serialization without accepting corrupt identities", () => {
  const draft = { creationPlanId: "plan:reserved-1", creationConfirmed: true, selectedSpotId: null, localDate: "2026-09-06", localTime: "22:00", notes: "new input", baseRevision: null };
  assert.deepEqual(parsePlanDraft(JSON.parse(JSON.stringify(draft))), draft);
  for (const creationPlanId of ["", "plan:", "user:other", "plan:../invalid", "plan:" + "x".repeat(176)]) assert.equal(parsePlanDraft({ ...draft, creationPlanId }), null);
  assert.equal(parsePlanDraft({ ...draft, creationPlanId: undefined }), null);
});

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
