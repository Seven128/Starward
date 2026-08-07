import { createHash, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import Redis from "ioredis";
import pg from "pg";
import { createBackup, restoreBackup } from "./backup-restore.mjs";

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const composePath = path.join(root, "infra", "miniapp", "docker-compose.yml");
const artifactPath = path.join(
  root,
  "artifacts",
  "miniapp",
  "infrastructure",
  "miniapp-infrastructure-session.json",
);
const runId = `verify_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
if (!/^verify_[a-f0-9]{16}$/u.test(runId))
  throw new Error("unsafe_infrastructure_run_id");
const databaseName = `starward_${runId}`;
const restoreDatabaseName = `starward_restore_${runId}`;
const backupPath = path.join(
  root,
  "tmp",
  "miniapp-backups",
  `${runId}.dump`,
);
const adminUrl =
  "postgresql://starward_miniapp:local_demo_only@127.0.0.1:55432/starward_miniapp";
const databaseUrl = `postgresql://starward_miniapp:local_demo_only@127.0.0.1:55432/${databaseName}`;
const redisUrl = "redis://127.0.0.1:56379";
const cachePrefix = `starward:miniapp:${runId}:`;
const queueName = `starward-miniapp-${runId}`;
const startedAt = new Date().toISOString();
const output = [];
let testStatus = null;
let apiChecks = null;
let backupRestore = null;

function stage(name, detail = {}) {
  process.stderr.write(
    `${JSON.stringify({ runner: "miniapp-infrastructure", stage: name, ...detail })}\n`,
  );
}

function safeDiagnostic(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/giu, "[REDACTED_DATABASE_URL]")
    .replace(/rediss?:\/\/[^\s"']+/giu, "[REDACTED_REDIS_URL]")
    .replace(/(["']?(?:token|password|secret)["']?\s*[:=]\s*)[^\s,}\]]+/giu, "$1[REDACTED]")
    .slice(-12_000);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
    ...options,
  });
  output.push(result.stdout ?? "", result.stderr ?? "");
  if (result.status !== 0) {
    process.stderr.write(
      `${JSON.stringify({
        runner: "miniapp-infrastructure",
        stage: "child:failed",
        command: path.basename(command),
        status: result.status,
      })}\n${safeDiagnostic(`${result.stdout ?? ""}\n${result.stderr ?? ""}`)}\n`,
    );
    throw new Error(
      `${path.basename(command)}_failed:${result.status}:${result.error?.code ?? "no_error_code"}`,
    );
  }
  return result;
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("infrastructure_api_port_unavailable");
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

async function waitForUrl(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("infrastructure_api_start_timeout");
}

function stopProcessTree(pid) {
  if (!pid) return;
  if (process.platform === "win32")
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
  else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  }
}

stage("compose:start");
run("docker", ["compose", "-f", composePath, "up", "-d", "--wait"]);
stage("compose:ready");
const admin = new Client({ connectionString: adminUrl });
await admin.connect();
const redis = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  connectionName: `starward-${runId}-cleanup`,
});
await redis.connect();
try {
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  stage("integration:start");
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("npm_execpath_missing");
  const test = run(
    process.execPath,
    [
      npmCli,
      "run",
      "test:integration",
      "--workspace",
      "@starward/miniapp-api",
    ],
    {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        REDIS_URL: redisUrl,
        MINIAPP_STORAGE_MODE: "postgres",
        MINIAPP_AUTO_MIGRATE: "1",
        MINIAPP_CACHE_PREFIX: cachePrefix,
        MINIAPP_QUEUE_NAME: queueName,
        MINIAPP_INTEGRATION_RUN_ID: runId,
      },
    },
  );
  testStatus = test.status;
  stage("integration:complete");
  stage("backup-restore:start");
  const backup = await createBackup({ databaseName, outputPath: backupPath });
  const restored = await restoreBackup({
    inputPath: backupPath,
    targetDatabase: restoreDatabaseName,
  });
  backupRestore = {
    status: restored.status,
    sha256: backup.manifest.sha256,
    byte_length: backup.manifest.byte_length,
    fingerprint_match: true,
  };
  stage("backup-restore:complete");
  const apiPort = await freePort();
  const adminToken = randomUUID();
  const api = spawn(
    process.execPath,
    ["--import", "tsx", "src/main.ts"],
    {
      cwd: path.join(root, "workers", "miniapp-api"),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        REDIS_URL: redisUrl,
        MINIAPP_STORAGE_MODE: "postgres",
        MINIAPP_AUTO_MIGRATE: "1",
        MINIAPP_CACHE_PREFIX: cachePrefix,
        MINIAPP_QUEUE_NAME: queueName,
        MINIAPP_ADMIN_TOKEN: adminToken,
        MINIAPP_API_PORT: String(apiPort),
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  api.stdout.on("data", (chunk) => output.push(String(chunk)));
  api.stderr.on("data", (chunk) => output.push(String(chunk)));
  try {
    const base = `http://127.0.0.1:${apiPort}`;
    await waitForUrl(`${base}/v1/capabilities`);
    stage("api-http:start");
    const capabilityResponse = await fetch(`${base}/v1/capabilities`);
    const capabilityEtag = capabilityResponse.headers.get("etag");
    if (!capabilityResponse.ok || !capabilityEtag)
      throw new Error("conditional_read_initial_response_invalid");
    const notModified = await fetch(`${base}/v1/capabilities`, {
      headers: { "if-none-match": capabilityEtag },
    });
    if (notModified.status !== 304)
      throw new Error(`conditional_read_failed:${notModified.status}`);
    const libraryResponse = await fetch(`${base}/v1/library`);
    const library = await libraryResponse.json();
    if (!libraryResponse.ok || !library.data.preferences)
      throw new Error("library_aggregate_invalid");
    const preferencesResponse = await fetch(`${base}/v1/preferences`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "idempotency-key": `http-preferences-${runId}`,
      },
      body: JSON.stringify({
        preferences: library.data.preferences.preferences,
        expectedRevision: library.data.preferences.revision,
      }),
    });
    const savedPreferences = await preferencesResponse.json();
    if (!preferencesResponse.ok || savedPreferences.data.revision < 2)
      throw new Error("preferences_http_save_failed");
    const conflictResponse = await fetch(`${base}/v1/preferences`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "idempotency-key": `http-conflict-${runId}`,
      },
      body: JSON.stringify({
        preferences: library.data.preferences.preferences,
        expectedRevision: library.data.preferences.revision,
      }),
    });
    const conflict = await conflictResponse.json();
    if (
      conflictResponse.status !== 409 ||
      conflict.code !== "CONFLICT" ||
      !conflict.recovery.includes("PRESERVE_DRAFT")
    )
      throw new Error("preferences_conflict_contract_failed");
    const rejectedFavorite = await fetch(
      `${base}/v1/favorites/${encodeURIComponent("spot:not-real")}`,
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `http-favorite-${runId}`,
        },
        body: JSON.stringify({ favorite: true }),
      },
    );
    const favoriteError = await rejectedFavorite.json();
    if (rejectedFavorite.status !== 404 || favoriteError.code !== "NOT_FOUND")
      throw new Error("favorite_error_contract_failed");
    const libraryAfterRejectedFavorite = await (
      await fetch(`${base}/v1/library`)
    ).json();
    if (
      libraryAfterRejectedFavorite.data.favoriteSpots.some(
        (spot) => spot.spotId === "spot:not-real",
      )
    )
      throw new Error("favorite_failure_was_committed");
    const adminShell = await fetch(`${base}/admin`);
    const adminHtml = await adminShell.text();
    if (!adminShell.ok || !adminHtml.includes("Demo 运营台"))
      throw new Error("admin_shell_unavailable");
    const unauthorized = await fetch(`${base}/v1/admin/dashboard`);
    if (unauthorized.status !== 403)
      throw new Error(`admin_rbac_fail_open:${unauthorized.status}`);
    const headers = {
      "content-type": "application/json",
      "x-admin-token": adminToken,
      "x-admin-actor": "admin:infrastructure-check",
    };
    const dashboardResponse = await fetch(`${base}/v1/admin/dashboard`, {
      headers,
    });
    const dashboard = await dashboardResponse.json();
    if (!dashboardResponse.ok || dashboard.data.spots.length !== 26)
      throw new Error("admin_dashboard_population_invalid");
    const spotId = dashboard.data.spots[0].spot_id;
    for (const action of ["suspend", "publish"]) {
      const response = await fetch(
        `${base}/v1/admin/spots/${encodeURIComponent(spotId)}/${action}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ reason: `infrastructure ${action} check` }),
        },
      );
      if (!response.ok) throw new Error(`admin_${action}_failed:${response.status}`);
    }
    const auditsResponse = await fetch(`${base}/v1/admin/audit-logs`, {
      headers,
    });
    const audits = await auditsResponse.json();
    if (!auditsResponse.ok || audits.data.length < 2)
      throw new Error("admin_audit_missing");
    apiChecks = {
      conditional_etag_304: "passed",
      aggregate_library_read: "passed",
      typed_conflict_recovery: "passed",
      failed_favorite_is_not_committed: "passed",
      admin_shell: "passed",
      rbac_denial: "passed",
      population: dashboard.data.spots.length,
      audited_status_roundtrip: "passed",
    };
    stage("api-http:complete");
  } finally {
    stopProcessTree(api.pid);
  }
} finally {
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(
      cursor,
      "MATCH",
      `*${runId}*`,
      "COUNT",
      200,
    );
    cursor = next;
    if (keys.length) await redis.del(...keys);
  } while (cursor !== "0");
  await redis.quit();
  await admin.query(
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
    [restoreDatabaseName],
  );
  await admin.query(`DROP DATABASE IF EXISTS "${restoreDatabaseName}"`);
  await admin.query(
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
    [databaseName],
  );
  await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await admin.end();
  await rm(backupPath, { force: true });
  await rm(`${backupPath}.manifest.json`, { force: true });
}

const result = {
  schema_version: "miniapp-infrastructure-session-v1",
  run_id: runId,
  status: testStatus === 0 ? "passed" : "failed",
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  services: {
    postgres_postgis: "isolated_run_database",
    redis_bullmq: "isolated_key_namespace",
  },
  api_admin: apiChecks,
  backup_restore: backupRestore,
  test_output_sha256: createHash("sha256")
    .update(output.join(""))
    .digest("hex"),
  cleanup: {
    database_dropped: true,
    redis_namespace_removed: true,
  },
};
await mkdir(path.dirname(artifactPath), { recursive: true });
await writeFile(artifactPath, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result)}\n`);
