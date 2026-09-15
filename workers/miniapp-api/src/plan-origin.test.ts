import assert from "node:assert/strict";
import test from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";

test("private selected plan origins survive readback, legacy edits and explicit clearing independently of browsing geography", async () => {
  const service = createTestMiniappService({ repository: new InMemoryTestRepository([TEST_PUBLISHED_SPOT]) });
  try {
    const first = (await service.login({ code: "local:plan-origin-first-account" })).data;
    const second = (await service.login({ code: "local:plan-origin-second-account" })).data;
    const context = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-09-15" })).data;
    // A valid origin outside browsing's trial geography and with a name longer than
    // the Context's 80-character limit must still be a valid private departure plan.
    const travel = { origin: "外地出发点".repeat(20), mode: "TRANSIT" as const,
      originLocation: { source: "WECHAT_CHOOSE_LOCATION" as const, address: "London", wgs84: { system: "WGS84" as const, latitude: 51.5, longitude: -0.12 } } };
    const input = { planId: "plan:origin" as never, spotId: TEST_PUBLISHED_SPOT.spotId, observationContextId: context.contextId,
      localDate: "2026-09-15", localTime: "22:00", notes: "私有出发地", travel, expectedRevision: null };
    const saved = await service.savePlan(first.userId, input, "plan:origin:create");
    assert.deepEqual(saved.data.travel, travel);
    assert.equal(saved.data.contextSnapshot.schemaVersion === "observation-context-snapshot-v2" && saved.data.contextSnapshot.routeOrigin, null);
    assert.deepEqual((await service.getPlans(first.userId)).data.plans[0]?.travel, travel);
    assert.deepEqual((await service.getPlans(second.userId)).data.plans, []);
    const legacy = await service.savePlan(first.userId, { ...input, expectedRevision: saved.data.revision,
      travel: { origin: travel.origin, mode: "WALKING" } }, "plan:origin:legacy");
    assert.deepEqual(legacy.data.travel?.originLocation, travel.originLocation);
    const cleared = await service.savePlan(first.userId, { ...input, expectedRevision: legacy.data.revision,
      travel: { ...travel, originLocation: null } }, "plan:origin:clear");
    assert.equal(cleared.data.travel?.originLocation, null);
    const restored = await service.savePlan(first.userId, { ...input, expectedRevision: cleared.data.revision }, "plan:origin:reselect");
    const renamed = await service.savePlan(first.userId, { ...input, expectedRevision: restored.data.revision,
      travel: { origin: "另一处手填出发地", mode: "TRANSIT" } }, "plan:origin:manual");
    assert.equal(renamed.data.travel?.originLocation, null);
    assert.equal((await service.getPlans(first.userId)).data.plans[0]?.travel?.origin, "另一处手填出发地");
    const replay = await service.savePlan(first.userId, input, "plan:origin:create");
    assert.deepEqual(replay.data.travel, travel);
    assert.equal((await service.getPlans(first.userId)).data.plans[0]?.revision, renamed.data.revision);
  } finally { await service.onModuleDestroy(); }
});
