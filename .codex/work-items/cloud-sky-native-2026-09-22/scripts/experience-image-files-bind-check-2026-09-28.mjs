import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";
const root = process.cwd(), item = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22"), evidence = path.join(item, "evidence");
const read = async name => JSON.parse(await fs.readFile(path.join(evidence, name), "utf8"));
const candidate = await read("experience-combined-clean-v12-candidate-2026-09-28.json");
const loaded = await read("experience-image-files-native-enter-2026-09-28.json");
const seeded = await read("experience-image-files-native-seed-2026-09-28.json");
const retired = await read("experience-image-files-native-readback-2026-09-28.json");
const current = await fingerprintBundle(path.join(root, candidate.bundle)); assert.equal(current.sha256, candidate.fingerprint.sha256);
for (const record of [loaded, seeded, retired]) assert.equal(record.candidateHash, current.sha256);
const sessions = new Set(loaded.files.owned.map(file => /-([a-z0-9]+_[a-z0-9]+)-\d+\.(?:jpg|png)$/.exec(file.name)?.[1]));
assert.equal(sessions.size, 1); assert(!sessions.has(undefined));
assert(loaded.files.owned.some(file => file.name.startsWith("sky-art-"))); assert(loaded.files.owned.some(file => file.name.startsWith("deep-sky-M-31-DETAIL-")));
assert(loaded.capture.sources.includes("AllWISE W3")); assert.equal(loaded.files.encodedBytes, 4241290);
assert.deepEqual(seeded.seeded.copiedBytes, [29180, 41153]); assert.equal(seeded.beforeRestart.encodedBytes, 4311623);
assert.equal(retired.previousRuntimeFixturesRemoved, true); assert.equal(retired.independentGuardPreserved, true);
assert.equal(retired.guardBytes, 4); assert.deepEqual(retired.files.owned, []);
for (const capture of [loaded.capture, seeded.before]) {
  const bytes = await fs.readFile(path.join(evidence, capture.filename));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), capture.sha256);
  const png = PNG.sync.read(bytes); assert.equal(png.width, capture.width); assert.equal(png.height, capture.height);
}
assert.equal(loaded.capture.sha256, seeded.before.sha256);
const texts = await Promise.all(["PLAN.md", "STATE.md", "INDEX.md", "PROGRESS.md"].map(name => fs.readFile(path.join(item, name), "utf8")));
for (const text of texts.slice(0, 3)) assert(text.includes("共享图片请求已统一JS运行时文件命名空间"));
assert.equal((texts[0].match(/\*\*当前可执行依赖：/g) ?? []).length, 1);
let checkedLinks = 0;
for (const text of texts) for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
  const target = match[1].split("#")[0]; if (!target || /^(https?:|thread:|codex:)/.test(target)) continue;
  await fs.access(path.resolve(item, target)); checkedLinks++;
}
const output = path.join(evidence, "experience-image-files-bind-check-2026-09-28.json");
const result = { scope: "Immutable candidate/files/captures/current-plan binding only; post-restart native redraw and current Context remain unverified", candidateHash: current.sha256,
  candidateFiles: current.fileCount, sharedFileSessionAcrossNativeConsumers: true, nativeUnownedCopiesRemovedBytes: 70333,
  independentGuardOriginalBytesPreserved: 4, capturesChecked: 2, capturesIdentical: true, currentPlanDependencies: 1,
  localLinksChecked: checkedLinks, latestNativeRedraw: "unverified", independentGuardLaterRelease: "unverified" };
await fs.writeFile(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" }); console.log(JSON.stringify(result));
