// Isolated LOCAL-profile smoke only. No provider calls, credentials or deployment.
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const folder = new URL("./", import.meta.url);
const image = "starward-miniapp-api-efficiency:local";
const network = "starward-efficiency-20260908";
const suffix = process.argv.includes("--final-tag") ? "-final" : "";
const api = "starward-efficiency-20260908-api" + suffix;
const fixtures = ["starward-efficiency-20260908-pg", "starward-efficiency-20260908-redis"];
const docker = (args, timeout = 60_000) => execFileSync("docker", args, {
  encoding: "utf8", timeout, windowsHide: true, maxBuffer: 1024 * 1024, stdio: ["ignore", "pipe", "pipe"],
}).trim();
const evidence = { image, network, api, profile: "LOCAL", verifiedAt: new Date().toISOString() };
const env = {
  MINIAPP_RELEASE_PROFILE: "LOCAL", MINIAPP_STORAGE_MODE: "POSTGRES", MINIAPP_AUTH_MODE: "LOCAL_TEST",
  MINIAPP_MEDIA_STORAGE_MODE: "DISABLED", MINIAPP_ROUTE_PROVIDER: "DISABLED", MINIAPP_PLACE_SEARCH_PROVIDER: "DISABLED",
  DATABASE_URL: "postgresql://starward_efficiency@postgres:5432/starward_efficiency",
  REDIS_URL: "redis://redis:6379", MINIAPP_CACHE_PREFIX: "starward:efficiency:image:",
  MINIAPP_QUEUE_NAME: "starward-efficiency-image",
};
const common = ["--network", network, "--cpus", "2", "--memory", "512m", "--pids-limit", "128",
  ...Object.entries(env).flatMap(([key, value]) => ["--env", `${key}=${value}`])];
let owned = false;
try {
  docker(["network", "inspect", network, "--format", "{{.Name}}"]);
  const existing = docker(["ps", "-a", "--format", "{{.Names}}"]);
  if (existing.split(/\r?\n/u).includes(api)) throw new Error("owned_api_name_already_present_inspect_before_reuse");
  for (const fixture of fixtures) {
    if (!existing.split(/\r?\n/u).includes(fixture)) throw new Error("required_task_fixture_missing");
    docker(["start", fixture]);
  }
  const fixtureDeadline = Date.now() + 45_000;
  let fixtureReady = false;
  while (Date.now() < fixtureDeadline) {
    try {
      docker(["exec", fixtures[0], "pg_isready", "-U", "starward_efficiency", "-d", "starward_efficiency"]);
      if (docker(["exec", fixtures[1], "redis-cli", "ping"]) === "PONG") { fixtureReady = true; break; }
    } catch {}
    await delay(250);
  }
  if (!fixtureReady) throw new Error("task_fixtures_not_ready");
  evidence.imageIdentity = JSON.parse(docker(["image", "inspect", image, "--format", "{{json .Id}}"]));
  evidence.imageBytes = Number(docker(["image", "inspect", image, "--format", "{{.Size}}"]));
  evidence.migration = JSON.parse(docker(["run", "--rm", ...common, image, "node", "--conditions=production", "workers/miniapp-api/dist/migrate.js"]));
  evidence.workerOnce = JSON.parse(docker(["run", "--rm", ...common, image, "node", "--conditions=production", "workers/miniapp-api/dist/worker.js", "--once"]));
  docker(["run", "-d", "--name", api, "--label", "starward.task=project-efficiency-2026-09-08",
    ...common, "--publish", "127.0.0.1::8787", image]);
  owned = true;
  const binding = docker(["port", api, "8787/tcp"]);
  if (!/^127\.0\.0\.1:\d+$/u.test(binding)) throw new Error("unexpected_api_port_binding");
  const base = `http://${binding}`;
  const until = Date.now() + 45_000;
  while (Date.now() < until) {
    try {
      const response = await fetch(`${base}/health/ready`, { signal: AbortSignal.timeout(2000) });
      const body = await response.json();
      if (response.ok && body.status === "ready" && body.ready === true) { evidence.readiness = body; break; }
    } catch {}
    await delay(250);
  }
  if (!evidence.readiness) throw new Error("image_readiness_not_reached");
  const capabilities = await fetch(`${base}/v2/capabilities`, { signal: AbortSignal.timeout(5000) });
  if (!capabilities.ok) throw new Error("image_capabilities_failed");
  const body = await capabilities.json();
  evidence.capabilities = { status: capabilities.status, apiVersion: body.apiVersion, dataState: body.dataState };
  evidence.status = "passed";
} catch (error) {
  evidence.status = "failed";
  evidence.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  if (owned) {
    await writeFile(new URL(`R7-image-runtime${suffix}.log`, folder), docker(["logs", api]));
    docker(["stop", "--time", "10", api]);
    // Keep this stopped named container for attributable inspection; root
    // coordinates final cleanup of it and the pre-existing task fixtures.
    evidence.runtimeStopped = true;
  }
  await writeFile(new URL(`R7-image-smoke${suffix}.json`, folder), JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify(evidence));
}
