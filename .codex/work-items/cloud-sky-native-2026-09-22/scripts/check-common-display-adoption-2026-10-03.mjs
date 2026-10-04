/** Current adopted owners and affected consumers only; no browser/GPU. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
const root = process.cwd(), app = path.join(root, "apps/wechat-miniapp");
const relative = process.argv.find(value => value.startsWith("--output="))?.slice(9) ?? "output/pre-aid-common-display-development-1003-r1";
const output = path.resolve(root, relative);
assert(output.startsWith(path.join(root, "output") + path.sep)); assert(!fs.existsSync(output));
fs.mkdirSync(output, { recursive: true });
const require = createRequire(path.join(app, "package.json")), tsEntry = require.resolve("typescript");
const ts = require(tsEntry); assert.equal(ts.version, "5.9.3");
const sky = "apps/wechat-miniapp/src/features/sky/";
const dynamicReaderJoin = process.argv.includes("--dynamic-reader-join");
const affectedTests = ["sky-deep-auxiliary-model", "sky-deep-auxiliary-visibility", "sky-deep-auxiliary-page",
  "sky-gpu-artwork-contributions", "sky-artwork-level-composition", "sky-sdss-science-scene", "sky-sdss-science-registration",
  "sky-sdss-optical-scene", "sky-sdss-optical-page", "sky-optical-page-acceptance", "sky-sdss-optical-completion",
  "sky-artwork-public-retirement", "sky-deep-sky-region", "sky-gpu-textures", "sky-canvas-time"];
const dynamicReaderTests = ["sky-deep-auxiliary-page", "sky-sdss-optical-page", "sky-optical-page-acceptance",
  "sky-deep-sky-region", "sky-sdss-science-registration", "sky-canvas-time", "sky-sdss-optical-completion"];
const tests = (dynamicReaderJoin ? dynamicReaderTests : affectedTests).map(name => sky + name + ".test.ts");
const owners = ["sky-artwork-level-composition", "sky-gpu-artwork-contributions", "sky-gpu-renderer",
  "sky-sdss-science-scene", "sky-scene-render", "sky-deep-auxiliary-visibility"].map(name => sky + name + ".ts");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const bind = file => {
  const absolute = fs.realpathSync(path.resolve(root, file)), bytes = fs.readFileSync(absolute);
  return { path: path.relative(root, absolute).replaceAll("\\", "/"), bytes: bytes.length, sha256: sha(bytes) };
};
const save = (name, value) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const protectedFiles = JSON.parse(fs.readFileSync(path.join(root,
  ".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json"), "utf8"));
for (const row of protectedFiles) assert.equal(bind(row.path).sha256, row.sha256);
const configPath = path.join(app, "tsconfig.json");
const config = ts.parseJsonConfigFileContent(ts.readConfigFile(configPath, ts.sys.readFile).config, ts.sys, app);
const files = new Set([fileURLToPath(import.meta.url), process.execPath, "tools/run-node.cjs", configPath,
  "package.json", path.join(app, "package.json"), tsEntry, require.resolve("typescript/package.json"),
  require.resolve("tsx"), require.resolve("tsx/package.json"), require.resolve("twgl.js"), require.resolve("twgl.js/package.json"),
  ...protectedFiles.map(row => row.path)]);
const dynamicInputs = [sky + "spot-sky-page.tsx", sky + "use-sky-artwork.ts", sky + "use-sky-sdss-optical.ts",
  sky + "sky-sdss-science-registration.fixture.json", "packages/astronomy-core/data/opengc-messier-deep-sky.v1.json",
  "workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json",
  ".codex/work-items/cloud-sky-native-2026-09-22/tmp/current-native-report-2026-10-01.json"];
for (const file of dynamicInputs) files.add(file);
// Bind the project-owned static imports of the actual test/owner graph. Vendor
// entry identities are limited above, rather than inventing a full vendor audit.
const pending = [...tests, ...owners].map(file => path.resolve(root, file));
while (pending.length) {
  const file = pending.pop(); if (files.has(file)) continue; files.add(file);
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const resolved = ts.resolveModuleName(node.moduleSpecifier.text, file, config.options, ts.sys).resolvedModule?.resolvedFileName;
      if (resolved && !resolved.includes("node_modules") && (resolved.endsWith(".ts") || resolved.endsWith(".tsx"))) pending.push(resolved);
    }
    ts.forEachChild(node, visit);
  }; visit(source);
}
const publication = "output/sdss-science-optical-writer-1002-r1/publication/manifest.json";
files.add(publication);
if (dynamicReaderJoin) files.add("output/pre-aid-common-display-development-1003-r2/result.json");
const before = [...new Set([...files].map(file => path.resolve(root, file)))].sort().map(bind); save("inputs-before.json", before);
for (const file of [...owners, ...tests, ...dynamicInputs]) {
  const target = path.join(output, "sources", file); fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, file), target);
}
const run = (name, args) => new Promise(resolve => {
  const command = [process.execPath, path.join(root, "tools/run-node.cjs"), ...args];
  const child = spawn(command[0], command.slice(1), { cwd: app, env: { ...process.env,
    CLOUD_SKY_SCIENCE_PUBLICATION_PATH: path.join(root, path.dirname(publication)) }, windowsHide: true });
  let stdout = "", stderr = "";
  child.stdout.on("data", bytes => { stdout += bytes; }); child.stderr.on("data", bytes => { stderr += bytes; });
  child.on("error", error => { stderr += String(error); });
  child.on("close", exit => {
    const log = name + ".log"; fs.writeFileSync(path.join(output, log), stdout + stderr, { flag: "wx" });
    resolve({ name, command, cwd: app, exit, stdout, stderr, log: bind(path.join(output, log)) });
  });
});
const results = await Promise.all([
  run("affected-consumers", ["--import", "tsx", "--test", ...tests.map(file => path.relative(app, path.join(root, file)))]),
  ...(dynamicReaderJoin ? [] : [run("app-typecheck", ["./node_modules/typescript/lib/tsc.js", "--noEmit", "-p", "tsconfig.json"])]),
]);
const after = before.map(row => bind(row.path)); assert.deepEqual(after, before); save("inputs-after.json", after);
for (const row of protectedFiles) assert.equal(bind(row.path).sha256, row.sha256);
const passed = results.every(result => result.exit === 0);
save("result.json", { status: passed ? "BOUNDED_SHARED_ADOPTION_CHECKS_PASS" : "FAILED", typescript: ts.version,
  results, before, after, sources: owners.map(bind), tests: tests.map(bind), protectedFiles,
  dynamicInputs: dynamicInputs.map(bind), dynamicReaderJoin,
  scope: dynamicReaderJoin
    ? "Actual unchanged AST/Hook/JSON reader subset with explicit dynamic inputs bound before/after this execution only. Earlier R2 100 checks and complete App TS5.9.3 stay at their original139 bindings; no retrospective input-binding upgrade. Controlled React/native adapters, no GPU or App TS repeat."
    : "Actual adopted owners/affected tests and complete App TS 5.9.3. Controlled GL readbacks, React scheduling and native image objects are fixture boundaries; no browser/GPU rerun, physical registration/quality/threshold adoption, WXML/native/default/budget/200DAU acceptance." });
console.log(JSON.stringify({ passed, results: results.map(({ name, exit, log }) => ({ name, exit, log })), result: bind(path.join(output, "result.json")) }));
if (!passed) process.exitCode = 1;
