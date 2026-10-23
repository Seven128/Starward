import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { ContributionDraftRequest } from "@starward/miniapp-contracts";
import { ContributionService } from "./contribution-service.ts";
import { MemoryMediaObjectStore } from "./media-object-store.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { insertExplicitTestSpot } from "./test-fixtures/infrastructure-spot.ts";

const databaseUrl = process.env.CONTRIBUTION_LOCK_TEST_DATABASE_URL;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

/** Pause an actual, already completed SQL lock acquisition, never a mock row. */
function holdAfter(repository: PostgresMiniappRepository, matches: (sql: string) => boolean) {
  const reached = deferred(), release = deferred();
  const connect = repository.pool.connect.bind(repository.pool);
  let held = false;
  repository.pool.connect = (async () => {
    repository.pool.connect = connect;
    const client = await connect(), query = client.query;
    client.query = (async (...args: unknown[]) => {
      const result = await Reflect.apply(query, client, args);
      if (!held && typeof args[0] === "string" && matches(args[0])) {
        held = true;
        reached.resolve();
        await release.promise;
      }
      return result;
    }) as typeof client.query;
    const originalRelease = client.release;
    client.release = (...args) => {
      client.query = query;
      client.release = originalRelease;
      originalRelease.apply(client, args);
    };
    return client;
  }) as typeof repository.pool.connect;
  return { reached: reached.promise, release: release.resolve };
}

async function waitForLock(repository: PostgresMiniappRepository, applicationName: string) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const waiting = await repository.pool.query(
      "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND application_name=$1 AND wait_event_type='Lock'",
      [applicationName],
    );
    if (waiting.rowCount) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail(`no actual PostgreSQL lock wait for ${applicationName}`);
}

async function namedRepository(name: string, migrate = false) {
  assert.ok(databaseUrl);
  assert.match(new URL(databaseUrl).pathname, /^\/starward_lock_[a-f0-9]+$/u);
  const url = new URL(databaseUrl);
  url.searchParams.set("application_name", name);
  url.searchParams.set("options", "-c lock_timeout=8000 -c statement_timeout=12000");
  return new PostgresMiniappRepository(url.toString()).initialize({ migrate });
}

async function fixture(withMedia = false) {
  const run = randomUUID();
  const repository = await namedRepository(`lock-fixture:${run}`, true);
  const service = new ContributionService(repository, new MemoryMediaObjectStore(), createTestRuntimeConfig());
  const userId = await repository.findOrCreateWechatUser(`lock-owner:${run}`);
  const spot = await insertExplicitTestSpot(repository, { spotId: `spot:lock:${run}` });
  const input: ContributionDraftRequest = {
    kind: "NEW_SPOT_PROPOSAL", spotId: null,
    candidateLocation: { displayName: spot.name, region: "TEST", wgs84: spot.wgs84 },
    observedAt: null, topics: [], detail: "TEST private evidence", rightsConfirmed: withMedia, preciseLocationConsent: true,
    candidateProfile: { fields: { name: spot.name }, media: {}, intake: {
      version: 1, openness: "UNKNOWN", legalEntry: "UNKNOWN", nightSafety: "UNKNOWN",
      contact: { kind: "UNKNOWN", number: "", purpose: "", source: "", publicPermissionConfirmed: false },
    } },
  };
  let draft = await service.createDraft(userId, input, `draft:${run}`);
  if (withMedia) {
    const bytes = await readFile(new URL("./test-fixtures/self-generated-transport-test.jpg", import.meta.url));
    draft = await service.createUpload(userId, draft.submissionId, { originalName: "TEST.jpg", mimeType: "image/jpeg",
      byteSize: bytes.length, kind: "site", expectedRevision: draft.revision }, `upload-slot:${run}`);
    draft = await service.completeUpload(userId, draft.submissionId, draft.media[0]!.uploadId,
      { dataBase64: bytes.toString("base64") }, `upload-complete:${run}`);
  }
  const submitted = await service.submit(userId, draft.submissionId, draft.revision, `submit:${run}`);
  const caseId = `moderation:${submitted.submissionId}`;
  const operation = (name: string) => ({ actorId: "admin:lock-test", reason: "TEST transaction ordering",
    requestId: `${name}:${run}`, idempotencyKey: `${name}:${run}` });
  return { repository, service, run, userId, spot, submitted, caseId, operation };
}

for (const order of ["delete-first", "review-first"] as const) {
  test(`real PostgreSQL erasure and moderation preserve privacy without a lock cycle when ${order}`, {
    skip: !databaseUrl, timeout: 30_000,
  }, async () => {
    const f = await fixture();
    const reviewerName = `reviewer:${f.run}`, deleterName = `deleter:${f.run}`;
    const reviewer = await namedRepository(reviewerName), deleter = await namedRepository(deleterName);
    let held: ReturnType<typeof holdAfter> | undefined;
    try {
      const review = () => reviewer.adminResolveModeration({ ...f.operation("resolve"), caseId: f.caseId,
        expectedRevision: f.submitted.revision, resolution: "APPROVED" });
      const erase = () => deleter.deleteAccount(f.userId, `erase:${f.run}`);
      if (order === "delete-first") {
        held = holdAfter(deleter, sql => sql.includes("SELECT state FROM users") && sql.includes("FOR UPDATE"));
        const deletion = erase();
        await held.reached;
        const reviewing = review();
        const rejected = assert.rejects(reviewing, /account_not_active|contribution_account_deleted/u);
        await waitForLock(f.repository, reviewerName);
        held.release();
        await deletion;
        await rejected;
      } else {
        held = holdAfter(reviewer, sql => sql.includes("FROM moderation_cases") && sql.includes("FOR UPDATE"));
        const reviewing = review();
        await held.reached;
        const deletion = erase();
        await waitForLock(f.repository, deleterName);
        held.release();
        const reviewed = await reviewing;
        assert.equal(reviewed.result.state, "APPROVED");
        await deletion;
        await assert.rejects(reviewer.adminReadReceipt(reviewed.receipt.receiptId), /operation_receipt_privacy_erased/u);
      }
      const row = (await f.repository.pool.query("SELECT user_id,payload FROM user_submissions WHERE submission_id=$1", [f.submitted.submissionId])).rows[0];
      assert.match(row.user_id, /^erased:/u);
      assert.ok(row.payload.privacyErasedAt);
      assert.equal(row.payload.detail, "");
      assert.deepEqual(row.payload.media, []);
      assert.deepEqual(row.payload.attempts, []);
      assert.equal((await f.repository.getSpot(f.spot.spotId))?.status, "PUBLISHED");
      await assert.rejects(review(), /account_not_active|contribution_account_deleted|operation_receipt_privacy_erased/u);
    } finally {
      held?.release();
      await reviewer.close();
      await deleter.close();
      await f.repository.close();
    }
  });
}

for (const order of ["delete-first", "publish-first"] as const) {
  test(`canonical publication and erasure retain separate results when ${order}`, {
    skip: !databaseUrl, timeout: 30_000,
  }, async () => {
    const f = await fixture();
    const publisherName = `publisher:${f.run}`, deleterName = `deleter:${f.run}`;
    const publisher = await namedRepository(publisherName), deleter = await namedRepository(deleterName);
    let held: ReturnType<typeof holdAfter> | undefined;
    try {
      const approved = await f.repository.adminResolveModeration({ ...f.operation("approve"), caseId: f.caseId,
        expectedRevision: f.submitted.revision, resolution: "APPROVED" });
      const merged = await f.repository.adminMergeContributionEvidence({ ...f.operation("merge"), caseId: f.caseId,
        spotId: f.spot.spotId, expectedSubmissionRevision: approved.result.submission!.revision,
        expectedSpotRevision: 1, confirmedClaims: ["SPOT_DETAILS"] });
      assert.equal(merged.detail.spot.status, "DATA_INSUFFICIENT");
      const assessed = await f.repository.adminAssessPublication({ ...f.operation("assess"), spotId: f.spot.spotId,
        expectedSpotRevision: 2 });
      assert.equal(assessed.result.complete, true);
      const publish = () => publisher.adminChangeSpotLifecycle({ ...f.operation("publish"), spotId: f.spot.spotId,
        action: "PUBLISH", expectedSpotRevision: 2, assessmentDigest: assessed.result.assessmentDigest });
      const erase = () => deleter.deleteAccount(f.userId, `erase:${f.run}`);
      if (order === "delete-first") {
        held = holdAfter(deleter, sql => sql.includes("SELECT state FROM users") && sql.includes("FOR UPDATE"));
        const deletion = erase();
        await held.reached;
        const publishing = publish();
        await waitForLock(f.repository, publisherName);
        held.release();
        await deletion;
        assert.equal((await publishing).result.status, "PUBLISHED");
      } else {
        held = holdAfter(publisher, sql => sql.includes("FROM spots s JOIN spot_overview_read_models") && sql.includes("FOR UPDATE"));
        const publishing = publish();
        await held.reached;
        const deletion = erase();
        await waitForLock(f.repository, deleterName);
        held.release();
        assert.equal((await publishing).result.status, "PUBLISHED");
        await deletion;
      }
      const retained = (await f.repository.pool.query("SELECT payload FROM user_submissions WHERE submission_id=$1", [f.submitted.submissionId])).rows[0].payload;
      assert.ok(retained.privacyErasedAt);
      assert.equal(retained.detail, "");
      assert.equal((await f.repository.getSpot(f.spot.spotId))?.status, "PUBLISHED");
      assert.equal(Number((await f.repository.pool.query("SELECT count(*)::int AS count FROM contribution_merge_events WHERE submission_id=$1", [f.submitted.submissionId])).rows[0].count), 1);
      await assert.rejects(f.repository.adminRequestContributionChanges({ ...f.operation("late-change"),
        caseId: f.caseId, expectedRevision: retained.revision }), /contribution_account_deleted/u);
    } finally {
      held?.release();
      await publisher.close();
      await deleter.close();
      await f.repository.close();
    }
  });
}

test("media review and case changes serialize at their shared submission and preserve revision conflicts", {
  skip: !databaseUrl, timeout: 30_000,
}, async () => {
  const f = await fixture(true);
  const mediaReviewer = await namedRepository(`media-reviewer:${f.run}`);
  const caseReviewerName = `case-reviewer:${f.run}`;
  const caseReviewer = await namedRepository(caseReviewerName);
  const held = holdAfter(mediaReviewer, sql => sql.includes("FROM contribution_media_uploads m") && sql.includes("FOR UPDATE"));
  try {
    const reviewingMedia = mediaReviewer.adminReviewContributionMedia({ ...f.operation("media-review"),
      uploadId: f.submitted.media[0]!.uploadId, caseId: f.caseId, decision: "ACCEPTED",
      expectedRevision: f.submitted.revision });
    await held.reached;
    const requestingChanges = caseReviewer.adminRequestContributionChanges({ ...f.operation("request-changes"),
      caseId: f.caseId, expectedRevision: f.submitted.revision });
    const rejected = assert.rejects(requestingChanges, /contribution_revision_conflict/u);
    rejected.catch(() => undefined);
    await waitForLock(f.repository, caseReviewerName);
    held.release();
    const reviewed = await reviewingMedia;
    await rejected;
    assert.equal(reviewed.result.decision, "ACCEPTED");
    const changed = await caseReviewer.adminRequestContributionChanges({ ...f.operation("revised-request"),
      caseId: f.caseId, expectedRevision: reviewed.receipt.resultingRevision! });
    assert.equal(changed.result.state, "CHANGES_REQUESTED");
    const receipt = await caseReviewer.adminRequestContributionChanges({ ...f.operation("revised-request"),
      caseId: f.caseId, expectedRevision: reviewed.receipt.resultingRevision! });
    assert.equal(receipt.receipt.status, "REPLAYED");
    assert.deepEqual(receipt.result, changed.result);
  } finally {
    held.release();
    await mediaReviewer.close();
    await caseReviewer.close();
    await f.repository.close();
  }
});

test("publication refreshes a changed owner set before mutations and preserves the caller's revision gate", {
  skip: !databaseUrl, timeout: 30_000,
}, async () => {
  const f = await fixture();
  const publisher = await namedRepository(`publisher-discovery:${f.run}`);
  const held = holdAfter(publisher, sql => sql.includes("SELECT DISTINCT user_id FROM user_submissions"));
  try {
    const approved = await f.repository.adminResolveModeration({ ...f.operation("approve"), caseId: f.caseId,
      expectedRevision: f.submitted.revision, resolution: "APPROVED" });
    const publishing = publisher.adminChangeSpotLifecycle({ ...f.operation("stale-publish"), spotId: f.spot.spotId,
      action: "PUBLISH", expectedSpotRevision: 1 });
    const rejected = assert.rejects(publishing, /spot_revision_conflict/u);
    rejected.catch(() => undefined);
    await held.reached;
    await f.repository.adminMergeContributionEvidence({ ...f.operation("merge-after-discovery"), caseId: f.caseId,
      spotId: f.spot.spotId, expectedSubmissionRevision: approved.result.submission!.revision,
      expectedSpotRevision: 1, confirmedClaims: ["SPOT_DETAILS"] });
    held.release();
    await rejected;
    const after = (await f.repository.pool.query("SELECT status,version FROM spots WHERE spot_id=$1", [f.spot.spotId])).rows[0];
    assert.deepEqual(after, { status: "DATA_INSUFFICIENT", version: 2 });
    assert.equal((await f.repository.pool.query("SELECT 1 FROM operation_receipts WHERE idempotency_key=$1", [f.operation("stale-publish").idempotencyKey])).rowCount, 0);
    const assessed = await f.repository.adminAssessPublication({ ...f.operation("fresh-assess"), spotId: f.spot.spotId,
      expectedSpotRevision: 2 });
    const published = await publisher.adminChangeSpotLifecycle({ ...f.operation("fresh-publish"), spotId: f.spot.spotId,
      action: "PUBLISH", expectedSpotRevision: 2, assessmentDigest: assessed.result.assessmentDigest });
    assert.equal(published.result.status, "PUBLISHED");
    assert.equal((await f.repository.getContribution(f.userId, f.submitted.submissionId))?.publicationImpact, "SPOT_PUBLISHED");
  } finally {
    held.release();
    await publisher.close();
    await f.repository.close();
  }
});
