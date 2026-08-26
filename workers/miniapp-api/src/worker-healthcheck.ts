import { loadReleaseMetadata } from "./release-metadata.ts";
import { assertFreshWorkerHeartbeat } from "./worker-heartbeat.ts";

try {
  const record = await assertFreshWorkerHeartbeat(loadReleaseMetadata());
  process.stdout.write(
    `${JSON.stringify({ status: "ready", checkedAt: record.checkedAt })}\n`,
  );
} catch (error) {
  process.stderr.write(
    `${JSON.stringify({
      status: "not-ready",
      code: error instanceof Error ? error.message : "worker_healthcheck_failed",
    })}\n`,
  );
  process.exitCode = 1;
}
