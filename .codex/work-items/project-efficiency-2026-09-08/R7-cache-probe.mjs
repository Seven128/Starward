// Local layer-cache proof. Source and lock bytes are restored with an ownership check.
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
const root = new URL("../../../", import.meta.url);
const hash = value => createHash("sha256").update(value).digest("hex");
const results = [];
async function run(name, file, transform, extra) {
  const location = new URL(file, root);
  const original = await readFile(location);
  const changed = Buffer.from(transform(original.toString("utf8")));
  const started = performance.now();
  let log = "", code;
  await writeFile(location, changed);
  try {
    code = await new Promise((resolve, reject) => {
      const child = spawn("docker", ["build", "--progress", "plain", "--file", "infrastructure/deployment/miniapp-api.Dockerfile", ...extra, "."], {
        cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
      });
      const collect = chunk => { log += chunk.toString(); };
      child.stdout.on("data", collect); child.stderr.on("data", collect);
      child.once("error", reject); child.once("close", resolve);
    });
  } finally {
    if (hash(await readFile(location)) !== hash(changed)) throw new Error("probe_input_changed_concurrently_do_not_overwrite");
    await writeFile(location, original);
    await writeFile(new URL(`R7-${name}.log`, import.meta.url), log);
  }
  const installs = [...log.matchAll(/^#(\d+) \[([^\]]+)\] RUN .*npm ci[^\r\n]*/gmu)].map(match => ({
    stage: match[2], cached: log.includes(`#${match[1]} CACHED`),
  }));
  results.push({ name, file, originalSha256: hash(original), restored: hash(await readFile(location)) === hash(original),
    code, durationMs: Math.round(performance.now() - started), installs });
  if (code !== 0) throw new Error(`${name}_build_failed`);
  if (!installs.length || installs.some(item => item.cached !== (name === "source-cache-probe"))) throw new Error(`${name}_unexpected_install_cache_state`);
  console.log(JSON.stringify(results.at(-1)));
}
try {
  await run("source-cache-probe", "workers/miniapp-api/src/provider-deadline.ts", text => text + "\n// Task-only BuildKit source-layer probe.\n", ["--tag", "starward-miniapp-api-efficiency:source-cache-probe"]);
  await run("lock-cache-probe", "package-lock.json", text => JSON.stringify({ ...JSON.parse(text), xStarwardCacheProbe: true }, null, 2) + "\n", ["--target", "production-dependencies", "--tag", "starward-miniapp-api-efficiency:lock-cache-probe"]);
} catch (error) {
  results.push({ error: error.message }); process.exitCode = 1;
} finally {
  await writeFile(new URL("R7-cache-probe.json", import.meta.url), JSON.stringify(results, null, 2) + "\n");
}
