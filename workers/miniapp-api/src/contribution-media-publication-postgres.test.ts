import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { ContributionDraftRequest } from "@starward/miniapp-contracts";
import { ContributionService } from "./contribution-service.ts";
import { LocalFilesystemMediaObjectStore } from "./media-object-store.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { insertExplicitTestSpot } from "./test-fixtures/infrastructure-spot.ts";

const databaseUrl = process.env.CONTRIBUTION_UPLOAD_TEST_DATABASE_URL;

test("PostgreSQL and filesystem preserve reviewed media across publication and repository recreation", {
  skip: !databaseUrl, timeout: 30_000,
}, async () => {
  assert.ok(databaseUrl);
  assert.match(new URL(databaseUrl).pathname, /^\/starward_upload_[a-f0-9]+$/u);
  const mediaRoot = await mkdtemp(path.join(tmpdir(), "starward-media-publication-"));
  let repository = new PostgresMiniappRepository(databaseUrl);
  let store = new LocalFilesystemMediaObjectStore(mediaRoot);
  const run = randomUUID();
  const operation = (name: string) => ({
    actorId: "admin:integration", reason: "隔离数据库与真实文件的媒体发布验证",
    requestId: `${name}:${run}`, idempotencyKey: `${name}:${run}`,
  });
  try {
    await repository.initialize({ migrate: true });
    let service = new ContributionService(repository, store, createTestRuntimeConfig());
    const owner = await repository.findOrCreateWechatUser(`media-owner:${run}`);
    const stranger = await repository.findOrCreateWechatUser(`media-stranger:${run}`);
    const spot = await insertExplicitTestSpot(repository, { spotId: `spot:media-${run}` });
    const baseline = await repository.getContributionFormalBaseline(spot.spotId);
    assert.ok(baseline);
    const originalDetail = await repository.getDetail(spot.spotId);
    const bytes = await readFile(new URL("./test-fixtures/self-generated-transport-test.jpg", import.meta.url));
    const expectedHash = createHash("sha256").update(bytes).digest("hex");
    const intent = await service.createFormalUploadIntent(owner, {
      spotId: spot.spotId, baselineRevision: baseline.revision,
    }, `intent:${run}`);
    const pending = await service.createFormalUpload(owner, intent.intentId, {
      originalName: "test.jpg", mimeType: "image/jpeg", byteSize: bytes.length,
      kind: "site", expectedRevision: intent.revision,
    }, `slot:${run}`);
    const uploadId = pending.uploads[0]!.uploadId;
    const uploaded = await service.completeFormalUpload(owner, intent.intentId, uploadId, {
      dataBase64: bytes.toString("base64"),
    }, `complete:${run}`);
    const originalObject = await repository.getContributionUploadObject(uploadId);
    assert.ok(originalObject);
    const submitted = await service.submitFormal(owner, {
      kind: "CORRECTION", baseline,
      proposal: { fields: {}, media: { site: [...baseline.media.site, uploadId] } },
      observedAt: null, rightsConfirmed: true, uploadIntentId: intent.intentId,
      expectedUploadIntentRevision: uploaded.revision,
    }, `submit:${run}`);
    assert.equal(submitted.state, "SUBMITTED");
    if (submitted.state !== "SUBMITTED") throw new Error("formal_submission_missing");
    const submissionId = submitted.submission.submissionId;
    const frozen = submitted.submission.attempts[0]!.snapshot;
    assert.deepEqual(frozen.media.map(media => media.uploadId), [uploadId]);
    const caseId = `moderation:${submissionId}`;
    const readOwner = () => service.readForOwner(owner, submissionId, uploadId);
    const readPublic = () => service.readForPublishedSpot(spot.spotId, uploadId);
    const assertBytes = (value: Awaited<ReturnType<typeof readOwner>>) => {
      assert.equal(value.mimeType, "image/jpeg");
      const actual = Buffer.from(value.dataBase64, "base64");
      assert.equal(actual.length, bytes.length);
      assert.equal(createHash("sha256").update(actual).digest("hex"), expectedHash);
    };
    const merge = (revision: number, phase: string) => repository.adminMergeContributionEvidence({
      ...operation(phase), caseId, spotId: spot.spotId,
      confirmedClaims: ["SITE_MEDIA_PROVENANCE"],
      expectedSubmissionRevision: revision, expectedSpotRevision: baseline.revision,
    });
    assertBytes(await readOwner());
    await assert.rejects(service.readForOwner(stranger, submissionId, uploadId), /contribution_upload_not_found/);
    await assert.rejects(readPublic(), /contribution_upload_not_found/);
    await assert.rejects(merge(submitted.submission.revision, "merge-pending"), /contribution_moderation_not_approved/);

    const approved = await repository.adminResolveModeration({
      ...operation("approve"), caseId, resolution: "APPROVED",
      expectedRevision: submitted.submission.revision,
    });
    await assert.rejects(merge(approved.result.submission!.revision, "merge-unreviewed-media"), /contribution_merge_media_not_accepted/);
    await assert.rejects(readPublic(), /contribution_upload_not_found/);
    const reviewed = await repository.adminReviewContributionMedia({
      ...operation("review-media"), uploadId, caseId, decision: "ACCEPTED",
      expectedRevision: approved.result.submission!.revision,
    });
    assert.equal(reviewed.result.decision, "ACCEPTED");
    const reviewedCase = await repository.adminGetModerationCase(caseId);
    assert.equal(reviewedCase?.submission?.revision, reviewed.receipt.resultingRevision,
      "the next operation must use the current revision returned by the case reader");
    assert.deepEqual(reviewedCase?.submission?.attempts[0]?.snapshot, frozen);
    assert.equal(reviewedCase?.submission?.statusHistory.at(-1)?.to, "MEDIA_ACCEPTED");
    const preview = await repository.adminCreateMergePreview({
      caseId, spotId: spot.spotId, confirmedClaims: ["SITE_MEDIA_PROVENANCE"],
      expectedSubmissionRevision: reviewed.receipt.resultingRevision!, expectedSpotRevision: baseline.revision,
    });
    assert.equal(preview.submissionRevision, reviewed.receipt.resultingRevision);
    assert.deepEqual(await repository.getDetail(spot.spotId), originalDetail,
      "review must not mutate the published canonical document");
    await assert.rejects(readPublic(), /contribution_upload_not_found/);
    const merged = await merge(reviewedCase!.submission!.revision, "merge-reviewed");
    assert.equal(merged.detail.formalMedia?.site?.includes(uploadId), true);
    assert.equal(merged.detail.spot.status, "DATA_INSUFFICIENT");
    await assert.rejects(readPublic(), /contribution_upload_not_found/);
    const mergedRow = (await repository.adminListSpots()).find(row => row.spot_id === spot.spotId)!;
    const assessment = await repository.adminAssessPublication({
      ...operation("assess"), spotId: spot.spotId, expectedSpotRevision: mergedRow.version,
    });
    assert.equal(assessment.result.complete, true);
    await repository.adminChangeSpotLifecycle({
      ...operation("publish"), spotId: spot.spotId, action: "PUBLISH",
      expectedSpotRevision: mergedRow.version, assessmentDigest: assessment.result.assessmentDigest,
    });
    assertBytes(await readPublic());

    // Publication must reach the actual public presentation, not only the object API.
    for (const publicSpot of [await repository.getSpot(spot.spotId),
      (await repository.getDetail(spot.spotId))?.spot,
      (await repository.listSpots()).find(item => item.spotId === spot.spotId),
      (await repository.listSpotsInRadius(spot.wgs84, 1)).find(item => item.spotId === spot.spotId)]) {
      const photo = publicSpot?.media.find(item => item.id === uploadId);
      assert.ok(photo, "published upload must reach every public spot projection");
      assert.equal(photo.state, "FRESH");
      assert.equal(photo.isSiteSpecific, true);
      assert.match(photo.localPath, /\/image$/u);
      assert.ok(photo.license);
    }

    // New pools and stores must recover identity and bytes without warm process state.
    await repository.close();
    await store.close();
    repository = new PostgresMiniappRepository(databaseUrl);
    await repository.initialize({ migrate: false });
    store = new LocalFilesystemMediaObjectStore(mediaRoot);
    service = new ContributionService(repository, store, createTestRuntimeConfig());
    const restored = await repository.getContribution(owner, submissionId);
    assert.ok(restored);
    assert.equal(restored.attempts.length, 1);
    assert.deepEqual(restored.attempts[0]!.snapshot, frozen);
    // Private upload lookup can still serve bytes even if canonical retention was
    // omitted. Verify the durable public reference independently of that fallback.
    assert.deepEqual((await repository.pool.query(
      `SELECT upload_id, spot_id, kind, source_submission_id, object_key, mime_type
         FROM spot_formal_reference_media WHERE upload_id=$1`, [uploadId],
    )).rows, [{
      upload_id: uploadId, spot_id: spot.spotId, kind: "site",
      source_submission_id: submissionId, object_key: originalObject.objectKey,
      mime_type: "image/jpeg",
    }]);
    assertBytes(await readOwner());
    assertBytes(await readPublic());
    await assert.rejects(service.readForOwner(stranger, submissionId, uploadId), /contribution_upload_not_found/);
    const publishedRow = (await repository.adminListSpots()).find(row => row.spot_id === spot.spotId)!;
    await repository.adminChangeSpotLifecycle({
      ...operation("unpublish"), spotId: spot.spotId, action: "UNPUBLISH",
      expectedSpotRevision: publishedRow.version,
    });
    await assert.rejects(readPublic(), /contribution_upload_not_found/);
    assertBytes(await readOwner());

    for (const resolution of ["REJECTED", "CHANGES_REQUESTED"] as const) {
      const input: ContributionDraftRequest = {
        kind: "NEW_SPOT_PROPOSAL", spotId: null,
        candidateLocation: { displayName: "已送审地点", region: "隔离测试", wgs84: spot.wgs84 },
        observedAt: null, topics: [], detail: "已送审说明",
        rightsConfirmed: false, preciseLocationConsent: true,
        candidateProfile: { fields: { name: "已送审地点" }, media: {}, intake: {
          version: 1, openness: "UNKNOWN", legalEntry: "UNKNOWN", nightSafety: "UNKNOWN",
          contact: { kind: "UNKNOWN", number: "", purpose: "", source: "", publicPermissionConfirmed: false },
        } },
      };
      const draft = await service.createDraft(owner, input, `${resolution}:draft:${run}`);
      const submitted = await service.submit(owner, draft.submissionId, draft.revision, `${resolution}:submit:${run}`);
      const frozen = structuredClone(submitted.attempts[0]!.snapshot);
      const caseId = `moderation:${submitted.submissionId}`;
      const reviewed = resolution === "REJECTED"
        ? await repository.adminResolveModeration({ ...operation(`${resolution}:review`),
            caseId, resolution, expectedRevision: submitted.revision })
        : await repository.adminRequestContributionChanges({ ...operation(`${resolution}:review`),
            caseId, expectedRevision: submitted.revision });
      const working = await service.updateDraft(owner, submitted.submissionId, {
        ...input, detail: "尚未重新送审的修改", rightsConfirmed: true,
        candidateLocation: { ...input.candidateLocation!, displayName: "工作副本地点" },
        candidateProfile: { ...input.candidateProfile!, fields: { name: "工作副本地点" } },
        expectedRevision: reviewed.result.submission!.revision,
      }, `${resolution}:edit:${run}`);
      const read = await repository.adminGetModerationCase(caseId);
      assert.equal(read?.submission?.revision, working.revision);
      for (const key of Object.keys(frozen) as (keyof typeof frozen)[])
        assert.deepEqual(read?.submission?.[key], frozen[key], `${resolution}: ${key} must remain submitted evidence`);
      assert.deepEqual(read?.immutableEvidence, { detail: frozen.detail,
        candidateLocation: frozen.candidateLocation, media: frozen.media });
      assert.deepEqual(working.attempts[0]!.snapshot, frozen);
    }
  } finally {
    try { await repository.close(); }
    finally {
      try { await store.close(); }
      finally { await rm(mediaRoot, { recursive: true, force: true }); }
    }
  }
});
