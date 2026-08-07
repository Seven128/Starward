import { OutboxWorkerRuntime, runOutboxOnce } from "./outbox-worker.ts";

const databaseUrl = process.env.DATABASE_URL?.trim();
const redisUrl = process.env.REDIS_URL?.trim();
const queueName = process.env.MINIAPP_QUEUE_NAME?.trim();
if (!databaseUrl) throw new Error("worker_database_url_required");
if (!redisUrl) throw new Error("worker_redis_url_required");
const options = {
  databaseUrl,
  redisUrl,
  ...(queueName ? { queueName } : {}),
};

const replayIndex = process.argv.indexOf("--replay");
if (replayIndex >= 0) {
  const eventId = process.argv[replayIndex + 1];
  if (!eventId) throw new Error("worker_replay_event_id_required");
  const runtime = new OutboxWorkerRuntime(options);
  try {
    process.stdout.write(`${JSON.stringify(await runtime.replayDeadLetter(eventId))}\n`);
  } finally {
    await runtime.close();
  }
} else if (process.argv.includes("--once")) {
  process.stdout.write(
    `${JSON.stringify(await runOutboxOnce(options))}\n`,
  );
} else {
  const runtime = new OutboxWorkerRuntime(options);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await runtime.close();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  const timer = setInterval(async () => {
    try {
      await runtime.enqueueOperationalSweep();
      await runtime.dispatchBatch();
    } catch (error) {
      process.stderr.write(
        `${JSON.stringify({
          level: "error",
          event: "outbox_dispatch_failed",
          code: error instanceof Error ? error.message : "unknown",
        })}\n`,
      );
    }
  }, 1_000);
  timer.unref();
  await runtime.enqueueOperationalSweep();
  await runtime.dispatchBatch();
  process.stdout.write(
    `${JSON.stringify({ status: "ready", worker: "miniapp-outbox" })}\n`,
  );
  await new Promise<void>((resolve) => {
    const poll = setInterval(() => {
      if (stopping) {
        clearInterval(poll);
        resolve();
      }
    }, 250);
  });
}
