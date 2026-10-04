import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { ContributionCandidateIntake, ContributionDraftRequest, SpotDetail } from "@starward/miniapp-contracts";
import { ContributionService } from "./contribution-service.ts";
import { DisabledMediaObjectStore } from "./media-object-store.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { insertExplicitTestSpot } from "./test-fixtures/infrastructure-spot.ts";

const databaseUrl = process.env.CONTRIBUTION_INTAKE_TEST_DATABASE_URL;
test("real PostgreSQL preserves new-point answers and gates reviewed canonical effects", {
  skip: !databaseUrl, timeout: 30_000,
}, async (suite) => {
  assert.ok(databaseUrl);
  assert.match(new URL(databaseUrl).pathname, /^\/starward_intake_[a-f0-9]+$/u);
  let repository = new PostgresMiniappRepository(databaseUrl);
  let service = new ContributionService(repository, new DisabledMediaObjectStore(), createTestRuntimeConfig());
  const run = randomUUID();
  const operation = (name: string) => ({ actorId: "admin:integration", reason: "隔离数据库新增点位核心事实验证",
    requestId: `${name}:${run}`, idempotencyKey: `${name}:${run}` });
  const unknown = (): ContributionCandidateIntake => ({ version: 1, openness: "UNKNOWN", legalEntry: "UNKNOWN", nightSafety: "UNKNOWN",
    contact: { kind: "UNKNOWN", number: "", purpose: "", publicPermissionConfirmed: false, source: "" } });
  try {
    await repository.initialize({ migrate: true });
    const owner = await repository.findOrCreateWechatUser(`intake-owner:${run}`);
    const stranger = await repository.findOrCreateWechatUser(`intake-stranger:${run}`);
    const spot = await insertExplicitTestSpot(repository, { spotId: `spot:intake-${run}` });
    const input = (intake?: ContributionCandidateIntake, target = spot): ContributionDraftRequest => ({ kind: "NEW_SPOT_PROPOSAL", spotId: null,
      candidateLocation: { displayName: target.name, region: "", wgs84: target.wgs84 }, observedAt: null, topics: [], detail: "",
      rightsConfirmed: false, preciseLocationConsent: true,
      candidateProfile: { fields: { name: target.name }, media: {}, ...(intake ? { intake } : {}) } });
    await suite.test("legacy unanswered draft saves but failed submit has no attempt or moderation effect", async () => {
      const draft = await service.createDraft(owner, input(), `legacy:${run}`);
      await assert.rejects(service.submit(owner, draft.submissionId, draft.revision, `legacy-submit:${run}`), /contribution_candidate_intake_incomplete/);
      const read = await service.getForOwner(owner, draft.submissionId);
      assert.equal(read.state, "DRAFT"); assert.deepEqual(read.attempts, []); assert.equal(read.revision, draft.revision);
      const rows = await repository.pool.query("SELECT case_id FROM moderation_cases WHERE subject_id=$1", [draft.submissionId]);
      assert.equal(rows.rowCount, 0);
    });
    await suite.test("explicit unknown persists across pool recreation and idempotent submit without certifying core facts", async () => {
      const draft = await service.createDraft(owner, input(unknown()), `unknown:${run}`);
      const submitted = await service.submit(owner, draft.submissionId, draft.revision, `unknown-submit:${run}`);
      assert.deepEqual(await service.submit(owner, draft.submissionId, draft.revision, `unknown-submit:${run}`), submitted);
      const frozen = structuredClone(submitted.attempts[0]!.snapshot);
      await repository.close(); repository = new PostgresMiniappRepository(databaseUrl);
      await repository.initialize({ migrate: false });
      service = new ContributionService(repository, new DisabledMediaObjectStore(), createTestRuntimeConfig());
      const restored = await service.getForOwner(owner, draft.submissionId);
      assert.deepEqual(restored.candidateProfile!.intake, unknown());
      assert.deepEqual(restored.attempts[0]!.snapshot, frozen);
      await assert.rejects(service.getForOwner(stranger, draft.submissionId), /contribution_not_found/);
      const baseline = (await repository.getContributionFormalBaseline(spot.spotId))!;
      const original = (await repository.getDetail(spot.spotId))!;
      const caseId = `moderation:${draft.submissionId}`;
      const approved = await repository.adminResolveModeration({ ...operation("approve-unknown"), caseId,
        resolution: "APPROVED", expectedRevision: restored.revision });
      const revision = approved.result.submission!.revision;
      const mergeInput = { caseId, spotId: spot.spotId, expectedSubmissionRevision: revision, expectedSpotRevision: baseline.revision };
      await assert.rejects(repository.adminMergeContributionEvidence({ ...operation("invalid-unknown-claim"), ...mergeInput,
        confirmedClaims: ["ACCESS_OPENNESS", "ACCESS_LEGAL_ENTRY", "SAFETY_NIGHT"] }), /contribution_merge_claim_not_reported/);
      assert.deepEqual(await repository.getDetail(spot.spotId), original, "rejected transaction must leave canonical data intact");
      const merged = await repository.adminMergeContributionEvidence({ ...operation("merge-unknown-details"), ...mergeInput,
        confirmedClaims: ["SPOT_DETAILS"] });
      assert.deepEqual(merged.detail.accessAndSafety, original.accessAndSafety);
      assert.equal(merged.detail.spot.status, "DATA_INSUFFICIENT");
      assert.deepEqual((await service.getForOwner(owner, draft.submissionId)).attempts[0]!.snapshot, frozen);
    });
    await suite.test("selected known safety and permitted public contact reach the durable canonical owner, with frozen provenance retained", async () => {
      const target = await insertExplicitTestSpot(repository, { spotId: `spot:intake-known-${run}` });
      const intake = unknown(); intake.nightSafety = "DANGER";
      intake.contact = { kind: "PUBLIC_NUMBER", number: "0755-12345678", purpose: "测试场地入场咨询", publicPermissionConfirmed: true, source: "测试场地公开告示" };
      const request = input(intake, target);
      request.candidateProfile = { ...request.candidateProfile!, fields: { ...request.candidateProfile!.fields, safety: "测试夜间落石风险" } };
      const draft = await service.createDraft(owner, request, `known:${run}`);
      const submitted = await service.submit(owner, draft.submissionId, draft.revision, `known-submit:${run}`);
      const frozen = structuredClone(submitted.attempts[0]!.snapshot);
      const caseId = `moderation:${draft.submissionId}`;
      const approved = await repository.adminResolveModeration({ ...operation("approve-known"), caseId,
        resolution: "ACCEPTED", expectedRevision: submitted.revision });
      const current = (await repository.adminListSpots()).find(row => row.spot_id === target.spotId)!;
      const original = (await repository.getDetail(target.spotId))!;
      const merged = await repository.adminMergeContributionEvidence({ ...operation("merge-known"), caseId, spotId: target.spotId,
        expectedSubmissionRevision: approved.result.submission!.revision, expectedSpotRevision: current.version,
        confirmedClaims: ["SPOT_DETAILS", "SAFETY_NIGHT"] });
      assert.equal(merged.detail.accessAndSafety.nightSafety, "DANGER");
      assert.deepEqual(merged.detail.accessAndSafety.guidance, ["测试夜间落石风险"]);
      assert.equal(merged.detail.accessAndSafety.legalAccess, original.accessAndSafety.legalAccess);
      assert.equal(merged.detail.formalFacts!.contact, "0755-12345678（测试场地入场咨询）");
      assert.equal(merged.detail.spot.status, "DATA_INSUFFICIENT");
      await repository.close(); repository = new PostgresMiniappRepository(databaseUrl);
      await repository.initialize({ migrate: false });
      service = new ContributionService(repository, new DisabledMediaObjectStore(), createTestRuntimeConfig());
      const persisted = (await repository.pool.query<{ payload: SpotDetail }>("SELECT payload FROM spot_overview_read_models WHERE spot_id=$1", [target.spotId])).rows[0]!.payload;
      assert.equal(await repository.getDetail(target.spotId), null, "merge is not automatic public availability");
      assert.equal(persisted.accessAndSafety.nightSafety, "DANGER");
      assert.equal(persisted.formalFacts!.contact, merged.detail.formalFacts!.contact);
      assert.deepEqual((await service.getForOwner(owner, draft.submissionId)).attempts[0]!.snapshot, frozen);
      const revisionRows = await repository.pool.query<{ payload: { candidateProfile: { intake: ContributionCandidateIntake } } }>(
        "SELECT payload FROM contribution_revisions WHERE submission_id=$1 AND revision_no=$2", [draft.submissionId, submitted.revision]);
      assert.deepEqual(revisionRows.rows[0]!.payload.candidateProfile.intake, intake);
    });
  } finally { await repository.close(); }
});
