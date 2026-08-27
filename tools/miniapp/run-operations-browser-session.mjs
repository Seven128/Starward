import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import Redis from "ioredis";
import pg from "pg";
import { dockerComposeInvocation } from "./docker-compose-runtime.mjs";
import { prepareOperationsRecords } from "./operations-browser-data.mjs";

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const composePath = path.join(root, "infra", "miniapp", "docker-compose.yml");
const runId = `operations_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
const databaseName = `starward_${runId}`;
if (!/^starward_operations_[a-f0-9]{16}$/u.test(databaseName))
  throw new Error("unsafe_operations_database_name");

const adminUrl =
  "postgresql://starward_miniapp:local_demo_only@127.0.0.1:55432/starward_miniapp";
const databaseUrl =
  `postgresql://starward_miniapp:local_demo_only@127.0.0.1:55432/${databaseName}`;
const redisUrl = "redis://127.0.0.1:56379";
const cachePrefix = `starward:miniapp:${runId}:`;
const queueName = `starward-miniapp-${runId}`;
const mediaStorageRoot = path.join(root, "tmp", "operations-browser-media", runId);
const stateRoot = path.join(root, "tmp", "operations-browser-session", runId);
const statePath = path.join(stateRoot, "session.json");
const actor = "admin:operations-acceptance";
const adminToken = randomUUID();
const children = [];
let admin;
let redis;
let shuttingDown = false;

function stage(name, detail = {}) {
  process.stdout.write(`${JSON.stringify({ runner: "operations-browser", stage: name, ...detail })}\n`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
    ...options,
  });
  if (result.status !== 0)
    throw new Error(`${path.basename(command)}_failed:${result.status}`);
  return result;
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("port_unavailable");
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

async function waitForUrl(url, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`url_start_timeout:${url}`);
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

async function cleanup() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children.reverse()) stopProcessTree(child.pid);
  if (redis) {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${cachePrefix}*`,
        "COUNT",
        200,
      );
      cursor = next;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== "0");
    await redis.quit();
  }
  if (admin) {
    await admin.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [databaseName],
    );
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await admin.end();
  }
  await rm(stateRoot, { recursive: true, force: true });
  await rm(mediaStorageRoot, { recursive: true, force: true });
  stage("cleaned", { database_dropped: true, redis_namespace_removed: true });
}

process.once("SIGINT", () => void cleanup().finally(() => process.exit(0)));
process.once("SIGTERM", () => void cleanup().finally(() => process.exit(0)));

try {
  const compose = dockerComposeInvocation(["-f", composePath, "up", "-d", "--wait"]);
  run(compose.command, compose.args);
  admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectionName: `starward-${runId}`,
  });
  await redis.connect();

  const runtimeEnvironment = {
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
    MINIAPP_ADMIN_TOKEN: adminToken,
    MINIAPP_ADMIN_RBAC: JSON.stringify({ [actor]: ["OWNER"] }),
    MINIAPP_AUTH_MODE: "LOCAL_TEST",
    MINIAPP_RELEASE_PROFILE: "LOCAL",
    MINIAPP_SESSION_SECRET: `operations-${runId}-session-secret`,
  };
  const npmCli = path.join(
    path.dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js",
  );
  stage("prepare-production-records");
  run(
    process.execPath,
    [npmCli, "run", "test:integration", "--workspace", "@starward/miniapp-api"],
    { env: runtimeEnvironment },
  );

  const apiPort = await freePort();
  const webPort = await freePort();
  const api = spawn(process.execPath, ["--import", "tsx", "src/main.ts"], {
    cwd: path.join(root, "workers", "miniapp-api"),
    env: { ...runtimeEnvironment, MINIAPP_API_PORT: String(apiPort) },
    stdio: ["ignore", "ignore", "ignore"],
    windowsHide: true,
  });
  children.push(api);
  const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
  await waitForUrl(`${apiBaseUrl}/v2/capabilities`);
  await prepareOperationsRecords({
    apiBaseUrl,
    root,
    runId,
    adminToken,
    actor,
  });

  const web = spawn(
    process.execPath,
    [
      npmCli,
      "run",
      "start:acceptance",
      "--workspace",
      "@starward/admin-web",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      String(webPort),
    ],
    {
      cwd: root,
      env: { ...process.env, STARWARD_API_BASE_URL: apiBaseUrl },
      stdio: ["ignore", "ignore", "ignore"],
      windowsHide: true,
    },
  );
  children.push(web);
  const webUrl = `http://127.0.0.1:${webPort}/`;
  await waitForUrl(webUrl);
  await mkdir(stateRoot, { recursive: true });
  await writeFile(
    statePath,
    `${JSON.stringify({ runId, webUrl, apiBaseUrl, actor, adminToken }, null, 2)}\n`,
    { flag: "wx" },
  );
  stage("ready", { webUrl, statePath, fixture_mode: false, memory_test_mode: false });
  await new Promise(() => {});
} finally {
  await cleanup();
}
