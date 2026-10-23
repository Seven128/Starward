import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ContributionService } from "./contribution-service.ts";
import { cleanupExpiredContributionUploads } from "./contribution-media-maintenance.ts";
import { LocalFilesystemMediaObjectStore } from "./media-object-store.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { insertExplicitTestSpot } from "./test-fixtures/infrastructure-spot.ts";

const databaseUrl = process.env.CONTRIBUTION_MAINTENANCE_TEST_DATABASE_URL;

test("bounded contribution maintenance preserves rollback intent, independent progress and active writers", { skip: !databaseUrl, timeout: 30_000 }, async () => {
  assert.ok(databaseUrl);
  assert.match(new URL(databaseUrl).pathname, /^\/starward_media_[a-f0-9]+$/u);
  const repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: true });
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-contribution-maintenance-"));
  const store = new LocalFilesystemMediaObjectStore(root);
  const service = new ContributionService(repository, store, createTestRuntimeConfig());
  const userId = await repository.findOrCreateWechatUser(`maintenance:${randomUUID()}`);
  const otherId = await repository.findOrCreateWechatUser(`maintenance-other:${randomUUID()}`);
  const spot = await insertExplicitTestSpot(repository, { spotId: `spot:maintenance:${randomUUID()}` });
  const bytes = await readFile(new URL("./test-fixtures/self-generated-transport-test.jpg", import.meta.url));
  const put = store.put.bind(store), remove = store.delete.bind(store);
  const future = new Date(Date.now() + 30 * 60_000).toISOString();
  let lastKey = "", failDeleteKey = "", deletes = 0;
  store.put = async input => { lastKey = input.objectKey; await put(input); throw new Error("test_reply_lost_after_object_write"); };
  store.delete = async key => { deletes++; if (key === failDeleteKey) throw new Error("test_one_object_unavailable"); await remove(key); };
  const make = async (owner = userId) => {
    const draft = await service.createDraft(owner, { kind: "FIELD_REPORT", spotId: spot.spotId, candidateLocation: null,
      observedAt: new Date().toISOString(), topics: ["NIGHT_SAFETY"], detail: "TEST 现场夜间光线较弱，需要自备照明并注意返程。",
      rightsConfirmed: true, preciseLocationConsent: false }, `draft:${randomUUID()}`);
    const ready = await service.createUpload(owner, draft.submissionId, { originalName: "test.jpg", mimeType: "image/jpeg",
      byteSize: bytes.length, expectedRevision: draft.revision }, `upload:${randomUUID()}`);
    const upload = ready.media[0]!;
    await assert.rejects(service.completeUpload(owner, ready.submissionId, upload.uploadId,
      { dataBase64: bytes.toString("base64") }, `complete:${randomUUID()}`), /test_reply_lost_after_object_write/);
    assert.ok(await store.read(lastKey));
    return { key: lastKey, parentId: ready.submissionId, uploadId: upload.uploadId };
  };
  try {
    const uploads = [await make(), await make(), await make(otherId)];
    const selected = await repository.expireContributionUploads(future, 2);
    assert.equal(selected.length, 2, "a pass cannot retire the entire eligible population");
    failDeleteKey = selected[0]!;
    deletes = 0;
    const own = await service.list(userId);
    assert.equal(own.length, 2);
    assert.equal(deletes, 0, "ordinary reads do not execute another account's object cleanup");
    assert.ok(own.every(item => Array.isArray(item.attempts)), "expiry preserves the submission history shape");
    await assert.rejects(cleanupExpiredContributionUploads(repository, store, future), /test_one_object_unavailable/);
    for (const upload of uploads) {
      assert.equal(Boolean(await store.read(upload.key)), upload.key === failDeleteKey);
    }
    const pending = await repository.pool.query("SELECT object_key FROM contribution_media_uploads WHERE state='EXPIRED' AND object_key IS NOT NULL");
    assert.deepEqual(pending.rows, [{ object_key: failDeleteKey }]);
    const next = await make();
    assert.deepEqual(await repository.expireContributionUploads(future, 1), [next.key], "untouched intent progresses ahead of an old failed object");
    failDeleteKey = "";
    assert.equal(await cleanupExpiredContributionUploads(repository, store, future), 2);
    assert.equal(await cleanupExpiredContributionUploads(repository, store, future), 0);

    const active = await make();
    const blocker = await repository.pool.connect();
    try {
      await blocker.query("BEGIN");
      await blocker.query("SELECT user_id FROM users WHERE user_id=$1 FOR UPDATE", [userId]);
      assert.deepEqual(await repository.expireContributionUploads(future, 2), []);
      await blocker.query("ROLLBACK");
      await blocker.query("BEGIN");
      await blocker.query("SELECT user_id FROM users WHERE user_id=$1 FOR SHARE", [userId]);
      await blocker.query("SELECT submission_id FROM user_submissions WHERE submission_id=$1 FOR UPDATE", [active.parentId]);
      assert.deepEqual(await repository.expireContributionUploads(future, 2), []);
      assert.ok(await store.read(active.key));
      await blocker.query("COMMIT");
    } finally { await blocker.query("ROLLBACK"); blocker.release(); }
    assert.equal(await cleanupExpiredContributionUploads(repository, store, future), 1);
    assert.equal(await store.read(active.key), null);
  } finally {
    await repository.close(); await store.close();
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await rm(root, { recursive: true, force: true });
  }
});
