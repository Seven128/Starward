import assert from "node:assert/strict";
import test from "node:test";
import { parsePlanReminders } from "./plan-reminders.ts";

const group = (id = "r1", count = 1) => ({ reminderId: id, title: "器材", hoursBeforeDeparture: 1,
  notifyOnWechat: false, items: Array.from({ length: count }, (_, index) => ({ itemId: `i${index}`, text: "电池", completed: false })) });
test("reminders enforce five groups, twenty items and independent valid identities", () => {
  assert.equal(parsePlanReminders(Array.from({ length: 5 }, (_, i) => group(`r${i}`, 20))).length, 5);
  assert.throws(() => parsePlanReminders(Array.from({ length: 6 }, (_, i) => group(`r${i}`))), /limit/);
  assert.throws(() => parsePlanReminders([group("r", 21)]), /limit/);
  assert.throws(() => parsePlanReminders([group(), group()]), /identity/);
  const duplicate = group("r", 2); duplicate.items[1]!.itemId = "i0";
  assert.throws(() => parsePlanReminders([duplicate]), /identity/);
});
test("drafts retain unfinished text while saved intent cannot forge delivery state", () => {
  const incomplete = { ...group(), title: "", hoursBeforeDeparture: 0 };
  assert.equal(parsePlanReminders([incomplete], true)[0]?.title, "");
  assert.throws(() => parsePlanReminders([incomplete]), /invalid|required/);
  const value = { ...group(), authorization: "GRANTED", delivery: "SENT", revision: 900 };
  assert.deepEqual(parsePlanReminders([value]), [group()]);
  for (const offset of [-1, 0, NaN, Infinity, 8761]) assert.throws(() => parsePlanReminders([{ ...group(), hoursBeforeDeparture: offset }]), /offset/);
  assert.throws(() => parsePlanReminders([{ ...group(), items: [{ itemId: "i", text: "", completed: false }] }]), /text_required/);
  assert.throws(() => parsePlanReminders([{ ...group(), notifyOnWechat: "yes" }]), /intent/);
});
