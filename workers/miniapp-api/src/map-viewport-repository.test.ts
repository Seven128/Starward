import assert from "node:assert/strict";
import test from "node:test";
import { TEST_PUBLISHED_SPOT, buildTestSpotDetail } from "@starward/miniapp-contracts/test-fixtures";
import type { SpotId, SpotSummary } from "@starward/miniapp-contracts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { insertExplicitTestSpot } from "./test-fixtures/infrastructure-spot.ts";

test("viewport fetches radius candidates directly while preserving complete population metadata and search", async () => {
  const outside: SpotSummary = { ...structuredClone(TEST_PUBLISHED_SPOT), spotId: "spot:outside" as SpotId,
    wgs84: { ...TEST_PUBLISHED_SPOT.wgs84, longitude: TEST_PUBLISHED_SPOT.wgs84.longitude + 3 } };
  const hidden: SpotSummary = { ...structuredClone(TEST_PUBLISHED_SPOT), spotId: "spot:hidden" as SpotId, status: "DATA_INSUFFICIENT" };
  const spots = [TEST_PUBLISHED_SPOT, outside, hidden];
  const repository = new InMemoryTestRepository(spots);
  repository.getDetail = async (id) => ({ ...buildTestSpotDetail(TEST_PUBLISHED_SPOT.spotId)!, spot: structuredClone(spots.find((spot) => spot.spotId === id)!) });
  let listCalls = 0, radiusCalls = 0;
  const list = repository.listSpots.bind(repository);
  const radius = repository.listSpotsInRadius.bind(repository);
  repository.listSpots = async () => { listCalls++; return list(); };
  repository.listSpotsInRadius = async (...args) => { radiusCalls++; return radius(...args); };
  const service = createTestMiniappService({ repository });
  try {
    const context = (await service.resolveObservationContext({
      location: { kind: "FORMAL_SPOT", spotId: TEST_PUBLISHED_SPOT.spotId }, localDate: "2026-09-08",
    })).data;
    const viewport = { center: TEST_PUBLISHED_SPOT.gcj02, zoom: 12 };
    const result = await service.getMapScene({ contextId: context.contextId, viewport });
    assert.equal(listCalls, 0);
    assert.equal(radiusCalls, 1);
    assert.deepEqual(result.data.spots.map((spot) => spot.spotId), [TEST_PUBLISHED_SPOT.spotId]);
    assert.equal(result.data.population.eligibleCount, 2);
    assert.deepEqual(result.data.population.stableIds, [TEST_PUBLISHED_SPOT.spotId, outside.spotId]);
    assert.equal(result.data.viewport?.excludedOutsideViewport, 1);
    const empty = await service.getMapScene({ contextId: context.contextId, viewport, query: "no-match" });
    assert.equal(empty.data.spots.length, 0);
    assert.equal(empty.data.population.eligibleCount, 2);
    await service.getMapScene({ contextId: context.contextId });
    assert.equal(listCalls, 1, "no-viewport behavior still loads the complete population");
  } finally { await service.onModuleDestroy(); }
});

const databaseUrl = process.env.MINIAPP_EFFICIENCY_DATABASE_URL;
test("PostGIS radius, compact population and detail all enforce current publication facts", { skip: !databaseUrl }, async () => {
  assert.ok(databaseUrl);
  const repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: true });
  try {
    const spot = await insertExplicitTestSpot(repository);
    const read = async () => ({
      radius: await repository.listSpotsInRadius(spot.wgs84, 1),
      all: await repository.listSpots(),
      population: await repository.listSpotPopulation(),
      detail: await repository.getDetail(spot.spotId),
    });
    const initial = await read();
    assert.deepEqual(initial.radius.map((row) => row.spotId), [spot.spotId]);
    assert.deepEqual(initial.population.map((row) => row.spotId), [spot.spotId]);
    assert.equal((await repository.listSpotsInRadius({ ...spot.wgs84, longitude: spot.wgs84.longitude + 1 }, 1)).length, 0);
    const cases = [
      ["UPDATE spots SET visibility_policy = 'HIDDEN' WHERE spot_id = $1", "UPDATE spots SET visibility_policy = 'PUBLIC_EXACT' WHERE spot_id = $1"],
      ["UPDATE spots SET status = 'DATA_INSUFFICIENT' WHERE spot_id = $1", "UPDATE spots SET status = 'PUBLISHED' WHERE spot_id = $1"],
      ["UPDATE spot_publication_assessments SET complete = false WHERE spot_id = $1", "UPDATE spot_publication_assessments SET complete = true WHERE spot_id = $1"],
      ["UPDATE spot_publication_assessments SET spot_revision = spot_revision + 1 WHERE spot_id = $1", "UPDATE spot_publication_assessments SET spot_revision = spot_revision - 1 WHERE spot_id = $1"],
      ["UPDATE spot_publication_assessments SET assessed_at = now() - interval '31 days' WHERE spot_id = $1", "UPDATE spot_publication_assessments SET assessed_at = now() WHERE spot_id = $1"],
    ];
    for (const [invalidate, restore] of cases) {
      await repository.pool.query(invalidate!, [spot.spotId]);
      const excluded = await read();
      assert.equal(excluded.radius.length, 0);
      assert.equal(excluded.all.length, 0);
      assert.equal(excluded.population.length, 0);
      assert.equal(excluded.detail, null);
      await repository.pool.query(restore!, [spot.spotId]);
    }
    await repository.pool.query("UPDATE spots SET status = 'TEMPORARILY_CLOSED', payload = jsonb_set(payload, '{status}', '\"TEMPORARILY_CLOSED\"') WHERE spot_id = $1", [spot.spotId]);
    const closed = await read();
    assert.equal(closed.radius.length, 1);
    assert.equal(closed.population.length, 1);
    assert.equal(closed.detail?.spot.status, "TEMPORARILY_CLOSED", "detail uses the current spot row even if an old read model remains");
  } finally { await repository.close(); }
});
