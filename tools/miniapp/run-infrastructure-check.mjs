import { createHash, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import Redis from "ioredis";
import pg from "pg";
import { createBackup, restoreBackup } from "./backup-restore.mjs";
import { dockerComposeInvocation } from "./docker-compose-runtime.mjs";
import { connectResourceWithRetry } from "./infrastructure-readiness.mjs";

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
const mediaStorageRoot = path.join(
  root,
  "tmp",
  "miniapp-infrastructure-media",
  runId,
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
const composeUp = dockerComposeInvocation([
  "-f",
  composePath,
  "up",
  "-d",
  "--wait",
]);
run(composeUp.command, composeUp.args);
stage("compose:ready");
const admin = await connectResourceWithRetry({
  label: "infrastructure_postgres",
  create: () => new Client({ connectionString: adminUrl, connectionTimeoutMillis: 2_000 }),
  connect: async (client) => {
    await client.connect();
    await client.query("SELECT 1");
  },
  close: async (client) => client.end(),
});
let redis;
try {
  redis = await connectResourceWithRetry({
    label: "infrastructure_redis",
    create: () => {
      const client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2_000,
        connectionName: `starward-${runId}-cleanup`,
      });
      client.on("error", () => {});
      return client;
    },
    connect: async (client) => {
      await client.connect();
      await client.ping();
    },
    close: async (client) => {
      client.disconnect();
    },
  });
} catch (error) {
  await admin.end().catch(() => {});
  throw error;
}
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
        MINIAPP_MEDIA_STORAGE_MODE: "LOCAL_FILESYSTEM",
        MINIAPP_MEDIA_STORAGE_ROOT: mediaStorageRoot,
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
        MINIAPP_AUTH_MODE: "LOCAL_TEST",
        MINIAPP_RELEASE_PROFILE: "LOCAL",
        MINIAPP_MEDIA_STORAGE_MODE: "LOCAL_FILESYSTEM",
        MINIAPP_MEDIA_STORAGE_ROOT: mediaStorageRoot,
        MINIAPP_SESSION_SECRET:
          "infrastructure-check-session-secret-current",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  api.stdout.on("data", (chunk) => output.push(String(chunk)));
  api.stderr.on("data", (chunk) => output.push(String(chunk)));
  try {
    const base = `http://127.0.0.1:${apiPort}`;
    await waitForUrl(`${base}/v2/capabilities`);
    stage("api-http:start");
    const capabilityResponse = await fetch(`${base}/v2/capabilities`);
    const capabilityEtag = capabilityResponse.headers.get("etag");
    if (!capabilityResponse.ok || !capabilityEtag)
      throw new Error("conditional_read_initial_response_invalid");
    const notModified = await fetch(`${base}/v2/capabilities`, {
      headers: { "if-none-match": capabilityEtag },
    });
    if (notModified.status !== 304)
      throw new Error(`conditional_read_failed:${notModified.status}`);
    const loginResponse = await fetch(`${base}/v2/auth/wechat/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: `local:infrastructure-http-${runId}` }),
    });
    const login = await loginResponse.json();
    if (!loginResponse.ok || !login.data?.accessToken)
      throw new Error("local_http_identity_failed");
    const identityHeaders = {
      authorization: `Bearer ${login.data.accessToken}`,
    };
    const libraryResponse = await fetch(`${base}/v2/me/library`, {
      headers: identityHeaders,
    });
    const library = await libraryResponse.json();
    if (!libraryResponse.ok || !library.data.preferences)
      throw new Error("library_aggregate_invalid");
    const preferencesResponse = await fetch(`${base}/v2/me/preferences`, {
      method: "PUT",
      headers: {
        ...identityHeaders,
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
    const conflictResponse = await fetch(`${base}/v2/me/preferences`, {
      method: "PUT",
      headers: {
        ...identityHeaders,
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
      `${base}/v2/me/favorites/FORMAL_SPOT/${encodeURIComponent("spot:not-real")}`,
      {
        method: "PUT",
        headers: {
          ...identityHeaders,
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
      await fetch(`${base}/v2/me/library`, { headers: identityHeaders })
    ).json();
    if (
      libraryAfterRejectedFavorite.data.favoriteSpots.some(
        (spot) => spot.spotId === "spot:not-real",
      )
    )
      throw new Error("favorite_failure_was_committed");
    const adminShell = await fetch(`${base}/admin`);
    if (adminShell.status !== 404)
      throw new Error(`admin_web_surface_still_exposed:${adminShell.status}`);
    const unauthorized = await fetch(`${base}/v2/admin/dashboard`);
    if (unauthorized.status !== 403)
      throw new Error(`admin_rbac_fail_open:${unauthorized.status}`);
    const headers = {
      "content-type": "application/json",
      "x-admin-token": adminToken,
      "x-admin-actor": "admin:infrastructure-check",
    };
    const dashboardResponse = await fetch(`${base}/v2/admin/dashboard`, {
      headers,
    });
    const dashboard = await dashboardResponse.json();
    if (!dashboardResponse.ok || dashboard.data.spots.length < 1)
      throw new Error("admin_dashboard_population_invalid");
    const statusRoundtripSpot = dashboard.data.spots.find(
      (spot) =>
        spot.status === "PUBLISHED" &&
        spot.publication_assessment?.complete === true,
    );
    if (!statusRoundtripSpot)
      throw new Error("admin_status_roundtrip_spot_missing");
    const spotId = statusRoundtripSpot.spot_id;
    const currentRevision = Number(statusRoundtripSpot.version);
    if (!Number.isInteger(currentRevision) || currentRevision < 1)
      throw new Error("admin_status_roundtrip_revision_invalid");
    const lifecycleHeaders = (operation) => ({
      ...headers,
      "idempotency-key": `infrastructure-${operation}-${runId}`,
    });
    const suspendResponse = await fetch(
      `${base}/v2/admin/spots/${encodeURIComponent(spotId)}/suspend`,
      {
        method: "POST",
        headers: lifecycleHeaders("suspend"),
        body: JSON.stringify({
          reason: "infrastructure suspend check",
          expectedRevision: currentRevision,
        }),
      },
    );
    if (!suspendResponse.ok)
      throw new Error(
        `admin_suspend_failed:${suspendResponse.status}:${await suspendResponse.text()}`,
      );
    const suspendedDashboard = await (
      await fetch(`${base}/v2/admin/dashboard`, { headers })
    ).json();
    const suspendedSpot = suspendedDashboard.data.spots.find(
      (spot) => spot.spot_id === spotId,
    );
    if (!suspendedSpot || suspendedSpot.status !== "TEMPORARILY_CLOSED")
      throw new Error("admin_suspend_readback_failed");
    const assessmentResponse = await fetch(
      `${base}/v2/admin/spots/${encodeURIComponent(spotId)}/publication-assessments`,
      {
        method: "POST",
        headers: lifecycleHeaders("assessment"),
        body: JSON.stringify({
          reason: "infrastructure republish assessment check",
          expectedRevision: suspendedSpot.version,
        }),
      },
    );
    const assessmentEnvelope = await assessmentResponse.json();
    if (!assessmentResponse.ok)
      throw new Error(
        `admin_assessment_failed:${assessmentResponse.status}:${JSON.stringify(assessmentEnvelope)}`,
      );
    const assessmentDigest =
      assessmentEnvelope.data?.assessmentDigest ??
      assessmentEnvelope.data?.readback?.assessmentDigest ??
      assessmentEnvelope.data?.result?.assessmentDigest;
    if (!assessmentDigest) throw new Error("admin_assessment_digest_missing");
    const publishResponse = await fetch(
      `${base}/v2/admin/spots/${encodeURIComponent(spotId)}/publish`,
      {
        method: "POST",
        headers: lifecycleHeaders("publish"),
        body: JSON.stringify({
          reason: "infrastructure publish check",
          expectedRevision: suspendedSpot.version,
          assessmentDigest,
        }),
      },
    );
    if (!publishResponse.ok)
      throw new Error(`admin_publish_failed:${publishResponse.status}`);
    const auditsResponse = await fetch(`${base}/v2/admin/audit-logs`, {
      headers,
    });
    const audits = await auditsResponse.json();
    if (!auditsResponse.ok || audits.data.length < 2)
      throw new Error("admin_audit_missing");
    apiChecks = {
      conditional_etag_304: "passed",
      isolated_local_identity: "passed",
      aggregate_library_read: "passed",
      typed_conflict_recovery: "passed",
      failed_favorite_is_not_committed: "passed",
      no_admin_web_surface: "passed",
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
  await rm(mediaStorageRoot, { recursive: true, force: true });
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
