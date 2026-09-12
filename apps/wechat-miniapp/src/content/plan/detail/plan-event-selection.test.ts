import assert from "node:assert/strict";
import test from "node:test";
import { consumePlanEventSelection, planEventSelectionBelongsTo, writePlanEventSelection } from "./plan-event-selection";

function memory() {
  const values = new Map<string, unknown>();
  return {
    values,
    getStorageSync: (key: string) => values.get(key),
    setStorageSync: (key: string, value: unknown) => values.set(key, value),
    removeStorageSync: (key: string) => { values.delete(key); },
  };
}

test("event child return is one-shot and isolated by account and draft target", () => {
  const storage = memory();
  const selection = { occurrenceId: "event-occurrence:007-per:2026", target: "plan:one" };
  assert.equal(writePlanEventSelection(storage, "owner-a", selection), true);
  assert.equal(consumePlanEventSelection(storage, "owner-b", selection.target), null);
  assert.equal(consumePlanEventSelection(storage, "owner-a", "plan:two"), null);
  assert.deepEqual(consumePlanEventSelection(storage, "owner-a", selection.target), selection);
  assert.equal(consumePlanEventSelection(storage, "owner-a", selection.target), null);
  const key = [...storage.values.keys()][0] ?? `starward.plan-event-selection.v1:["owner-a","plan:one"]`;
  assert.equal(planEventSelectionBelongsTo(key, "owner-a"), true);
  assert.equal(planEventSelectionBelongsTo(key, "owner"), false);
});

test("invalid occurrence identities never become editor input", () => {
  const storage = memory();
  assert.equal(writePlanEventSelection(storage, "owner", { occurrenceId: "bad", target: "new:" }), false);
  assert.equal(storage.values.size, 0);
});
