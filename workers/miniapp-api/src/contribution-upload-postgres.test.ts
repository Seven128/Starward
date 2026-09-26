import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ContributionService } from "./contribution-service.ts";
import { MemoryMediaObjectStore } from "./media-object-store.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { insertExplicitTestSpot } from "./test-fixtures/infrastructure-spot.ts";

const databaseUrl = process.env.CONTRIBUTION_UPLOAD_TEST_DATABASE_URL;
// Run only against an explicitly supplied disposable database with all migrations.
for (const formal of [false, true]) test(`PostgreSQL ${formal ? "formal" : "draft"} upload locking, rollback and retired media`, { skip: !databaseUrl, timeout: 30_000 }, async (context) => {
  assert.ok(databaseUrl);
  assert.match(new URL(databaseUrl).pathname, /^\/starward_upload_[a-f0-9]+$/u);
  const repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: true });
  let release = () => {};
  let arrived = () => {};
  let entered: Promise<void>;
  let gate: Promise<void>;
  class ControlledStore extends MemoryMediaObjectStore {
    puts = 0;
    pause = false;
    failAfterWrite = false;
    failDelete = false;
    override async put(input: { objectKey: string; bytes: Uint8Array }) {
      this.puts++;
      if (this.pause) { this.pause = false; arrived(); await gate; }
      await super.put(input);
      if (this.failAfterWrite) throw new Error("synthetic_after_write");
    }
    override async delete(key: string) {
      if (this.failDelete) throw new Error("synthetic_delete_unavailable");
      return super.delete(key);
    }
  }
  const store = new ControlledStore();
  const service = new ContributionService(repository, store, createTestRuntimeConfig());
  const run = randomUUID();
  try {
    const userId = await repository.findOrCreateWechatUser(`upload:${run}`);
    const spot = await insertExplicitTestSpot(repository, { spotId: `spot:upload-${run}` });
    const baseline = await repository.getContributionFormalBaseline(spot.spotId);
    assert.ok(baseline);
    const bytes = await readFile(new URL("./test-fixtures/self-generated-transport-test.jpg", import.meta.url));
    const file = { originalName: "test.jpg", mimeType: "image/jpeg" as const, byteSize: bytes.length };
    const draft = formal ? null : await service.createDraft(userId, { kind: "FIELD_REPORT", spotId: spot.spotId, candidateLocation: null,
      observedAt: new Date().toISOString(), topics: ["PARKING"], detail: "隔离事务测试的停车现场说明，车辆可以在指定区域停放。", rightsConfirmed: true, preciseLocationConsent: false }, `draft:${run}`);
    const intent = formal ? await service.createFormalUploadIntent(userId, { spotId: spot.spotId, baselineRevision: baseline.revision }, `intent:${run}`) : null;
    let revision = (intent ?? draft)!.revision;
    const table = formal ? "formal_feedback_media_uploads" : "contribution_media_uploads";
    const slot = async (suffix: string) => {
      if (formal) {
        const result = await service.createFormalUpload(userId, intent!.intentId, { ...file, kind: "site", expectedRevision: revision }, `slot:${run}:${suffix}`);
        revision = result.revision;
        return result.uploads.at(-1)!;
      }
      const result = await service.createUpload(userId, draft!.submissionId, { ...file, expectedRevision: revision }, `slot:${run}:${suffix}`);
      revision = result.revision;
      return result.media.at(-1)!;
    };
    const complete = async (uploadId: Awaited<ReturnType<typeof slot>>["uploadId"], key: string) => {
      const input = { dataBase64: bytes.toString("base64") };
      return formal ? service.completeFormalUpload(userId, intent!.intentId, uploadId, input, key)
        : service.completeUpload(userId, draft!.submissionId, uploadId, input, key);
    };
    const first = await slot("winner");
    entered = new Promise(resolve => { arrived = resolve; });
    gate = new Promise(resolve => { release = resolve; });
    store.pause = true;
    const winner = complete(first.uploadId, `complete:${run}:winner`);
    await entered;
    let contenderRead = () => {};
    const readPending = new Promise<void>(resolve => { contenderRead = resolve; });
    // The contender must carry the old PENDING snapshot into completion; otherwise
    // a late service read could short-circuit and never exercise transaction locking.
    const readIntent = repository.getFormalUploadIntent.bind(repository);
    const readDraft = repository.getContribution.bind(repository);
    const readMock = formal
      ? context.mock.method(repository, "getFormalUploadIntent", async (...args: Parameters<typeof readIntent>) => {
        const value = await readIntent(...args);
        assert.equal(value?.uploads.find(upload => upload.uploadId === first.uploadId)?.state, "PENDING");
        contenderRead();
        return value;
      })
      : context.mock.method(repository, "getContribution", async (...args: Parameters<typeof readDraft>) => {
        const value = await readDraft(...args);
        assert.equal(value?.media.find(upload => upload.uploadId === first.uploadId)?.state, "PENDING");
        contenderRead();
        return value;
      });
    const contender = complete(first.uploadId, `complete:${run}:contender`);
    const results = Promise.all([winner, contender]);
    await readPending;
    readMock.mock.restore();
    release();
    const [committed] = await results;
    revision = committed.revision;
    assert.equal(store.puts, 1);
    const object = await repository.getContributionUploadObject(first.uploadId);
    assert.ok(object);
    assert.equal(createHash("sha256").update((await store.read(object.objectKey))!).digest("hex"), createHash("sha256").update(bytes).digest("hex"));

    const failed = await slot("rollback");
    // Model a pre-upgrade PENDING row. Retirement must register its stable key.
    await repository.pool.query(`UPDATE ${table} SET object_key=NULL WHERE upload_id=$1`, [failed.uploadId]);
    store.failAfterWrite = true;
    await assert.rejects(complete(failed.uploadId, `complete:${run}:rollback`), /synthetic_after_write/);
    store.failAfterWrite = false;
    assert.equal((await repository.pool.query(`SELECT state FROM ${table} WHERE upload_id=$1`, [failed.uploadId])).rows[0].state, "PENDING");
    store.failDelete = true;
    await assert.rejects(formal ? service.removeFormalUpload(userId, intent!.intentId, failed.uploadId, revision, `remove:${run}`)
      : service.removeUpload(userId, draft!.submissionId, failed.uploadId, revision, `remove:${run}`), /delete_unavailable/);
    const retired = (await repository.pool.query(`SELECT state,object_key FROM ${table} WHERE upload_id=$1`, [failed.uploadId])).rows[0];
    assert.equal(retired.state, "EXPIRED");
    assert.ok(retired.object_key);
    assert.ok(await store.read(retired.object_key));
    if (formal) {
      const pending = await repository.getFormalUploadIntent(userId, intent!.intentId);
      const result = await service.submitFormal(userId, { kind: "CORRECTION", baseline,
        proposal: { fields: { detail: "隔离事务验证：只提交仍然保留的照片。" }, media: { site: [first.uploadId] } },
        observedAt: null, rightsConfirmed: true, uploadIntentId: intent!.intentId, expectedUploadIntentRevision: pending!.revision }, `submit:${run}`);
      assert.equal(result.state, "SUBMITTED");
      if (result.state === "SUBMITTED") assert.deepEqual(result.submission.media.map(upload => upload.uploadId), [first.uploadId]);
    } else {
      const pending = await repository.getContribution(userId, draft!.submissionId);
      const submitted = await service.submit(userId, draft!.submissionId, pending!.revision, `submit:${run}`);
      assert.deepEqual(submitted.media.map(upload => upload.uploadId), [first.uploadId]);
    }
    assert.equal((await repository.pool.query(`SELECT state FROM ${table} WHERE upload_id=$1`, [failed.uploadId])).rows[0].state, "EXPIRED");
    store.failDelete = false;
    await service.cleanupExpiredUploads();
    assert.equal(await store.read(retired.object_key), null);
    assert.ok(await store.read(object.objectKey));
    assert.equal((await repository.pool.query(`SELECT object_key FROM ${table} WHERE upload_id=$1`, [failed.uploadId])).rows[0].object_key, null);
  } finally { release(); await repository.close(); await store.close(); }
});
