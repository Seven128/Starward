// Complete affected Hook/frame/TAN checks with actual pinned publications.
// React/query/native callbacks remain controlled; no rendered/native claim.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
assert.equal(typeof process.argv[2], "string");
const output = path.resolve(process.argv[2]), relative = path.relative(path.join(root, "output"), output);
assert(relative && !path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
await mkdir(output);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const save = (name, value) => writeFile(path.join(output, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const bind = async file => { const bytes = await readFile(file); return { path: path.relative(root, file).replaceAll("\\", "/"), bytes: bytes.length, sha256: sha(bytes) }; };
const app = path.join(root, "apps/wechat-miniapp"), requireApp = createRequire(path.join(app, "package.json"));
assert.equal(requireApp("typescript/package.json").version, "5.9.3");
const science = "output/sdss-science-optical-writer-1002-r1/publication", prepared = "output/prepared-optical-publication-1003-r4/publication";
const expected = [
  [science, "3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5"],
  [prepared, "23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1"],
];
const protectedRows = JSON.parse(await readFile(path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json"), "utf8"));
const tests = ["use-sky-sdss-optical.test.ts", "use-sky-sdss-science-optical.test.ts", "sky-sdss-optical-frame.test.ts",
  "sky-sdss-science-registration.test.ts", "sky-deep-auxiliary-page.test.ts", "stellar-page-recovery.test.ts",
  "sky-sdss-optical-scene.test.ts", "sky-sdss-science-scene.test.ts"];
const featureSources = ["use-sky-target-optical.ts", "use-sky-sdss-optical.ts", "use-sky-prepared-optical.ts",
  "sky-sdss-optical-selection.ts", "sky-sdss-optical-frame.ts", "sky-tan-optical-registration.ts", "sky-sdss-science-registration.ts",
  "sky-sdss-science-registration.fixture.json", "sky-prepared-optical-registration.fixture.json",
  "sky-artwork-loader.ts", "use-sky-artwork.ts", "sky-artwork-request.ts", "sky-scene-render.ts",
  "sky-artwork-level-composition.ts", "sky-sdss-science-scene.ts", "spot-sky-page.tsx", "sky-fixed-image-status.ts",
  ...tests];
const commonSources = ["apps/wechat-miniapp/src/services/sky-publication-resource.ts", "apps/wechat-miniapp/src/services/prepared-optical-client.ts",
  "apps/wechat-miniapp/src/services/prepared-optical-resource.ts", "apps/wechat-miniapp/src/services/sdss-science-optical-resource.ts",
  "packages/miniapp-contracts/src/prepared-optical-publication.ts", "packages/miniapp-contracts/src/sdss-science-optical-publication.ts",
  "packages/miniapp-contracts/src/optical-publication-content.ts", "packages/miniapp-contracts/src/index.ts",
  "apps/wechat-miniapp/package.json", "apps/wechat-miniapp/tsconfig.json", "tools/run-node.cjs",
  ".codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-prepared-optical-wcs-fixture-2026-10-03.py"];
const sources = new Set([fileURLToPath(import.meta.url), requireApp.resolve("typescript/package.json"),
  requireApp.resolve("typescript/lib/typescript.js"), requireApp.resolve("typescript/lib/tsc.js"),
  ...featureSources.map(file => path.join(app, "src/features/sky", file)),
  ...commonSources.map(file => path.join(root, file)), ...protectedRows.map(row => path.join(root, row.path))]);
for (const [directory, pin] of expected) {
  const file = path.join(root, directory, "manifest.json"), bytes = await readFile(file); assert.equal(sha(bytes), pin);
  sources.add(file); for (const asset of Object.values(JSON.parse(bytes).levels)) sources.add(path.join(root, directory, asset.file));
}
const before = await Promise.all([...sources].map(bind));
for (const row of protectedRows) assert.equal(before.find(item => item.path === row.path)?.sha256, row.sha256);
await save("inputs-before.json", before);
for (const file of featureSources) await writeFile(path.join(output, `executed-${file}.txt`), await readFile(path.join(app, "src/features/sky", file)), { flag: "wx" });
await writeFile(path.join(output, "executed-script.mjs"), await readFile(fileURLToPath(import.meta.url)), { flag: "wx" });
const env = { ...process.env, CLOUD_SKY_SCIENCE_PUBLICATION_PATH: path.join(root, science), CLOUD_SKY_PREPARED_PUBLICATION_PATH: path.join(root, prepared) };
const run = async (name, args) => {
  const result = spawnSync(process.execPath, args, { cwd: app, env, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  await writeFile(path.join(output, `${name}.stdout.log`), result.stdout ?? "", { flag: "wx" });
  await writeFile(path.join(output, `${name}.stderr.log`), result.stderr ?? "", { flag: "wx" });
  return { args, exitCode: result.status, signal: result.signal, error: result.error ? String(result.error) : null,
    stdout: await bind(path.join(output, `${name}.stdout.log`)), stderr: await bind(path.join(output, `${name}.stderr.log`)) };
};
const checks = await run("affected-tests", ["--import", "tsx", "--test", ...tests.map(file => `src/features/sky/${file}`)]);
const types = await run("app-types", [requireApp.resolve("typescript/lib/tsc.js"), "--noEmit", "-p", "tsconfig.json"]);
const after = await Promise.all([...sources].map(bind)); await save("inputs-after.json", after);
const inputsExact = JSON.stringify(before) === JSON.stringify(after);
const passed = inputsExact && checks.exitCode === 0 && types.exitCode === 0;
const result = { status: passed ? "PASSED_BOUNDED_PREPARED_HOOK_FRAME_TAN_DEVELOPMENT" : "FAILED", checks, types,
  boundInputs: before.length, beforeAfterExact: inputsExact, node: process.version, typescript: "5.9.3",
  realSourceDecodesOrReprojections: 0,
  scope: "Actual pinned Prepared R4/science writer input and complete affected owners with controlled React/query/loader callbacks, independent Astropy nominal TAN geometry and full App typecheck. No target WEAPP/native/GPU/rendered Prepared Scene, visible full credit, source physical precision, default adoption, final quality or capacity acceptance." };
await save("result.json", result);
console.log(JSON.stringify({ status: result.status, testsExit: checks.exitCode, typesExit: types.exitCode, inputsExact, ...await bind(path.join(output, "result.json")) }));
process.exitCode = passed ? 0 : 1;
