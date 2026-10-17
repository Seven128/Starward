import assert from "node:assert/strict";
import test from "node:test";
import { zonedLocalToUtc, type ObservationContext, type PlanId } from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";

for (const [timezone, localDate, localTime, nightDate] of [
  ["Asia/Shanghai", "2026-10-10", "06:00", "2026-10-09"],
  ["Asia/Shanghai", "2027-01-01", "00:00", "2026-12-31"],
  ["Asia/Shanghai", "2026-10-10", "11:59", "2026-10-09"],
  ["Asia/Shanghai", "2026-10-10", "12:00", "2026-10-10"],
  ["Asia/Shanghai", "2026-10-10", "23:59", "2026-10-10"],
  ["Asia/Hong_Kong", "2026-10-10", "00:15", "2026-10-09"],
  ["Asia/Macau", "2026-10-10", "10:00", "2026-10-09"],
] as const) {
  test(`plan ${timezone} ${localDate} ${localTime} preserves its civil time in the correct observation night`, async () => {
    const spot = { ...TEST_PUBLISHED_SPOT, timezone };
    const service = createTestMiniappService({ repository: new InMemoryTestRepository([spot]) });
    try {
      const owner = (await service.login({ code: `local:plan-civil-${localTime.replace(":", "")}-test` })).data.userId;
      const source = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: spot.spotId }, localDate: "2026-09-28" })).data;
      const input = { planId: "plan:civil-night" as PlanId, spotId: spot.spotId, observationContextId: source.contextId,
        localDate, localTime, notes: "authored civil time", expectedRevision: null };
      const saved = (await service.savePlan(owner, input, "plan-civil-create")).data;
      assert.equal(saved.localDate, localDate);
      assert.equal(saved.localTime, localTime);
      assert.equal(saved.contextSnapshot.localDate, nightDate);
      const instant = zonedLocalToUtc({ localDate, localTime, timezone });
      assert.equal(saved.contextSnapshot.selectedAtUtc, instant);
      assert.equal(saved.contextSnapshot.timezone, timezone);
      const savedContext = (await service.getObservationContext(saved.contextSnapshot.contextId, owner)).data;
      assert.equal(savedContext.localDate, nightDate);
      assert.equal(savedContext.selectedAtUtc, instant);
      assert.ok(Date.parse(instant) >= Date.parse(savedContext.nightStartUtc));
      assert.ok(Date.parse(instant) < Date.parse(savedContext.nightEndUtc));
      assert.deepEqual((await service.getPlans(owner)).data.plans[0], saved);
      const replay = (await service.savePlan(owner, { ...input, observationContextId: "ctx:expired-source" as ObservationContext["contextId"] }, "plan-civil-create")).data;
      assert.deepEqual(replay, saved);
      const edited = (await service.savePlan(owner, { ...input, expectedRevision: saved.revision, localTime: "12:00" }, "plan-civil-edit")).data;
      assert.equal(edited.revision, 2);
      assert.equal(edited.localDate, localDate);
      assert.equal(edited.contextSnapshot.localDate, localDate);
      assert.equal(edited.contextSnapshot.selectedAtUtc, zonedLocalToUtc({ localDate, localTime: "12:00", timezone }));
      assert.deepEqual((await service.getPlans(owner)).data.plans[0], edited);
    } finally { await service.onModuleDestroy(); }
  });
}

test("renewing a Context reference cannot recreate a deleted plan through its historical save receipt", async () => {
  const service = createTestMiniappService({ repository: new InMemoryTestRepository([TEST_PUBLISHED_SPOT]) });
  try {
    const owner = (await service.login({ code: "local:plan-deleted-context-retry-test" })).data.userId;
    const source = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-10-09" })).data;
    const input = { planId: "plan:deleted-context-retry" as PlanId, spotId: TEST_PUBLISHED_SPOT.spotId,
      observationContextId: source.contextId, localDate: "2026-10-10", localTime: "06:00", notes: "saved before deletion", expectedRevision: null };
    const saved = (await service.savePlan(owner, input, "plan-before-context-expiry")).data;
    await service.deletePlan(owner, input.planId, "plan-context-delete");
    assert.equal((await service.getPlans(owner)).data.plans.length, 0);
    const receipt = (await service.savePlan(owner, { ...input, observationContextId: "ctx:renewed-reference" as ObservationContext["contextId"] }, "plan-before-context-expiry")).data;
    assert.deepEqual(receipt, saved);
    assert.equal((await service.getPlans(owner)).data.plans.length, 0, "a historical receipt must have no create effect");
  } finally { await service.onModuleDestroy(); }
});
