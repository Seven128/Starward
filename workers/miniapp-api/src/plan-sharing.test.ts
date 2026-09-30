import assert from "node:assert/strict";
import test from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import type { SpotSummary } from "@starward/miniapp-contracts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";

test("public plan sharing projects only approved facts and invalidates an edited plan", async () => {
  const service = createTestMiniappService({ repository: new InMemoryTestRepository([TEST_PUBLISHED_SPOT]) });
  try {
    const owner = (await service.login({ code: "local:public-share-owner" })).data.userId;
    const context = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-09-25" })).data;
    const input = { planId: "plan:share-private" as never, spotId: TEST_PUBLISHED_SPOT.spotId,
      observationContextId: context.contextId, localDate: "2026-09-25", localTime: "22:00",
      timing: { departureLocalDate: "2026-09-25", departureLocalTime: "19:00", endLocalDate: "2026-09-26", endLocalTime: "02:00" },
      travel: { origin: "SECRET_PRIVATE_ORIGIN", mode: "DRIVING" as const }, notes: "SECRET_PRIVATE_NOTE",
      expectedRevision: null };
    const saved = await service.savePlan(owner, input, "plan:share:create");
    const share = await service.createPlanShare(owner, saved.data.planId);
    const publicPlan = await service.getSharedPlan(share.data.token);
    assert.equal(publicPlan.data.kind, "PLAN");
    assert.equal(publicPlan.data.spotId, TEST_PUBLISHED_SPOT.spotId);
    assert.equal(publicPlan.data.departureLocalTime, "19:00");
    const serialized = JSON.stringify(publicPlan.data);
    for (const privateValue of ["SECRET_PRIVATE_ORIGIN", "SECRET_PRIVATE_NOTE", owner, saved.data.planId])
      assert.equal(serialized.includes(privateValue), false);
    assert.equal(JSON.stringify(share.data).includes(owner), false);
    await service.savePlan(owner, { ...input, notes: "updated", expectedRevision: saved.data.revision }, "plan:share:edit");
    await assert.rejects(() => service.getSharedPlan(share.data.token), /share_not_found/);
    const publicSpot = await service.getSharedSpot(TEST_PUBLISHED_SPOT.spotId);
    assert.equal(publicSpot.data.kind, "SPOT");
    assert.equal(JSON.stringify(publicSpot.data).includes("SECRET_PRIVATE"), false);
  } finally { await service.onModuleDestroy(); }
});

test("publication changes revoke both public receipts while temporary closure stays explicit", async () => {
  class ChangingPublicationRepository extends InMemoryTestRepository {
    status: SpotSummary["status"] = "PUBLISHED";

    override async getDetail(spotId: SpotSummary["spotId"]) {
      const detail = await super.getDetail(spotId);
      return detail ? { ...detail, spot: { ...detail.spot, status: this.status } } : null;
    }
  }

  const repository = new ChangingPublicationRepository([TEST_PUBLISHED_SPOT]);
  const service = createTestMiniappService({ repository });
  try {
    const owner = (await service.login({ code: "local:publication-share-owner" })).data.userId;
    const context = (await service.resolveObservationContext({
      location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-09-25",
    })).data;
    const saved = await service.savePlan(owner, {
      planId: "plan:publication-share" as never, spotId: TEST_PUBLISHED_SPOT.spotId,
      observationContextId: context.contextId, localDate: "2026-09-25", localTime: "22:00",
      timing: { departureLocalDate: "2026-09-25", departureLocalTime: "19:00", endLocalDate: "2026-09-26", endLocalTime: "02:00" },
      travel: { origin: "PRIVATE_PUBLICATION_ORIGIN", mode: "DRIVING" },
      notes: "PRIVATE_PUBLICATION_NOTE", expectedRevision: null,
    }, "plan:publication-share:create");
    const receipt = await service.createPlanShare(owner, saved.data.planId);
    assert.equal((await service.getSharedPlan(receipt.data.token)).data.spotStatus, "PUBLISHED");

    repository.status = "TEMPORARILY_CLOSED";
    assert.equal((await service.getSharedSpot(TEST_PUBLISHED_SPOT.spotId)).data.status, "TEMPORARILY_CLOSED");
    const closedPlan = await service.getSharedPlan(receipt.data.token);
    assert.equal(closedPlan.data.kind, "PLAN");
    assert.equal(closedPlan.data.spotStatus, "TEMPORARILY_CLOSED");
    assert.equal(JSON.stringify(closedPlan.data).includes("PRIVATE_PUBLICATION"), false);

    repository.status = "UNPUBLISHED";
    await assert.rejects(() => service.getSharedSpot(TEST_PUBLISHED_SPOT.spotId), /share_not_found/);
    await assert.rejects(() => service.getSharedPlan(receipt.data.token), /share_not_found/);
    await assert.rejects(() => service.createPlanShare(owner, saved.data.planId), /share_not_found/);
  } finally { await service.onModuleDestroy(); }
});
