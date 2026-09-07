import assert from "node:assert/strict";
import test from "node:test";
import { createPlanSaveRetry, PlanSaveRecoveryError, planSaveBelongsTo, type PlanSaveInput } from "./plan-save-retry";
const input: PlanSaveInput = { planId: "plan:first", spotId: "spot:one", observationContextId: "context:first", localDate: "2026-09-06", localTime: "22:00", notes: "my notes", expectedRevision: null, contextIdentity: "same-origin" };
function fixture() {
  const values = new Map<string, unknown>(); let sequence = 0;
  const storage = { getStorageSync: (key: string) => values.get(key), setStorageSync: (key: string, value: unknown) => { values.set(key, structuredClone(value)); }, removeStorageSync: (key: string) => { values.delete(key); } };
  return { values, storage, boot: () => createPlanSaveRetry(storage, () => `test:${++sequence}`, error => error === "rejected") };
}
test("cold new-plan retry uses the original plan ID, context and idempotency identity", async () => {
  const f = fixture(); let firstKey = "";
  await assert.rejects(f.boot()("a", input, async key => { firstKey = key; throw new Error("lost receipt"); }));
  const result = await f.boot()("a", { ...input, planId: "plan:new-random", observationContextId: "context:refreshed" }, async (key, original) => {
    assert.equal(key, firstKey); assert.deepEqual(original, input); return "saved";
  });
  assert.equal(result, "saved"); assert.equal(f.values.size, 0);
});
test("changed account, content, origin or existing-plan identity does not reuse another save", async () => {
  const f = fixture(), keys: string[] = [];
  for (const [owner, value] of [
    ["a", input], ["b", input], ["a", { ...input, notes: "changed" }], ["a", { ...input, contextIdentity: "other-origin" }],
    ["a", { ...input, expectedRevision: 2 }], ["a", { ...input, expectedRevision: 2, planId: "plan:other" }],
  ] as const) await assert.rejects(f.boot()(owner, value, async key => { keys.push(key); throw new Error("unknown"); }));
  assert.equal(new Set(keys).size, 6);
  assert.equal([...f.values.keys()].filter(key => planSaveBelongsTo(key, "a")).length, 1);
});
test("unavailable storage prevents dispatch and only whitelisted fields are retained", async () => {
  const f = fixture();
  const blocked = createPlanSaveRetry({ ...f.storage, setStorageSync() { throw new Error("full"); } }, () => "test:key", () => false);
  await assert.rejects(blocked("a", input, async () => assert.fail("must not dispatch")), PlanSaveRecoveryError);
  await assert.rejects(f.boot()("a", { ...input, accessToken: "NEVER_RETAIN" } as PlanSaveInput, async () => { throw new Error("unknown"); }));
  assert.doesNotMatch(JSON.stringify([...f.values.values()]), /accessToken|NEVER_RETAIN/);
  await assert.rejects(f.boot()("a", input, async () => { throw "rejected"; }));
  assert.equal(f.values.size, 0);
});
