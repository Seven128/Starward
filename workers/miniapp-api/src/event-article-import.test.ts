import assert from "node:assert/strict";
import test from "node:test";
import { AstronomicalEventCatalogOwner, MemoryAstronomicalEventCatalogStore, builtInAstronomicalEventCatalogPackage, validateAstronomicalEventCatalogPackage, diffAstronomicalEventCatalog } from "./astronomical-event-catalog-owner.ts";
import { importEventArticle, type EventArticleImport } from "./event-article-import.ts";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";

async function setup() {
  const store = new MemoryAstronomicalEventCatalogStore();
  const owner = await new AstronomicalEventCatalogOwner(store).initialize();
  await store.upsertSourceConfig({ sourceId: "source:editorial-test", provider: "示例文章来源", endpoint: null, enabled: true,
    parserVersion: owner.snapshot().parserVersion, schemaVersion: owner.snapshot().schemaVersion, autoPublishEligible: true,
    approvedBaselineVersion: owner.snapshot().catalogVersion, termsUrl: "https://example.org/terms", coverage: "自有测试文章" });
  const input: EventArticleImport = { occurrenceId: owner.snapshot().events[0]!.occurrenceId, catalogVersion: "article-test-1", expectedActive: owner.activeIdentity(),
    article: { title: "测试文章：观测前准备", paragraphs: ["这是一段自有测试资料正文，用于核对段落在保存、审核和发布后保留。", "第二段保留独立内容，不提供极大时刻或流量数值。"],
      originalUrl: "https://example.org/meteors", authorName: "测试作者", publishedTime: "2026-09-15", retrievedAt: "2026-09-15T00:00:00Z", inputSha256: null, parserVersion: "manual-text.v1" },
    license: "自有测试资料", rights: { confirmed: true, basis: "测试资料由本测试作者编写，仅用于隔离验证", registeredSourceId: "source:editorial-test" } };
  return { owner, store, input };
}
async function publish(owner: AstronomicalEventCatalogOwner, candidateId: string) {
  await owner.reviewCandidate({ candidateId, decision: "APPROVE", actorId: "admin:review", reason: "已核对正文及授权", expectedActive: owner.activeIdentity() });
  await owner.publishCandidate({ candidateId, actorId: "admin:publish", reason: "发布核对资料", expectedActive: owner.activeIdentity() });
}

test("article candidate freezes rights, preserves numerical records, and publication/rollback includes exact text", async () => {
  const { owner, store, input } = await setup();
  const baseline = owner.snapshot();
  const result = await importEventArticle(owner, input, "admin:author");
  const candidate = result.candidate!;
  const retried = await importEventArticle(owner, input, "admin:author");
  assert.equal(retried.candidate!.candidateId, candidate.candidateId);
  assert.deepEqual(retried.candidate!.package.articleRights, candidate.package.articleRights);
  assert.equal((await store.listCandidates()).length, 1);
  assert.equal(candidate.state, "REVIEW_REQUIRED");
  assert.deepEqual(candidate.diff.articleChanges, [input.occurrenceId]);
  assert.ok(candidate.decisionReasons.includes("ARTICLE_CHANGED_REQUIRES_REVIEW"));
  assert.equal(owner.find(input.occurrenceId)!.article, undefined);
  await assert.rejects(owner.publishCandidate({ candidateId: candidate.candidateId, actorId: "admin:publish", reason: "不能跳过审核" }), /not_publishable/);
  const rights = candidate.package.articleRights![input.occurrenceId]!;
  assert.equal(rights.confirmedBy, "admin:author");
  assert.equal(rights.basis, input.rights.basis);
  assert.match(rights.articleSha256, /^[a-f0-9]{64}$/);
  for (let i = 0; i < baseline.events.length; i++) {
    const { article: _article, ...record } = candidate.package.events[i]!;
    assert.deepEqual(record, baseline.events[i]);
  }
  await publish(owner, candidate.candidateId);
  const restarted = await new AstronomicalEventCatalogOwner(store).initialize();
  assert.deepEqual(restarted.find(input.occurrenceId)!.article?.paragraphs, input.article!.paragraphs);
  assert.equal(restarted.sourceFor(restarted.find(input.occurrenceId)!).provider, "Global Meteor Network");
  await restarted.rollback({ catalogVersion: baseline.catalogVersion, actorId: "admin:restore", reason: "恢复原目录" });
  assert.equal(restarted.find(input.occurrenceId)!.article, undefined);
  assert.deepEqual((await store.getPublication(input.catalogVersion))!.package.articleRights, candidate.package.articleRights);
});

test("client-supplied rights cannot authorize changed text, source, actor or missing registered publisher", async () => {
  const { owner, input } = await setup();
  await assert.rejects(importEventArticle(owner, { ...input, rights: { ...input.rights, confirmed: false as true } }, "admin:author"), /rights_required/);
  await assert.rejects(importEventArticle(owner, { ...input, rights: { ...input.rights, registeredSourceId: "source:missing" } }, "admin:author"), /registered_source_required/);
  const candidate = (await importEventArticle(owner, input, "admin:author")).candidate!;
  const laundered = structuredClone(candidate.package);
  laundered.catalogVersion = "article-false-gmn";
  laundered.events[0]!.article!.sourceId = laundered.events[0]!.sourceId!;
  laundered.events[0]!.article!.originalUrl = laundered.sources.find(source => source.id === laundered.events[0]!.sourceId)!.sourceUrl;
  assert.throws(() => validateAstronomicalEventCatalogPackage(laundered, { pendingArticleConfirmation: true }), /article_source_invalid/);
  await publish(owner, candidate.candidateId);
  const modified = structuredClone(candidate.package);
  modified.catalogVersion = "article-forged";
  modified.events[0]!.article!.paragraphs = ["被替换的未经确认正文"];
  assert.throws(() => validateAstronomicalEventCatalogPackage(modified), /rights_required/);
  await assert.rejects(owner.importCandidate({ sourceId: input.rights.registeredSourceId, package: modified, actorId: "admin:other", trigger: "SCHEDULED" }), /registered_source_required|rights_required/);
  const accepted = await owner.importCandidate({ sourceId: input.rights.registeredSourceId, package: modified, actorId: "admin:other", articleRightsConfirmation: input.rights });
  assert.equal(accepted.candidate!.package.articleRights![input.occurrenceId]!.confirmedBy, "admin:other");
  const changedSource = structuredClone(candidate.package);
  changedSource.catalogVersion = "article-source-change";
  changedSource.sources.find(source => source.id === changedSource.events[0]!.article!.sourceId)!.license = "另一许可";
  assert.deepEqual(diffAstronomicalEventCatalog(candidate.package, changedSource).articleChanges, [input.occurrenceId]);
  await assert.rejects(owner.importCandidate({ sourceId: input.rights.registeredSourceId, package: changedSource, actorId: "scheduled", trigger: "SCHEDULED" }), /rights_required|registered_source_required/);
});

test("structured feed removal is review-required and stale article form cannot overwrite current catalog", async () => {
  const { owner, input } = await setup();
  const candidate = (await importEventArticle(owner, input, "admin:author")).candidate!;
  await publish(owner, candidate.candidateId);
  await assert.rejects(importEventArticle(owner, { ...input, catalogVersion: "stale-form" }, "admin:author"), /active_changed/);
  const feed = builtInAstronomicalEventCatalogPackage(); feed.catalogVersion = "automatic-feed-removes-article";
  const removal = await owner.importCandidate({ sourceId: input.rights.registeredSourceId, actorId: "scheduled", package: feed, trigger: "SCHEDULED" });
  assert.equal(removal.state, "REVIEW_REQUIRED");
  assert.ok(removal.candidate!.decisionReasons.includes("ARTICLE_CHANGED_REQUIRES_REVIEW"));
  const intentional = await importEventArticle(owner, { ...input, catalogVersion: "manual-removal", expectedActive: owner.activeIdentity(), article: null }, "admin:author");
  assert.equal(intentional.candidate!.package.events[0]!.article, undefined);
  assert.equal(intentional.candidate!.package.sources.some(source => source.id.startsWith("source:article:")), false);
  await publish(owner, intentional.candidate!.candidateId);
  assert.equal(owner.find(input.occurrenceId)!.article, undefined);
});

test("public list omits body and private evidence; detail returns article with its own provenance", async () => {
  const { owner, input } = await setup();
  const candidate = (await importEventArticle(owner, input, "admin:author")).candidate!;
  const service = createTestMiniappService();
  await service.eventCatalog.store.upsertSourceConfig((await owner.store.getSourceConfig(input.rights.registeredSourceId))!);
  const imported = (await service.eventCatalog.importCandidate({ sourceId: input.rights.registeredSourceId, package: candidate.package, actorId: "admin:author", articleRightsConfirmation: input.rights })).candidate!;
  await publish(service.eventCatalog, imported.candidateId);
  const list = service.getAstronomicalEvents();
  assert.ok(list.data.events.every(event => !("article" in event)));
  assert.doesNotMatch(JSON.stringify(list), /测试资料由本测试作者编写|confirmedBy|articleRights|第二段保留独立内容/);
  const detail = await service.getAstronomicalEvent(input.occurrenceId);
  assert.deepEqual(detail.data.event.article?.paragraphs, input.article!.paragraphs);
  assert.equal(detail.data.articleSource?.provider, "示例文章来源");
  assert.equal(detail.data.source.provider, "Global Meteor Network");
  assert.doesNotMatch(JSON.stringify(detail), /confirmedBy|articleRights|测试资料由本测试作者编写/);
});
