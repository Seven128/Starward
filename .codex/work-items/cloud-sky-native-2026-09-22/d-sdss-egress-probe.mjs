import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const work = path.dirname(fileURLToPath(import.meta.url));
const suffix = Date.now().toString(36);
const network = `starward-sdss-egress-${suffix}`;
const api = `${network}-api`;
const edge = `${network}-edge`;
const privateProbe = "SDSS_EGRESS_PRIVATE_QUERY_SENTINEL";
const caddyImage = "caddy@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648";
const apiImage = "starward-miniapp-api:cloudsky-sdss-local-20260925";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");

function docker(args, { allowFailure = false } = {}) {
  const result = spawnSync("docker", args, { cwd: root, encoding: "utf8", timeout: 60_000,
    maxBuffer: 1024 * 1024 });
  if (!allowFailure && (result.error || result.status !== 0))
    throw new Error(`docker ${args[0]} failed: ${result.error?.message ?? result.stderr.trim()}`);
  return result.stdout.trim();
}

async function ready(base) {
  for (let attempt = 0; attempt < 30; attempt++) {
    try { if ((await fetch(`${base}/health/ready`)).ok) return; } catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error("isolated edge/API did not become ready");
}

let createdNetwork = false, startedApi = false, startedEdge = false;
try {
  docker(["network", "create", network]); createdNetwork = true;
  docker(["run", "-d", "--rm", "--name", api, "--network", network, "--network-alias", "api",
    "--memory", "512m", "--memory-swap", "512m", "-e", "MINIAPP_RELEASE_PROFILE=LOCAL",
    "-e", "MINIAPP_STORAGE_MODE=MEMORY_TEST", "-e", "MINIAPP_ACCEPTANCE_MODE=1", apiImage]);
  startedApi = true;
  docker(["run", "-d", "--rm", "--name", edge, "--network", network,
    "--memory", "128m", "--memory-swap", "128m", "-p", "127.0.0.1::8080",
    "--mount", `type=bind,source=${path.join(work, "d-sdss-egress-probe.caddy")},target=/etc/caddy/Caddyfile,readonly`,
    "--mount", `type=bind,source=${path.join(root, "infrastructure/deployment/sky-resource-logging.caddy")},target=/etc/caddy/sky-resource-logging.caddy,readonly`,
    caddyImage, "caddy", "run", "--config", "/etc/caddy/Caddyfile"]);
  startedEdge = true;
  const port = Number(docker(["port", edge, "8080/tcp"]).match(/:(\d+)$/u)?.[1]);
  assert.ok(Number.isInteger(port) && port > 0);
  const base = `http://127.0.0.1:${port}`;
  await ready(base);

  const cases = [];
  async function read(url, status, category, expectedBytes, expectedSha) {
    const response = await fetch(`${base}${url}`, { headers: {
      "X-Private-Probe": privateProbe, "Accept-Encoding": "identity" } });
    assert.equal(response.status, status, url);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (expectedBytes !== undefined) assert.equal(bytes.length, expectedBytes, url);
    if (expectedSha) assert.equal(sha(bytes), expectedSha, url);
    cases.push({ status, category, bytes: bytes.length });
    return response.headers.get("content-type")?.includes("json") ? JSON.parse(bytes.toString()) : null;
  }

  const current = await read(`/v2/sky/sdss-optical/manifest?private=${privateProbe}`, 200, "optical_published");
  assert.match(current.publicationHash, /^[a-f0-9]{64}$/u);
  const hash = current.publicationHash;
  const fixed = await read(`/v2/sky/sdss-optical/${hash}/manifest`, 200, "optical_published");
  assert.equal(fixed.publicationHash, hash);
  for (const level of ["OVERVIEW", "MEDIUM", "DETAIL"]) {
    const asset = fixed.levels[level];
    await read(asset.downloadUrl, 200, "optical_published", asset.bytes, asset.sha256);
  }
  await read(`/v2/sky/sdss-optical/${"0".repeat(64)}/M-51-detail.jpg`, 404, "optical_published");
  await read("/v2/sky/optical/manifest", 404, "optical_trial");
  await read("/health/live", 200, null);

  let access = [];
  for (let attempt = 0; attempt < 10; attempt++) {
    const raw = docker(["logs", edge]);
    assert.ok(!raw.includes(privateProbe), "request/query content entered edge logs");
    access = raw.split(/\r?\n/u).filter(Boolean).flatMap(line => {
      try { const value = JSON.parse(line); return value.logger === "http.log.access.log0" ? [value] : []; }
      catch { return []; }
    }).slice(-cases.length);
    if (access.length === cases.length) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(access.length, cases.length);
  for (const [index, item] of cases.entries()) {
    const log = access[index];
    assert.equal(log.status, item.status);
    assert.equal(log.sky_resource_class ?? null, item.category);
    assert.equal(log.size, item.bytes, "identity transfer must match emitted response body");
    assert.ok(!("request" in log) && !("resp_headers" in log) && !("uri" in log) && !("url" in log));
  }
  process.stdout.write(JSON.stringify({ image: apiImage, classified: cases, totalPublishedImageBytes:
    cases.slice(2, 5).reduce((sum, item) => sum + item.bytes, 0),
    edgeRequestDataFiltered: true, localOnly: true }, null, 2) + "\n");
} finally {
  if (startedEdge) docker(["stop", edge], { allowFailure: true });
  if (startedApi) docker(["stop", api], { allowFailure: true });
  if (createdNetwork) docker(["network", "rm", network], { allowFailure: true });
}
