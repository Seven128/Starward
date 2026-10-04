import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root = process.cwd();
const item = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22");
const evidence = path.join(item, "evidence");
const read = async name => JSON.parse(await fs.readFile(path.join(evidence, name), "utf8"));
const output = path.join(evidence, "experience-route-date-bind-check-2026-09-28.json");
await assert.rejects(fs.access(output), { code: "ENOENT" });
const candidates = await Promise.all(["v12", "v13"].map(generation => read(`experience-combined-clean-${generation}-candidate-2026-09-28.json`)));
const actual = await Promise.all(candidates.map(candidate => fingerprintBundle(path.join(root, candidate.bundle))));
for (let index = 0; index < candidates.length; index++) assert.deepEqual(actual[index], candidates[index].fingerprint);
const previous = new Map(actual[0].files.map(file => [file.path, file.sha256]));
const changedPaths = actual[1].files.filter(file => previous.get(file.path) !== file.sha256).map(file => file.path);
assert.deepEqual(actual[1].files.map(file => file.path), actual[0].files.map(file => file.path));
assert.equal(changedPaths.length, 2);
assert(changedPaths.includes("project.config.json"));
assert.equal(changedPaths.filter(name => name.endsWith(".js")).length, 1);
for (const name of ["enter", "seed", "readback"]) {
  const record = await read(`experience-image-files-native-${name}-2026-09-28.json`);
  assert.equal(record.candidateHash, actual[0].sha256);
  assert.notEqual(record.candidateHash, actual[1].sha256);
}
const checks = await read("experience-route-date-recovery-checks-2026-09-28.json");
assert.equal(checks.beforeFix.exit_code, 1); assert(checks.beforeFix.output.includes("RangeError"));
assert.equal(checks.afterFix.exit_code, 0); assert.equal(checks.typecheck.exit_code, 0);
const documents = ["PLAN.md", "STATE.md", "INDEX.md", "PROGRESS.md", "evidence/experience-route-date-recovery-2026-09-28.md"];
let checkedLinks = 0;
for (const name of documents) {
  const text = await fs.readFile(path.join(item, name), "utf8");
  if (["PLAN.md", "STATE.md", "INDEX.md"].includes(name)) {
    assert(text.includes("clean-v13")); assert(text.includes("尚未打开"));
  }
  if (name === "PLAN.md") assert.equal((text.match(/\*\*当前可执行依赖：/g) ?? []).length, 1);
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^(https?:|thread:|codex:)/.test(target)) continue;
    await fs.access(path.resolve(path.dirname(path.join(item, name)), target)); checkedLinks++;
  }
}
const page = await fs.readFile(path.join(root, "apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx"), "utf8");
assert(page.includes("const selectedCivilDate = contextComplete ? civilDateForInstant("));
assert(page.includes("() => contextComplete ? observationDateOptions(new Date(), routeContext.timezone) : []"));
assert(page.includes("[contextComplete, routeContext.timezone]"));
const result = {
  scope: "Candidate fingerprints, prior native evidence scope, source and current-plan links only; no new native recovery, quality or phone acceptance",
  previousNativeCandidateHash: actual[0].sha256, latestUnopenedCandidateHash: actual[1].sha256,
  candidateFiles: actual[1].fileCount, changedPaths, pageSourceSha256: createHash("sha256").update(page).digest("hex"),
  recordedRegressionBeforeFixFailed: true, recordedAfterFixAndTypecheckPassed: true,
  currentPlanDependencies: 1, localLinksChecked: checkedLinks, nativeV13Recovery: "unverified",
  currentNativeContextAndGuardRelease: "unverified", targetPhoneNewMoon: "unverified",
};
await fs.writeFile(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(result));
