import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root = process.cwd(), item = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22");
const output = path.join(item, "evidence/experience-context-ack-close-2026-09-29.json");
await assert.rejects(fs.access(output), { code: "ENOENT" });
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const after = JSON.parse(await fs.readFile(path.join(item, "evidence/experience-context-ack-http-after-2026-09-29.json"), "utf8"));
assert(after.rows.every(row => row.ok));
for (const source of after.sourceHashes) assert.equal(digest(await fs.readFile(path.join(root, source.file))), source.sha256);
const candidates = [];
for (const generation of ["v15", "v16"]) {
  const candidate = JSON.parse(await fs.readFile(path.join(item, `evidence/experience-combined-clean-${generation}-candidate-2026-09-29.json`), "utf8"));
  assert.equal((await fingerprintBundle(path.join(root, candidate.bundle))).sha256, candidate.fingerprint.sha256);
  candidates.push({ generation, sha256: candidate.fingerprint.sha256, rawBytes: candidate.fingerprint.totalBytes, opened: false });
}
let localLinksChecked = 0;
for (const doc of ["PLAN.md", "STATE.md", "INDEX.md", "PROGRESS.md", "evidence/experience-context-ack-2026-09-29.md"]) {
  const filename = path.join(item, doc), text = await fs.readFile(filename, "utf8");
  if (doc === "PLAN.md") {
    assert.equal(text.match(/\*\*当前可执行依赖：/g)?.length, 1);
    assert(text.includes("最新无诊断clean-v16已构建、尚未打开"));
    assert(text.includes("DSS营利使用需书面许可") && text.includes("当前Gaia DR3/EDR3") && text.includes("ESA银河"));
    assert(text.includes("不新增回执存储或普遍“恰好一次”传输条件"));
  }
  for (const match of text.matchAll(/\]\(([^\s)]+)\)/g)) {
    const url = match[1]; if (/^(?:https?:|thread:|codex:|app:|#)/.test(url)) continue;
    const target = url.split("#")[0]; if (!target) continue;
    await fs.access(path.resolve(path.dirname(filename), target)); localLinksChecked++;
  }
}
await fs.writeFile(output, JSON.stringify({ at: new Date().toISOString(), currentSourcesMatchHttpProbe: true,
  candidates, localLinksChecked, uniqueCurrentPlanDependency: true, phoneTouched: false, newNativeWindows: 0,
  nativeCurrentFrameOrContextVerified: false, newMoonPhoneVerified: false, independentReviewObtained: false,
  scope: "Source/artifact/document binding only; no native, whole-journey, target-quality/performance/cost or Goal-completion certification." }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ currentSourcesMatchHttpProbe: true, candidates, localLinksChecked, uniqueCurrentPlanDependency: true }));
