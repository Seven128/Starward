import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { ContributionService } from "./contribution-service.ts";
import { ObservationContextService } from "./observation-context-service.ts";
import { DisabledMediaObjectStore } from "./media-object-store.ts";
import { MemoryCache } from "./cache.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { insertExplicitTestSpot } from "./test-fixtures/infrastructure-spot.ts";
import type { ObservationContextResolveRequest } from "@starward/miniapp-contracts";

const databaseUrl = process.env.PENDING_CONTEXT_TEST_DATABASE_URL;
test("real PostgreSQL frozen ownership, accepted merge, current publication mapping and removal survive pool recreation", {
  skip: !databaseUrl, timeout: 30_000,
}, async (suite) => {
  assert.ok(databaseUrl); assert.match(new URL(databaseUrl).pathname, /^\/starward_context_[a-f0-9]+$/u);
  let repository = new PostgresMiniappRepository(databaseUrl);
  const cache = new MemoryCache(), config = createTestRuntimeConfig(), run = randomUUID();
  const operation = (phase: string) => ({ actorId: "admin:integration", reason: "隔离数据库本人待审位置生命周期验证",
    requestId: `${phase}:${run}`, idempotencyKey: `${phase}:${run}` });
  try {
    await repository.initialize({ migrate: true });
    const owner = await repository.findOrCreateWechatUser(`pending-context-owner:${run}`);
    const other = await repository.findOrCreateWechatUser(`pending-context-other:${run}`);
    const spot = await insertExplicitTestSpot(repository, { spotId: `spot:pending-context-${run}` });
    let contributions = new ContributionService(repository, new DisabledMediaObjectStore(), config);
    const draft = await contributions.createDraft(owner, { kind: "NEW_SPOT_PROPOSAL", spotId: null,
      candidateLocation: { displayName: spot.name, region: "", wgs84: spot.wgs84 }, observedAt: null,
      topics: [], detail: "", rightsConfirmed: false, preciseLocationConsent: true,
      candidateProfile: { fields: { name: spot.name }, media: {}, intake: { version: 1,
        openness: "UNKNOWN", legalEntry: "UNKNOWN", nightSafety: "UNKNOWN",
        contact: { kind: "UNKNOWN", number: "", purpose: "", source: "", publicPermissionConfirmed: false } } },
    }, `draft:${run}`);
    let contexts = new ObservationContextService(repository, cache, config);
    await assert.rejects(contexts.resolve({ location: { kind: "PENDING_PROPOSAL", submissionId: draft.submissionId,
      attemptId: "contribution-attempt:missing", attemptBaseRevision: draft.revision }, localDate: "2026-10-05" }, owner), /permission_denied/);
    const submitted = await contributions.submit(owner, draft.submissionId, draft.revision, `submit:${run}`), attempt = submitted.attempts.at(-1)!;
    const input: ObservationContextResolveRequest = { location: { kind: "PENDING_PROPOSAL", submissionId: submitted.submissionId,
      attemptId: attempt.attemptId, attemptBaseRevision: attempt.baseRevision }, localDate: "2026-10-05", selectedAt: "2026-10-05T13:00:00.000Z" };
    const initial = await contexts.resolve(input, owner);
    await suite.test("same owner's frozen identity remains private across a recreated repository pool", async () => {
      await repository.close(); repository = new PostgresMiniappRepository(databaseUrl);
      await repository.initialize({ migrate: false });
      contributions = new ContributionService(repository, new DisabledMediaObjectStore(), config);
      contexts = new ObservationContextService(repository, cache, config);
      assert.deepEqual(await contexts.get(initial.contextId, owner), initial);
      await assert.rejects(contexts.get(initial.contextId, other), /permission_denied/);
      await assert.rejects(contexts.resolve(input, other), /contribution_not_found/);
      assert.deepEqual((await contributions.getForOwner(owner, submitted.submissionId)).attempts.at(-1)!.snapshot, attempt.snapshot);
    });
    const caseId = `moderation:${submitted.submissionId}`;
    await suite.test("accepted and actually merged but unpublished coordinates remain the original pending identity", async () => {
      const baseline = (await repository.getContributionFormalBaseline(spot.spotId))!;
      const approved = await repository.adminResolveModeration({ ...operation("approve"), caseId, resolution: "ACCEPTED", expectedRevision: submitted.revision });
      await repository.adminMergeContributionEvidence({ ...operation("merge"), caseId, spotId: spot.spotId,
        expectedSubmissionRevision: approved.result.submission!.revision, expectedSpotRevision: baseline.revision, confirmedClaims: ["SPOT_DETAILS"] });
      const read = await contributions.getForOwner(owner, submitted.submissionId);
      assert.equal(read.mergeState, "MERGED"); assert.equal(read.spotId, spot.spotId); assert.equal(read.submissionState, "ACCEPTED");
      assert.notEqual(read.publicationImpact, "SPOT_PUBLISHED"); assert.equal(await repository.getSpot(spot.spotId), null);
      assert.deepEqual((await contexts.get(initial.contextId, owner)).location, initial.location);
    });
    await suite.test("actual assessment and publication map the Context, and unpublication cannot revive pending recovery", async () => {
      const row = (await repository.adminListSpots()).find(item => item.spot_id === spot.spotId)!;
      const assessment = await repository.adminAssessPublication({ ...operation("assess"), spotId: spot.spotId, expectedSpotRevision: row.version });
      assert.equal(assessment.result.complete, true, JSON.stringify(assessment.result.blockers));
      await repository.adminChangeSpotLifecycle({ ...operation("publish"), spotId: spot.spotId, action: "PUBLISH",
        expectedSpotRevision: row.version, assessmentDigest: assessment.result.assessmentDigest });
      const mapping = await contributions.getForOwner(owner, submitted.submissionId);
      assert.equal(mapping.publicationImpact, "SPOT_PUBLISHED"); assert.equal(mapping.spotId, spot.spotId);
      const mapped = await contexts.get(initial.contextId, owner);
      assert.deepEqual(mapped.location, { kind: "FORMAL_SPOT", spotId: spot.spotId, locationVersion: 1 });
      assert.equal(mapped.selectedAtUtc, initial.selectedAtUtc); assert.equal(mapped.localDate, initial.localDate);
      assert.equal(mapped.expiresAt, initial.expiresAt); assert.deepEqual(mapped.privateProposal, initial.privateProposal);
      const recovery: ObservationContextResolveRequest = { ...input, location: { ...input.location as Extract<ObservationContextResolveRequest["location"], { kind: "PENDING_PROPOSAL" }>, formalSpotId: spot.spotId } };
      assert.equal((await contexts.resolve(recovery, owner)).location.kind, "FORMAL_SPOT");
      const current = (await repository.adminListSpots()).find(item => item.spot_id === spot.spotId)!;
      await repository.adminChangeSpotLifecycle({ ...operation("unpublish"), spotId: spot.spotId, action: "UNPUBLISH", expectedSpotRevision: current.version });
      await assert.rejects(contexts.get(mapped.contextId, owner), /formal_spot_not_found/);
      await assert.rejects(contexts.resolve(recovery, owner), /formal_spot_not_found/);
      await assert.rejects(contexts.resolve(input, owner), /formal_spot_not_found/);
    });
  } finally { await repository.close(); await cache.close(); }
});
