import { OutboxWorkerRuntime, runOutboxOnce } from "./outbox-worker.ts";
import { loadReleaseMetadata } from "./release-metadata.ts";
import { WorkerHeartbeat } from "./worker-heartbeat.ts";

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
  const heartbeat = new WorkerHeartbeat(loadReleaseMetadata());
  let stopping = false;
  let nextCycle: NodeJS.Timeout | null = null;
  let stopPromise: Promise<void> | null = null;
  const stop = () => {
    if (stopPromise) return stopPromise;
    stopPromise = (async () => {
      stopping = true;
      if (nextCycle) clearTimeout(nextCycle);
      await heartbeat.write("stopping");
      await runtime.close();
      await heartbeat.remove();
    })();
    return stopPromise;
  };
  const handleSignal = () => {
    if (stopping) return;
    void stop().catch((error) => {
      process.stderr.write(
        `${JSON.stringify({
          level: "error",
          event: "worker_shutdown_failed",
          code: error instanceof Error ? error.message : "unknown",
        })}\n`,
      );
      process.exitCode = 1;
    });
  };
  process.once("SIGINT", handleSignal);
  process.once("SIGTERM", handleSignal);
  const runCycle = async () => {
    try {
      await runtime.enqueueOperationalSweep();
      await runtime.dispatchBatch();
      await heartbeat.write("ready");
    } catch (error) {
      const code = error instanceof Error ? error.message : "unknown";
      await heartbeat.write("degraded", code);
      process.stderr.write(
        `${JSON.stringify({
          level: "error",
          event: "outbox_dispatch_failed",
          code,
        })}\n`,
      );
    } finally {
      if (!stopping) nextCycle = setTimeout(() => void runCycle(), 1_000);
    }
  };
  await runCycle();
  process.stdout.write(
    `${JSON.stringify({
      status: "ready",
      worker: "miniapp-outbox",
      release: loadReleaseMetadata(),
    })}\n`,
  );
  await new Promise<void>((resolve) => {
    const poll = setInterval(() => {
      if (stopping) {
        clearInterval(poll);
        void (stopPromise ?? stop()).finally(resolve);
      }
    }, 250);
  });
}
