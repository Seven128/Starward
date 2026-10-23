import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { OutboxDispatchRecovery, OutboxQueueHandleProbe } from "./outbox-dispatch-recovery.ts";
import { mapEventToJob } from "./outbox-worker.ts";
import { createOutboxRecoveryFixture } from "./test-fixtures/outbox-recovery.ts";

const databaseUrl = process.env.OUTBOX_RECOVERY_TEST_DATABASE_URL;
const redisUrl = process.env.OUTBOX_RECOVERY_TEST_REDIS_URL;

test("non-reminder outbox recovery uses PostgreSQL ownership and real BullMQ handles", {
  skip: !databaseUrl || !redisUrl,
}, async t => {
  assert.ok(databaseUrl && redisUrl);
  const fixture = await createOutboxRecoveryFixture(databaseUrl, redisUrl);
  const { repository, legacyQueue } = fixture;
  const recovery = (probe = new OutboxQueueHandleProbe([fixture.runtime.queue, legacyQueue])) =>
    new OutboxDispatchRecovery(repository.pool, probe,
      event => mapEventToJob(event.event_type, event.payload) === "NOTIFICATION");
  try {
    await t.test("live or legacy queue handles and reminders are not reclaimed", async () => {
      const live = await fixture.insertEvent();
      const legacy = await fixture.insertEvent();
      const reminder = await fixture.insertEvent({ jobKind: "NOTIFICATION" }, "OperationalNOTIFICATIONRequested");
      const oldReminder = await fixture.insertEvent({}, "FavoriteSaved");
      await fixture.runtime.queue.add("MEDIA", { eventId: live }, { jobId: live });
      await legacyQueue.add("MEDIA", { eventId: legacy }, { jobId: legacy });
      assert.equal(await recovery().recoverBatch(), 0);
      for (const id of [live, legacy, reminder, oldReminder]) assert.equal(await fixture.state(id), "DISPATCHED");
      assert.ok(await fixture.runtime.queue.getJob(live));
      assert.ok(await legacyQueue.getJob(legacy));
      await fixture.clearEvents();
    });

    await t.test("Redis read failures and timeouts preserve the durable dispatch", async () => {
      const id = await fixture.insertEvent();
      const failed = recovery(new OutboxQueueHandleProbe([{
        getJob: async () => { throw new Error("injected_redis_read_failure"); },
      }]));
      await assert.rejects(failed.recoverBatch(), /injected_redis_read_failure/);
      assert.equal(await fixture.state(id), "DISPATCHED");
      const pending = new Promise<unknown>(() => {});
      const timedOut = recovery(new OutboxQueueHandleProbe([{ getJob: () => pending }], 15));
      await assert.rejects(timedOut.recoverBatch(), /outbox_queue_probe_timeout/);
      assert.equal(await fixture.state(id), "DISPATCHED");
      await fixture.clearEvents();
    });

    await t.test("a missing Redis job does not steal the active PostgreSQL effect transaction", async () => {
      const id = await fixture.insertEvent();
      const owner = await repository.pool.connect();
      try {
        await owner.query("BEGIN");
        await owner.query("SELECT event_id FROM outbox_events WHERE event_id=$1 FOR UPDATE", [id]);
        assert.equal(await recovery().recoverBatch(), 0);
        assert.equal(await fixture.state(id), "DISPATCHED");
        await owner.query("ROLLBACK");
        assert.equal(await recovery().recoverBatch(), 1);
        assert.equal(await fixture.state(id), "PENDING");
      } finally { await owner.query("ROLLBACK"); owner.release(); }
      await fixture.clearEvents();
    });

    await t.test("a changed dispatch generation invalidates an earlier absence observation", async () => {
      const id = await fixture.insertEvent();
      const interrupted = recovery(new OutboxQueueHandleProbe([{
        getJob: async eventId => {
          assert.equal(eventId, id);
          const firstRead = await fixture.runtime.queue.getJob(id);
          assert.equal(firstRead, undefined);
          // Another owner recovers/re-dispatches while this reader is between
          // Redis observation and PostgreSQL claim, using the dispatch lock.
          const dispatcher = await repository.pool.connect();
          try {
            await dispatcher.query("BEGIN");
            await dispatcher.query("SELECT event_id FROM outbox_events WHERE event_id=$1 FOR UPDATE", [id]);
            await fixture.runtime.queue.add("MEDIA", { eventId: id }, { jobId: id });
            await dispatcher.query("UPDATE outbox_events SET dispatched_at=dispatched_at+interval '1 microsecond' WHERE event_id=$1", [id]);
            await dispatcher.query("COMMIT");
          } finally { dispatcher.release(); }
          return firstRead;
        },
      }]));
      assert.equal(await interrupted.recoverBatch(), 0);
      assert.equal(await fixture.state(id), "DISPATCHED");
      assert.ok(await fixture.runtime.queue.getJob(id));
      await fixture.clearEvents();
    });

    await t.test("bounded keyset pages reach a lost event after retained handles", async () => {
      const ids = await Promise.all(Array.from({ length: 4 }, () => fixture.insertEvent()));
      ids.sort();
      for (const id of ids.slice(0, 3)) await fixture.runtime.queue.add("MEDIA", { eventId: id }, { jobId: id });
      const owner = recovery();
      assert.equal(await owner.recoverBatch(2), 0);
      assert.equal(await owner.recoverBatch(2), 1);
      assert.equal(await fixture.state(ids[3]!), "PENDING");
      await fixture.clearEvents();
    });

    await t.test("a genuinely lost MEDIA handle completes deletion and receipt replay survives worker restart", async () => {
      const batchId = randomUUID();
      const objectKey = `profiles/${randomUUID().replaceAll("-", "").slice(0, 24)}/${randomUUID()}.jpg`;
      const bytes = Buffer.from("owned nonempty media deletion fixture");
      await fixture.runtime.mediaStore.put({ objectKey, bytes, mimeType: "image/jpeg" });
      assert.deepEqual(await fixture.runtime.mediaStore.read(objectKey), bytes);
      await repository.pool.query("INSERT INTO account_deletion_media_queue(deletion_batch_id,object_key) VALUES($1,$2)", [batchId, objectKey]);
      const id = await fixture.insertEvent({ jobKind: "MEDIA", action: "DELETE_ACCOUNT_MEDIA", deletionBatchId: batchId });
      const lostJob = await fixture.runtime.queue.add("MEDIA", { eventId: id }, { jobId: id });
      await lostJob.remove();
      assert.equal(await fixture.runtime.queue.getJob(id), undefined);
      assert.equal(await fixture.runtime.dispatchBatch(), 1);
      assert.ok(await fixture.runtime.queue.getJob(id));
      let deletes = 0;
      const initialDelete = fixture.runtime.mediaStore.delete.bind(fixture.runtime.mediaStore);
      t.mock.method(fixture.runtime.mediaStore, "delete", async (key: string) => { deletes++; await initialDelete(key); });
      await fixture.runtime.queue.resume();
      await fixture.runtime.waitForIdle();
      assert.equal(await fixture.state(id), "COMPLETE");
      assert.equal(await fixture.runtime.mediaStore.read(objectKey), null);
      assert.equal(deletes, 1);
      const receipt = await repository.pool.query<{ result_state: string; result_payload: { deletedObjectCount: number } }>(
        "SELECT result_state,result_payload FROM job_effects WHERE event_id=$1", [id]);
      assert.equal(receipt.rows[0]!.result_state, "ACCOUNT_MEDIA_DELETED");
      assert.equal(receipt.rows[0]!.result_payload.deletedObjectCount, 1);
      assert.equal((await repository.pool.query("SELECT object_key FROM account_deletion_media_queue WHERE deletion_batch_id=$1", [batchId])).rowCount, 0);
      await fixture.runtime.queue.pause();
      await fixture.restart();
      const doneJob = await fixture.runtime.queue.getJob(id);
      assert.ok(doneJob); await doneJob.remove();
      await repository.pool.query("UPDATE outbox_events SET state='DISPATCHED',dispatched_at=now() WHERE event_id=$1", [id]);
      t.mock.method(fixture.runtime.mediaStore, "delete", async () => { throw new Error("receipt_replay_must_not_repeat_delete"); });
      assert.equal(await fixture.runtime.dispatchBatch(), 1);
      await fixture.runtime.queue.resume();
      await fixture.runtime.waitForIdle();
      assert.equal(await fixture.state(id), "COMPLETE");
      assert.equal((await repository.pool.query("SELECT effect_key FROM job_effects WHERE event_id=$1", [id])).rowCount, 1);
      assert.equal((await repository.pool.query("SELECT execution_id FROM job_executions WHERE event_id=$1 AND state='COMPLETE'", [id])).rowCount, 2);
      await fixture.runtime.queue.pause();
      await fixture.clearEvents();
    });

    await t.test("a lost commit reply cannot turn a committed effect or execution back into failure", async () => {
      const id = await fixture.insertEvent({ jobKind: "PROVIDER_HEALTH" }, "OperationalPROVIDER_HEALTHRequested");
      const connect = fixture.runtime.pool.connect.bind(fixture.runtime.pool);
      let lostReply = false;
      const mockedConnect = t.mock.method(fixture.runtime.pool, "connect", (...connectArgs: unknown[]) => {
        // Pool.query uses the callback overload; only explicit worker-owned
        // transactions need the lost-reply injection.
        if (connectArgs.length) return Reflect.apply(connect, fixture.runtime.pool, connectArgs);
        return (async () => {
          const client = await connect();
          let wroteEffect = false;
          return new Proxy(client, {
            get(target, property) {
              if (property !== "query") {
                const value = Reflect.get(target, property);
                return typeof value === "function" ? value.bind(target) : value;
              }
              return async (...args: unknown[]) => {
                const result = await (target.query as (...values: unknown[]) => Promise<unknown>).apply(target, args);
                if (typeof args[0] === "string" && args[0].includes("INSERT INTO job_effects")
                  && Array.isArray(args[1]) && args[1][1] === id) wroteEffect = true;
                if (args[0] === "COMMIT" && wroteEffect && !lostReply) {
                  lostReply = true;
                  throw new Error("injected_lost_commit_reply");
                }
                return result;
              };
            },
          });
        })();
      });
      try {
        assert.equal(await fixture.runtime.dispatchBatch(), 1);
        await fixture.runtime.queue.resume();
        await fixture.runtime.waitForIdle();
        assert.equal(lostReply, true);
        assert.equal(await fixture.state(id), "COMPLETE");
        const executions = await repository.pool.query<{ state: string }>(
          "SELECT state FROM job_executions WHERE event_id=$1 ORDER BY started_at", [id]);
        assert.equal(executions.rowCount, 2, "BullMQ retried the unacknowledged completion");
        assert.ok(executions.rows.every(row => row.state === "COMPLETE"), "the first committed execution remains complete");
        assert.equal((await repository.pool.query("SELECT effect_key FROM job_effects WHERE event_id=$1", [id])).rowCount, 1);
      } finally { mockedConnect.mock.restore(); }
      await fixture.runtime.queue.pause();
      await fixture.clearEvents();
    });
  } finally { t.mock.restoreAll(); await fixture.close(); }
});
