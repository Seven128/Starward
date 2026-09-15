import assert from "node:assert/strict";
import test from "node:test";
import { createPlanSaveRetry, PlanSaveRecoveryError, planSaveBelongsTo, planContextIdentity, type PlanSaveInput } from "./plan-save-retry";
import type { ObservationContext } from "@starward/miniapp-contracts";
const input: PlanSaveInput = { planId: "plan:first", spotId: "spot:one", observationContextId: "context:first", localDate: "2026-09-06", localTime: "22:00", notes: "my notes", expectedRevision: null, contextIdentity: "same-origin" };

test("an explicit origin's lost receipt survives unrelated browsing-origin changes without creating another plan", async () => {
  const first = { timezone: "Asia/Shanghai", location: { kind: "MAP_POINT", wgs84: { system: "WGS84", latitude: 22, longitude: 113 } } } as ObservationContext;
  const changed = { ...first, location: { kind: "FORMAL_SPOT", spotId: "spot:one" }, routeOrigin: null } as ObservationContext;
  for (const originLocation of [null, { source: "WECHAT_CHOOSE_LOCATION" as const, address: "所选地址", wgs84: { system: "WGS84" as const, latitude: 23, longitude: 114 } }]) {
    const travel = { origin: "我的出发地", mode: "TRANSIT" as const, originLocation };
    const f = fixture(); let firstKey = "";
    await assert.rejects(f.boot()("a", { ...input, travel, contextIdentity: planContextIdentity(first, travel) }, async key => { firstKey = key; throw new Error("lost receipt"); }));
    await f.boot()("a", { ...input, planId: "plan:regenerated", observationContextId: "context:changed", travel,
      contextIdentity: planContextIdentity(changed, travel) }, async (key, original) => {
      assert.equal(key, firstKey); assert.equal(original.planId, input.planId); return "saved";
    });
  }
  assert.notEqual(planContextIdentity(first), planContextIdentity(changed));
});

test("interval and departure survive cold retry and distinguish a changed save intent", async () => {
  const f = fixture();
  const timing = { endLocalDate: "2026-09-07", endLocalTime: "02:00", departureLocalDate: "2026-09-06", departureLocalTime: "20:00" };
  let firstKey = "";
  await assert.rejects(f.boot()("a", { ...input, timing }, async key => { firstKey = key; throw new Error("lost receipt"); }));
  await assert.rejects(f.boot()("a", { ...input, timing: { ...timing, endLocalTime: "03:00" } }, async (key, original) => {
    assert.notEqual(key, firstKey);
    assert.equal(original.timing?.endLocalTime, "03:00");
    throw new Error("lost receipt");
  }));
  await f.boot()("a", { ...input, timing }, async (key, original) => {
    assert.equal(key, firstKey);
    assert.deepEqual(original.timing, timing);
    return "saved";
  });
});

test("departure origin and mode survive cold retry and identify a changed save", async () => {
  const f = fixture();
  const travel = { origin: "深圳市福田区", mode: "TRANSIT" as const, originLocation: {
    source: "WECHAT_CHOOSE_LOCATION" as const, address: "所选地址", wgs84: { system: "WGS84" as const, latitude: 22.54, longitude: 114.05 } } };
  let firstKey = "";
  await assert.rejects(f.boot()("a", { ...input, travel }, async key => { firstKey = key; throw new Error("lost"); }));
  await assert.rejects(f.boot()("a", { ...input, travel: { ...travel, mode: "WALKING" } }, async key => {
    assert.notEqual(key, firstKey); throw new Error("lost");
  }));
  await assert.rejects(f.boot()("a", { ...input, travel: { ...travel, originLocation: { ...travel.originLocation,
    wgs84: { ...travel.originLocation.wgs84, longitude: 114.15 } } } }, async key => {
    assert.notEqual(key, firstKey); throw new Error("lost");
  }));
  await f.boot()("a", { ...input, travel }, async (key, original) => {
    assert.equal(key, firstKey); assert.deepEqual(original.travel, travel); return "saved";
  });
});
function fixture() {
  const values = new Map<string, unknown>(); let sequence = 0;
  const storage = { getStorageSync: (key: string) => values.get(key), setStorageSync: (key: string, value: unknown) => { values.set(key, structuredClone(value)); }, removeStorageSync: (key: string) => { values.delete(key); } };
  return { values, storage, boot: () => createPlanSaveRetry(storage, () => `test:${++sequence}`, error => error === "rejected") };
}

test("reminders survive cold retry and completion changes get a distinct save identity", async () => {
  const f = fixture(); let originalKey = "";
  const reminders = [{ reminderId: "reminder:1", title: "设备", hoursBeforeDeparture: 0.5, notifyOnWechat: false,
    items: [{ itemId: "item:1", text: "备用电池", completed: false }] }];
  await assert.rejects(f.boot()("a", { ...input, reminders }, async key => { originalKey = key; throw new Error("lost receipt"); }));
  await assert.rejects(f.boot()("a", { ...input, reminders: reminders.map(reminder => ({ ...reminder, items: reminder.items.map(item => ({ ...item, completed: true })) })) }, async key => {
    assert.notEqual(key, originalKey); throw new Error("lost receipt");
  }));
  await f.boot()("a", { ...input, reminders }, async (key, original) => {
    assert.equal(key, originalKey); assert.deepEqual(original.reminders, reminders); return "saved";
  });
});
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

test("adopted 2000-character notes survive retry and larger notes never dispatch", async () => {
  const f = fixture();
  const accepted = { ...input, notes: "字".repeat(2000) };
  await assert.rejects(f.boot()("a", accepted, async () => { throw new Error("unknown"); }));
  const invalidFixture = fixture();
  let dispatched = false;
  await assert.rejects(invalidFixture.boot()("a", { ...input, notes: "字".repeat(2001) }, async () => {
    dispatched = true;
  }), PlanSaveRecoveryError);
  assert.equal(dispatched, false);
});
