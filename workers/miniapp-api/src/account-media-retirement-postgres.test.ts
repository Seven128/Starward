import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { PoolClient } from "pg";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { MiniappService } from "./miniapp-service.ts";
import { DisabledMediaObjectStore, LocalFilesystemMediaObjectStore } from "./media-object-store.ts";
import { queueAccountMediaRetirement, retireAccountMediaBatch } from "./account-media-retirement.ts";
import { retireExpiredAccountAvatarWrites } from "./account-avatar-persistence.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";
import { DeterministicWeatherTestAdapter } from "./test-fixtures/deterministic-weather-adapter.ts";
import { DisabledRouteAdapter } from "./route-provider.ts";

const databaseUrl = process.env.ACCOUNT_PRIVATE_WRITE_TEST_DATABASE_URL;

async function fixture() {
  assert.ok(databaseUrl);
  assert.match(new URL(databaseUrl).pathname, /^\/starward_account_write_[a-f0-9]+$/u);
  const repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: true });
  const root = await mkdtemp(path.join(os.tmpdir(), "starward-avatar-retirement-"));
  const mediaStore = new LocalFilesystemMediaObjectStore(root);
  const service = new MiniappService({ repository, mediaStore, config: createTestRuntimeConfig(),
    weather: new DeterministicWeatherTestAdapter(), route: new DisabledRouteAdapter() });
  const userId = await repository.findOrCreateWechatUser(`avatar-retirement:${randomUUID()}`);
  const bytes = await readFile(new URL("./test-fixtures/self-generated-transport-test.jpg", import.meta.url));
  const input = (expectedRevision: number, zoom = 1.3) => ({ expectedRevision, zoom,
    dataBase64: bytes.toString("base64"), mimeType: "image/jpeg" as const, declaredByteSize: bytes.length });
  return { repository, mediaStore, service, userId, input,
    async close() {
      await service.onModuleDestroy();
      assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
      await rm(root, { recursive: true, force: true });
    } };
}

async function transaction<T>(repository: PostgresMiniappRepository, run: (client: PoolClient) => Promise<T>) {
  const client = await repository.pool.connect();
  try { await client.query("BEGIN"); const result = await run(client); await client.query("COMMIT"); return result; }
  catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

async function waitForDatabase(predicate: () => Promise<boolean>, message: string) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail(message);
}

test("PostgreSQL avatar retirement survives failed/disabled deletion and repository restart", { skip: !databaseUrl }, async () => {
  const f = await fixture();
  let reopened: PostgresMiniappRepository | undefined;
  try {
    await f.service.saveAccountAvatar(f.userId, f.input(1), "retire:first");
    const previous = (await f.repository.getAccountAvatarObject(f.userId))!;
    await f.service.saveAccountAvatar(f.userId, f.input(2, 1.8), "retire:second");
    const current = (await f.repository.getAccountAvatarObject(f.userId))!;
    const event = (await f.repository.pool.query<{ payload: { deletionBatchId: string; jobKind: string; action: string } }>(
      "SELECT payload FROM outbox_events WHERE idempotency_key=$1", [`${f.userId}:account.avatar:retire:second`])).rows[0]!;
    assert.equal(event.payload.jobKind, "MEDIA");
    assert.equal(event.payload.action, "DELETE_ACCOUNT_MEDIA");
    const batch = event.payload.deletionBatchId;
    reopened = await new PostgresMiniappRepository(databaseUrl!).initialize();
    const queued = async () => (await reopened!.pool.query("SELECT object_key FROM account_deletion_media_queue WHERE deletion_batch_id=$1", [batch])).rows;
    assert.deepEqual(await queued(), [{ object_key: previous.objectKey }]);
    assert.equal((await transaction(reopened, client => retireAccountMediaBatch(client, new DisabledMediaObjectStore(), batch))).failedObjectCount, 1);
    assert.equal((await queued()).length, 1);
    const realDelete = f.mediaStore.delete.bind(f.mediaStore);
    f.mediaStore.delete = async () => { throw new Error("test_filesystem_unavailable"); };
    assert.equal((await transaction(reopened, client => retireAccountMediaBatch(client, f.mediaStore, batch))).failedObjectCount, 1);
    assert.equal((await queued()).length, 1);
    assert.ok(await f.mediaStore.read(current.objectKey));
    assert.equal((await f.service.getAccountAvatar(f.userId)).data.zoom, 1.8);
    f.mediaStore.delete = realDelete;
    const retired = await transaction(reopened, client => retireAccountMediaBatch(client, f.mediaStore, batch));
    assert.equal(retired.deletedObjectCount, 1);
    assert.equal(await f.mediaStore.read(previous.objectKey), null);
    assert.ok(await f.mediaStore.read(current.objectKey));
    assert.deepEqual(await queued(), []);
    assert.equal((await transaction(reopened, client => retireAccountMediaBatch(client, f.mediaStore, batch))).deletedObjectCount, 0);
    // An old or duplicate intent never owns a current durable reference.
    const liveBatch = await transaction(reopened, client => queueAccountMediaRetirement(client, [current.objectKey]));
    assert.ok(liveBatch);
    assert.equal((await transaction(reopened, client => retireAccountMediaBatch(client, f.mediaStore, liveBatch))).retainedObjectCount, 1);
    assert.ok(await f.mediaStore.read(current.objectKey));
  } finally { await reopened?.close(); await f.close(); }
});

test("bounded account media pages retain unknown references and commit independent acknowledgements", { skip: !databaseUrl }, async () => {
  const f = await fixture();
  try {
    await f.service.saveAccountAvatar(f.userId, f.input(1), "retire:bounded-live");
    const live = (await f.repository.getAccountAvatarObject(f.userId))!.objectKey;
    const prefix = `profiles/${randomUUID().replaceAll("-", "").slice(0, 24)}`;
    const keys = [0, 1, 2].map(index => `${prefix}/retirement-${index}.jpg`);
    for (const objectKey of keys) await f.mediaStore.put({ objectKey, bytes: Buffer.from("bounded private media fixture") });
    const batch = (await transaction(f.repository, client => queueAccountMediaRetirement(client, keys)))!;
    const failed = await transaction(f.repository, async client => {
      const observed = new Proxy(client, { get(target, property) {
        if (property !== "query") return Reflect.get(target, property);
        return async (sql: string, values?: unknown[]) => {
          if (sql.includes("AS referenced") && values?.[0] === keys[0])
            return target.query("SELECT account_media_reference_check_missing_column");
          return target.query(sql, values);
        };
      } });
      return retireAccountMediaBatch(observed, f.mediaStore, batch, 2);
    });
    assert.equal(failed.failedObjectCount, 1);
    assert.equal(failed.deletedObjectCount, 1);
    assert.equal(failed.hasRemainingObjects, true);
    assert.equal(failed.continueProcessing, true);
    assert.ok(await f.mediaStore.read(keys[0]!));
    assert.equal(await f.mediaStore.read(keys[1]!), null);
    assert.ok(await f.mediaStore.read(keys[2]!));
    assert.deepEqual((await f.repository.pool.query("SELECT object_key FROM account_deletion_media_queue WHERE deletion_batch_id=$1 ORDER BY object_key", [batch])).rows,
      [{ object_key: keys[0] }, { object_key: keys[2] }]);
    const next = await transaction(f.repository, client => retireAccountMediaBatch(client, f.mediaStore, batch, 1));
    assert.equal(next.deletedObjectCount, 1);
    assert.equal(await f.mediaStore.read(keys[2]!), null, "untouched work precedes the previous failure");
    assert.ok(await f.mediaStore.read(keys[0]!));
    const final = await transaction(f.repository, client => retireAccountMediaBatch(client, f.mediaStore, batch, 1));
    assert.equal(final.totalDeletedObjectCount, 3);
    assert.equal(final.hasRemainingObjects, false);
    const disabledBatch = (await transaction(f.repository, client => queueAccountMediaRetirement(client, [live, `${prefix}/disabled-image.jpg`])))!;
    const disabled = await transaction(f.repository, client => retireAccountMediaBatch(client, new DisabledMediaObjectStore(), disabledBatch));
    assert.equal(disabled.retainedObjectCount, 1, "a known current reference retires only its obsolete intent");
    assert.equal(disabled.failedObjectCount, 1);
    assert.equal(disabled.hasRemainingObjects, true);
    assert.ok(await f.mediaStore.read(live));
    assert.deepEqual((await f.repository.pool.query("SELECT object_key FROM account_deletion_media_queue WHERE deletion_batch_id=$1", [disabledBatch])).rows,
      [{ object_key: `${prefix}/disabled-image.jpg` }]);
  } finally { await f.close(); }
});

test("actual COMMIT followed by a lost reply never compensates the committed avatar", { skip: !databaseUrl }, async () => {
  const f = await fixture();
  const connect = f.repository.pool.connect.bind(f.repository.pool);
  let commits = 0;
  try {
    f.repository.pool.connect = (async () => {
      const client = await connect();
      const query = client.query;
      client.query = (async (...args: unknown[]) => {
        const result = await Reflect.apply(query, client, args);
        if (args[0] === "COMMIT") {
          client.query = query;
          if (++commits === 2) {
            f.repository.pool.connect = connect;
            throw new Error("test_reply_lost_after_real_commit");
          }
        }
        return result;
      }) as typeof client.query;
      return client;
    }) as typeof f.repository.pool.connect;
    await assert.rejects(f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:commit:lost"), /test_reply_lost_after_real_commit/);
    assert.equal((await f.service.getAccountAvatar(f.userId)).data.zoom, 1.3);
    const retried = await f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:commit:lost");
    assert.equal(retried.data.revision, 2);
    await assert.rejects(f.service.saveAccountAvatar(f.userId, f.input(1, 2), "avatar:commit:lost"), /idempotency_conflict/);
  } finally { f.repository.pool.connect = connect; await f.close(); }
});

test("rolled-back avatar bytes remain durably owned through restart, failed cleanup and exact retry", { skip: !databaseUrl }, async () => {
  const f = await fixture();
  const put = f.mediaStore.put.bind(f.mediaStore);
  let reopened: PostgresMiniappRepository | undefined;
  try {
    f.mediaStore.put = async input => { await put(input); throw new Error("test_write_ack_lost"); };
    await assert.rejects(f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:rollback:retry"), /test_write_ack_lost/);
    assert.equal(await f.repository.getAccountAvatarObject(f.userId), null);
    const intent = (await f.repository.pool.query<{ object_key: string; request_digest: string }>(
      "SELECT object_key, request_digest FROM account_avatar_write_intents WHERE user_id=$1", [f.userId])).rows[0]!;
    assert.match(intent.request_digest, /^[a-f0-9]{64}$/);
    assert.ok(await f.mediaStore.read(intent.object_key));
    await assert.rejects(f.service.saveAccountAvatar(f.userId, f.input(1, 1.8), "avatar:rollback:retry"), /idempotency_conflict/);
    reopened = await new PostgresMiniappRepository(databaseUrl!).initialize();
    await reopened.pool.query("UPDATE account_avatar_write_intents SET expires_at=clock_timestamp()-interval '1 second' WHERE user_id=$1", [f.userId]);
    assert.equal((await transaction(reopened, client => retireExpiredAccountAvatarWrites(client, new DisabledMediaObjectStore(), 100))).failedIntentCount, 1);
    assert.equal((await reopened.pool.query("SELECT retired_at FROM account_avatar_write_intents WHERE user_id=$1", [f.userId])).rows[0].retired_at, null);
    const cleanup = await transaction(reopened, client => retireExpiredAccountAvatarWrites(client, f.mediaStore, 100));
    assert.equal(cleanup.deletedObjectCount, 1);
    assert.equal(await f.mediaStore.read(intent.object_key), null);
    assert.ok((await reopened.pool.query("SELECT retired_at FROM account_avatar_write_intents WHERE user_id=$1", [f.userId])).rows[0].retired_at);
    await assert.rejects(f.service.saveAccountAvatar(f.userId, f.input(1, 1.8), "avatar:rollback:retry"), /idempotency_conflict/);
    f.mediaStore.put = put;
    assert.equal((await f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:rollback:retry")).data.revision, 2);
    assert.equal((await f.service.getAccountAvatar(f.userId)).data.zoom, 1.3);
    assert.ok(await f.mediaStore.read(intent.object_key));
    assert.deepEqual((await reopened.pool.query("SELECT object_key FROM account_avatar_write_intents WHERE user_id=$1", [f.userId])).rows, []);
  } finally { f.mediaStore.put = put; await reopened?.close(); await f.close(); }
});

test("a lost preparation COMMIT reply writes no bytes and permits the exact retry", { skip: !databaseUrl }, async () => {
  const f = await fixture();
  const connect = f.repository.pool.connect.bind(f.repository.pool);
  const put = f.mediaStore.put.bind(f.mediaStore);
  let puts = 0;
  f.mediaStore.put = async input => { puts++; await put(input); };
  try {
    f.repository.pool.connect = (async () => {
      const client = await connect(), query = client.query;
      client.query = (async (...args: unknown[]) => {
        const result = await Reflect.apply(query, client, args);
        if (args[0] === "COMMIT") {
          client.query = query; f.repository.pool.connect = connect;
          throw new Error("test_prepare_commit_reply_lost");
        }
        return result;
      }) as typeof client.query;
      return client;
    }) as typeof f.repository.pool.connect;
    await assert.rejects(f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:prepare:lost"), /test_prepare_commit_reply_lost/);
    assert.equal(puts, 0);
    assert.equal((await f.repository.pool.query("SELECT count(*)::int AS count FROM account_avatar_write_intents WHERE user_id=$1", [f.userId])).rows[0].count, 1);
    assert.equal((await f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:prepare:lost")).data.revision, 2);
    assert.equal(puts, 1);
  } finally { f.repository.pool.connect = connect; await f.close(); }
});

test("expiry cannot retire a PostgreSQL avatar writer while its COMMIT result is pending", { skip: !databaseUrl, timeout: 15_000 }, async () => {
  const f = await fixture();
  const observer = await new PostgresMiniappRepository(databaseUrl!).initialize();
  const connect = f.repository.pool.connect.bind(f.repository.pool);
  const reachedCommit = deferred(), releaseCommit = deferred();
  let commits = 0, saving: Promise<unknown> | undefined;
  try {
    f.repository.pool.connect = (async () => {
      const client = await connect(), query = client.query;
      client.query = (async (...args: unknown[]) => {
        if (args[0] !== "COMMIT") return Reflect.apply(query, client, args);
        const commit = ++commits;
        if (commit === 2) { reachedCommit.resolve(); await releaseCommit.promise; }
        const result = await Reflect.apply(query, client, args);
        client.query = query;
        if (commit === 1) {
          // Only this isolated fixture uses a short deadline so real expiry is
          // observed while the actual reference transaction holds its locks.
          await client.query("UPDATE account_avatar_write_intents SET expires_at=clock_timestamp()+interval '1 second' WHERE user_id=$1", [f.userId]);
        } else {
          f.repository.pool.connect = connect;
          throw new Error("test_write_commit_reply_lost");
        }
        return result;
      }) as typeof client.query;
      return client;
    }) as typeof f.repository.pool.connect;
    saving = assert.rejects(f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:pending:commit"), /test_write_commit_reply_lost/);
    await reachedCommit.promise;
    await waitForDatabase(async () => (await observer.pool.query(
      "SELECT expires_at<=clock_timestamp() AS expired FROM account_avatar_write_intents WHERE user_id=$1", [f.userId])).rows[0]?.expired === true,
    "the prepared intent must actually expire while the writer is live");
    const pending = (await observer.pool.query("SELECT object_key FROM account_avatar_write_intents WHERE user_id=$1", [f.userId])).rows[0]!;
    assert.ok(await f.mediaStore.read(pending.object_key));
    assert.equal((await transaction(observer, client => retireExpiredAccountAvatarWrites(client, f.mediaStore, 100))).retiredIntentCount, 0);
    assert.ok(await f.mediaStore.read(pending.object_key), "SKIP LOCKED must preserve a live writer's object");
    releaseCommit.resolve(); await saving; saving = undefined;
    assert.equal((await f.service.getAccountAvatar(f.userId)).data.zoom, 1.3);
    assert.equal((await f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:pending:commit")).data.revision, 2);
    assert.deepEqual((await observer.pool.query("SELECT object_key FROM account_avatar_write_intents WHERE user_id=$1", [f.userId])).rows, []);
  } finally {
    releaseCommit.resolve(); await saving; f.repository.pool.connect = connect;
    await observer.close(); await f.close();
  }
});

test("an exact avatar retry waits for retirement ownership before rewriting the same object", { skip: !databaseUrl, timeout: 15_000 }, async () => {
  const f = await fixture();
  const observer = await new PostgresMiniappRepository(databaseUrl!).initialize();
  const put = f.mediaStore.put.bind(f.mediaStore), remove = f.mediaStore.delete.bind(f.mediaStore);
  const deleting = deferred(), allowDelete = deferred();
  let puts = 0, cleanup: Promise<unknown> | undefined, saving: Promise<unknown> | undefined;
  try {
    f.mediaStore.put = async input => { puts++; await put(input); throw new Error("test_rollback_after_put"); };
    await assert.rejects(f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:cleanup:race"), /test_rollback_after_put/);
    await f.repository.pool.query("UPDATE account_avatar_write_intents SET expires_at=clock_timestamp()-interval '1 second' WHERE user_id=$1", [f.userId]);
    f.mediaStore.put = async input => { puts++; await put(input); };
    f.mediaStore.delete = async key => { deleting.resolve(); await allowDelete.promise; await remove(key); };
    cleanup = transaction(observer, client => retireExpiredAccountAvatarWrites(client, f.mediaStore, 100));
    await deleting.promise;
    saving = f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:cleanup:race");
    await waitForDatabase(async () => (await observer.pool.query(
      "SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%account_avatar_write_intents%'",
    )).rows[0].count > 0, "the exact retry must wait on the retirement's actual PostgreSQL lock");
    assert.equal(puts, 1, "no new put may cross the retirement lock");
    allowDelete.resolve(); await cleanup; cleanup = undefined; await saving; saving = undefined;
    assert.equal(puts, 2);
    assert.equal((await f.service.getAccountAvatar(f.userId)).data.zoom, 1.3);
    assert.deepEqual((await observer.pool.query("SELECT object_key FROM account_avatar_write_intents WHERE user_id=$1", [f.userId])).rows, []);
  } finally {
    allowDelete.resolve(); await cleanup; await saving;
    f.mediaStore.put = put; f.mediaStore.delete = remove; await observer.close(); await f.close();
  }
});

test("account erasure transfers abandoned avatar intents to its durable retirement batch", { skip: !databaseUrl }, async () => {
  const f = await fixture();
  const put = f.mediaStore.put.bind(f.mediaStore);
  try {
    f.mediaStore.put = async input => { await put(input); throw new Error("test_avatar_abandoned"); };
    await assert.rejects(f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:erase:staged"), /test_avatar_abandoned/);
    const objectKey = (await f.repository.pool.query("SELECT object_key FROM account_avatar_write_intents WHERE user_id=$1", [f.userId])).rows[0].object_key;
    const receipt = await f.repository.deleteAccount(f.userId, "avatar:erase:account");
    assert.equal(receipt.mediaCleanupState, "QUEUED");
    assert.deepEqual((await f.repository.pool.query("SELECT object_key FROM account_avatar_write_intents WHERE user_id=$1", [f.userId])).rows, []);
    const batch = (await f.repository.pool.query("SELECT deletion_batch_id FROM account_deletion_media_queue WHERE object_key=$1", [objectKey])).rows[0].deletion_batch_id;
    assert.ok(await f.mediaStore.read(objectKey));
    assert.equal((await transaction(f.repository, client => retireAccountMediaBatch(client, f.mediaStore, batch))).deletedObjectCount, 1);
    assert.equal(await f.mediaStore.read(objectKey), null);
    await assert.rejects(f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:erase:staged"), /account_not_active/);
  } finally { f.mediaStore.put = put; await f.close(); }
});

test("new avatar receipts bind all metadata while historical receipts remain read-only replays", { skip: !databaseUrl }, async () => {
  const f = await fixture();
  const put = f.mediaStore.put.bind(f.mediaStore);
  let puts = 0;
  f.mediaStore.put = async input => { puts++; await put(input); };
  try {
    await f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:receipt:version");
    const current = (await f.repository.pool.query(
      "SELECT avatar_object_key,avatar_sha256,avatar_byte_size FROM users WHERE user_id=$1", [f.userId])).rows[0]!;
    await assert.rejects(f.repository.saveAccountAvatar(f.userId, {
      objectKey: current.avatar_object_key, sha256: current.avatar_sha256, version: current.avatar_sha256,
      byteSize: current.avatar_byte_size + 1, mimeType: "image/jpeg", zoom: 1.3,
    }, 1, "account.avatar:avatar:receipt:version"), /idempotency_conflict/);
    // Before staging, stored receipts carried an unversioned outbox digest.
    await f.repository.pool.query("UPDATE idempotency_records SET request_digest=$3 WHERE scope_id=$1 AND idempotency_key=$2",
      [f.userId, "account.avatar:avatar:receipt:version", "f".repeat(64)]);
    await f.service.saveAccountAvatar(f.userId, f.input(2, 1.9), "avatar:receipt:successor");
    const replay = await f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:receipt:version");
    assert.equal(replay.data.revision, 2);
    assert.equal((await f.service.getAccountAvatar(f.userId)).data.zoom, 1.9);
    assert.equal(puts, 2, "a historical receipt cannot acquire a fresh write intent");
  } finally { await f.close(); }
});

test("expired avatar intent retirement preserves a current durable reference", { skip: !databaseUrl }, async () => {
  const f = await fixture();
  try {
    await f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:live:reference");
    const current = (await f.repository.getAccountAvatarObject(f.userId))!;
    await f.repository.pool.query(
      `INSERT INTO account_avatar_write_intents(user_id,idempotency_key,object_key,request_digest,expires_at)
       VALUES ($1,'historical:uncertain',$2,$3,clock_timestamp()-interval '1 second')`,
      [f.userId, current.objectKey, "f".repeat(64)],
    );
    const result = await transaction(f.repository, client => retireExpiredAccountAvatarWrites(client, new DisabledMediaObjectStore(), 100));
    assert.equal(result.retiredIntentCount, 1);
    assert.equal(result.retainedObjectCount, 1);
    assert.equal(result.deletedObjectCount, 0);
    assert.ok(await f.mediaStore.read(current.objectKey));
    assert.equal((await f.service.getAccountAvatar(f.userId)).data.zoom, 1.3);
  } finally { await f.close(); }
});

test("same-key concurrent PostgreSQL avatar requests store once and historical replay preserves the successor", { skip: !databaseUrl }, async () => {
  const f = await fixture();
  let puts = 0;
  const put = f.mediaStore.put.bind(f.mediaStore);
  f.mediaStore.put = async input => { puts++; await put(input); };
  try {
    const [first, concurrent] = await Promise.all([
      f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:concurrent"),
      f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:concurrent"),
    ]);
    assert.deepEqual(first.data, concurrent.data);
    assert.equal(puts, 1);
    await f.service.saveAccountAvatar(f.userId, f.input(2, 1.7), "avatar:successor");
    const current = await f.repository.getAccountAvatarObject(f.userId);
    await f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:concurrent");
    assert.deepEqual(await f.repository.getAccountAvatarObject(f.userId), current);
    assert.equal(puts, 2);
    await assert.rejects(f.service.saveAccountAvatar(f.userId, f.input(1), "avatar:stale"), /revision_conflict/);
    assert.equal(puts, 2);
  } finally { await f.close(); }
});
