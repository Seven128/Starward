import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root = process.cwd(), item = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22");
const evidence = path.join(item, "evidence"), resultFile = path.join(evidence, "grid-tracer-cost-2026-09-29/close-bind.json");
await assert.rejects(fs.access(resultFile), { code: "ENOENT" });
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const comparison = JSON.parse(await fs.readFile(path.join(evidence, "grid-tracer-cost-2026-09-29/comparison.json"), "utf8"));
for (const source of comparison.afterSources.sourceHashes) assert.equal(digest(await fs.readFile(path.join(root, source.file))), source.sha256);
const candidate = JSON.parse(await fs.readFile(path.join(evidence, "experience-combined-clean-v15-candidate-2026-09-29.json"), "utf8"));
assert.equal((await fingerprintBundle(path.join(root, candidate.bundle))).sha256, candidate.fingerprint.sha256);
const docs = ["PLAN.md", "STATE.md", "INDEX.md", "PROGRESS.md", "evidence/experience-grid-tracer-cost-2026-09-29.md"];
let localLinksChecked = 0;
for (const doc of docs) {
  const file = path.join(item, doc), text = await fs.readFile(file, "utf8");
  if (doc === "PLAN.md") {
    assert.equal(text.match(/\*\*当前可执行依赖：/g)?.length, 1);
    assert(text.includes("最新无诊断clean-v15已构建、尚未打开"));
    assert(text.includes("DSS营利使用需书面许可") && text.includes("当前Gaia DR3/EDR3") && text.includes("ESA银河"));
    assert(text.includes("缺现场数据不妨碍交付模拟效果"));
  }
  for (const match of text.matchAll(/\]\(([^\s)]+)\)/g)) {
    const url = match[1];
    if (/^(?:https?:|thread:|codex:|app:|#)/.test(url)) continue;
    const target = url.split("#")[0]; if (!target) continue;
    await fs.access(path.resolve(path.dirname(file), target)); localLinksChecked++;
  }
}
await fs.writeFile(resultFile, JSON.stringify({ at: new Date().toISOString(), sourcesStillMatchCausalComparison: true,
  latestCandidate: { bundle: candidate.bundle, sha256: candidate.fingerprint.sha256, rawBytes: candidate.fingerprint.totalBytes, opened: false },
  uniqueCurrentPlanDependency: true, localLinksChecked, phoneTouched: false, newNativeWindows: 0,
  nativeCurrentFrameOrContextVerified: false, newMoonPhoneVerified: false, independentReviewObtained: false,
  scope: "Artifact/document/source binding only. No native, target-quality, performance, operating-cost or Goal-completion certification." }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ sourceHashesMatch: true, candidateSha256: candidate.fingerprint.sha256, localLinksChecked, uniqueCurrentPlanDependency: true }));
