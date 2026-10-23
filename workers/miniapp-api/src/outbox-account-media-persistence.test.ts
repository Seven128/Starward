import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { Job, UnrecoverableError } from "bullmq";
import { createOutboxRecoveryFixture } from "./test-fixtures/outbox-recovery.ts";
import { MEDIA_MAINTENANCE_BATCH_SIZE } from "./contribution-media-maintenance.ts";

const databaseUrl = process.env.OUTBOX_RECOVERY_TEST_DATABASE_URL;
const redisUrl = process.env.OUTBOX_RECOVERY_TEST_REDIS_URL;

async function waitFor(predicate: () => Promise<boolean>, message: string) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail(message);
}

test("only an affirmative terminal account MEDIA handle is archived and existing replay finishes its remainder", { skip: !databaseUrl || !redisUrl }, async t => {
  const fixture = await createOutboxRecoveryFixture(databaseUrl!, redisUrl!);
  try {
    const { batchId, keys, eventId } = await enqueueMedia(fixture, MEDIA_MAINTENANCE_BATCH_SIZE + 1);
    let failedHandle = false;
    let terminalTransitionError: string | null = null;
    let successfulDeletes = 0;
    const realDelete = fixture.runtime.mediaStore.delete.bind(fixture.runtime.mediaStore);
    t.mock.method(fixture.runtime.mediaStore, "delete", async (key: string) => { await realDelete(key); successfulDeletes++; });
    const moveToDelayed = Job.prototype.moveToDelayed;
    const transition = t.mock.method(Job.prototype, "moveToDelayed", async function (this: Job, timestamp: number, token?: string) {
      if (this.id === eventId && !failedHandle) {
        await fixture.runtime.queue.pause();
        // Produce an actual terminal BullMQ handle through its supported
        // ownership-checked transition. This tests terminal reconciliation;
        // it does not simulate or certify BullMQ's stalled-job timer itself.
        try { await this.moveToFailed(new UnrecoverableError("owned_terminal_continuation_failure"), token!, false); }
        catch (error) { terminalTransitionError = error instanceof Error ? error.message : String(error); throw error; }
        failedHandle = true;
        throw new Error("owned_continuation_transition_unknown");
      }
      await moveToDelayed.call(this, timestamp, token);
    });
    assert.equal(await fixture.runtime.dispatchBatch(), 1);
    await fixture.runtime.queue.resume();
    await waitFor(async () => failedHandle || terminalTransitionError !== null, "the continuation fixture must have a real terminal handle");
    assert.equal(terminalTransitionError, null);
    await fixture.runtime.worker.pause();
    assert.equal(await fixture.state(eventId), "DISPATCHED");
    assert.equal(await (await fixture.runtime.queue.getJob(eventId))!.getState(), "failed");
    assert.equal((await receipt(fixture, eventId)).length, 0);
    assert.equal((await fixture.repository.pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM account_deletion_media_queue WHERE deletion_batch_id=$1", [batchId],
    )).rows[0]!.count, 1);
    const legacy = await fixture.legacyQueue.add("MEDIA", { eventId }, { jobId: eventId });
    assert.notEqual(await legacy.getState(), "failed");
    assert.equal(await fixture.runtime.dispatchBatch(), 0);
    assert.equal(await fixture.state(eventId), "DISPATCHED", "a live legacy handle prevents terminal classification");
    await legacy.remove();
    const getState = Job.prototype.getState;
    const unknown = t.mock.method(Job.prototype, "getState", async function (this: Job) {
      return this.id === eventId ? "unknown" as const : getState.call(this);
    });
    assert.equal(await fixture.runtime.dispatchBatch(), 0);
    assert.equal(await fixture.state(eventId), "DISPATCHED", "an unknown state is not permission to dead-letter");
    unknown.mock.restore();
    const unavailable = t.mock.method(Job.prototype, "getState", async function (this: Job) {
      if (this.id === eventId) throw new Error("owned_terminal_state_read_unavailable");
      return getState.call(this);
    });
    await assert.rejects(fixture.runtime.dispatchBatch(), /owned_terminal_state_read_unavailable/);
    assert.equal(await fixture.state(eventId), "DISPATCHED", "a failed state read preserves the durable dispatch");
    unavailable.mock.restore();
    assert.equal(await fixture.runtime.dispatchBatch(), 0, "terminal reconciliation must not silently re-enqueue a job");
    assert.equal(await fixture.state(eventId), "DEAD_LETTER");
    assert.equal((await fixture.repository.pool.query<{ last_error_code: string }>(
      "SELECT last_error_code FROM outbox_events WHERE event_id=$1", [eventId],
    )).rows[0]!.last_error_code, "OUTBOX_CONTINUATION_QUEUE_FAILED");
    assert.equal(await (await fixture.runtime.queue.getJob(eventId))!.getState(), "failed", "the exact handle is retained for existing explicit replay");
    transition.mock.restore();
    fixture.runtime.worker.resume();
    await fixture.runtime.queue.resume();
    await fixture.runtime.replayDeadLetter(eventId);
    assert.equal(await fixture.state(eventId), "COMPLETE");
    assert.equal(successfulDeletes, keys.length);
    assert.equal((await receipt(fixture, eventId)).length, 1);
    assert.equal((await receipt(fixture, eventId))[0]!.result_payload.deletedObjectCount, keys.length);
    for (const key of keys) assert.equal(await fixture.runtime.mediaStore.read(key), null);
  } finally { t.mock.restoreAll(); await fixture.close(); }
});

type Fixture = Awaited<ReturnType<typeof createOutboxRecoveryFixture>>;
async function enqueueMedia(fixture: Fixture, count: number) {
  const batchId = randomUUID();
  const owner = randomUUID().replaceAll("-", "").slice(0, 24);
  const keys = Array.from({ length: count }, (_, index) => `profiles/${owner}/retirement-${String(index).padStart(5, "0")}.jpg`);
  for (const objectKey of keys) await fixture.runtime.mediaStore.put({ objectKey, bytes: Buffer.from(`owned media ${objectKey}`), mimeType: "image/jpeg" });
  await fixture.repository.pool.query(
    "INSERT INTO account_deletion_media_queue(deletion_batch_id,object_key) SELECT $1,unnest($2::text[])", [batchId, keys],
  );
  const eventId = await fixture.insertEvent({ jobKind: "MEDIA", action: "DELETE_ACCOUNT_MEDIA", deletionBatchId: batchId });
  return { batchId, keys, eventId };
}

async function receipt(fixture: Fixture, eventId: string) {
  return (await fixture.repository.pool.query<{ result_payload: { deletedObjectCount: number; retainedObjectCount: number } }>(
    "SELECT result_payload FROM job_effects WHERE event_id=$1", [eventId],
  )).rows;
}

test("exact account MEDIA commits bounded progress beyond the failure budget and replays only the remainder", {
  skip: !databaseUrl || !redisUrl,
}, async t => {
  const fixture = await createOutboxRecoveryFixture(databaseUrl!, redisUrl!);
  try {
    const { batchId, keys, eventId } = await enqueueMedia(fixture, MEDIA_MAINTENANCE_BATCH_SIZE * 4 + 1);
    const current = await fixture.repository.findOrCreateWechatUser(`outbox-current-media:${randomUUID()}`);
    const currentBytes = (await fixture.runtime.mediaStore.read(keys[1]!))!;
    await fixture.repository.pool.query(
      `UPDATE users SET avatar_object_key=$2,avatar_mime_type='image/jpeg',avatar_byte_size=$3,avatar_sha256=$4,avatar_zoom=1.3 WHERE user_id=$1`,
      [current, keys[1], currentBytes.length, createHash("sha256").update(currentBytes).digest("hex")],
    );
    const attempts = new Map<string, number>();
    const realDelete = fixture.runtime.mediaStore.delete.bind(fixture.runtime.mediaStore);
    const failure = t.mock.method(fixture.runtime.mediaStore, "delete", async (key: string) => {
      attempts.set(key, (attempts.get(key) ?? 0) + 1);
      if (key === keys[0]) throw new Error("owned_media_temporarily_unavailable");
      await realDelete(key);
    });
    assert.equal(await fixture.runtime.dispatchBatch(), 1);
    await fixture.runtime.queue.resume();
    await fixture.runtime.waitForIdle();
    assert.equal(await fixture.state(eventId), "DEAD_LETTER");
    assert.equal((await fixture.runtime.queue.getJob(eventId))!.attemptsMade, 3, "only failure-only pages consume retries");
    const executions = await fixture.repository.pool.query<{ state: string; result_payload: { deletedObjectCount: number; failedObjectCount: number; retainedObjectCount: number } }>(
      "SELECT state,result_payload FROM job_executions WHERE event_id=$1 ORDER BY started_at", [eventId],
    );
    const continued = executions.rows.filter(row => row.state === "CONTINUED");
    assert.ok(continued.length > 3, "normal pages are not cut off by attempts=3");
    assert.ok(continued.every(row => row.result_payload.deletedObjectCount + row.result_payload.failedObjectCount + row.result_payload.retainedObjectCount <= MEDIA_MAINTENANCE_BATCH_SIZE));
    assert.deepEqual((await fixture.repository.pool.query("SELECT object_key FROM account_deletion_media_queue WHERE deletion_batch_id=$1", [batchId])).rows,
      [{ object_key: keys[0] }]);
    assert.equal((await receipt(fixture, eventId)).length, 0, "an unfinished batch has no completion effect");
    assert.ok(await fixture.runtime.mediaStore.read(keys[0]!));
    assert.ok(await fixture.runtime.mediaStore.read(keys[1]!));
    for (const key of keys.slice(2)) {
      assert.equal(await fixture.runtime.mediaStore.read(key), null);
      assert.equal(attempts.get(key), 1, "independent successes are not deleted again");
    }
    failure.mock.restore();
    await fixture.runtime.replayDeadLetter(eventId);
    assert.equal(await fixture.state(eventId), "COMPLETE");
    assert.deepEqual((await receipt(fixture, eventId)).map(row => row.result_payload), [
      { deletionBatchId: batchId, deletedObjectCount: keys.length - 1, retainedObjectCount: 1 },
    ]);
    assert.equal((await fixture.repository.pool.query("SELECT 1 FROM account_media_retirement_progress WHERE deletion_batch_id=$1", [batchId])).rowCount, 0);
    assert.equal(await fixture.runtime.mediaStore.read(keys[0]!), null);
    assert.ok(await fixture.runtime.mediaStore.read(keys[1]!));
  } finally { t.mock.restoreAll(); await fixture.close(); }
});

test("a lost continuation handle resumes the same event from committed page progress", { skip: !databaseUrl || !redisUrl }, async t => {
  const fixture = await createOutboxRecoveryFixture(databaseUrl!, redisUrl!);
  try {
    const { batchId, keys, eventId } = await enqueueMedia(fixture, MEDIA_MAINTENANCE_BATCH_SIZE * 3 + 1);
    let deletes = 0;
    const realDelete = fixture.runtime.mediaStore.delete.bind(fixture.runtime.mediaStore);
    t.mock.method(fixture.runtime.mediaStore, "delete", async (key: string) => {
      await realDelete(key);
      if (++deletes === MEDIA_MAINTENANCE_BATCH_SIZE) await fixture.runtime.queue.pause();
    });
    assert.equal(await fixture.runtime.dispatchBatch(), 1);
    await fixture.runtime.queue.resume();
    await waitFor(async () => (await fixture.repository.pool.query(
      "SELECT 1 FROM job_executions WHERE event_id=$1 AND state='CONTINUED'", [eventId],
    )).rowCount === 1, "the first committed page must yield its unfinished job");
    await fixture.runtime.worker.pause();
    assert.equal((await receipt(fixture, eventId)).length, 0);
    assert.equal(await fixture.state(eventId), "DISPATCHED");
    assert.equal((await fixture.repository.pool.query("SELECT count(*)::int AS remaining FROM account_deletion_media_queue WHERE deletion_batch_id=$1", [batchId])).rows[0].remaining,
      keys.length - MEDIA_MAINTENANCE_BATCH_SIZE);
    const handle = (await fixture.runtime.queue.getJob(eventId))!;
    assert.notEqual(await handle.getState(), "active");
    await handle.remove();
    assert.equal(await fixture.runtime.queue.getJob(eventId), undefined);
    await fixture.restart();
    const resumedDelete = fixture.runtime.mediaStore.delete.bind(fixture.runtime.mediaStore);
    t.mock.method(fixture.runtime.mediaStore, "delete", async (key: string) => { deletes++; await resumedDelete(key); });
    assert.equal(await fixture.runtime.dispatchBatch(), 1);
    assert.equal((await fixture.runtime.queue.getJob(eventId))!.id, eventId);
    await fixture.runtime.queue.resume();
    await fixture.runtime.waitForIdle();
    assert.equal(deletes, keys.length);
    assert.equal(await fixture.state(eventId), "COMPLETE");
    assert.equal((await receipt(fixture, eventId))[0]!.result_payload.deletedObjectCount, keys.length);
  } finally { t.mock.restoreAll(); await fixture.close(); }
});

test("lost page and final COMMIT replies preserve accumulated media receipts", { skip: !databaseUrl || !redisUrl }, async t => {
  const fixture = await createOutboxRecoveryFixture(databaseUrl!, redisUrl!);
  try {
    const { keys, eventId } = await enqueueMedia(fixture, MEDIA_MAINTENANCE_BATCH_SIZE * 3 + 1);
    let lostPage = false;
    let lostCompletion = false;
    let deletes = 0;
    const realDelete = fixture.runtime.mediaStore.delete.bind(fixture.runtime.mediaStore);
    t.mock.method(fixture.runtime.mediaStore, "delete", async (key: string) => { deletes++; await realDelete(key); });
    for (const [pool, phase] of [[fixture.runtime.repository.pool, "page"], [fixture.runtime.pool, "completion"]] as const) {
      const connect = pool.connect.bind(pool);
      t.mock.method(pool, "connect", (...args: unknown[]) => {
        if (args.length) return Reflect.apply(connect, pool, args);
        return (async () => {
          const client = await connect();
          let recorded = false;
          return new Proxy(client, { get(target, property) {
            if (property !== "query") {
              const value = Reflect.get(target, property);
              return typeof value === "function" ? value.bind(target) : value;
            }
            return async (...values: unknown[]) => {
              const result = await Reflect.apply(target.query, target, values);
              if (typeof values[0] === "string" && values[0].includes(phase === "page" ? "UPDATE account_media_retirement_progress" : "INSERT INTO job_effects")) recorded = true;
              if (values[0] === "COMMIT" && recorded && (phase === "page" ? !lostPage : !lostCompletion)) {
                if (phase === "page") lostPage = true; else lostCompletion = true;
                throw new Error(`owned_lost_${phase}_commit_reply`);
              }
              return result;
            };
          } });
        })();
      });
    }
    assert.equal(await fixture.runtime.dispatchBatch(), 1);
    await fixture.runtime.queue.resume();
    await fixture.runtime.waitForIdle();
    assert.ok(lostPage && lostCompletion);
    assert.equal(deletes, keys.length);
    assert.equal(await fixture.state(eventId), "COMPLETE");
    assert.equal((await receipt(fixture, eventId)).length, 1);
    assert.equal((await receipt(fixture, eventId))[0]!.result_payload.deletedObjectCount, keys.length);
  } finally { t.mock.restoreAll(); await fixture.close(); }
});

test("a failed Redis continuation transition retries durable progress without completing the batch early", { skip: !databaseUrl || !redisUrl }, async t => {
  const fixture = await createOutboxRecoveryFixture(databaseUrl!, redisUrl!);
  try {
    const { keys, eventId } = await enqueueMedia(fixture, MEDIA_MAINTENANCE_BATCH_SIZE * 2 + 1);
    let rejected = false;
    let deletes = 0;
    const realDelete = fixture.runtime.mediaStore.delete.bind(fixture.runtime.mediaStore);
    t.mock.method(fixture.runtime.mediaStore, "delete", async (key: string) => { deletes++; await realDelete(key); });
    const moveToDelayed = Job.prototype.moveToDelayed;
    t.mock.method(Job.prototype, "moveToDelayed", async function (this: Job, timestamp: number, token?: string) {
      if (this.id === eventId && !rejected) {
        rejected = true;
        assert.equal((await receipt(fixture, eventId)).length, 0);
        assert.equal(await fixture.state(eventId), "DISPATCHED");
        throw new Error("owned_redis_delayed_transition_failed");
      }
      await moveToDelayed.call(this, timestamp, token);
    });
    assert.equal(await fixture.runtime.dispatchBatch(), 1);
    await fixture.runtime.queue.resume();
    await fixture.runtime.waitForIdle();
    assert.equal(rejected, true);
    assert.equal(deletes, keys.length);
    assert.equal(await fixture.state(eventId), "COMPLETE");
    assert.equal((await receipt(fixture, eventId))[0]!.result_payload.deletedObjectCount, keys.length);
  } finally { t.mock.restoreAll(); await fixture.close(); }
});

for (const lostReplyPhase of ["redis", "continuation-commit"] as const) {
test(`a committed continuation with a lost reply remains recoverable after earlier failures (${lostReplyPhase})`, { skip: !databaseUrl || !redisUrl }, async t => {
  const fixture = await createOutboxRecoveryFixture(databaseUrl!, redisUrl!);
  try {
    const { batchId, keys, eventId } = await enqueueMedia(fixture, MEDIA_MAINTENANCE_BATCH_SIZE * 2 + 1);
    let storageAvailable = false;
    let successfulDeletes = 0;
    let lostReply = false;
    const failureAttempts: number[] = [];
    const workerErrors: string[] = [];
    fixture.runtime.worker.on("error", error => { workerErrors.push(error.message); });
    fixture.runtime.worker.on("failed", job => {
      if (job?.id !== eventId) return;
      failureAttempts.push(job.attemptsMade);
      if (job.attemptsMade === 2) storageAvailable = true;
    });
    const realDelete = fixture.runtime.mediaStore.delete.bind(fixture.runtime.mediaStore);
    t.mock.method(fixture.runtime.mediaStore, "delete", async (key: string) => {
      if (!storageAvailable) throw new Error("owned_storage_not_yet_recovered");
      await realDelete(key);
      successfulDeletes++;
    });
    if (lostReplyPhase === "continuation-commit") {
      const pool = fixture.runtime.pool;
      const connect = pool.connect.bind(pool);
      t.mock.method(pool, "connect", (...args: unknown[]) => {
        if (args.length) return Reflect.apply(connect, pool, args);
        return (async () => {
          const client = await connect();
          let continued = false;
          return new Proxy(client, { get(target, property) {
            if (property !== "query") {
              const value = Reflect.get(target, property);
              return typeof value === "function" ? value.bind(target) : value;
            }
            return async (...values: unknown[]) => {
              const result = await Reflect.apply(target.query, target, values);
              if (typeof values[0] === "string" && values[0].includes("state='CONTINUED'")) continued = true;
              if (values[0] === "COMMIT" && continued && storageAvailable && !lostReply) {
                await fixture.runtime.queue.pause();
                lostReply = true;
                throw new Error("owned_lost_continuation_commit_reply");
              }
              return result;
            };
          } });
        })();
      });
    }
    const moveToDelayed = Job.prototype.moveToDelayed;
    t.mock.method(Job.prototype, "moveToDelayed", async function (this: Job, timestamp: number, token?: string) {
      if (lostReplyPhase === "redis" && this.id === eventId && storageAvailable && !lostReply) {
        // Hold the same handle after the real Redis transition. The injected
        // error is only a lost response: Redis already released its old lock.
        await fixture.runtime.queue.pause();
        await moveToDelayed.call(this, timestamp, token);
        assert.equal(this.attemptsMade, 2);
        assert.notEqual(await this.getState(), "active");
        lostReply = true;
        throw new Error("owned_lost_committed_continuation_reply");
      }
      await moveToDelayed.call(this, timestamp, token);
    });
    assert.equal(await fixture.runtime.dispatchBatch(), 1);
    await fixture.runtime.queue.resume();
    await waitFor(async () => lostReply, "the resumed batch must really move before losing its reply");
    await fixture.runtime.worker.pause();
    const afterReplyLoss = (await fixture.repository.pool.query<{ state: string; attempts: number; last_error_code: string | null }>(
      "SELECT state,attempts,last_error_code FROM outbox_events WHERE event_id=$1", [eventId],
    )).rows[0]!;
    const handle = (await fixture.runtime.queue.getJob(eventId))!;
    const redisAttempts = handle.attemptsMade;
    assert.equal((await receipt(fixture, eventId)).length, 0);
    const remaining = (await fixture.repository.pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM account_deletion_media_queue WHERE deletion_batch_id=$1", [batchId],
    )).rows[0]!.count;
    assert.equal(remaining, keys.length - MEDIA_MAINTENANCE_BATCH_SIZE);
    await handle.remove();
    assert.equal(await fixture.runtime.queue.getJob(eventId), undefined);
    await fixture.restart();
    const resumedDelete = fixture.runtime.mediaStore.delete.bind(fixture.runtime.mediaStore);
    t.mock.method(fixture.runtime.mediaStore, "delete", async (key: string) => { await resumedDelete(key); successfulDeletes++; });
    const recoveredCount = await fixture.runtime.dispatchBatch();
    t.diagnostic(JSON.stringify({ lostReplyPhase, afterReplyLoss, redisAttempts, failureAttempts, remaining, recoveredCount, workerErrors }));
    assert.equal(afterReplyLoss.state, "DISPATCHED", "a completed normal continuation cannot become a dead letter because its reply was lost");
    assert.equal(afterReplyLoss.attempts, 2, "only the two actual storage failures consume the durable failure budget");
    assert.equal(redisAttempts, 2, "normal continuation did not consume another BullMQ failure attempt");
    assert.deepEqual(failureAttempts, [1, 2]);
    assert.equal(recoveredCount, 1, "positive loss of the continuation handle must use the existing automatic recovery");
    assert.equal((await fixture.runtime.queue.getJob(eventId))!.id, eventId);
    await fixture.runtime.queue.resume();
    await fixture.runtime.waitForIdle();
    assert.equal(successfulDeletes, keys.length);
    assert.equal(await fixture.state(eventId), "COMPLETE");
    assert.equal((await receipt(fixture, eventId)).length, 1);
    assert.equal((await receipt(fixture, eventId))[0]!.result_payload.deletedObjectCount, keys.length);
    for (const key of keys) assert.equal(await fixture.runtime.mediaStore.read(key), null);
  } finally { t.mock.restoreAll(); await fixture.close(); }
});
}
