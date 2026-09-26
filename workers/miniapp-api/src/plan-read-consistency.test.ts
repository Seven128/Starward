import assert from "node:assert/strict";
import test from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

for (const mutation of ["delete", "edit"] as const) {
  test(`a delayed plan read cannot republish data superseded by ${mutation}`, async () => {
    const service = createTestMiniappService();
    let release = () => {};
    try {
      const user = (await service.login({ code: `local:plan-read-${mutation}-regression` })).data.userId;
      const context = (await service.resolveObservationContext({
        location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-09-28",
      })).data;
      const input = {
        planId: `plan:read-${mutation}` as never, spotId: TEST_PUBLISHED_SPOT.spotId,
        observationContextId: context.contextId, localDate: "2026-09-28", localTime: "22:00",
        timing: { departureLocalDate: "2026-09-28", departureLocalTime: "20:00", endLocalDate: "2026-09-29", endLocalTime: "02:00" },
        notes: "before edit", expectedRevision: null,
      };
      const initial = (await service.savePlan(user, input, "plan-read-create")).data;
      const originalGetSpot = service.repository.getSpot.bind(service.repository);
      let reached = () => {};
      const readingLabels = new Promise<void>(resolve => { reached = resolve; });
      const resume = new Promise<void>(resolve => { release = resolve; });
      let delayNextRead = true;
      service.repository.getSpot = async id => {
        if (delayNextRead) { delayNextRead = false; reached(); await resume; }
        return originalGetSpot(id);
      };
      const olderRead = service.getPlans(user);
      await readingLabels;
      if (mutation === "delete") {
        assert.equal((await service.deletePlan(user, initial.planId, "plan-read-delete")).data.plans.length, 0);
      } else {
        await service.savePlan(user, { ...input, expectedRevision: initial.revision, notes: "after edit" }, "plan-read-edit");
      }
      release();
      assert.equal((await olderRead).data.plans[0]?.notes, "before edit", "the deliberately old read is a real earlier snapshot");
      const durable = await service.repository.listPlans(user);
      const fresh = await service.getPlans(user);
      assert.deepEqual(fresh.data.plans, durable, "a subsequent read must reflect the completed mutation, not late cached data");
      assert.equal(fresh.dataState, "FRESH");
      assert.equal(durable.length, mutation === "delete" ? 0 : 1);
      if (mutation === "edit") assert.equal(durable[0]?.notes, "after edit");
    } finally {
      release();
      await service.onModuleDestroy();
    }
  });
}
