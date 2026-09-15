import assert from "node:assert/strict";
import test from "node:test";
import { AstronomicalEventCatalogOwner, builtInAstronomicalEventCatalogPackage, eventCatalogDigest, EVENT_CATALOG_SCHEMA_VERSION } from "./astronomical-event-catalog-owner.ts";
import { PostgresAstronomicalEventCatalogStore } from "./postgres-astronomical-event-catalog-store.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";

const databaseUrl = process.env.GMN_TEST_DATABASE_URL;
test("Postgres preserves publication, review and source preconditions, with complete candidate pagination", { skip: !databaseUrl }, async () => {
  assert.ok(databaseUrl);
  assert.match(new URL(databaseUrl).pathname, /^\/starward_gmn_[a-f0-9]+$/);
  const repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: true });
  try {
    const store = new PostgresAstronomicalEventCatalogStore(repository.pool);
    assert.equal(await store.loadActivePublication(), null, "Use a fresh isolated database");
    const source = { sourceId: "source:concurrency-test", provider: "Isolated test source", endpoint: "https://example.test/catalog.json",
      enabled: true, parserVersion: "test-parser", schemaVersion: EVENT_CATALOG_SCHEMA_VERSION, autoPublishEligible: true,
      approvedBaselineVersion: "reviewed-baseline", termsUrl: "https://example.test/terms", coverage: "Isolated regression" } as const;
    await store.upsertSourceConfig(source, "admin:regression", true);
    await assert.rejects(store.upsertSourceConfig({ ...source, endpoint: null, autoPublishEligible: false, approvedBaselineVersion: null }, "admin:late", true), /source_exists/);
    assert.deepEqual(await store.getSourceConfig(source.sourceId), source);
    const owner = await new AstronomicalEventCatalogOwner(store).initialize();
    const staleOwner = await new AstronomicalEventCatalogOwner(store).initialize();
    const baseline = builtInAstronomicalEventCatalogPackage();
    const identity = { catalogVersion: baseline.catalogVersion, contentSha256: eventCatalogDigest(baseline) };
    const ids: string[] = [];
    for (let i = 0; i < 101; i++) {
      const imported = await owner.importCandidate({ sourceId: source.sourceId, actorId: "admin:regression", package: {
        ...baseline, catalogVersion: `pg-concurrency-${i}`, parserVersion: source.parserVersion,
        events: baseline.events.map((event, index) => index === 0 ? { ...event, displayName: `回归数据 ${i}` } : event),
      } });
      ids.push(imported.candidate!.candidateId);
    }
    const first = await store.listCandidates();
    const second = await store.listCandidates(undefined, 100);
    assert.equal(first[0]?.candidateId, ids[100]);
    assert.equal(first.length, 100);
    assert.deepEqual(second.map(row => row.candidateId), [ids[0]]);
    assert.equal(new Set([...first, ...second].map(row => row.candidateId)).size, 101);
    for (const id of ids.slice(0, 2)) await owner.reviewCandidate({ candidateId: id, decision: "APPROVE", reason: "Reviewed", actorId: "admin:regression", expectedState: "REVIEW_REQUIRED" });
    await assert.rejects(owner.reviewCandidate({ candidateId: ids[0]!, decision: "REJECT", reason: "Old review", actorId: "admin:late", expectedState: "REVIEW_REQUIRED" }), /candidate_changed/);
    await owner.publishCandidate({ candidateId: ids[0]!, reason: "Publish first", actorId: "admin:regression", expectedActive: identity });
    // Both a stale process and a stale confirmation in an up-to-date process must fail.
    for (const actor of [staleOwner, owner]) await assert.rejects(actor.publishCandidate({ candidateId: ids[1]!, reason: "Stale confirmation", actorId: "admin:late", expectedActive: identity }), /active_changed/);
    assert.equal((await store.loadActivePublication())?.catalogVersion, "pg-concurrency-0");
    assert.equal((await store.getCandidate(ids[1]!))?.state, "AUTO_PUBLISH_ELIGIBLE");
    await assert.rejects(owner.publishCandidate({ candidateId: ids[1]!, reason: "Old approval with refreshed confirmation", actorId: "admin:late", expectedActive: owner.activeIdentity() }), /review_baseline_changed/);
    const before = owner.snapshot();
    const beforeIdentity = { catalogVersion: before.catalogVersion, contentSha256: eventCatalogDigest(before) };
    const restored = await owner.rollback({ catalogVersion: baseline.catalogVersion, actorId: "admin:regression", reason: "Restore baseline", expectedActive: beforeIdentity });
    await assert.rejects(owner.rollback({ catalogVersion: baseline.catalogVersion, actorId: "admin:regression", reason: "Lost response retry", expectedActive: beforeIdentity }), /active_changed/);
    await assert.rejects(owner.rollback({ catalogVersion: baseline.catalogVersion, actorId: "admin:regression", reason: "Fresh confirmation after lost response", expectedActive: owner.activeIdentity() }), /already_active/);
    assert.equal((await store.listPublications()).length, 2);
    const reloaded = await new AstronomicalEventCatalogOwner(new PostgresAstronomicalEventCatalogStore(repository.pool)).initialize();
    assert.equal(reloaded.snapshot().catalogVersion, restored.catalogVersion);
    assert.deepEqual(reloaded.snapshot().events, baseline.events);
    const audit = await repository.pool.query("SELECT action,count(*)::integer AS count FROM audit_logs WHERE subject_type='ASTRONOMICAL_EVENT_CATALOG' GROUP BY action");
    const counts = Object.fromEntries(audit.rows.map(row => [row.action, row.count]));
    assert.equal(counts.EVENT_CATALOG_PUBLISH, 1);
    assert.equal(counts.EVENT_CATALOG_ROLLBACK, 1);
  } finally { await repository.close(); }
});
