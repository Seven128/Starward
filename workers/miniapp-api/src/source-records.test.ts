import assert from "node:assert/strict";
import test from "node:test";
import type { SourceSummary, SpotId } from "@starward/miniapp-contracts";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";

test("the overview preserves source records with different validity or attribution under one ID", async () => {
  const first: SourceSummary = { ...TEST_PUBLISHED_SPOT.source, id: "test-fixture:source-records",
    validFrom: "2026-08-06T04:00:00Z", validTo: "2026-08-07T04:00:00Z",
    attribution: { name: "TEST earlier record", url: "https://example.com/first", statements: ["TEST earlier credit"] } };
  const second: SourceSummary = { ...first, validFrom: "2026-08-07T04:00:00Z", validTo: null,
    attribution: { name: "TEST later record", url: "https://example.com/second", statements: ["TEST later credit"] } };
  class SourceRecordRepository extends InMemoryTestRepository {
    override async getDetail(spotId: SpotId) {
      const detail = await super.getDetail(spotId);
      return detail ? { ...detail, dataDisclosure: [first, structuredClone(first), second] } : null;
    }
  }
  const service = createTestMiniappService({ repository: new SourceRecordRepository([TEST_PUBLISHED_SPOT]) });
  try {
    const context = (await service.resolveObservationContext({ location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-08-06" })).data;
    const overview = await service.getSpotOverview(TEST_PUBLISHED_SPOT.spotId, context.contextId);
    const own = (records: readonly SourceSummary[]) => records.filter(item => item.id === first.id);
    assert.deepEqual(own(overview.data.dataDisclosure), [first, second]);
    assert.deepEqual(own(overview.sources), [first, second]);
    assert.deepEqual(first.attribution?.statements, ["TEST earlier credit"]);
  } finally { await service.onModuleDestroy(); }
});
