import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import pg from "pg";
import { OutboxWorkerRuntime } from "./outbox-worker.ts";
import { PostgresMiniappRepository } from "./postgres-repository.ts";
import { createTestRuntimeConfig } from "./runtime-config.ts";

const databaseUrl = process.env.DATABASE_URL?.trim();
const redisUrl = process.env.REDIS_URL?.trim();

test("API and worker survive idle database disconnects and recover real reads", {
  skip: !databaseUrl || !redisUrl,
}, async () => {
  assert.ok(databaseUrl);
  assert.ok(redisUrl);
  // Only the infrastructure runner's disposable database may receive faults.
  assert.match(new URL(databaseUrl!).pathname, /^\/starward_verify_[a-f0-9]{16}$/u);
  const controller = new pg.Client({ connectionString: databaseUrl });
  await controller.connect();
  const repository = new PostgresMiniappRepository(databaseUrl!);
  let runtime: OutboxWorkerRuntime | undefined;
  try {
    await repository.initialize({ migrate: true });
    runtime = new OutboxWorkerRuntime({
      databaseUrl: databaseUrl!, redisUrl: redisUrl!,
      queueName: `pool-${new URL(databaseUrl!).pathname.slice(1)}-${randomUUID()}`,
      runtimeConfig: createTestRuntimeConfig({
        databaseUrl, redisUrl, storageMode: "POSTGRES",
        mediaStorage: { mode: "DISABLED", root: null, maxUploadBytes: 1_200_000 },
      }),
    });
    const beforeWorker = await runtime.snapshot();
    // This tests both actual Pool constructors, including the repository owned
    // by the worker. No test error listener may mask a missing product handler.
    for (const pool of [repository.pool, runtime.pool, runtime.repository.pool]) {
      const before = await pool.query("SELECT pg_backend_pid() AS pid, 42 AS value");
      const pid = before.rows[0].pid;
      assert.equal(before.rows[0].value, 42);
      const broken = await controller.query(`SELECT pg_terminate_backend(pid) AS terminated
        FROM pg_stat_activity WHERE pid=$1 AND datname=current_database() AND state='idle'`, [pid]);
      assert.equal(broken.rows[0]?.terminated, true);
      const deadline = Date.now() + 2_000;
      while (pool.totalCount && Date.now() < deadline) await delay(10);
      assert.equal(pool.totalCount, 0, "pg must retire the disconnected idle client");
      const after = await pool.query("SELECT pg_backend_pid() AS pid, 42 AS value");
      assert.notEqual(after.rows[0].pid, pid);
      assert.equal(after.rows[0].value, 42);
      await assert.rejects(pool.query("SELECT 1/0"), { code: "22012" },
        "business query errors must still reject without automatic retries");
    }
    assert.equal((await repository.readinessSnapshot()).ready, true);
    assert.equal((await runtime.repository.readinessSnapshot()).ready, true);
    assert.deepEqual(await runtime.snapshot(), beforeWorker);
  } finally {
    // Retire only the newly named empty test queues. No jobs are dispatched.
    if (runtime) await runtime.close();
    await repository.close();
    await controller.end();
  }
});
