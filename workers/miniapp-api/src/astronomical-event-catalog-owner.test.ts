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
import { retiredMeteorRecords } from "./test-fixtures/retired-meteor-records.ts";
import { eventCatalogDigest } from "./astronomical-event-catalog-owner.ts";

test("old publication confirmations and repeated rollback cannot overwrite a newer active catalog", async () => {
  const store = new MemoryAstronomicalEventCatalogStore();
  await store.upsertSourceConfig(sourceConfig());
  const owner = await new AstronomicalEventCatalogOwner(store).initialize();
  const initial = owner.snapshot();
  const expectedActive = { catalogVersion: initial.catalogVersion, contentSha256: eventCatalogDigest(initial) };
  const imported = await owner.importCandidate({ sourceId: "source:test-events", package: { ...packageVersion("confirmation-a"), events: initial.events.map((event, index) => index === 0 ? { ...event, displayName: "实际变更名称" } : event) }, actorId: "admin:first" });
  const next = await owner.importCandidate({ sourceId: "source:test-events", package: packageVersion("confirmation-b"), actorId: "admin:second" });
  for (const result of [imported, next]) await owner.reviewCandidate({ candidateId: result.candidate!.candidateId, decision: "APPROVE", actorId: "admin:review", reason: "Reviewed", expectedState: "REVIEW_REQUIRED" });
  await assert.rejects(owner.reviewCandidate({ candidateId: imported.candidate!.candidateId, decision: "REJECT", actorId: "admin:late", reason: "Stale review", expectedState: "REVIEW_REQUIRED" }), /candidate_changed/);
  await owner.publishCandidate({ candidateId: imported.candidate!.candidateId, actorId: "admin:first", reason: "Publish A", expectedActive });
  await assert.rejects(owner.publishCandidate({ candidateId: next.candidate!.candidateId, actorId: "admin:second", reason: "Old confirmation", expectedActive }), /active_changed/);
  assert.equal(owner.snapshot().catalogVersion, "confirmation-a");
  assert.equal((await store.getCandidate(next.candidate!.candidateId))?.state, "AUTO_PUBLISH_ELIGIBLE");
  const beforeRollback = { catalogVersion: owner.snapshot().catalogVersion, contentSha256: eventCatalogDigest(owner.snapshot()) };
  const restored = await owner.rollback({ catalogVersion: initial.catalogVersion, actorId: "admin:first", reason: "Restore", expectedActive: beforeRollback });
  const count = (await store.listPublications()).length;
  await assert.rejects(owner.rollback({ catalogVersion: initial.catalogVersion, actorId: "admin:first", reason: "Response lost retry", expectedActive: beforeRollback }), /active_changed/);
  assert.equal((await store.listPublications()).length, count);
  assert.equal((await store.loadActivePublication())?.catalogVersion, restored.catalogVersion);
  // The UI reads the new identity after a lost response; identical contents must still be rejected.
  await assert.rejects(owner.rollback({ catalogVersion: initial.catalogVersion, actorId: "admin:first", reason: "New confirmation after reconciliation", expectedActive: owner.activeIdentity() }), /already_active/);
  assert.equal((await store.listPublications()).length, count);
});

test("late refresh cannot replace a newer runtime publication and old approvals need current review", async () => {
  const store = new MemoryAstronomicalEventCatalogStore();
  await store.upsertSourceConfig(sourceConfig());
  const owner = await new AstronomicalEventCatalogOwner(store).initialize();
  const initial = owner.snapshot();
  const makeCandidate = (version: string, index: number) => owner.importCandidate({ sourceId: "source:test-events", actorId: "admin:upload", package: {
    ...initial, catalogVersion: version, events: initial.events.map((event, i) => i === index ? { ...event, displayName: version } : event),
  } });
  const a = (await makeCandidate("refresh-a", 0)).candidate!;
  const b = (await makeCandidate("refresh-b", 1)).candidate!;
  for (const candidate of [a, b]) await owner.reviewCandidate({ candidateId: candidate.candidateId, decision: "APPROVE", reason: "Reviewed initial", actorId: "admin:review" });
  await owner.publishCandidate({ candidateId: a.candidateId, reason: "A first", actorId: "admin:publish" });
  await assert.rejects(owner.publishCandidate({ candidateId: b.candidateId, reason: "Old approval", actorId: "admin:publish", expectedActive: owner.activeIdentity() }), /review_baseline_changed/);
  const diff = diffAstronomicalEventCatalog(owner.snapshot(), b.package);
  assert.deepEqual(new Set(diff.changedOccurrenceIds), new Set([initial.events[0]!.occurrenceId, initial.events[1]!.occurrenceId]));
  await owner.reviewCandidate({ candidateId: b.candidateId, decision: "APPROVE", reason: "Reviewed both changes", actorId: "admin:review", expectedActive: owner.activeIdentity(), expectedState: "AUTO_PUBLISH_ELIGIBLE" });
  const originalLoad = store.loadActivePublication.bind(store);
  let releaseRead!: () => void;
  let captured!: () => void;
  const capturedPromise = new Promise<void>(resolve => { captured = resolve; });
  const gate = new Promise<void>(resolve => { releaseRead = resolve; });
  store.loadActivePublication = async () => { const value = await originalLoad(); captured(); await gate; return value; };
  const refresh = owner.initialize();
  await capturedPromise;
  await owner.publishCandidate({ candidateId: b.candidateId, reason: "B while read waits", actorId: "admin:publish", expectedActive: owner.activeIdentity() });
  releaseRead(); await refresh;
  assert.equal(owner.snapshot().catalogVersion, "refresh-b");
  assert.equal((await originalLoad())?.catalogVersion, "refresh-b");
});

test("manual source creation cannot reset existing automatic configuration; candidates paginate newest first", async () => {
  const store = new MemoryAstronomicalEventCatalogStore();
  const config = sourceConfig();
  await store.upsertSourceConfig(config);
  await assert.rejects(store.upsertSourceConfig({ ...config, endpoint: null, autoPublishEligible: false, approvedBaselineVersion: null }, "admin:manual", true), /source_exists/);
  assert.deepEqual(await store.getSourceConfig(config.sourceId), config);
  const owner = await new AstronomicalEventCatalogOwner(store).initialize();
  const ids: string[] = [];
  for (let index = 0; index < 101; index++) {
    const result = await owner.importCandidate({ sourceId: config.sourceId, actorId: "admin:upload", package: packageVersion(`pagination-${index}`) });
    ids.push(result.candidate!.candidateId);
  }
  const first = await store.listCandidates();
  const second = await store.listCandidates(undefined, 100);
  assert.equal(first.length, 100);
  assert.equal(first[0]?.candidateId, ids[100]);
  assert.deepEqual(second.map(row => row.candidateId), [ids[0]]);
  assert.equal(new Set([...first, ...second].map(row => row.candidateId)).size, 101);
});

test("automatic import binds the same baseline used for diff before asynchronous source lookup", async () => {
  const store = new MemoryAstronomicalEventCatalogStore();
  await store.upsertSourceConfig(sourceConfig());
  const owner = await new AstronomicalEventCatalogOwner(store).initialize();
  const baseline = owner.snapshot();
  const b = (await owner.importCandidate({ sourceId: "source:test-events", actorId: "admin:upload", package: {
    ...baseline, catalogVersion: "import-race-b", events: baseline.events.map((event, index) => index === 0 ? { ...event, displayName: "Reviewed B" } : event),
  } })).candidate!;
  await owner.reviewCandidate({ candidateId: b.candidateId, decision: "APPROVE", actorId: "admin:review", reason: "B reviewed" });
  let release!: () => void; let captured!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const waiting = new Promise<void>(resolve => { captured = resolve; });
  const getSource = store.getSourceConfig.bind(store);
  store.getSourceConfig = async id => { const value = await getSource(id); captured(); await gate; return value; };
  const importing = owner.importCandidate({ sourceId: "source:test-events", actorId: "admin:scheduled", trigger: "SCHEDULED", package: { ...baseline, catalogVersion: "import-race-c", parserVersion: "test-parser-1" } });
  await waiting;
  await owner.publishCandidate({ candidateId: b.candidateId, actorId: "admin:publish", reason: "B first" });
  release(); const c = (await importing).candidate!;
  assert.equal(c.state, "AUTO_PUBLISH_ELIGIBLE");
  assert.equal(c.reviewedAgainst?.catalogVersion, baseline.catalogVersion);
  await assert.rejects(owner.publishCandidate({ candidateId: c.candidateId, actorId: "admin:scheduled", reason: "No stale diff approval" }), /review_baseline_changed/);
  assert.equal(owner.snapshot().catalogVersion, "import-race-b");
});

test("newest refresh survives either return order across independent publication owners", async () => {
  for (const order of [[0, 1], [1, 0]]) {
    const store = new MemoryAstronomicalEventCatalogStore();
    await store.upsertSourceConfig(sourceConfig());
    const writer = await new AstronomicalEventCatalogOwner(store).initialize();
    const publish = async (version: string) => {
      const candidate = (await writer.importCandidate({ sourceId: "source:test-events", actorId: "admin:upload", package: packageVersion(version) })).candidate!;
      await writer.reviewCandidate({ candidateId: candidate.candidateId, decision: "APPROVE", actorId: "admin:review", reason: "Reviewed" });
      await writer.publishCandidate({ candidateId: candidate.candidateId, actorId: "admin:publish", reason: "Publish" });
    };
    await publish("ordered-read-a");
    const reader = await new AstronomicalEventCatalogOwner(store).initialize();
    const originalLoad = store.loadActivePublication.bind(store);
    const releases: Array<() => void> = [];
    const snapshots: string[] = [];
    store.loadActivePublication = async () => {
      const value = await originalLoad(); snapshots.push(value!.catalogVersion);
      await new Promise<void>(resolve => { releases.push(resolve); }); return value;
    };
    const first = reader.initialize();
    await Promise.resolve(); await Promise.resolve();
    await publish("ordered-read-b");
    const second = reader.initialize();
    await Promise.resolve(); await Promise.resolve();
    assert.deepEqual(snapshots, ["ordered-read-a", "ordered-read-b"]);
    const reads = [first, second];
    for (const index of order) { releases[index]!(); await reads[index]; }
    assert.equal(reader.snapshot().catalogVersion, "ordered-read-b");
  }
});

function retiredPackage() {
  const current = builtInAstronomicalEventCatalogPackage();
  return { ...current, catalogVersion: "iau-imo-reviewed-2026.1+astronomy-engine-2.1.19-eclipses-2026.1",
    coverage: "REVIEWED_2026_METEOR_AND_ECLIPSE_EVENTS" as const,
    sourceRelease: "committed-reviewed-2026.1", parserVersion: "builtin-reviewed-2026.1",
    events: [...retiredMeteorRecords, ...current.events.filter(event => event.kind !== "METEOR_SHOWER")],
    sources: current.sources.map(source => source.provider === "Global Meteor Network" ? {
      ...source, id: "meteor-catalog:iau-imo-reviewed-2026.1", provider: "International Meteor Organization", kind: "OFFICIAL_REFERENCE" as const,
    } : source),
  };
}

test("exact retired persisted baseline migrates once through publication; operator edits survive", async () => {
  for (const edited of [false, true]) {
    const store = new MemoryAstronomicalEventCatalogStore();
    const previous = retiredPackage();
    if (edited) previous.events = previous.events.map(event => event.code === "PER" ? { ...event, displayName: "运营核对的英仙座资料" } : event);
    await store.activatePublication({ publicationId: "legacy:one", catalogVersion: previous.catalogVersion,
      candidateId: null, package: previous, contentSha256: eventCatalogDigest(previous),
      publishedAt: "2026-09-01T00:00:00Z", publishedBy: "admin:old", reason: "prior baseline", rolledBackFromVersion: null });
    const owner = await new AstronomicalEventCatalogOwner(store).initialize();
    const reloaded = await new AstronomicalEventCatalogOwner(store).initialize();
    assert.equal(owner.snapshot().catalogVersion, reloaded.snapshot().catalogVersion);
    assert.equal((await store.listPublications()).length, edited ? 1 : 2);
    assert.ok(await store.getPublication(previous.catalogVersion));
    if (edited) assert.equal(owner.find("event-occurrence:007-per:2026")?.displayName, "运营核对的英仙座资料");
    else {
      assert.equal(owner.snapshot().coverage, "ANNUAL_METEOR_REFERENCES_AND_ECLIPSES");
      assert.equal(owner.sourceFor(owner.find("event-occurrence:007-per:2026")!).provider, "Global Meteor Network");
      assert.deepEqual(owner.snapshot().events.filter(event => event.kind !== "METEOR_SHOWER"), previous.events.filter(event => event.kind !== "METEOR_SHOWER"));
    }
  }
});

test("GMN source cannot be laundered into a precise annual peak or detached from direction validity", () => {
  const baseline = builtInAstronomicalEventCatalogPackage();
  const per = baseline.events.find(event => event.code === "PER")!;
  assert.equal(per.kind, "METEOR_SHOWER");
  if (per.kind !== "METEOR_SHOWER") throw new Error("missing meteor");
  const { annualReference: _annual, ...withoutAnnual } = per;
  for (const changed of [
    { ...withoutAnnual, radiantRightAscensionDeg: 48, radiantDeclinationDeg: 58, nominalPeakZhr: 999 },
    { ...per, nominalPeakZhr: 999 },
    { ...per, sourceId: "source:missing" },
    { ...per, peakDate: "2026-02-30" },
    { ...per, annualReference: { ...per.annualReference!, radiantDrift: { ...per.annualReference!.radiantDrift!, validSolarOffsetMaxDeg: 150 } } },
  ]) assert.throws(() => validateAstronomicalEventCatalogPackage({ ...baseline, events: baseline.events.map(event => event.occurrenceId === per.occurrenceId ? changed : event) }), /event_catalog_/);
});

test("migration preserves a concurrent operator publication and retired rollback stays rejected after restart", async () => {
  const store = new MemoryAstronomicalEventCatalogStore();
  const previous = retiredPackage();
  await store.activatePublication({ publicationId: "legacy:race", catalogVersion: previous.catalogVersion,
    candidateId: null, package: previous, contentSha256: eventCatalogDigest(previous),
    publishedAt: "2026-09-01T00:00:00Z", publishedBy: "admin:old", reason: "prior baseline", rolledBackFromVersion: null });
  const activate = store.activatePublication.bind(store);
  const operatorPackage = { ...builtInAstronomicalEventCatalogPackage(), catalogVersion: "operator-reviewed-concurrent" };
  store.activatePublication = async (publication, expectedActive) => {
    if (publication.publishedBy === "system:external-capability-migration") {
      await activate({ ...publication, publicationId: "operator:race", catalogVersion: operatorPackage.catalogVersion,
        package: operatorPackage, contentSha256: eventCatalogDigest(operatorPackage), publishedBy: "admin:operator" });
    }
    return activate(publication, expectedActive);
  };
  const owner = await new AstronomicalEventCatalogOwner(store).initialize();
  assert.equal(owner.snapshot().catalogVersion, operatorPackage.catalogVersion);
  assert.equal((await store.listPublications()).length, 2);
  await assert.rejects(owner.rollback({ catalogVersion: previous.catalogVersion, actorId: "admin:operator", reason: "旧版资料复核" }), /retired_baseline_not_restorable/);
  const reloaded = await new AstronomicalEventCatalogOwner(store).initialize();
  assert.equal(reloaded.snapshot().catalogVersion, operatorPackage.catalogVersion);
  assert.equal((await store.listPublications()).length, 2);
});

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
  const added = { ...template, occurrenceId: "event-occurrence:999-tst:2026", eventId: "meteor-shower:999-tst", iauNumber: 999, code: "TST", displayName: "测试新增流星雨" };
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

test("rollback of a maximum-length version remains valid and survives owner restart", async () => {
  const store = new MemoryAstronomicalEventCatalogStore();
  await store.upsertSourceConfig(sourceConfig());
  const owner = await new AstronomicalEventCatalogOwner(store).initialize();
  const original = owner.snapshot();
  const targetVersion = "r".repeat(160);
  for (const [version, name] of [[targetVersion, "先前名称"], ["next-rollback-version", "后来名称"]]) {
    const imported = await owner.importCandidate({ sourceId: "source:test-events", trigger: "SCHEDULED", actorId: "admin:scheduled-ingestion", package: { ...original, catalogVersion: version!, parserVersion: "test-parser-1", events: [{ ...original.events[0]!, displayName: name! }, ...original.events.slice(1)] } });
    await owner.publishCandidate({ candidateId: imported.candidate!.candidateId, actorId: "admin:publisher", reason: "发布供回滚验证" });
  }
  const result = await owner.rollback({ catalogVersion: targetVersion, actorId: "admin:publisher", reason: "恢复先前资料" });
  assert.ok(result.catalogVersion.length <= 160);
  assert.equal(result.restoredFromVersion, targetVersion);
  validateAstronomicalEventCatalogPackage(result.package);
  const restarted = await new AstronomicalEventCatalogOwner(store).initialize();
  assert.equal(restarted.snapshot().catalogVersion, result.catalogVersion);
  assert.equal(restarted.snapshot().events[0]!.displayName, "先前名称");
  assert.equal((await store.loadActivePublication())?.restoredFromVersion, targetVersion);
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
