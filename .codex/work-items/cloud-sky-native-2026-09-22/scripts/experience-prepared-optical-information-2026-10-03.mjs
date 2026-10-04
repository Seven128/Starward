/** Exact optical information/manifest-link chain; no rendering or adoption. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const output = path.resolve(root, process.argv[2] ?? "output/prepared-optical-information-1003-r1");
assert.equal(path.relative(root, output).replaceAll("\\", "/").startsWith("output/prepared-optical-information-"), true);
await mkdir(output, { recursive: false });
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const bind = async file => { const b = await readFile(file); return { path: path.relative(root, file).replaceAll("\\", "/"), bytes: b.length, sha256: sha(b) }; };
const save = async (name, value) => writeFile(path.join(output, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const worker = path.join(root, "workers/miniapp-api"), app = path.join(root, "apps/wechat-miniapp");
const requireWorker = createRequire(path.join(worker, "package.json")), requireApp = createRequire(path.join(app, "package.json"));
for (const require of [requireWorker, requireApp]) assert.equal(require("typescript/package.json").version, "5.9.3");
const prepared = path.join(root, "output/prepared-optical-publication-1003-r4/publication"), science = path.join(root, "output/sdss-science-optical-writer-1002-r1/publication");
for (const [directory, pin] of [[prepared, "23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1"],
  [science, "3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5"]]) assert.equal(sha(await readFile(path.join(directory, "manifest.json"))), pin);
const protectedRows = JSON.parse(await readFile(path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json"), "utf8"));
const workerTests = ["prepared-optical-information.test.ts", "celestial-source-recovery.test.ts"];
const appTests = ["services/prepared-optical-information.test.ts", "services/celestial-information-response.test.ts", "services/celestial-optical-selection.test.ts",
  "sky/sources/source-partial-recovery.test.ts", "features/sky/sky-catalog-information-recovery.test.ts"];
const selected = ["workers/miniapp-api/src/prepared-optical-imagery.ts", "workers/miniapp-api/src/sdss-optical-imagery.ts", "workers/miniapp-api/src/celestial-object-information.ts",
  "workers/miniapp-api/src/miniapp-service.ts", "workers/miniapp-api/src/controller.ts", "workers/miniapp-api/src/deep-sky-imagery.ts",
  "workers/miniapp-api/src/etag.interceptor.ts", "workers/miniapp-api/src/api-exception.filter.ts", "workers/miniapp-api/src/celestial-object-aliases.ts",
  "workers/miniapp-api/src/deep-sky-scene-provider.ts", "workers/miniapp-api/src/test-fixtures/create-test-service.ts",
  "workers/miniapp-api/src/test-fixtures/prepared-optical-publication.ts", "workers/miniapp-api/src/test-fixtures/synthetic-optical-png.ts",
  "apps/wechat-miniapp/src/services/api-client.ts", "apps/wechat-miniapp/src/services/celestial-information-response.ts",
  "apps/wechat-miniapp/src/services/celestial-information-presentation.ts", "apps/wechat-miniapp/src/hooks/use-celestial-information.ts",
  "apps/wechat-miniapp/src/services/api-request-test-support.ts", "apps/wechat-miniapp/src/services/response-cache.ts",
  "apps/wechat-miniapp/src/services/cache-policy.ts", "apps/wechat-miniapp/src/services/request-lifecycle.ts",
  "apps/wechat-miniapp/src/sky/sources/index.tsx", "apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx",
  "packages/miniapp-contracts/src/prepared-optical-publication.ts", "packages/miniapp-contracts/src/sdss-science-optical-publication.ts",
  "packages/miniapp-contracts/src/optical-publication-content.ts", "packages/miniapp-contracts/src/index.ts", "tools/run-node.cjs",
  "workers/miniapp-api/package.json", "workers/miniapp-api/tsconfig.json", "apps/wechat-miniapp/package.json", "apps/wechat-miniapp/tsconfig.json",
  ...workerTests.map(file => `workers/miniapp-api/src/${file}`), ...appTests.map(file => `apps/wechat-miniapp/src/${file}`)];
const files = new Set([fileURLToPath(import.meta.url), process.execPath, ...selected.map(file => path.join(root, file)),
  path.join(prepared, "manifest.json"), path.join(science, "manifest.json"), ...protectedRows.map(row => path.join(root, row.path))]);
for (const require of [requireWorker, requireApp]) for (const file of ["typescript/package.json", "typescript/lib/typescript.js", "typescript/lib/tsc.js", "tsx/package.json"]) files.add(require.resolve(file));
const assets = path.join(worker, "assets/deep-sky");
for (const entry of await readdir(assets, { withFileTypes: true })) if (entry.isDirectory() && /^(?:sdss-)?m(?:51|82)(?:-|$)/iu.test(entry.name)) files.add(path.join(assets, entry.name, "manifest.json"));
const before = await Promise.all([...files].map(bind));
for (const row of protectedRows) assert.equal(before.find(item => item.path === row.path)?.sha256, row.sha256);
await save("inputs-before.json", before);
for (const file of selected) await writeFile(path.join(output, `executed-${file.replaceAll("/", "__")}.txt`), await readFile(path.join(root, file)), { flag: "wx" });
await writeFile(path.join(output, "executed-script.mjs"), await readFile(fileURLToPath(import.meta.url)), { flag: "wx" });
const tracePath = path.join(output, "actual-bff-source-trace.json"), env = { ...process.env, CLOUD_SKY_PREPARED_PUBLICATION_PATH: prepared,
  CLOUD_SKY_SCIENCE_PUBLICATION_PATH: science, CLOUD_SKY_PREPARED_SOURCE_TRACE_PATH: tracePath };
const run = async (name, cwd, args, actualEnv = env) => {
  const result = spawnSync(process.execPath, args, { cwd, env: actualEnv, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  await writeFile(path.join(output, `${name}.stdout.log`), result.stdout ?? "", { flag: "wx" });
  await writeFile(path.join(output, `${name}.stderr.log`), result.stderr ?? "", { flag: "wx" });
  return { args, exitCode: result.status, signal: result.signal, error: result.error ? String(result.error) : null,
    stdout: await bind(path.join(output, `${name}.stdout.log`)), stderr: await bind(path.join(output, `${name}.stderr.log`)) };
};
const workerChecks = await run("worker-affected", worker, ["--import", "tsx", "--test", ...workerTests.map(file => `src/${file}`)]);
let tracePresent = true; try { await access(tracePath); } catch { tracePresent = false; }
const appEnv = { ...env }; if (!tracePresent) delete appEnv.CLOUD_SKY_PREPARED_SOURCE_TRACE_PATH;
const appChecks = await run("app-affected", app, ["--import", "tsx", "--test", ...appTests.map(file => `src/${file}`)], appEnv);
const workerTypes = await run("worker-types", worker, [requireWorker.resolve("typescript/lib/tsc.js"), "--noEmit", "-p", "tsconfig.json"]);
const appTypes = await run("app-types", app, [requireApp.resolve("typescript/lib/tsc.js"), "--noEmit", "-p", "tsconfig.json"]);
const after = await Promise.all([...files].map(bind)); await save("inputs-after.json", after);
const exact = JSON.stringify(before) === JSON.stringify(after), checks = { workerChecks, appChecks, workerTypes, appTypes };
const passed = exact && tracePresent && Object.values(checks).every(check => check.exitCode === 0);
const result = { status: passed ? "PASSED_BOUNDED_PREPARED_INFORMATION_CHAIN" : "FAILED", checks, inputs: before.length, beforeAfterExact: exact,
  sourceTrace: tracePresent ? await bind(tracePath) : null, appUsesActualBffSourceTrace: tracePresent, node: process.version, typescript: "5.9.3",
  scope: "Actual pinned Prepared R4 metadata and original science/legacy/W3, loopback Nest/Fastify HTTP partial/conditional/recovery, selected client/response/manifest-link/source-page AST consumers, worker+App typechecks. Native UI/actual complete visible associated credit, PNG/GPU/ordinary adoption/full quality/resources/200DAU capacity remain unverified." };
await save("result.json", result);
console.log(JSON.stringify({ status: result.status, exitCodes: Object.fromEntries(Object.entries(checks).map(([name, check]) => [name, check.exitCode])),
  inputsExact: exact, sourceTrace: tracePresent, ...await bind(path.join(output, "result.json")) }));
process.exitCode = passed ? 0 : 1;
