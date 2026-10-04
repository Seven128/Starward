import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";
const task = ".codex/work-items/cloud-sky-native-2026-09-22", evidence = `${task}/evidence`;
const output = `${evidence}/experience-combined-clean-v28-candidate-2026-09-29.json`;
await assert.rejects(fs.access(output), { code: "ENOENT" });
const read = async file => JSON.parse(await fs.readFile(file, "utf8"));
const hash = async file => createHash("sha256").update(await fs.readFile(file)).digest("hex");
const prior = await read(`${evidence}/experience-combined-clean-v26-candidate-2026-09-29.json`);
assert.equal((await fingerprintBundle(path.resolve(prior.bundle))).sha256, prior.fingerprint.sha256);
const allowed = ["spot-sky-page.tsx", "sky-gpu-renderer.ts"].map(file => `apps/wechat-miniapp/src/features/sky/${file}`);
const sourceInputs = [], ownerChanges = [];
for (const input of prior.sourceInputs) {
  const sha256 = await hash(input.file);
  if (allowed.includes(input.file)) { assert.notEqual(sha256, input.sha256); ownerChanges.push({ file: input.file, beforeSha256: input.sha256, sha256 }); }
  else assert.equal(sha256, input.sha256, `unaffected owner ${input.file}`);
  sourceInputs.push({ file: input.file, sha256 });
}
assert.equal(ownerChanges.length, 2); assert.equal(sourceInputs.length, 99);
for (const input of [...prior.testInputs, ...prior.retainedSkyTests]) assert.equal(await hash(input.file), input.sha256, input.file);
const checks = { command: "node tools/run-node.cjs --import tsx --test apps/wechat-miniapp/src/features/sky/sky-galactic-band.test.ts apps/wechat-miniapp/src/features/sky/sky-gpu-textures.test.ts apps/wechat-miniapp/src/features/sky/sky-canvas-time.test.ts apps/wechat-miniapp/src/services/galactic-image-publication.test.ts",
  tests: 21, passed: 21, failed: 0, behaviourExitCode: 0, typecheckCommand: "npm run typecheck --workspace @starward/wechat-miniapp", typecheckExitCode: 0,
  scope: "Actual command results from unified exec 86874, on the owner hashes below; tests and typechecking do not establish rendered quality or target acceptance.",
  ownerChanges, buildLog: `${evidence}/experience-galactic-v28-build-2026-09-29.txt` };
assert.match(await fs.readFile(checks.buildLog, "utf8"), /exitCode=0\s*$/u);
const causal = await read(`${evidence}/experience-galactic-causal-validation-2026-09-29.json`);
assert.equal(causal.sourceImageSha256, "e3a70f835197c6a6965871fc4224635aa5d04a4874d2fa1c177a9a1470d1e2a0");
const bundle = "apps/wechat-miniapp/dist/weapp-check-sky-combined-clean-v28-0929";
const config = await read(`${bundle}/project.config.json`), oldConfig = await read(`${prior.bundle}/project.config.json`);
assert.equal(config.appid, oldConfig.appid); config.projectname = "Starward-Sky-Combined-Clean-V28-0929"; config.setting.urlCheck = false;
await fs.writeFile(`${bundle}/project.config.json`, JSON.stringify(config, null, 2) + "\n");
const fingerprint = await fingerprintBundle(path.resolve(bundle));
const code = (await Promise.all(fingerprint.files.filter(file => file.path.endsWith(".js")).map(file => fs.readFile(path.join(bundle, file.path), "utf8")))).join("\n");
const diagnostics = {};
for (const marker of Object.keys(prior.diagnostics)) { assert(!code.includes(marker), marker); diagnostics[marker] = "absent"; }
assert(!fingerprint.files.some(file => file.path.endsWith(".map"))); assert(code.includes("http://127.0.0.1:8791"));
assert(code.includes("u_filterStrength") && code.includes("u_imageTexel"));
const disclosure = "局部放大时对全景背景作平滑显示";
const escapedDisclosure = Array.from(disclosure, value => "\\u" + value.charCodeAt(0).toString(16).padStart(4, "0")).join("");
assert(code.includes(disclosure) || code.includes(escapedDisclosure));
const app = await read(`${bundle}/app.json`); assert.equal(app.debug ?? false, false);
const packages = app.subpackages ?? app.subPackages ?? [], rawPackageBytes = { main: 0 };
for (const file of fingerprint.files) {
  const name = packages.find(item => file.path.startsWith(item.root.replace(/\/$/u, "") + "/"))?.root ?? "main";
  rawPackageBytes[name] = (rawPackageBytes[name] ?? 0) + file.bytes;
}
const changedBundleFiles = fingerprint.files.filter(file => {
  const old = prior.fingerprint.files.find(candidate => candidate.path === file.path); return !old || old.sha256 !== file.sha256;
}).map(file => file.path);
const record = { scope: "Prepared fixed clean v28 native development candidate. Only two Sky source owners changed from v26: magnified 2MASS background display filter and its public source disclosure. Native evidence follows separately. No phone, target performance or final acceptance.",
  bundle, apiOrigin: prior.apiOrigin, appDebug: false, diagnostics, fingerprint, rawPackageBytes,
  previousCandidate: { bundle: prior.bundle, sha256: prior.fingerprint.sha256 }, skippedCandidate: "v27 contains withdrawn Map exploration and remains unopened/unadopted",
  sourceInputs, inheritedSourceInputCount: 99, ownerChanges, testInputs: prior.testInputs,
  retainedSkyTests: prior.retainedSkyTests, checks,
  actualPixelValidation: { file: `${evidence}/experience-galactic-causal-validation-2026-09-29.json`, sha256: await hash(`${evidence}/experience-galactic-causal-validation-2026-09-29.json`) },
  retainedRunningOpticalInputs: prior.retainedRunningOpticalInputs, retainedRunningSourceRecovery: prior.retainedRunningSourceRecovery,
  changedBundleFiles, sourceScope: "Sky only", mapSourceSha256: await hash("apps/wechat-miniapp/src/pages/map/index.scss"),
  difference: "Same hash-bound source image/data and existing shared GPU/image/camera owners; continuous display filter only under source-texel magnification. Whole-dome/red outputs and schematic recovery remain unchanged in applicable actual software GPU cases. No synthetic validity mask, new image, upload or texture.",
  runningScope: "Existing services remain. Replace the one owned v26 window only after recording its current Context; loopback check bundle must not be phone-pushed." };
assert.equal(record.mapSourceSha256, "81283f7b2849cd55eed4a82d322885e1c76d7f8aa81ab26fc2fc584d198c0e82");
await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ bundle, sha256: fingerprint.sha256, files: fingerprint.fileCount, rawBytes: fingerprint.totalBytes,
  rawPackageBytes, rawDelta: fingerprint.totalBytes - prior.fingerprint.totalBytes, changedBundleFiles, changedSkyOwners: ownerChanges.length }));
