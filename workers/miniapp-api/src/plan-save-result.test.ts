import assert from "node:assert/strict";
import test from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

test("read-only plan verification returns the exact original receipt without saving or scheduling", async () => {
  const service = createTestMiniappService();
  try {
    const owner = (await service.login({ code: "local:save-result-owner" })).data.userId;
    const other = (await service.login({ code: "local:save-result-other" })).data.userId;
    const context = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-10-15" })).data;
    const input = { planId: "plan:save-result" as never, spotId: TEST_PUBLISHED_SPOT.spotId,
      observationContextId: context.contextId, localDate: "2026-10-15", localTime: "22:00", notes: "original", expectedRevision: null };
    const first = (await service.savePlan(owner, input, "save-result:first")).data;
    const latest = (await service.savePlan(owner, { ...input, notes: "later edit", expectedRevision: first.revision }, "save-result:later")).data;
    const beforeSchedules = await service.repository.listPlanReminderSchedules(owner);
    service.repository.savePlan = async () => assert.fail("verification must never write a plan");
    assert.deepEqual((await service.getPlanSaveResult(owner, input.planId, "save-result:first")).data.receipt, first);
    assert.deepEqual((await service.getPlanSaveResult(owner, input.planId, "save-result:first")).data.receipt, first);
    assert.equal((await service.getPlanSaveResult(other, input.planId, "save-result:first")).data.receipt, null);
    assert.equal((await service.getPlanSaveResult(owner, "plan:another", "save-result:first")).data.receipt, null);
    assert.equal((await service.getPlanSaveResult(owner, input.planId, "save-result:unknown")).data.receipt, null);
    assert.deepEqual(await service.repository.listPlans(owner), [latest]);
    assert.deepEqual(await service.repository.listPlanReminderSchedules(owner), beforeSchedules);
    await assert.rejects(service.getPlanSaveResult(owner, input.planId, ""), /invalid_idempotency_key/);
  } finally { await service.onModuleDestroy(); }
});
