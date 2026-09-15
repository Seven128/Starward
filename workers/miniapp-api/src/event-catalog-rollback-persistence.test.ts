import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { AstronomicalEventCatalogOwner, builtInAstronomicalEventCatalogPackage, eventCatalogDigest } from "./astronomical-event-catalog-owner.ts";
import { PostgresAstronomicalEventCatalogStore } from "./postgres-astronomical-event-catalog-store.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";

const databaseUrl = process.env.GMN_TEST_DATABASE_URL;
test("PostgreSQL preserves the full rollback target in immutable publication and audit across restart", { skip: !databaseUrl }, async () => {
  assert.ok(databaseUrl);
  assert.match(new URL(databaseUrl).pathname, /^\/starward_gmn_[a-f0-9]+$/);
  let repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: true });
  const targetVersion = `${randomUUID()}${"r".repeat(124)}`;
  const nextVersion = randomUUID();
  try {
    const store = new PostgresAstronomicalEventCatalogStore(repository.pool);
    const initial = builtInAstronomicalEventCatalogPackage();
    for (const [catalogVersion, name] of [[targetVersion, "先前名称"], [nextVersion, "后来名称"]]) {
      const catalog = { ...initial, catalogVersion: catalogVersion!, events: [{ ...initial.events[0]!, displayName: name! }, ...initial.events.slice(1)] };
      await store.activatePublication({ publicationId: `event-publication:${randomUUID()}`, catalogVersion: catalog.catalogVersion, candidateId: null,
        package: catalog, contentSha256: eventCatalogDigest(catalog), publishedAt: new Date().toISOString(), publishedBy: "admin:regression", reason: "隔离恢复目标验证", rolledBackFromVersion: null });
    }
    const owner = await new AstronomicalEventCatalogOwner(store).initialize();
    const restored = await owner.rollback({ catalogVersion: targetVersion, actorId: "admin:regression", reason: "恢复完整目标身份", expectedActive: owner.activeIdentity() });
    assert.ok(restored.catalogVersion.length <= 160);
    assert.equal(restored.restoredFromVersion, targetVersion);
    assert.equal(restored.rolledBackFromVersion, nextVersion);
    const audit = await repository.pool.query("SELECT after_payload->>'restored_from_version' AS target FROM audit_logs WHERE action='EVENT_CATALOG_ROLLBACK' AND subject_id=$1", [restored.catalogVersion]);
    assert.deepEqual(audit.rows, [{ target: targetVersion }]);
    await assert.rejects(repository.pool.query("UPDATE astronomical_event_catalog_publications SET restored_from_version='tampered' WHERE catalog_version=$1", [restored.catalogVersion]), /event_catalog_publication_immutable/);
    await repository.close();
    repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: false });
    const restartedStore = new PostgresAstronomicalEventCatalogStore(repository.pool);
    assert.equal((await restartedStore.loadActivePublication())?.restoredFromVersion, targetVersion);
    assert.equal((await restartedStore.getPublication(restored.catalogVersion))?.rolledBackFromVersion, nextVersion);
    assert.equal((await new AstronomicalEventCatalogOwner(restartedStore).initialize()).snapshot().events[0]!.displayName, "先前名称");
  } finally { await repository.close(); }
});
