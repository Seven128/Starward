import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { UserId } from "@starward/miniapp-contracts";
import { ContributionService } from "./contribution-service.ts";
import { contributionMediaObjectKey } from "./contribution-media-object.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { createOutboxRecoveryFixture } from "./test-fixtures/outbox-recovery.ts";

const databaseUrl = process.env.OUTBOX_RECOVERY_TEST_DATABASE_URL;
const redisUrl = process.env.OUTBOX_RECOVERY_TEST_REDIS_URL;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

test("a user-origin MEDIA sweep cannot hold account erasure behind its cleanup acknowledgement", {
  skip: !databaseUrl || !redisUrl, timeout: 30_000,
}, async t => {
  assert.ok(databaseUrl && redisUrl);
  const boundedUrl = new URL(databaseUrl);
  boundedUrl.searchParams.set("options", "-c statement_timeout=12000");
  const fixture = await createOutboxRecoveryFixture(boundedUrl.toString(), redisUrl);
  const { repository } = fixture;
  const run = randomUUID();
  const deleteUrl = new URL(databaseUrl);
  const deleteApplication = `media-erasure:${run}`;
  deleteUrl.searchParams.set("application_name", deleteApplication);
  // A regression must fail and release its locks instead of leaving this
  // disposable worker/database waiting after the test finishes.
  deleteUrl.searchParams.set("options", "-c lock_timeout=4500 -c statement_timeout=10000");
  const deleter = new PostgresMiniappRepository(deleteUrl.toString());
  const service = new ContributionService(repository, fixture.runtime.mediaStore, fixture.runtime.config);
  const userId = await repository.findOrCreateWechatUser(`media-erasure:${run}`);
  const deletingObject = deferred(), releaseObject = deferred(), acknowledging = deferred();
  let pendingAcknowledgements = 0;
  let deletion: Promise<{ ok: true; receipt: Awaited<ReturnType<typeof deleter.deleteAccount>> } | { ok: false; error: unknown }> | undefined;
  try {
    const draft = await service.createDraft(userId, {
      kind: "NEW_SPOT_PROPOSAL", spotId: null,
      candidateLocation: { displayName: "media erasure fixture", region: "TEST", wgs84: { system: "WGS84", latitude: 30, longitude: 120 } },
      observedAt: null, topics: [], detail: "synthetic private contribution", rightsConfirmed: true, preciseLocationConsent: true,
      candidateProfile: { fields: { name: "media erasure fixture" }, media: {} },
    }, `draft:${run}`);
    const withSlot = await service.createUpload(userId, draft.submissionId, {
      originalName: "synthetic.jpg", mimeType: "image/jpeg", byteSize: 16, kind: "site", expectedRevision: draft.revision,
    }, `slot:${run}`);
    const upload = withSlot.media[0]!;
    const objectKey = contributionMediaObjectKey(userId, upload.uploadId, upload.mimeType);
    await fixture.runtime.mediaStore.put({ objectKey, bytes: Buffer.from("orphaned contribution fixture"), mimeType: "image/jpeg" });
    const expiredAt = new Date(Date.now() - 3_600_000).toISOString();
    await repository.pool.query("UPDATE contribution_media_uploads SET expires_at=$2 WHERE upload_id=$1", [upload.uploadId, expiredAt]);
    const produced = await repository.pool.query<{ event_id: string; event_type: string }>(
      "SELECT event_id::text,event_type FROM outbox_events WHERE payload->>'userId'=$1", [userId]);
    fixture.trackEvents(produced.rows.map(row => row.event_id));
    const mediaEvent = produced.rows.find(row => row.event_type === "ContributionMediaUploadCreated")!;
    assert.ok(mediaEvent, "the real contribution command must produce the user-scoped MEDIA event");
    await repository.pool.query("UPDATE outbox_events SET state='COMPLETE',completed_at=now() WHERE event_id=ANY($1::uuid[]) AND event_id<>$2::uuid",
      [produced.rows.map(row => row.event_id), mediaEvent.event_id]);
    const originalDelete = fixture.runtime.mediaStore.delete.bind(fixture.runtime.mediaStore);
    t.mock.method(fixture.runtime.mediaStore, "delete", async (key: string) => {
      if (key === objectKey) { deletingObject.resolve(); await releaseObject.promise; }
      await originalDelete(key);
    });
    const originalAck = fixture.runtime.repository.acknowledgeContributionMediaDeletion.bind(fixture.runtime.repository);
    t.mock.method(fixture.runtime.repository, "acknowledgeContributionMediaDeletion", async (keys: readonly string[]) => {
      if (keys.includes(objectKey)) acknowledging.resolve();
      try { return await originalAck(keys); }
      catch (error) {
        if (keys.includes(objectKey) && error instanceof Error && error.message === "contribution_media_cleanup_ack_pending") {
          pendingAcknowledgements++;
          const pending = await repository.pool.query("SELECT state,object_key FROM contribution_media_uploads WHERE upload_id=$1", [upload.uploadId]);
          assert.deepEqual(pending.rows[0], { state: "EXPIRED", object_key: objectKey }, "a skipped uncommitted DELETE is still a visible durable intent");
        }
        throw error;
      }
    });
    assert.equal(await fixture.runtime.dispatchBatch(), 1);
    await fixture.runtime.queue.resume();
    await deletingObject.promise;
    // Expiry has really committed; deletion now removes the media row and
    // reaches the real outbox lock still owned by this MEDIA job.
    deletion = deleter.deleteAccount(userId, `erase:${run}`).then(
      receipt => ({ ok: true as const, receipt }), error => ({ ok: false as const, error }));
    const waitDeadline = Date.now() + 3_000;
    let reachedOutbox = false;
    while (Date.now() < waitDeadline) {
      const waiting = await repository.pool.query(
        "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND application_name=$1 AND wait_event_type='Lock' AND query LIKE 'UPDATE outbox_events SET payload%'",
        [deleteApplication]);
      if (waiting.rowCount) { reachedOutbox = true; break; }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(reachedOutbox, true, "real deletion must reach the outbox boundary before object deletion resumes");
    releaseObject.resolve();
    await acknowledging.promise;
    const result = await deletion;
    assert.equal(result.ok, true, result.ok ? "" : `cleanup acknowledgement blocked account erasure: ${String(result.error)}`);
    await fixture.runtime.waitForIdle();
    assert.ok(pendingAcknowledgements > 0, "skipping another owner must report pending rather than acknowledge cleanup");
    assert.equal(await fixture.state(mediaEvent.event_id), "COMPLETE");
    assert.equal((await repository.pool.query("SELECT state FROM users WHERE user_id=$1", [userId])).rows[0].state, "DELETED");
    assert.equal((await repository.pool.query("SELECT 1 FROM contribution_media_uploads WHERE upload_id=$1", [upload.uploadId])).rowCount, 0);
    assert.equal(await fixture.runtime.mediaStore.read(objectKey), null);
    const retained = (await repository.pool.query("SELECT payload FROM user_submissions WHERE submission_id=$1", [draft.submissionId])).rows[0].payload;
    assert.ok(retained.privacyErasedAt);
    assert.equal(retained.detail, "");
    assert.equal((await repository.pool.query("SELECT effect_key FROM job_effects WHERE event_id=$1", [mediaEvent.event_id])).rowCount, 1);
    const executions = await repository.pool.query<{ state: string; error_code: string | null }>(
      "SELECT state,error_code FROM job_executions WHERE event_id=$1", [mediaEvent.event_id]);
    assert.ok(executions.rows.some(row => row.state === "FAILED" && row.error_code === "contribution_media_cleanup_ack_pending"));
    assert.equal(executions.rows.filter(row => row.state === "COMPLETE").length, 1, "the original queue retry must finish after erasure transfers ownership");
  } finally {
    releaseObject.resolve();
    if (deletion) await deletion;
    await fixture.runtime.waitForIdle();
    const remaining = await repository.pool.query<{ event_id: string }>("SELECT event_id::text FROM outbox_events WHERE payload->>'userId'=$1", [userId]);
    fixture.trackEvents(remaining.rows.map(row => row.event_id));
    t.mock.restoreAll();
    await deleter.close();
    await fixture.close();
  }
});

test("ordinary MEDIA sweeps retain independent contribution and avatar cleanup through retries", {
  skip: !databaseUrl || !redisUrl,
}, async t => {
  assert.ok(databaseUrl && redisUrl);
  const fixture = await createOutboxRecoveryFixture(databaseUrl, redisUrl);
  const { repository } = fixture;
  const service = new ContributionService(repository, fixture.runtime.mediaStore, fixture.runtime.config);
  const makeAvatarIntent = async (userId: UserId) => {
    const key = `profiles/${randomUUID().replaceAll("-", "").slice(0, 24)}/${randomUUID()}.jpg`;
    await fixture.runtime.mediaStore.put({ objectKey: key, bytes: Buffer.from("orphaned avatar fixture"), mimeType: "image/jpeg" });
    await repository.pool.query(`INSERT INTO account_avatar_write_intents(user_id,idempotency_key,object_key,request_digest,expires_at)
      VALUES($1,$2,$3,$4,clock_timestamp()-interval '1 hour')`, [userId, randomUUID(), key, "f".repeat(64)]);
    return key;
  };
  const avatarRetired = async (key: string) => (await repository.pool.query<{ retired: boolean }>(
    "SELECT retired_at IS NOT NULL AS retired FROM account_avatar_write_intents WHERE object_key=$1", [key])).rows[0]!.retired;
  const makeExpiredContribution = async (userId: UserId) => {
    const draft = await service.createDraft(userId, {
      kind: "NEW_SPOT_PROPOSAL", spotId: null,
      candidateLocation: { displayName: "media maintenance fixture", region: "TEST", wgs84: { system: "WGS84", latitude: 30, longitude: 120 } },
      observedAt: null, topics: [], detail: "synthetic private contribution", rightsConfirmed: true, preciseLocationConsent: true,
      candidateProfile: { fields: { name: "media maintenance fixture" }, media: {} },
    }, randomUUID());
    const withSlot = await service.createUpload(userId, draft.submissionId, {
      originalName: "synthetic.jpg", mimeType: "image/jpeg", byteSize: 16, kind: "site", expectedRevision: draft.revision,
    }, randomUUID());
    const upload = withSlot.media[0]!;
    const objectKey = contributionMediaObjectKey(userId, upload.uploadId, upload.mimeType);
    await fixture.runtime.mediaStore.put({ objectKey, bytes: Buffer.from("orphaned contribution fixture"), mimeType: "image/jpeg" });
    // These commands establish the real upload ownership. Exercise one named
    // maintenance sweep, without also running incidental fixture outbox jobs.
    const ancillary = await repository.pool.query<{ event_id: string }>(
      "UPDATE outbox_events SET state='COMPLETE',completed_at=now() WHERE payload->>'userId'=$1 AND state='PENDING' RETURNING event_id::text", [userId]);
    fixture.trackEvents(ancillary.rows.map(row => row.event_id));
    const expiredAt = new Date(Date.now() - 3_600_000).toISOString();
    await repository.pool.query(`UPDATE contribution_media_uploads SET expires_at=$2::timestamptz,
      payload=jsonb_set(payload,'{expiresAt}',to_jsonb($2::timestamptz)) WHERE upload_id=$1`, [upload.uploadId, expiredAt]);
    return { objectKey, uploadId: upload.uploadId };
  };
  try {
    for (const failedOwner of ["contribution", "avatar"] as const) {
      await t.test(`${failedOwner} store failure keeps the other owner's success durable before replay`, async () => {
        const userId = await repository.findOrCreateWechatUser(`media-maintenance:${randomUUID()}`);
        const contribution = await makeExpiredContribution(userId);
        const avatar = await makeAvatarIntent(userId);
        const extraAvatar = failedOwner === "avatar" ? await makeAvatarIntent(userId) : null;
        const failedKey = failedOwner === "contribution" ? contribution.objectKey : avatar;
        const deleteObject = fixture.runtime.mediaStore.delete.bind(fixture.runtime.mediaStore);
        const successes = new Map<string, number>();
        const failedDelete = t.mock.method(fixture.runtime.mediaStore, "delete", async (key: string) => {
          if (key === failedKey) throw new Error("injected_owned_media_store_failure");
          await deleteObject(key);
          successes.set(key, (successes.get(key) ?? 0) + 1);
        });
        const id = await fixture.insertEvent({ jobKind: "MEDIA" });
        try {
          assert.equal(await fixture.runtime.dispatchBatch(), 1);
          await fixture.runtime.queue.resume();
          await fixture.runtime.waitForIdle();
          assert.equal(await fixture.state(id), "DEAD_LETTER");
          assert.equal((await repository.pool.query("SELECT effect_key FROM job_effects WHERE event_id=$1", [id])).rowCount, 0);
          assert.ok(await fixture.runtime.mediaStore.read(failedKey));
          if (failedOwner === "contribution") {
            assert.equal(await avatarRetired(avatar), true);
            assert.equal(await fixture.runtime.mediaStore.read(avatar), null);
            assert.equal(successes.get(avatar), 1, "job retry does not redo committed avatar retirement");
            const retained = await repository.pool.query<{ state: string; object_key: string | null }>(
              "SELECT state,object_key FROM contribution_media_uploads WHERE upload_id=$1", [contribution.uploadId]);
            assert.deepEqual(retained.rows[0], { state: "EXPIRED", object_key: contribution.objectKey });
          } else {
            assert.equal(await avatarRetired(avatar), false);
            assert.equal(await avatarRetired(extraAvatar!), true);
            assert.equal(await fixture.runtime.mediaStore.read(extraAvatar!), null);
            assert.equal(successes.get(extraAvatar!), 1, "one avatar failure does not roll back another retired intent");
            assert.equal(await fixture.runtime.mediaStore.read(contribution.objectKey), null);
            assert.equal(successes.get(contribution.objectKey), 1);
            assert.equal((await repository.pool.query("SELECT object_key FROM contribution_media_uploads WHERE upload_id=$1", [contribution.uploadId])).rows[0].object_key, null);
          }
        } finally { failedDelete.mock.restore(); }
        await fixture.runtime.replayDeadLetter(id);
        assert.equal(await fixture.state(id), "COMPLETE");
        assert.equal(await fixture.runtime.mediaStore.read(failedKey), null);
        assert.equal(await avatarRetired(avatar), true);
        const effect = await repository.pool.query<{ result_state: string }>("SELECT result_state FROM job_effects WHERE event_id=$1", [id]);
        assert.equal(effect.rowCount, 1);
        assert.equal(effect.rows[0]!.result_state, "MEDIA_MAINTAINED");
        await fixture.runtime.queue.pause();
        await fixture.clearEvents();
      });
    }
  } finally { t.mock.restoreAll(); await fixture.close(); }
});
