import assert from "node:assert/strict";
import test from "node:test";
import {
  AstronomicalEventCatalogOwner,
  EVENT_CATALOG_SCHEMA_VERSION,
  MemoryAstronomicalEventCatalogStore,
  builtInAstronomicalEventCatalogPackage,
  diffAstronomicalEventCatalog,
  validateAstronomicalEventCatalogPackage,
  type EventCatalogSourceConfig,
} from "./astronomical-event-catalog-owner.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

function packageVersion(version: string) {
  return { ...builtInAstronomicalEventCatalogPackage("2026-01-01T00:00:00.000Z"), catalogVersion: version };
}

function sourceConfig(overrides: Partial<EventCatalogSourceConfig> = {}): EventCatalogSourceConfig {
  return {
    sourceId: "source:test-events",
    provider: "Test authoritative catalog",
    endpoint: "https://events.example.test/catalog.json",
    enabled: true,
    parserVersion: "test-parser-1",
    schemaVersion: EVENT_CATALOG_SCHEMA_VERSION,
    autoPublishEligible: true,
    approvedBaselineVersion: "reviewed-baseline-1",
    termsUrl: "https://events.example.test/terms",
    coverage: "Reviewed test occurrences",
    ...overrides,
  };
}

test("catalog package validation rejects duplicate identities, invalid precision and invented time scale", () => {
  const valid = packageVersion("catalog-test-1");
  assert.equal(validateAstronomicalEventCatalogPackage(valid).events.length, valid.events.length);
  assert.throws(() => validateAstronomicalEventCatalogPackage({ ...valid, timeScale: "LOCAL" }), /event_catalog_time_scale_invalid/u);
  assert.throws(() => validateAstronomicalEventCatalogPackage({ ...valid, precision: "" }), /event_catalog_precision_invalid/u);
  assert.throws(() => validateAstronomicalEventCatalogPackage({ ...valid, events: [valid.events[0], valid.events[0]] }), /event_catalog_occurrence_duplicate/u);
  assert.throws(() => validateAstronomicalEventCatalogPackage({ ...valid, undeclaredField: true }), /event_catalog_package_schema_invalid/u);
});

test("diff identifies removals, coverage collapse and critical-time changes", () => {
  const active = packageVersion("catalog-active");
  const moved = { ...active.events[0]!, peakDate: active.events[0]!.activeEndDate };
  const candidate = { ...active, catalogVersion: "catalog-candidate", events: [moved] };
  const diff = diffAstronomicalEventCatalog(active, candidate);
  assert.ok(diff.removedOccurrenceIds.length > 0);
  assert.equal(diff.coverageCollapse, true);
  assert.deepEqual(diff.criticalTimeChanges, [moved.occurrenceId]);
});

test("operator import always waits for review and publication changes all runtime consumers", async () => {
  const store = new MemoryAstronomicalEventCatalogStore();
  await store.upsertSourceConfig(sourceConfig());
  const owner = await new AstronomicalEventCatalogOwner(store).initialize();
  const current = owner.snapshot();
  const first = current.events[0]!;
  const changed = { ...first, displayName: `${first.displayName}（核对版）` };
  const imported = await owner.importCandidate({
    sourceId: "source:test-events",
    package: { ...current, catalogVersion: "reviewed-2026.2", parserVersion: "test-parser-1", events: [changed, ...current.events.slice(1)] },
    actorId: "admin:review",
  });
  assert.equal(imported.state, "REVIEW_REQUIRED");
  assert.ok(imported.candidate?.decisionReasons.includes("OPERATOR_UPLOAD_REQUIRES_REVIEW"));
  await assert.rejects(owner.publishCandidate({ candidateId: imported.candidate!.candidateId, actorId: "admin:publisher", reason: "尚未审核" }), /not_publishable/u);
  await owner.reviewCandidate({ candidateId: imported.candidate!.candidateId, decision: "APPROVE", actorId: "admin:review", reason: "已与发布资料逐项核对" });
  await owner.publishCandidate({ candidateId: imported.candidate!.candidateId, actorId: "admin:publisher", reason: "审核完成" });
  const service = createTestMiniappService({ eventCatalog: owner });
  assert.equal(service.getAstronomicalEvents().data.catalogVersion, "reviewed-2026.2");
  assert.equal((await service.getAstronomicalEvent(first.occurrenceId)).data.event.displayName, changed.displayName);
  const context = await service.resolveObservationContext({
    location: { kind: "MAP_POINT", wgs84: { system: "WGS84", latitude: 22.54, longitude: 114.06 }, displayName: "测试坐标", timezoneHint: "Asia/Shanghai", source: "MAP_VIEWPORT" },
    localDate: first.peakDate,
    eventInstanceId: first.occurrenceId,
    targetProfile: "METEOR",
  });
  assert.equal(context.data.eventInstanceId, first.occurrenceId);
});

test("approved stable scheduled source auto-publishes only a noncritical additive change", async () => {
  const store = new MemoryAstronomicalEventCatalogStore();
  await store.upsertSourceConfig(sourceConfig());
  const owner = await new AstronomicalEventCatalogOwner(store).initialize();
  const current = owner.snapshot();
  const template = current.events.find(event => event.kind === "METEOR_SHOWER")!;
  const added = { ...template, occurrenceId: "meteor:test-addition:2026", eventId: "meteor:test-addition", code: "TEST", displayName: "测试新增流星雨" };
  const result = await owner.importCandidate({ sourceId: "source:test-events", trigger: "SCHEDULED", actorId: "admin:scheduled-ingestion", package: { ...current, catalogVersion: "scheduled-2026.2", parserVersion: "test-parser-1", events: [...current.events, added] } });
  assert.equal(result.state, "AUTO_PUBLISH_ELIGIBLE");
  await owner.publishCandidate({ candidateId: result.candidate!.candidateId, actorId: "admin:scheduled-ingestion", reason: "稳定来源自动发布" });
  assert.equal(owner.find(added.occurrenceId)?.displayName, added.displayName);

  const removed = await owner.importCandidate({ sourceId: "source:test-events", trigger: "SCHEDULED", actorId: "admin:scheduled-ingestion", package: { ...owner.snapshot(), catalogVersion: "scheduled-2026.3", parserVersion: "test-parser-1", events: owner.snapshot().events.slice(1) } });
  assert.equal(removed.state, "REVIEW_REQUIRED");
  assert.ok(removed.candidate?.decisionReasons.includes("OCCURRENCES_REMOVED"));
});

test("retrieval timestamps alone are no change and changed facts require a new version", async () => {
  const owner = await new AstronomicalEventCatalogOwner().initialize();
  const current = owner.snapshot();
  const refreshed = { ...current, sources: current.sources.map(source => ({ ...source, retrievedAt: "2026-09-10T00:00:00.000Z" })) };
  assert.equal((await owner.importCandidate({ sourceId: "source:any", trigger: "SCHEDULED", actorId: "admin:scheduled-ingestion", package: refreshed })).state, "NO_CHANGE");
  await assert.rejects(owner.importCandidate({ sourceId: "source:any", trigger: "SCHEDULED", actorId: "admin:scheduled-ingestion", package: { ...current, events: [{ ...current.events[0]!, displayName: "发生变化" }, ...current.events.slice(1)] } }), /event_catalog_version_not_advanced/u);
});

test("retrieval sends validators, bounds failures and retains the published catalog", async () => {
  const store = new MemoryAstronomicalEventCatalogStore();
  await store.upsertSourceConfig(sourceConfig());
  const owner = await new AstronomicalEventCatalogOwner(store).initialize();
  const firstRun = await owner.retrieve({
    sourceId: "source:test-events",
    fetcher: async () => new Response(JSON.stringify(packageVersion("retrieved-2026.2")), { status: 200, headers: { "content-type": "application/json", etag: '"catalog-1"', "last-modified": "Wed, 01 Jan 2026 00:00:00 GMT" } }),
  });
  assert.equal(firstRun.state, "CANDIDATE_CREATED");
  let conditional = false;
  const unchanged = await owner.retrieve({
    sourceId: "source:test-events",
    fetcher: async (_url, init) => {
      const requestHeaders = new Headers(init?.headers);
      conditional = requestHeaders.get("if-none-match") === '"catalog-1"' && Boolean(requestHeaders.get("if-modified-since"));
      return new Response(null, { status: 304 });
    },
  });
  assert.equal(conditional, true);
  assert.equal(unchanged.state, "NO_CHANGE");
  const versionBeforeFailure = owner.snapshot().catalogVersion;
  const failed = await owner.retrieve({ sourceId: "source:test-events", fetcher: async () => { throw new Error("network_unreachable"); } });
  assert.equal(failed.state, "FAILED");
  assert.equal(owner.snapshot().catalogVersion, versionBeforeFailure);
});

test("rollback creates an auditable new version instead of mutating history", async () => {
  const store = new MemoryAstronomicalEventCatalogStore();
  await store.upsertSourceConfig(sourceConfig());
  const owner = await new AstronomicalEventCatalogOwner(store).initialize();
  const current = owner.snapshot();
  const changed = { ...current.events[0]!, displayName: "审核后的名称" };
  const imported = await owner.importCandidate({ sourceId: "source:test-events", trigger: "SCHEDULED", actorId: "admin:scheduled-ingestion", package: { ...current, catalogVersion: "rollback-source-1", parserVersion: "test-parser-1", events: [changed, ...current.events.slice(1)] } });
  await owner.publishCandidate({ candidateId: imported.candidate!.candidateId, actorId: "admin:publisher", reason: "发布供回滚验证" });
  const next = { ...owner.snapshot(), catalogVersion: "rollback-source-2", events: [{ ...changed, displayName: "第二版名称" }, ...current.events.slice(1)] };
  const second = await owner.importCandidate({ sourceId: "source:test-events", trigger: "SCHEDULED", actorId: "admin:scheduled-ingestion", package: next });
  await owner.publishCandidate({ candidateId: second.candidate!.candidateId, actorId: "admin:publisher", reason: "第二次发布" });
  const rolledBack = await owner.rollback({ catalogVersion: "rollback-source-1", actorId: "admin:publisher", reason: "第二版核对失败" });
  assert.match(rolledBack.catalogVersion, /^rollback-source-1\.rollback\./u);
  assert.equal(rolledBack.rolledBackFromVersion, "rollback-source-2");
  assert.equal(owner.snapshot().events[0]!.displayName, "审核后的名称");
  assert.equal((await owner.listPublications()).length, 4);
});

test("catalog publication changes Observation Context identity and report cache inputs", async () => {
  const store = new MemoryAstronomicalEventCatalogStore();
  await store.upsertSourceConfig(sourceConfig());
  const owner = await new AstronomicalEventCatalogOwner(store).initialize();
  const service = createTestMiniappService({ eventCatalog: owner });
  const request = {
    location: { kind: "MAP_POINT" as const, wgs84: { system: "WGS84" as const, latitude: 22.54, longitude: 114.06 }, displayName: "目录版本测试", timezoneHint: "Asia/Shanghai" as const, source: "MAP_VIEWPORT" as const },
    localDate: "2026-08-12",
    targetProfile: "METEOR" as const,
  };
  const before = (await service.resolveObservationContext(request)).data;
  const current = owner.snapshot();
  const meteor = current.events.find(event => event.kind === "METEOR_SHOWER")!;
  const imported = await owner.importCandidate({ sourceId: "source:test-events", trigger: "SCHEDULED", actorId: "admin:scheduled-ingestion", package: { ...current, catalogVersion: "context-version-2026.2", parserVersion: "test-parser-1", events: current.events.map(event => event.occurrenceId === meteor.occurrenceId ? { ...meteor, displayName: `${meteor.displayName}更新` } : event) } });
  await owner.publishCandidate({ candidateId: imported.candidate!.candidateId, actorId: "admin:publisher", reason: "验证上下文版本失效" });
  const after = (await service.resolveObservationContext(request)).data;
  assert.notEqual(after.contextFingerprint, before.contextFingerprint);
  assert.equal(after.algorithmVersions.eventCatalog, "context-version-2026.2");
});
