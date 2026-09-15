import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import type { PlanId } from "@starward/miniapp-contracts";
import { AstronomicalEventCatalogOwner, builtInAstronomicalEventCatalogPackage, eventCatalogDigest } from "./astronomical-event-catalog-owner.ts";
import { PostgresAstronomicalEventCatalogStore } from "./postgres-astronomical-event-catalog-store.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { MiniappService } from "./miniapp-service.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { createWeatherPort } from "./weather-provider.ts";
import { DisabledRouteAdapter } from "./route-provider.ts";
import { insertExplicitTestSpot } from "./test-fixtures/infrastructure-spot.ts";
import { retiredMeteorRecords } from "./test-fixtures/retired-meteor-records.ts";

const databaseUrl = process.env.GMN_TEST_DATABASE_URL;

test("persisted retired catalog migrates across repository restart without changing saved plans", { skip: !databaseUrl }, async () => {
  assert.ok(databaseUrl);
  // This test must use its own disposable database, never the ordinary development database.
  assert.match(new URL(databaseUrl).pathname, /^\/starward_gmn_[a-f0-9]+$/);
  const config = createTestRuntimeConfig({ storageMode: "POSTGRES", databaseUrl });
  let repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: true });
  const current = builtInAstronomicalEventCatalogPackage();
  const previous = { ...current, catalogVersion: "iau-imo-reviewed-2026.1+astronomy-engine-2.1.19-eclipses-2026.1",
    coverage: "REVIEWED_2026_METEOR_AND_ECLIPSE_EVENTS" as const,
    sourceRelease: "committed-reviewed-2026.1", parserVersion: "builtin-reviewed-2026.1",
    events: [...retiredMeteorRecords, ...current.events.filter(event => event.kind !== "METEOR_SHOWER")],
    sources: current.sources.map(source => source.provider === "Global Meteor Network" ? {
      ...source, id: "meteor-catalog:iau-imo-reviewed-2026.1", provider: "International Meteor Organization", kind: "OFFICIAL_REFERENCE" as const,
    } : source),
  };
  try {
    const store = new PostgresAstronomicalEventCatalogStore(repository.pool);
    await store.activatePublication({ publicationId: `publication:${randomUUID()}`, catalogVersion: previous.catalogVersion,
      candidateId: null, package: previous, contentSha256: eventCatalogDigest(previous), publishedAt: "2026-09-01T00:00:00Z",
      publishedBy: "admin:isolated-regression", reason: "Existing baseline before migration", rolledBackFromVersion: null });
    const spot = await insertExplicitTestSpot(repository);
    const userId = await repository.findOrCreateWechatUser(`gmn-persistence:${randomUUID()}`);
    // Save through the existing service and repository; weather is the normal unconfigured adapter, not a fixture fallback.
    const service = new MiniappService({ repository, config, weather: createWeatherPort(config), route: new DisabledRouteAdapter() });
    const context = (await service.resolveObservationContext({ location: { kind: "MAP_POINT", displayName: "隔离数据库地点",
      wgs84: { system: "WGS84", latitude: 22.54, longitude: 114.06 }, source: "MAP_VIEWPORT", timezoneHint: "Asia/Shanghai" }, localDate: "2026-08-06" })).data;
    const saved = (await service.savePlan(userId, { planId: `plan:${randomUUID()}` as PlanId, spotId: spot.spotId,
      observationContextId: context.contextId, localDate: "2026-08-06", localTime: "23:40",
      eventOccurrenceIds: ["event-occurrence:007-per:2026"], notes: "Retain original date and occurrence identity", expectedRevision: null }, `save:${randomUUID()}`)).data;
    await service.onModuleDestroy();

    repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: false });
    const reloadedStore = new PostgresAstronomicalEventCatalogStore(repository.pool);
    const owner = await new AstronomicalEventCatalogOwner(reloadedStore).initialize();
    assert.match(owner.snapshot().catalogVersion, /^gmn-annual-.*\.migration\./);
    assert.equal(owner.sourceFor(owner.find(saved.eventOccurrenceIds![0]!)!).provider, "Global Meteor Network");
    assert.deepEqual(await repository.listPlans(userId), [saved]);
    assert.deepEqual((await reloadedStore.getPublication(previous.catalogVersion))?.package, previous);
    assert.deepEqual(owner.snapshot().events.filter(event => event.kind !== "METEOR_SHOWER"), previous.events.filter(event => event.kind !== "METEOR_SHOWER"));
    assert.equal((await reloadedStore.listPublications()).length, 2);
    await assert.rejects(owner.rollback({ catalogVersion: previous.catalogVersion, actorId: "admin:isolated-regression", reason: "退役目录不可恢复" }), /retired_baseline_not_restorable/);
    const staleWrite = { ...(await reloadedStore.loadActivePublication())!, publicationId: `publication:${randomUUID()}`, catalogVersion: "must-not-activate" };
    await assert.rejects(reloadedStore.activatePublication(staleWrite, { catalogVersion: previous.catalogVersion, contentSha256: eventCatalogDigest(previous) }), /active_changed/);
    assert.equal((await reloadedStore.loadActivePublication())?.catalogVersion, owner.snapshot().catalogVersion);
    const audit = await repository.pool.query("SELECT action FROM audit_logs WHERE subject_type='ASTRONOMICAL_EVENT_CATALOG' AND subject_id=$1", [owner.snapshot().catalogVersion]);
    assert.deepEqual(audit.rows.map(row => row.action), ["EVENT_CATALOG_PUBLISH"]);
    await assert.rejects(repository.pool.query("UPDATE astronomical_event_catalog_publications SET reason='changed' WHERE catalog_version=$1", [previous.catalogVersion]), /event_catalog_publication_immutable/);
    await repository.close();
    repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: false });
    const finalStore = new PostgresAstronomicalEventCatalogStore(repository.pool);
    assert.equal((await new AstronomicalEventCatalogOwner(finalStore).initialize()).snapshot().catalogVersion, owner.snapshot().catalogVersion);
    assert.equal((await finalStore.listPublications()).length, 2);
    assert.deepEqual(await repository.listPlans(userId), [saved]);
  } finally {
    await repository.close();
  }
});
