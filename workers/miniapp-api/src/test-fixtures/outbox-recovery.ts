import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Queue } from "bullmq";
import { PostgresMiniappRepository } from "../postgres-repository.ts";
import { createTestRuntimeConfig } from "../runtime-config.ts";
import { OutboxWorkerRuntime } from "../outbox-worker.ts";

/** This fixture only accepts the caller's dedicated synthetic database. */
export async function createOutboxRecoveryFixture(databaseUrl: string, redisUrl: string) {
  assert.match(new URL(databaseUrl).pathname, /^\/starward_outbox_[a-f0-9]+$/u);
  const redis = new URL(redisUrl);
  assert.ok(redis.pathname === "" || redis.pathname === "/" || redis.pathname === "/0");
  const objectRoot = await mkdtemp(path.join(tmpdir(), "starward-outbox-recovery-"));
  const queueName = `starward-outbox-recovery-${randomUUID()}`;
  const config = createTestRuntimeConfig({
    storageMode: "POSTGRES", databaseUrl,
    mediaStorage: { mode: "LOCAL_FILESYSTEM", root: objectRoot, maxUploadBytes: 1_200_000 },
  });
  const repository = await new PostgresMiniappRepository(databaseUrl).initialize({ migrate: true });
  const legacyQueue = new Queue(`${queueName}-reminders`, { connection: {
    host: redis.hostname, port: Number(redis.port || 6379),
    ...(redis.username ? { username: redis.username } : {}),
    ...(redis.password ? { password: redis.password } : {}),
    ...(redis.protocol === "rediss:" ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
  } });
  let runtime = new OutboxWorkerRuntime({ databaseUrl, redisUrl, queueName, runtimeConfig: config });
  await Promise.all([runtime.queue.pause(), legacyQueue.pause()]);
  const eventIds: string[] = [];
  const insertEvent = async (payload: Record<string, unknown> = { jobKind: "MEDIA" }, eventType = "OperationalMEDIARequested") => {
    const eventId = randomUUID();
    await repository.pool.query(
      `INSERT INTO outbox_events(event_id,event_type,idempotency_key,payload,state,dispatched_at)
       VALUES($1::uuid,$2,$1::uuid::text,$3,'DISPATCHED',now())`, [eventId, eventType, payload],
    );
    eventIds.push(eventId);
    return eventId;
  };
  const state = async (eventId: string) => (await repository.pool.query<{ state: string }>(
    "SELECT state FROM outbox_events WHERE event_id=$1", [eventId],
  )).rows[0]!.state;
  const clearEvents = async () => {
    for (const eventId of eventIds) for (const queue of [runtime.queue, legacyQueue]) {
      const job = await queue.getJob(eventId);
      if (job) await job.remove();
    }
    await repository.pool.query("DELETE FROM job_effects WHERE event_id=ANY($1::uuid[])", [eventIds]);
    await repository.pool.query("DELETE FROM job_executions WHERE event_id=ANY($1::uuid[])", [eventIds]);
    await repository.pool.query("DELETE FROM outbox_events WHERE event_id=ANY($1::uuid[])", [eventIds]);
    eventIds.length = 0;
  };
  return {
    repository, legacyQueue, insertEvent, state, clearEvents,
    trackEvents(ids: readonly string[]) { eventIds.push(...ids.filter(id => !eventIds.includes(id))); },
    get runtime() { return runtime; },
    async restart() {
      await runtime.close();
      runtime = new OutboxWorkerRuntime({ databaseUrl, redisUrl, queueName, runtimeConfig: config });
      await runtime.queue.pause();
    },
    async close() {
      await runtime.worker.pause();
      await clearEvents();
      await runtime.queue.obliterate();
      await legacyQueue.obliterate();
      await runtime.close();
      await legacyQueue.close();
      await repository.close();
      assert.equal(path.dirname(objectRoot), path.resolve(tmpdir()));
      assert.ok(path.basename(objectRoot).startsWith("starward-outbox-recovery-"));
      await rm(objectRoot, { recursive: true });
    },
  };
}
