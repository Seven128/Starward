import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { ReleaseMetadata } from "./release-metadata.ts";
import {
  assertFreshWorkerHeartbeat,
  WorkerHeartbeat,
} from "./worker-heartbeat.ts";

const release: ReleaseMetadata = {
  environment: "staging",
  revision: "a".repeat(40),
  imageDigest: `sha256:${"b".repeat(64)}`,
  releasedAt: "2026-08-26T12:00:00.000Z",
};

test("worker heartbeat is atomic, release-bound and fails when stale", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "starward-heartbeat-"));
  const filePath = path.join(directory, "worker.json");
  const environment = {
    MINIAPP_WORKER_HEARTBEAT_FILE: filePath,
    MINIAPP_WORKER_HEARTBEAT_MAX_AGE_MS: "5000",
  };
  try {
    const heartbeat = new WorkerHeartbeat(release, environment);
    const record = await heartbeat.write("ready");
    assert.equal(
      (await assertFreshWorkerHeartbeat(release, environment, Date.parse(record.checkedAt) + 1_000)).state,
      "ready",
    );
    await assert.rejects(
      assertFreshWorkerHeartbeat(release, environment, Date.parse(record.checkedAt) + 6_000),
      /worker_heartbeat_stale/u,
    );
    await assert.rejects(
      assertFreshWorkerHeartbeat({ ...release, revision: "c".repeat(40) }, environment),
      /worker_heartbeat_release_mismatch/u,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
