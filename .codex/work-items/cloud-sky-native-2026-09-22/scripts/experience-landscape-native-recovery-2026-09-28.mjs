import sdk from "miniprogram-automator";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
const root = path.resolve("."), evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const output = path.join(evidence, "experience-landscape-native-recovery-2026-09-28.json");
assert.equal(await fs.access(output).then(() => true, () => false), false);
const file = path.join(root, "workers/miniapp-api/assets/landscape/panorama-1024.png");
const original = await fs.readFile(file), sha = bytes => createHash("sha256").update(bytes).digest("hex");
assert.equal(sha(original), "1e4222bb02d6b4c95c643047de6916581b5e2a665e00d9cc60edd94c3cb072d3");
const candidate = JSON.parse(await fs.readFile(path.join(evidence, "experience-combined-clean-v6-candidate-2026-09-28.json"), "utf8"));
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9439" }), 5000);
boundWechatProtocol(program);
async function until(read, accept, label) {
  const end = Date.now() + 15000;
  while (Date.now() < end) { const value = await read(); if (accept(value)) return value; await new Promise(resolve => setTimeout(resolve, 120)); }
  throw Error(label);
}
async function panoramaFiles() {
  return program.evaluate(function () {
    const fs = wx.getFileSystemManager();
    return fs.readdirSync(wx.env.USER_DATA_PATH).filter(name => name.startsWith("sky-art-")).flatMap(name => {
      const full = wx.env.USER_DATA_PATH + "/" + name, raw = fs.statSync(full), stat = raw.stats || raw;
      if (stat.size !== 854784) return [];
      const bytes = new Uint8Array(fs.readFileSync(full));
      return bytes[0] === 137 && bytes[1] === 80 ? [{ bytes: stat.size, width: new DataView(bytes.buffer).getUint32(16), height: new DataView(bytes.buffer).getUint32(20) }] : [];
    });
  });
}
let mutated = false;
try {
  const page = await program.currentPage(); assert.equal(page.path, "sky/detail/index");
  async function list(open) {
    if (Boolean(await page.$(".sky-object-search__input")) === open) return;
    const xml = await (await page.$(".sky-control-dock")).outerWxml();
    const button = xml.match(new RegExp(`<button id="([^"]+)"[^>]*>${open ? "天体列表" : "收起列表"}</button>`));
    assert.ok(button); await (await page.$("#" + button[1])).tap();
    await until(() => page.$(".sky-object-search__input"), value => Boolean(value) === open, "list state missing");
  }
  async function read() {
    const text = await (await page.$(".sky-orientation-page")).text();
    const retry = [];
    for (const button of await page.$$(".sky-view-mode__button")) if ((await button.text()) === "重试模拟地景图片") retry.push(button);
    return { description: await (await page.$(".sky-orientation-canvas")).attribute("aria-label"),
      model: text.includes("当前显示自有草地与树木模拟模型。"), photo: text.includes("模拟地景图片来源 · Lubomir Hambalek"), retry: retry.length === 1 };
  }
  await list(true); const before = await until(read, value => value.photo && !value.model, "photo not initially painted");
  await list(false); assert.equal((await panoramaFiles()).length, 1);
  const corrupt = Buffer.from(original); corrupt[80] ^= 1; mutated = true; await fs.writeFile(file, corrupt);
  const manifest = await (await fetch("http://127.0.0.1:8789/v2/sky/landscape/manifest")).json();
  const failedResponse = await fetch("http://127.0.0.1:8789" + manifest.resources[0].image.downloadUrl);
  assert.equal(failedResponse.status, 500, "real corrupt publication must fail closed");
  await (await page.$(".sky-view-mode__landscape")).tap();
  await until(panoramaFiles, files => files.length === 0, "off retained the native photo file");
  await (await page.$(".sky-view-mode__landscape")).tap();
  await list(true); const fallback = await until(read, value => value.model && value.retry && !value.photo, "normal request did not show model fallback");
  assert.equal((await panoramaFiles()).length, 0);
  await fs.writeFile(file, original); mutated = false;
  let retry;
  for (const button of await page.$$(".sky-view-mode__button")) if ((await button.text()) === "重试模拟地景图片") retry = button;
  assert.ok(retry); await retry.tap();
  const restored = await until(read, value => value.photo && !value.model && !value.retry, "normal retry did not restore photo credit");
  const files = await until(panoramaFiles, files => files.length === 1, "retry has no actual native PNG");
  await list(false);
  assert.equal((await program.currentPage()).pageId, page.pageId);
  for (const entry of candidate.fingerprint.files) assert.equal(sha(await fs.readFile(path.join(root, candidate.bundle, entry.path))), entry.sha256);
  const record = { scope: "One exact clean-v6/9439 normal Taro request/file/image/GPU page; temporary corruption of owned local fixture asset, actual HTTP 500, model/source fallback and public retry. No phone, peak memory or final quality acceptance",
    candidateHash: candidate.fingerprint.sha256, before, failedStatus: failedResponse.status, fallback, restored, nativePhotoFiles: files,
    restoredSourceHash: sha(await fs.readFile(file)), candidateFilesUnchanged: true, samePage: true };
  await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(record));
} finally {
  if (mutated) await fs.writeFile(file, original);
  assert.equal(sha(await fs.readFile(file)), sha(original), "restore the owned source even on failure");
  await program.disconnect();
}
