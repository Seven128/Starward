import assert from "node:assert/strict";
import sdk from "miniprogram-automator";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";

const root = path.resolve("."), evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const scenario = process.argv[2]; assert.ok(["moon", "m31"].includes(scenario));
const output = path.join(evidence, `experience-resource-clean-v4-${scenario}-2026-09-28.json`);
assert.ok(!await fs.access(output).then(() => true, () => false), "preserve prior evidence");
const candidate = JSON.parse(await fs.readFile(path.join(evidence, "experience-combined-clean-v4-candidate-2026-09-28.json"), "utf8"));
const baseline = JSON.parse(await fs.readFile(path.join(evidence, "experience-resource-native-files-baseline-2026-09-28.json"), "utf8"));
const baselineNames = new Set(baseline.files.map(file => file.name));
async function verifyFiles() {
  for (const file of candidate.fingerprint.files) {
    const bytes = await fs.readFile(path.join(root, candidate.bundle, file.path));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256, "candidate bytes changed: " + file.path);
  }
}
await verifyFiles();
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9437" }), 5000);
boundWechatProtocol(program, 5000);
async function until(read, accept, label) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    const value = await read(); if (accept(value)) return value;
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  throw Error(label);
}
async function inventory() {
  const files = await program.evaluate(function () {
    const manager = wx.getFileSystemManager();
    return manager.readdirSync(wx.env.USER_DATA_PATH)
      .filter(name => name.startsWith("sky-art-") || name.startsWith("deep-sky-"))
      .map(name => {
        const raw = manager.statSync(wx.env.USER_DATA_PATH + "/" + name), stat = raw.stats || raw;
        return { name, bytes: Number(stat.size) || 0 };
      });
  });
  assert.ok(Array.isArray(files));
  const added = files.filter(file => !baselineNames.has(file.name));
  const groups = { skyArtwork: { count: 0, bytes: 0 }, deepSky: { count: 0, bytes: 0 } };
  for (const file of added) {
    const group = file.name.startsWith("sky-art-") ? groups.skyArtwork : groups.deepSky;
    group.count++; group.bytes += file.bytes;
  }
  return { added, groups, baselinePresent: files.filter(file => baselineNames.has(file.name)).length };
}
async function read(page) {
  const canvas = await page.$(".sky-orientation-canvas"), located = await page.$(".sky-located-object");
  return { description: canvas ? await canvas.attribute("aria-label") : null,
    located: located ? await located.attribute("aria-label") : null,
    sources: await (await page.$(".sky-image-status-group")).text(),
    modal: Boolean(await page.$(".sky-object-modal")), choices: Boolean(await page.$(".sky-object-choice")) };
}
function publicInventory(value) { return { groups: value.groups, baselinePresent: value.baselinePresent }; }
function ready(value) {
  return scenario === "moon" ? value.added.some(file => file.name.startsWith("sky-art-") && file.bytes === 1595187)
    : value.groups.deepSky.count > 0;
}
try {
  const page = await program.currentPage(); assert.equal(page.path, "sky/detail/index");
  const before = await read(page);
  assert.ok(before.description.includes("已呈现") && before.description.includes("2026-09-28T16:00:00.000Z"));
  assert.ok(before.description.includes(`垂直视场 ${scenario === "moon" ? "1.0" : "3.0"} 度`));
  assert.ok(scenario === "moon" ? before.located?.includes("月球") : /M\s*31/.test(before.located ?? ""));
  if (scenario === "m31") assert.ok(before.sources.includes("AllWISE W3"), "registered M31 pixels must be presented");
  assert.equal(before.modal, false); assert.equal(before.choices, false);
  await until(inventory, ready, "expected current native image file not ready");
  const size = await (await page.$(".sky-orientation-canvas")).size();
  const cycles = [];
  for (let cycle = 1; cycle <= 3; cycle++) {
    const loaded = await inventory(), oldSkyNames = new Set(loaded.added.filter(file => file.name.startsWith("sky-art-")).map(file => file.name));
    await program.navigateTo("/content/settings/index");
    await until(() => program.currentPage(), current => current.path === "content/settings/index", "settings route not ready");
    const hidden = await until(inventory, value => value.groups.skyArtwork.count === 0, "retired native-image temporary files remain while hidden");
    if (scenario === "m31") assert.deepEqual(hidden.groups.deepSky, loaded.groups.deepSky,
      "hide must preserve the owned encoded coarse/fine recovery files");
    await program.navigateBack();
    await until(() => program.currentPage(), current => current.pageId === page.pageId, "Sky page identity not restored");
    const restored = await until(() => read(page), value => value.description === before.description && value.located === before.located &&
      value.sources === before.sources,
      "same Sky scene not restored");
    assert.equal(restored.modal, false); assert.equal(restored.choices, false);
    const recoveredFiles = await until(inventory, ready, "native image did not reload after show");
    assert.equal(recoveredFiles.added.filter(file => oldSkyNames.has(file.name)).length, 0,
      "returned Canvas cannot reuse temporary files of the retired native-image generation");
    assert.deepEqual(await (await page.$(".sky-orientation-canvas")).size(), size);
    cycles.push({ cycle, loaded: publicInventory(loaded), hidden: publicInventory(hidden), recovered: publicInventory(recoveredFiles),
      samePage: true, sameSceneDescription: true, sameLocatedObject: true, sameCanvasSize: true });
  }
  const after = await read(page); await verifyFiles();
  const record = { scope: "Official SDK, exact CLI-bound clean-v4/9437; real DevTools file system and public hide/show recovery. Files are not decoded bitmap/GPU memory, phone FPS or physical-device acceptance.",
    candidate: candidate.bundle, candidateHash: candidate.fingerprint.sha256, filesChecked: candidate.fingerprint.fileCount,
    baseline: { count: baseline.files.length, bytes: baseline.files.reduce((total, file) => total + file.bytes, 0) },
    scenario, canvasSize: size, before, cycles, after, candidateFilesUnchanged: true };
  await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(record));
} finally { program.disconnect(); }
