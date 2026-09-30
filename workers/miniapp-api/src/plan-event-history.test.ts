import assert from "node:assert/strict";
import test from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

test("catalog withdrawal preserves unchanged plan history without allowing new unavailable associations", async () => {
  const service = createTestMiniappService();
  try {
    const owner = (await service.login({ code: "local:plan-event-history" })).data.userId;
    const other = (await service.login({ code: "local:plan-event-other" })).data.userId;
    const context = (await service.resolveObservationContext({
      location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-09-28",
    })).data;
    const historicalIds = ["event-occurrence:007-per:2026", "event-occurrence:006-lyr:2026"];
    const input = {
      planId: "plan:event-history" as never, spotId: TEST_PUBLISHED_SPOT.spotId,
      observationContextId: context.contextId, localDate: "2026-09-28", localTime: "22:00",
      timing: { departureLocalDate: "2026-09-28", departureLocalTime: "20:00", endLocalDate: "2026-09-29", endLocalTime: "02:00" },
      travel: { origin: "历史出发地", mode: "DRIVING" as const }, reminders: [],
      eventOccurrenceIds: historicalIds.slice(0, 1), notes: "原备注", expectedRevision: null,
    };
    const initial = (await service.savePlan(owner, input, "event-history-create")).data;
    const legacy = await service.repository.savePlan(owner, { ...initial, eventOccurrenceIds: historicalIds }, initial.revision, "event-history-seed");
    const catalog = service.eventCatalog;
    const baseline = catalog.snapshot();
    const imported = await catalog.importCandidate({ sourceId: "source:history-regression", actorId: "test:operator", package: {
      ...baseline, catalogVersion: `${baseline.catalogVersion}.withdrawal-test`,
      events: baseline.events.filter(event => event.occurrenceId !== historicalIds[0]),
    } });
    assert.ok(imported.candidate);
    await catalog.reviewCandidate({ candidateId: imported.candidate.candidateId, decision: "APPROVE", actorId: "test:reviewer", reason: "Controlled withdrawal" });
    await catalog.publishCandidate({ candidateId: imported.candidate.candidateId, actorId: "test:publisher", reason: "Controlled withdrawal", expectedActive: catalog.activeIdentity() });
    assert.equal(catalog.find(historicalIds[0]!), null);
    const edited = (await service.savePlan(owner, { ...input, eventOccurrenceIds: historicalIds,
      expectedRevision: legacy.revision, notes: "仅修改备注" }, "event-history-notes")).data;
    assert.equal(edited.revision, legacy.revision + 1);
    assert.deepEqual(edited.eventOccurrenceIds, historicalIds);
    assert.equal(edited.notes, "仅修改备注");
    assert.deepEqual(edited.timing, legacy.timing);
    assert.deepEqual(edited.travel, legacy.travel);
    assert.deepEqual((await service.getPlans(owner)).data.plans[0]?.eventOccurrenceIds, historicalIds);

    for (const [user, patch] of [
      [owner, { planId: "plan:new-history", expectedRevision: null }],
      [other, { expectedRevision: null }],
      [owner, { expectedRevision: edited.revision }],
    ] as const) {
      await assert.rejects(service.savePlan(user, { ...input, ...patch, planId: (patch.planId ?? input.planId) as never,
        eventOccurrenceIds: historicalIds.slice(0, 1) }, `event-history-reject-${user}-${patch.planId ?? "existing"}`), /plan_event_occurrence_invalid/);
    }
    assert.equal((await service.getPlans(owner)).data.plans[0]?.revision, edited.revision);
    const replaced = (await service.savePlan(owner, { ...input, eventOccurrenceIds: historicalIds.slice(1),
      expectedRevision: edited.revision }, "event-history-replace")).data;
    const cleared = (await service.savePlan(owner, { ...input, eventOccurrenceIds: [],
      expectedRevision: replaced.revision }, "event-history-clear")).data;
    assert.deepEqual(cleared.eventOccurrenceIds, []);
  } finally { await service.onModuleDestroy(); }
});
