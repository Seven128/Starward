import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ContributionService } from "./contribution-service.ts";
import { contributionMediaObjectKey } from "./contribution-media-object.ts";
import { cleanupExpiredContributionUploads } from "./contribution-media-maintenance.ts";
import { LocalFilesystemMediaObjectStore } from "./media-object-store.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { insertExplicitTestSpot } from "./test-fixtures/infrastructure-spot.ts";

const databaseUrl = process.env.CONTRIBUTION_EXPIRY_TEST_DATABASE_URL;

test("PostgreSQL expiry reads stay pure while explicit replacement owns retirement before the sweep", {
  skip: !databaseUrl, timeout: 30_000,
}, async t => {
  assert.ok(databaseUrl);
  assert.match(new URL(databaseUrl).pathname, /^\/starward_media_[a-f0-9]+$/u);
  const repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: true });
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-media-expiry-"));
  const store = new LocalFilesystemMediaObjectStore(root);
  const service = new ContributionService(repository, store, createTestRuntimeConfig());
  const spot = await insertExplicitTestSpot(repository, { spotId: `spot:expiry:${randomUUID()}` });
  const bytes = await readFile(new URL("./test-fixtures/self-generated-transport-test.jpg", import.meta.url));
  const file = { originalName: "photo.jpg", mimeType: "image/jpeg" as const, byteSize: bytes.length };
  const start = Date.now();
  let now = start;
  t.mock.method(Date, "now", () => now);
  try {
    for (const state of ["PENDING", "UPLOADED"] as const) {
      now = start;
      const userId = await repository.findOrCreateWechatUser(`expiry:${state}:${randomUUID()}`);
      let draft = await service.createDraft(userId, { kind: "FIELD_REPORT", spotId: spot.spotId,
        candidateLocation: null, observedAt: new Date(start).toISOString(), topics: ["LAST_ROAD"],
        detail: "现场看到末段道路可通行，返程照明较弱，需要自备照明并结伴。",
        rightsConfirmed: true, preciseLocationConsent: false }, `draft:${randomUUID()}`);
      draft = await service.createUpload(userId, draft.submissionId,
        { ...file, expectedRevision: draft.revision }, `slot:${randomUUID()}`);
      const old = draft.media[0]!;
      const oldKey = contributionMediaObjectKey(userId, old.uploadId, old.mimeType);
      if (state === "UPLOADED") draft = await service.completeUpload(userId, draft.submissionId, old.uploadId,
        { dataBase64: bytes.toString("base64") }, `complete:${randomUUID()}`);
      else {
        const put = store.put.bind(store);
        const failure = t.mock.method(store, "put", async (input: Parameters<typeof store.put>[0]) => { await put(input); throw new Error("test_unacknowledged_object"); });
        await assert.rejects(service.completeUpload(userId, draft.submissionId, old.uploadId,
          { dataBase64: bytes.toString("base64") }, `complete-lost:${randomUUID()}`), /test_unacknowledged_object/);
        failure.mock.restore();
      }
      assert.ok(await store.read(oldKey));
      await assert.rejects(service.createUpload(userId, draft.submissionId,
        { ...file, expectedRevision: draft.revision, replaceUploadId: old.uploadId }, `too-early:${randomUUID()}`), /replacement_invalid/);
      now += 10 * 60_000;
      draft = await service.createUpload(userId, draft.submissionId,
        { ...file, expectedRevision: draft.revision }, `other:${randomUUID()}`);
      const other = structuredClone(draft.media[1]!);
      now = Date.parse(old.expiresAt) + 1;
      const current = (await service.list(userId))[0]!;
      assert.equal(current.media[0]!.state, "EXPIRED");
      assert.equal((await repository.getContribution(userId, draft.submissionId))!.media[0]!.state, "EXPIRED");
      assert.equal(current.revision, draft.revision);
      const before = (await repository.pool.query("SELECT state,object_key FROM contribution_media_uploads WHERE upload_id=$1", [old.uploadId])).rows[0];
      assert.deepEqual(before, { state, object_key: oldKey });
      assert.equal((await repository.pool.query("SELECT payload->'media'->0->>'state' AS state FROM user_submissions WHERE submission_id=$1",
        [draft.submissionId])).rows[0].state, state);
      const request = { ...file, expectedRevision: current.revision, replaceUploadId: old.uploadId };
      const operationKey = `replace:${randomUUID()}`;
      const replaced = await service.createUpload(userId, draft.submissionId, request, operationKey);
      assert.equal(replaced.revision, current.revision + 1);
      assert.notEqual(replaced.media[0]!.uploadId, old.uploadId);
      assert.deepEqual(replaced.media[1], other);
      assert.deepEqual((await repository.pool.query("SELECT state,object_key FROM contribution_media_uploads WHERE upload_id=$1", [old.uploadId])).rows[0],
        { state: "EXPIRED", object_key: oldKey });
      const completed = await service.completeUpload(userId, draft.submissionId, replaced.media[0]!.uploadId,
        { dataBase64: bytes.toString("base64") }, `new-complete:${randomUUID()}`);
      assert.equal(completed.media[0]!.state, "UPLOADED");
      assert.deepEqual(await service.createUpload(userId, draft.submissionId, request, operationKey), replaced);
      const remove = store.delete.bind(store);
      const failDelete = t.mock.method(store, "delete", async (key: string) => {
        if (key === oldKey) throw new Error("test_retirement_retry");
        await remove(key);
      });
      await assert.rejects(cleanupExpiredContributionUploads(repository, store, new Date(now).toISOString()), /test_retirement_retry/);
      failDelete.mock.restore();
      assert.equal((await repository.pool.query("SELECT object_key FROM contribution_media_uploads WHERE upload_id=$1", [old.uploadId])).rows[0].object_key, oldKey);
      assert.equal(await cleanupExpiredContributionUploads(repository, store, new Date(now).toISOString()), 1);
      assert.equal(await store.read(oldKey), null);
      assert.equal((await repository.pool.query("SELECT object_key FROM contribution_media_uploads WHERE upload_id=$1", [old.uploadId])).rows[0].object_key, null);
      assert.ok(await store.read(contributionMediaObjectKey(userId, completed.media[0]!.uploadId, "image/jpeg")));
    }
  } finally {
    t.mock.restoreAll(); await repository.close(); await store.close();
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await rm(root, { recursive: true, force: true });
  }
});
