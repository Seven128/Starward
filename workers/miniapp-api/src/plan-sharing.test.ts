import assert from "node:assert/strict";
import test from "node:test";
import { buildTestSpotDetail, TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import type { SpotSummary } from "@starward/miniapp-contracts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";

test("public spot sharing retains canonical facts, moderated overrides and explicit clears", async () => {
  const detail = structuredClone(buildTestSpotDetail(TEST_PUBLISHED_SPOT.spotId)!);
  delete detail.formalFacts;
  detail.accessAndSafety = { ...detail.accessAndSafety, openness: "OPEN", legalAccess: "PERMITTED",
    restrictions: ["仅限指定通道"], guidance: ["夜间结伴进入"] };
  detail.spot.facilities = detail.spot.facilities.map((facility) => facility.type === "PARKING"
    ? { ...facility, status: "AVAILABLE", detail: "停车测试区", openingHours: "", usageCondition: "" } : facility);
  class CanonicalRepository extends InMemoryTestRepository {
    override async getDetail() { return detail; }
  }
  const service = createTestMiniappService({ repository: new CanonicalRepository([TEST_PUBLISHED_SPOT]) });
  try {
    const canonical = (await service.getSharedSpot(TEST_PUBLISHED_SPOT.spotId)).data;
    assert.equal(canonical.opening, "开放");
    assert.equal(canonical.access, "允许进入；仅限指定通道");
    assert.equal(canonical.safety, "夜间结伴进入");
    assert.equal(canonical.parking, "有；停车测试区");
    assert.equal(canonical.horizon, null);
    assert.deepEqual(Object.keys(canonical).sort(), ["kind", "spotId", "spotGcj02", "name", "region", "address", "status",
      "opening", "access", "safety", "parking", "horizon", "source"].sort());

    detail.formalFacts = { openness: "有条件开放", hours: "19:00—23:00", access: "需预约", accessNote: null,
      safety: null, parking: null, parkingNote: null, horizon: "南向开阔" };
    const moderated = (await service.getSharedSpot(TEST_PUBLISHED_SPOT.spotId)).data;
    assert.equal(moderated.opening, "有条件开放；19:00—23:00");
    assert.equal(moderated.access, "需预约");
    assert.equal(moderated.safety, null);
    assert.equal(moderated.parking, null);
    assert.equal(moderated.horizon, "南向开阔");

    delete detail.formalFacts;
    detail.accessAndSafety.legalAccess = "CONDITIONAL";
    detail.spot.facilities = detail.spot.facilities.map(facility => facility.type === "PARKING"
      ? { ...facility, status: "UNAVAILABLE" } : facility);
    const restricted = (await service.getSharedSpot(TEST_PUBLISHED_SPOT.spotId)).data;
    assert.equal(restricted.access, "需预约或其他条件；仅限指定通道");
    assert.equal(restricted.parking, "没有；停车测试区");
    detail.accessAndSafety = { ...detail.accessAndSafety, openness: "UNKNOWN", legalAccess: "UNKNOWN", restrictions: [], guidance: [] };
    detail.spot.facilities = [];
    detail.evidence = [];
    const missing = (await service.getSharedSpot(TEST_PUBLISHED_SPOT.spotId)).data;
    for (const key of ["opening", "access", "safety", "parking", "horizon"] as const) assert.equal(missing[key], null);
  } finally { await service.onModuleDestroy(); }
});

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
