import assert from "node:assert/strict";
import test from "node:test";
import { acknowledgePlanSave, createPlanSaveRetry, PlanSaveRecoveryError, planContextIdentity, planSaveBelongsTo, resolvePlanCreationId, samePlanSaveIntent, selectPlanSaveRecovery, type PlanSaveInput } from "./plan-save-retry";
import type { ObservationContext } from "@starward/miniapp-contracts";
const input: PlanSaveInput = { planId: "plan:first", spotId: "spot:one", observationContextId: "context:first", localDate: "2026-09-06", localTime: "22:00", notes: "my notes", expectedRevision: null, contextIdentity: "same-origin" };
function fixture() {
  const values = new Map<string, unknown>(); let sequence = 0;
  const storage = { getStorageSync: (key: string) => values.get(key), setStorageSync: (key: string, value: unknown) => { values.set(key, structuredClone(value)); }, removeStorageSync: (key: string) => { values.delete(key); } };
  return { values, storage, boot: () => createPlanSaveRetry(storage, () => `test:${++sequence}`, error => error === "rejected") };
}

test("cold retry after editing a draft replays its original body and key until explicitly acknowledged", async () => {
  const f = fixture();
  const original = { ...input, timing: { endLocalDate: "2026-09-07", endLocalTime: "02:00", departureLocalDate: "2026-09-06", departureLocalTime: "20:00" },
    travel: { origin: "深圳", mode: "TRANSIT" as const, originLocation: null },
    reminders: [{ reminderId: "reminder:1", title: "器材", hoursBeforeDeparture: 0.5, notifyOnWechat: false, items: [{ itemId: "item:1", text: "电池", completed: false }] }] };
  let firstKey = "";
  await assert.rejects(f.boot()("a", original, async key => { firstKey = key; throw Error("receipt lost"); }));
  const changed = { ...original, notes: "changed", observationContextId: "context:refreshed", timing: { ...original.timing, endLocalTime: "03:00" } };
  const result = await f.boot()("a", changed, async (key, body) => {
    assert.equal(key, firstKey); assert.deepEqual(body, original); return "receipt";
  });
  assert.equal(result.result, "receipt"); assert.equal(f.values.size, 1);
  assert.equal(samePlanSaveIntent(changed, result.input), false);
  acknowledgePlanSave(f.storage, result.receipt);
  assert.equal(f.values.size, 0);
  const next = await f.boot()("a", { ...changed, expectedRevision: 1 }, async (key, body) => {
    assert.notEqual(key, firstKey); assert.equal(body.notes, "changed"); return "updated";
  });
  // A late old acknowledgement cannot clear a later write to this same plan.
  acknowledgePlanSave(f.storage, result.receipt);
  assert.equal(f.values.size, 1);
  acknowledgePlanSave(f.storage, next.receipt);
  assert.equal(f.values.size, 0);
});

test("different accounts and independently reserved drafts never share a write", async () => {
  const f = fixture(); const keys: string[] = [];
  for (const [owner, planId] of [["a", "plan:first"], ["b", "plan:first"], ["a", "plan:other"]]) {
    await assert.rejects(f.boot()(owner!, { ...input, planId: planId! }, async key => { keys.push(key); throw Error("unknown"); }));
  }
  assert.equal(new Set(keys).size, 3);
  assert.equal([...f.values.keys()].filter(key => planSaveBelongsTo(key, "a")).length, 1);
});

test("a first explicit rejection can release, but a rejection after an unknown dispatch cannot", async () => {
  const fresh = fixture();
  await assert.rejects(fresh.boot()("a", input, async () => { throw "rejected"; }));
  assert.equal(fresh.values.size, 0);
  const f = fixture();
  await assert.rejects(f.boot()("a", input, async () => {
    assert.equal(f.values.size, 1, "the journal must precede dispatch and survive process termination");
    throw Error("unknown");
  }));
  await assert.rejects(f.boot()("a", input, async () => { throw "rejected"; }));
  assert.equal(f.values.size, 1);
});

test("storage failure prevents dispatch; successful receipt remains recoverable if draft cleanup has not happened", async () => {
  const f = fixture();
  const blocked = createPlanSaveRetry({ ...f.storage, setStorageSync() { throw Error("full"); } }, () => "test:key", () => false);
  await assert.rejects(blocked("a", input, async () => assert.fail("must not dispatch")), PlanSaveRecoveryError);
  const first = await f.boot()("a", input, async () => "saved");
  await f.boot()("a", { ...input, notes: "cold draft modified" }, async (key, original) => {
    assert.equal(key, first.receipt.key); assert.equal(original.notes, input.notes); return "same saved receipt";
  });
  assert.equal(f.values.size, 1);
});

test("v1 exact intent inherits its old plan identity while ambiguous changed drafts require explicit selection", async () => {
  const f = fixture(), storageKey = 'starward.plan-save.v1:["a"]';
  f.storage.setStorageSync(storageKey, { schema: 1, entries: [{ input, key: "old:one" }] });
  assert.equal(resolvePlanCreationId(f.storage, "a", { ...input, planId: "plan:regenerated", observationContextId: "context:new" }), input.planId);
  assert.throws(() => resolvePlanCreationId(f.storage, "a", { ...input, notes: "changed" }), error => error instanceof PlanSaveRecoveryError && error.pending.length === 1);
  f.storage.setStorageSync(storageKey, { schema: 1, entries: [{ input, key: "old:one" }, { input: { ...input, notes: "second" }, key: "old:two" }] });
  await assert.rejects(f.boot()("a", input, async () => assert.fail("ambiguous")), PlanSaveRecoveryError);
  selectPlanSaveRecovery(f.storage, { owner: "a", key: "old:two", planId: input.planId });
  const chosen = await f.boot()("a", input, async (key, original) => {
    assert.equal(key, "old:two"); assert.equal(original.notes, "second"); return "receipt";
  });
  acknowledgePlanSave(f.storage, chosen.receipt);
  assert.equal((f.values.get(storageKey) as { entries: unknown[] }).entries.length, 1, "unselected operation survives");
});

test("explicit origin identity ignores unrelated browsing origin, retaining all authored travel and reminder fields", () => {
  const first = { timezone: "Asia/Shanghai", location: { kind: "MAP_POINT", wgs84: { system: "WGS84", latitude: 22, longitude: 113 } } } as ObservationContext;
  const changed = { ...first, location: { kind: "FORMAL_SPOT", spotId: "spot:one" }, routeOrigin: null } as ObservationContext;
  for (const originLocation of [null, { source: "WECHAT_CHOOSE_LOCATION" as const, address: "地址", wgs84: { system: "WGS84" as const, latitude: 23, longitude: 114 } }]) {
    const travel = { origin: "出发地", mode: "TRANSIT" as const, originLocation };
    assert.equal(planContextIdentity(first, travel), planContextIdentity(changed, travel));
  }
  assert.notEqual(planContextIdentity(first), planContextIdentity(changed));
});

test("only whitelisted inputs and adopted note lengths reach the journal", async () => {
  const f = fixture();
  await assert.rejects(f.boot()("a", { ...input, notes: "字".repeat(2000), accessToken: "NEVER_RETAIN" } as PlanSaveInput, async () => { throw Error("unknown"); }));
  assert.doesNotMatch(JSON.stringify([...f.values.values()]), /accessToken|NEVER_RETAIN/);
  await assert.rejects(fixture().boot()("a", { ...input, notes: "字".repeat(2001) }, async () => assert.fail("invalid note")), PlanSaveRecoveryError);
});
