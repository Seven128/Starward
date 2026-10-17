import assert from "node:assert/strict";
import test from "node:test";
import { TEST_PUBLISHED_SPOT } from "@starward/miniapp-contracts/test-fixtures";
import { createTestMiniappService } from "./test-fixtures/create-test-service.ts";
import { InMemoryTestRepository } from "./test-fixtures/in-memory-repository.ts";

test("submission verification reads only the original account/subject/operation receipt and cannot submit", async () => {
  const service = createTestMiniappService();
  try {
    const owner = (await service.login({ code: "local:submit-result-owner" })).data.userId;
    const other = (await service.login({ code: "local:submit-result-other" })).data.userId;
    const draft = (await service.createContributionDraft(owner, { kind: "FIELD_REPORT", spotId: TEST_PUBLISHED_SPOT.spotId, candidateLocation: null,
      observedAt: "2026-08-22T14:30:00.000Z", topics: ["NIGHT_SAFETY"], detail: "完整现场记录：末段道路与停车区可通行，夜间返程仍应结伴并自备照明。", rightsConfirmed: false, preciseLocationConsent: false }, "result:create")).data;
    const accepted = (await service.submitContribution(owner, draft.submissionId, draft.revision, "result:submit")).data;
    const current = (await service.listContributions(owner)).data.submissions;
    service.repository.submitContribution = async () => assert.fail("GET verification cannot invoke the write owner");
    assert.deepEqual((await service.getContributionSubmitResult(owner, draft.submissionId, "result:submit")).data.receipt, accepted);
    assert.deepEqual((await service.getContributionSubmitResult(owner, draft.submissionId, "result:submit")).data.receipt, accepted);
    for (const [user, subject, key] of [[other, draft.submissionId, "result:submit"], [owner, "contribution:another", "result:submit"], [owner, draft.submissionId, "result:create"], [owner, draft.submissionId, "result:missing"]] as const)
      assert.equal((await service.getContributionSubmitResult(user, subject as never, key)).data.receipt, null);
    assert.deepEqual((await service.listContributions(owner)).data.submissions, current);
    await assert.rejects(service.getContributionSubmitResult(owner, draft.submissionId, ""), /invalid_idempotency_key/);
  } finally { await service.onModuleDestroy(); }
});

test("formal verification preserves accepted and conflict acknowledgements without creating records", async () => {
  const repository = new InMemoryTestRepository(), service = createTestMiniappService({ repository });
  try {
    const owner = (await service.login({ code: "local:formal-result-owner" })).data.userId;
    const other = (await service.login({ code: "local:formal-result-other" })).data.userId;
    const baseline = (await service.getContributionFormalBaseline(TEST_PUBLISHED_SPOT.spotId)).data;
    const input = { kind: "CORRECTION" as const, baseline, proposal: { fields: { hours: "19:00—次日05:00" }, media: {} }, observedAt: null, rightsConfirmed: false };
    const accepted = (await service.submitFormalContribution(owner, input, "formal-result:submit")).data;
    repository.setFormalBaselineForAcceptance({ ...baseline, revision: baseline.revision + 1, fields: { ...baseline.fields, hours: "20:00—次日04:00" } });
    const conflict = (await service.submitFormalContribution(other, input, "formal-result:conflict")).data;
    assert.equal(conflict.state, "CONFLICT");
    const before = (await service.listContributions(owner)).data.submissions;
    service.repository.submitFormalContribution = async () => assert.fail("verification cannot write or merge feedback");
    assert.deepEqual((await service.getFormalContributionSubmitResult(owner, TEST_PUBLISHED_SPOT.spotId, "formal-result:submit")).data.receipt, accepted);
    assert.deepEqual((await service.getFormalContributionSubmitResult(other, TEST_PUBLISHED_SPOT.spotId, "formal-result:conflict")).data.receipt, conflict);
    assert.equal((await service.getFormalContributionSubmitResult(other, TEST_PUBLISHED_SPOT.spotId, "formal-result:submit")).data.receipt, null);
    assert.equal((await service.getFormalContributionSubmitResult(owner, "spot:another" as never, "formal-result:submit")).data.receipt, null);
    assert.equal((await service.getFormalContributionSubmitResult(owner, TEST_PUBLISHED_SPOT.spotId, "formal-result:missing")).data.receipt, null);
    assert.deepEqual((await service.listContributions(owner)).data.submissions, before);
  } finally { await service.onModuleDestroy(); }
});
