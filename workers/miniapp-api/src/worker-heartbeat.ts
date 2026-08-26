import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ReleaseMetadata } from "./release-metadata.ts";

export type WorkerHeartbeatState = "ready" | "degraded" | "stopping";

export interface WorkerHeartbeatRecord {
  schemaVersion: "starward-worker-heartbeat-v1";
  worker: "miniapp-outbox";
  state: WorkerHeartbeatState;
  checkedAt: string;
  release: ReleaseMetadata;
  errorCode: string | null;
}

function heartbeatPath(environment: NodeJS.ProcessEnv = process.env) {
  const selected =
    environment.MINIAPP_WORKER_HEARTBEAT_FILE?.trim() ??
    path.resolve("tmp", "miniapp-worker-heartbeat.json");
  if (!path.isAbsolute(selected))
    throw new Error("worker_heartbeat_path_must_be_absolute");
  return path.normalize(selected);
}

export class WorkerHeartbeat {
  readonly filePath: string;

  constructor(
    private readonly release: ReleaseMetadata,
    environment: NodeJS.ProcessEnv = process.env,
  ) {
    this.filePath = heartbeatPath(environment);
  }

  async write(state: WorkerHeartbeatState, errorCode: string | null = null) {
    const record: WorkerHeartbeatRecord = {
      schemaVersion: "starward-worker-heartbeat-v1",
      worker: "miniapp-outbox",
      state,
      checkedAt: new Date().toISOString(),
      release: this.release,
      errorCode,
    };
    await mkdir(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(record)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporary, this.filePath);
    return record;
  }

  async remove() {
    await rm(this.filePath, { force: true });
  }
}

export async function assertFreshWorkerHeartbeat(
  release: ReleaseMetadata,
  environment: NodeJS.ProcessEnv = process.env,
  now = Date.now(),
) {
  const filePath = heartbeatPath(environment);
  const maxAgeMs = Number(
    environment.MINIAPP_WORKER_HEARTBEAT_MAX_AGE_MS?.trim() ?? "30000",
  );
  if (!Number.isInteger(maxAgeMs) || maxAgeMs < 5_000 || maxAgeMs > 300_000)
    throw new Error("worker_heartbeat_max_age_invalid");
  const record = JSON.parse(await readFile(filePath, "utf8")) as WorkerHeartbeatRecord;
  if (
    record.schemaVersion !== "starward-worker-heartbeat-v1" ||
    record.worker !== "miniapp-outbox" ||
    record.state !== "ready"
  )
    throw new Error("worker_heartbeat_not_ready");
  const checkedAt = Date.parse(record.checkedAt);
  if (!Number.isFinite(checkedAt) || now - checkedAt < 0 || now - checkedAt > maxAgeMs)
    throw new Error("worker_heartbeat_stale");
  if (
    record.release.environment !== release.environment ||
    record.release.revision !== release.revision ||
    record.release.imageDigest !== release.imageDigest
  )
    throw new Error("worker_heartbeat_release_mismatch");
  return record;
}
