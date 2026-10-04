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
assert(path.basename(out).startsWith("optical-source-credit-"));
await mkdir(out);
const sha = b => createHash("sha256").update(b).digest("hex");
const bind = async p => { const b = await readFile(path.resolve(root, p));
  return { path: p, bytes: b.length, sha256: sha(b) }; };
const save = (name, value) => writeFile(path.join(out, name), JSON.stringify(value, null, 2)+"\n", { flag: "wx" });
const require = createRequire(path.join(root, "apps/wechat-miniapp/package.json"));
assert.equal(require("typescript/package.json").version, "5.9.3");
const sky = "apps/wechat-miniapp/src/features/sky/";
const service = "apps/wechat-miniapp/src/services/";
const files = [fileURLToPath(import.meta.url), "tools/run-node.cjs", process.execPath,
  require.resolve("typescript/lib/tsc.js"), require.resolve("typescript/package.json"),
  ...["sky-optical-source-credit.ts", "sky-optical-source-credit.test.ts", "sky-optical-image-credit.tsx",
    "spot-sky-page.tsx", "spot-sky-page.scss", "sky-source-return-back.test.ts", "sky-catalog-information-recovery.test.ts",
    "sky-sdss-optical-frame.ts", "sky-sdss-optical-completion.ts", "sky-target-optical-identity.ts",
    "sky-artwork-loader.ts", "sky-prepared-optical-footprint.fixture.json", "sky-gpu-renderer.ts",
    "sky-artwork-level-composition.ts"].map(p => sky+p),
  ...["celestial-information-presentation.ts", "celestial-information-response.ts", "api-client.ts"].map(p => service+p),
  "packages/miniapp-contracts/src/sdss-optical-publication.ts",
  "workers/miniapp-api/src/test-fixtures/sdss-science-publication.ts",
  "workers/miniapp-api/src/prepared-optical-imagery.ts", "workers/miniapp-api/src/sdss-optical-imagery.ts",
  "workers/miniapp-api/src/celestial-object-information.ts", "workers/miniapp-api/src/miniapp-service.ts",
  "output/prepared-background-basis-1003-r1/result.json"];
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
    child.on("error", reject); child.on("close", exitCode => resolve({ exitCode, stdout, stderr }));
  });
  await writeFile(path.join(out, name+".log"), result.stdout+result.stderr, { flag: "wx" });
  return { name, exitCode: result.exitCode, log: await bind(path.relative(root, path.join(out, name+".log"))) };
}
const [tests, types] = await Promise.all([
  run("affected-tests", ["tools/run-node.cjs", "--import", "tsx", "--test",
    sky+"sky-optical-source-credit.test.ts", sky+"sky-source-return-back.test.ts",
    sky+"sky-catalog-information-recovery.test.ts"], root),
  run("app-typescript-5.9.3", ["../../tools/run-node.cjs", "./node_modules/typescript/lib/tsc.js", "--noEmit", "-p", "tsconfig.json"],
    path.join(root, "apps/wechat-miniapp")),
]);
const after = await Promise.all(files.map(bind)); await save("inputs-after.json", after);
const exact = JSON.stringify(before) === JSON.stringify(after);
const result = { status: tests.exitCode === 0 && types.exitCode === 0 && exact ? "PASSED_BOUND_SOURCE_CREDIT_DEVELOPMENT" : "FAILED",
  checks: [tests, types], beforeAfterExact: exact, selectedInputs: before.length,
  scope: "Actual shared credit and page-expression/JSX consumers with cached Prepared metadata, admitted legacy identity and portable science structure. Selected source identities; no full executable-module trace. Full caption semantics and exact route action, not actual WXML/native placement/readability, ordinary Prepared adoption, GPU policy/participation, final colour/background/quality or capacity acceptance. No shader, publication, source bytes, source information owner or six protected changes modified." };
await save("result.json", result);
console.log(JSON.stringify({ ...result, result: await bind(path.relative(root, path.join(out, "result.json"))) }));
process.exitCode = result.status === "FAILED" ? 1 : 0;
