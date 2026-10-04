import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const out = path.resolve(process.argv[2]);
assert.equal(path.dirname(out), path.join(root, "output"));
assert(path.basename(out).startsWith("prepared-footprint-registration-"));
await mkdir(out);
const sha = b => createHash("sha256").update(b).digest("hex");
const bind = async p => { const b = await readFile(path.resolve(root, p));
  return { path: p, bytes: b.length, sha256: sha(b) }; };
const save = (name, value) => writeFile(path.join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const require = createRequire(path.join(root, "apps/wechat-miniapp/package.json"));
assert.equal(require("typescript/package.json").version, "5.9.3");
const sky = "apps/wechat-miniapp/src/features/sky/";
const files = [fileURLToPath(import.meta.url), "tools/run-node.cjs", process.execPath,
  require.resolve("typescript/lib/tsc.js"), require.resolve("typescript/package.json"),
  ...["sky-prepared-optical-footprint.ts", "sky-prepared-optical-footprint.test.ts",
    "sky-prepared-optical-footprint.fixture.json", "sky-artwork-registration.ts",
    "sky-artwork-registration.test.ts", "sky-tan-optical-registration.ts",
    "sky-sdss-science-registration.test.ts", "sky-prepared-optical-registration.fixture.json",
    "sky-sdss-science-registration.fixture.json", "sky-target-optical-identity.ts",
    "sky-sdss-optical-frame.ts", "sky-observation-frame.ts", "sky-view-projection.ts"].map(p => sky + p),
  "packages/astronomy-core/src/observation-frame.ts", "packages/astronomy-core/src/astronomy-engine-runtime.ts",
  "packages/miniapp-contracts/src/prepared-optical-publication.ts",
  "output/prepared-optical-publication-1003-r4/publication/manifest.json",
  "output/prepared-footprint-display-1003-r1/result.json"];
const protectedRows = JSON.parse(await readFile(path.join(root,
  ".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json"), "utf8"));
files.push(...protectedRows.map(row => row.path));
const before = await Promise.all(files.map(bind));
for (const row of protectedRows) assert.equal(before.find(item => item.path === row.path)?.sha256, row.sha256);
await save("inputs-before.json", before);
await writeFile(path.join(out, "executed-driver.mjs"), await readFile(fileURLToPath(import.meta.url)), { flag: "wx" });
async function run(name, args, cwd) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", b => { stdout += b; }); child.stderr.on("data", b => { stderr += b; });
    child.on("error", reject); child.on("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
  await writeFile(path.join(out, name + ".stdout.log"), result.stdout, { flag: "wx" });
  await writeFile(path.join(out, name + ".stderr.log"), result.stderr, { flag: "wx" });
  return { name, exitCode: result.code, signal: result.signal,
    stdoutSha256: sha(result.stdout), stderrSha256: sha(result.stderr) };
}
const tests = await run("registration-tests", [path.join(root, "tools/run-node.cjs"), "--import", "tsx", "--test",
  ...["sky-prepared-optical-footprint.test.ts", "sky-artwork-registration.test.ts",
    "sky-sdss-science-registration.test.ts"].map(p => path.join(root, sky, p))], root);
const types = await run("app-ts-5.9.3", [path.join(root, "tools/run-node.cjs"),
  require.resolve("typescript/lib/tsc.js"), "--noEmit", "-p", "tsconfig.json"], path.join(root, "apps/wechat-miniapp"));
const after = await Promise.all(files.map(bind)); await save("inputs-after.json", after);
const exact = JSON.stringify(before) === JSON.stringify(after);
const result = { status: tests.exitCode === 0 && types.exitCode === 0 && exact ? "PASSED_BOUND_GEOMETRY_DEVELOPMENT" : "FAILED",
  checks: [tests, types], beforeAfterExact: exact, selectedInputs: before.length,
  scope: "Current shared nominal source/mother registration and portable prior WCS fixtures, real Astronomy Engine report rotations plus admitted finite nonorthogonality. Selected-source identities only, not a complete executed module trace. No RGB/alpha/source/publication changes, original image decode/reprojection, display transfer/default policy adoption, Scene/GPU/native/physical accuracy or quality/capacity acceptance." };
await save("result.json", result); console.log(JSON.stringify({ ...result, result: await bind(path.relative(root, path.join(out, "result.json"))) }));
process.exitCode = result.status === "FAILED" ? 1 : 0;
