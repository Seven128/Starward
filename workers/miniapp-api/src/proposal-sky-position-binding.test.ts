import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { EXTENDED_DEEP_SKY_CATALOG_VERSION } from "@starward/miniapp-contracts";
import { matchingCelestialPositionResponse } from "../../../apps/wechat-miniapp/src/services/celestial-position-response.ts";
import { MiniappController } from "./controller.ts";
import { loadSaoCatalog } from "./sao-catalog-provider.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

test("private proposal position remains bound to the displayed report across reads and an explicit time update", async () => {
  const service = createTestMiniappService();
  try {
    const session = (await service.login({ code: "local:proposal-position-binding" })).data;
    const location = { displayName: "候选位置", region: "深圳", wgs84: { system: "WGS84" as const, latitude: 22.588, longitude: 114.302 } };
    const draft = (await service.createContributionDraft(session.userId, {
      kind: "NEW_SPOT_PROPOSAL", spotId: null, candidateLocation: location,
      observedAt: null, topics: [], detail: "", rightsConfirmed: true, preciseLocationConsent: true,
      candidateProfile: { fields: { name: location.displayName, address: "隔离测试位置" }, media: {} },
    }, "proposal-position-create:0001")).data;
    const pending = (await service.submitContribution(session.userId, draft.submissionId, draft.revision,
      "proposal-position-submit:0001")).data;
    const initial = (await service.resolveObservationContext({ location: { kind: "MAP_POINT", ...location,
      source: "MAP_VIEWPORT", timezoneHint: "Asia/Shanghai" }, localDate: "2026-10-06" })).data;
    const controller = new MiniappController(service), catalog = loadSaoCatalog("bsc5p-bright-stars.v3").catalog;
    const reference = "SAO:19229", at = "2026-10-06T04:00:00.000Z";
    const verify = async (context: typeof initial) => {
      const report = await service.getSky(pending.submissionId, context.contextId, session.userId,
        "bsc5p-bright-stars.v3", EXTENDED_DEEP_SKY_CATALOG_VERSION);
      // Cross a real acquisition timestamp without changing the submitted evidence.
      await new Promise(resolve => setTimeout(resolve, 5));
      const position = await controller.celestialPosition(encodeURIComponent(pending.submissionId),
        encodeURIComponent(reference), context.contextId, at, "Bearer " + session.accessToken,
        "bsc5p-bright-stars.v3", EXTENDED_DEEP_SKY_CATALOG_VERSION);
      matchingCelestialPositionResponse(position, { reference, ...report.data.context, at }, catalog);
      assert.ok(position.data.position);
      assert.equal(position.data.spotId, pending.submissionId);
      assert.equal(position.data.contextRevision, context.revision);
      assert.equal(report.sources.find(source => source.id === "proposal-source:" + pending.submissionId)?.retrievedAt,
        pending.updatedAt);
      return { report, position };
    };
    const before = await verify(initial);
    const changed = (await service.updateObservationContext(initial.contextId,
      { expectedRevision: initial.revision, selectedAt: "2026-10-06T14:00:00.000Z" })).data;
    const after = await verify(changed);
    assert.equal(changed.revision, initial.revision + 1);
    assert.deepEqual(changed.location, initial.location);
    assert.throws(() => matchingCelestialPositionResponse(before.position,
      { reference, ...after.report.data.context, at }, catalog), /binding_invalid/u);
  } finally { await service.onModuleDestroy(); }
});
