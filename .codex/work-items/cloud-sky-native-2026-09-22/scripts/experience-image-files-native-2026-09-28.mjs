import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import sdk from "miniprogram-automator";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";

const stage = process.argv[2], port = Number(process.argv[3] ?? 9445);
assert(["enter", "seed", "readback", "restore"].includes(stage)); assert([9445, 9446].includes(port));
const root = process.cwd(), evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const candidate = JSON.parse(await fs.readFile(path.join(evidence, "experience-combined-clean-v12-candidate-2026-09-28.json"), "utf8"));
const output = path.join(evidence, `experience-image-files-native-${stage}-2026-09-28.json`);
await assert.rejects(fs.access(output), { code: "ENOENT" });
assert.equal((await fingerprintBundle(path.join(root, candidate.bundle))).sha256, candidate.fingerprint.sha256);
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: `ws://127.0.0.1:${port}` }), 5000);
boundWechatProtocol(program, 6000);
const digest = value => createHash("sha256").update(value).digest("hex");
const guardName = "starward-sky-image-cleanup-guard-20260928.tmp";
const staleNames = ["sky-art-legacy0928-1.png", "deep-sky-M-31-DETAIL-legacy0928-2.jpg"];
async function until(read, accepts, label) {
  const end = Date.now() + 12000;
  while (Date.now() < end) {
    let value; try { value = await read(); } catch (error) { if (error.message !== "frame_not_presented") throw error; }
    if (value !== undefined && accepts(value)) return value;
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  throw new Error(label);
}
const pageAt = expected => until(() => program.currentPage(), page => page?.path === expected, "unexpected_page");
const element = (page, selector) => until(() => page.$(selector), Boolean, "missing_element:" + selector);
async function state(page) {
  const description = await (await element(page, ".sky-orientation-canvas")).attribute("aria-label");
  if (!description.includes("已呈现")) throw new Error("frame_not_presented");
  return { description, located: await (await page.$(".sky-located-object"))?.attribute("aria-label") ?? null,
    sources: await (await page.$(".sky-image-status-group"))?.text() ?? "" };
}
async function capture(page, label) {
  await new Promise(resolve => setTimeout(resolve, 650)); const before = await state(page);
  const bytes = Buffer.from(await program.screenshot(), "base64"), png = PNG.sync.read(bytes);
  assert.equal(await program.currentPage(), page); assert.deepEqual(await state(page), before);
  const filename = `experience-combined-clean-v12-files-${label}-2026-09-28.png`;
  await fs.writeFile(path.join(evidence, filename), bytes, { flag: "wx" });
  return { ...before, filename, sha256: digest(bytes), width: png.width, height: png.height };
}
async function fileSnapshot() {
  const files = await program.evaluate(() => {
    const fs = wx.getFileSystemManager(), root = wx.env.USER_DATA_PATH;
    return fs.readdirSync(root).map(name => ({ name, bytes: fs.statSync(root + "/" + name).size }));
  });
  const owned = files.filter(file => /^(sky-art-|deep-sky-M-)/.test(file.name));
  return { owned, encodedCount: owned.length, encodedBytes: owned.reduce((sum, file) => sum + file.bytes, 0),
    otherCount: files.length - owned.length, guardPresent: files.some(file => file.name === guardName) };
}
async function select(page, name) {
  if (!await page.$(".sky-object-search__input")) {
    const xml = await (await element(page, ".sky-control-dock")).outerWxml();
    const match = xml.match(/<button id="([^"]+)"[^>]*>天体列表<\/button>/); assert(match);
    await (await page.$("#" + match[1])).tap();
  }
  await (await element(page, ".sky-object-search__input")).input(name);
  const result = await until(async () => { for (const row of await page.$$(".sky-object-search__result")) if ((await row.text()).includes(name)) return row; }, Boolean, "object_search_unavailable");
  await result.tap(); await (await element(page, ".sky-object-locate")).tap();
  await until(() => state(page), value => Boolean(value.located), "object_not_located");
}
async function time(page, clock) {
  await (await element(page, ".sky-control-dock__button--time")).tap();
  const track = await (await element(page, ".sky-orientation-time-ruler__track")).outerWxml();
  const tick = [...track.matchAll(/<button id="([^"]+)"[^>]*aria-label="([^"]+)"/g)].find(match => match[2].startsWith(clock + "，")); assert(tick);
  await (await page.$("#" + tick[1])).tap();
  await until(() => state(page), value => value.description.endsWith("所选观测时刻 " + clock), "time_not_presented");
  await until(async () => await (await page.$(".sky-orientation-time-ruler__current-state"))?.text() ?? "", value => !value.includes("保存中") && !value.includes("预览"), "time_not_committed");
  await (await element(page, ".sky-control-dock__button--time")).tap();
}
async function zoom(page, target) {
  const from = Number((await state(page)).description.match(/垂直视场 (\d+(?:\.\d+)?) 度/)?.[1]); assert(Number.isFinite(from));
  const ratio = Math.tan(from * Math.PI / 720) / Math.tan(target * Math.PI / 720), start = Math.min(220, 358 / ratio), end = start * ratio;
  const touches = distance => [0, 1].map(identifier => ({ identifier, x: 195.2 + (identifier ? 1 : -1) * distance / 2, y: 420, clientX: 195.2 + (identifier ? 1 : -1) * distance / 2, clientY: 420 }));
  const scene = await element(page, "#spot-night-sky-scene");
  await scene.touchstart({ touches: touches(start), changedTouches: touches(start) });
  await scene.touchmove({ touches: touches(end), changedTouches: touches(end) });
  await scene.touchend({ touches: [], changedTouches: touches(end) });
  await until(() => state(page), value => Math.abs(Number(value.description.match(/垂直视场 (\d+(?:\.\d+)?) 度/)?.[1]) - target) < .11, "zoom_not_presented");
}
async function enterSky(page) {
  if (page.path === "sky/detail/index" && await page.$(".sky-context-error")) {
    let back; for (const button of await page.$$("button")) if ((await button.attribute("aria-label")) === "返回入口") back = button;
    assert(back); await back.tap(); page = await program.currentPage();
  }
  if (page.path !== "sky/detail/index") {
    if (page.path === "pages/map/index") await (await element(page, ".map-search-entry")).tap();
    page = await pageAt("spot/search/index"); await (await element(page, ".spot-search-field__input")).input("示例观星点");
    const suggestion = await element(page, ".spot-search-suggestion"); assert((await suggestion.outerWxml()).includes("示例观星点")); await suggestion.tap();
    page = await pageAt("pages/map/index"); await until(async () => await (await element(page, ".spot-panel__title")).text(), value => value === "示例观星点", "spot_not_ready");
    await (await element(page, ".spot-panel__action--cloud")).tap(); page = await pageAt("sky/detail/index");
  }
  const defer = await page.$(".sky-orientation-recovery__defer"); if (defer) await defer.tap();
  await until(() => state(page), value => value.description.includes("手动视角"), "manual_sky_not_presented");
  return page;
}
try {
  let page = await program.currentPage(), result;
  if (stage === "enter") {
    page = await enterSky(page);
    await time(page, "00:00"); await select(page, "M 31"); await zoom(page, 1.5);
    await until(() => state(page), value => value.sources.includes("AllWISE W3"), "image_not_decoded");
    result = { capture: await capture(page, "m31-loaded"), files: await fileSnapshot() };
  } else if (stage === "seed") {
    page = await pageAt("sky/detail/index"); assert((await state(page)).located.startsWith("M 31"));
    const files = await fileSnapshot(); const artwork = files.owned.filter(file => /^sky-art-.*\.png$/.test(file.name)).sort((a, b) => a.bytes - b.bytes)[0];
    const deep = files.owned.find(file => /^deep-sky-M-31-DETAIL-.*\.jpg$/.test(file.name)); assert(artwork); assert(deep);
    const seeded = await program.evaluate((artName, deepName, staleNames, guardName) => {
      const fs = wx.getFileSystemManager(), root = wx.env.USER_DATA_PATH;
      const existing = fs.readdirSync(root); if ([...staleNames, guardName].some(name => existing.includes(name))) throw new Error("native_fixture_already_exists");
      const bodies = [fs.readFileSync(root + "/" + artName), fs.readFileSync(root + "/" + deepName)];
      staleNames.forEach((name, index) => fs.writeFileSync(root + "/" + name, bodies[index]));
      fs.writeFileSync(root + "/" + guardName, new Uint8Array([91, 92, 93, 94]).buffer);
      return { copiedBytes: bodies.map(body => body.byteLength), guardBytes: 4 };
    }, artwork.name, deep.name, staleNames, guardName);
    result = { fixture: "Copies of actual encoded files with previous-runtime names; never product imagery or observed M110 data", seeded, beforeRestart: await fileSnapshot(), before: await capture(page, "before-restart") };
  } else if (stage === "readback") {
    const files = await fileSnapshot(); assert(!files.owned.some(file => staleNames.includes(file.name)), "stale_fixture_not_removed"); assert(files.guardPresent);
    const guard = await program.evaluate(name => { const fs = wx.getFileSystemManager(); return Array.from(new Uint8Array(fs.readFileSync(wx.env.USER_DATA_PATH + "/" + name))); }, guardName);
    assert.deepEqual(guard, [91, 92, 93, 94]);
    result = { page: page.path, files, previousRuntimeFixturesRemoved: true, independentGuardPreserved: true, guardBytes: guard.length };
  } else {
    page = await enterSky(page); await time(page, "00:00");
    await select(page, "M 31"); await zoom(page, 1.5); await until(() => state(page), value => value.sources.includes("AllWISE W3"), "image_not_decoded");
    const files = await fileSnapshot(); assert(files.owned.some(file => /^deep-sky-M-31-DETAIL-[a-z0-9]+_[a-z0-9]+-\d+\.jpg$/.test(file.name)));
    const sessions = new Set(files.owned.map(file => /-([a-z0-9]+_[a-z0-9]+)-\d+\.(?:jpg|png)$/.exec(file.name)?.[1])); assert.equal(sessions.size, 1); assert(!sessions.has(undefined));
    const restored = await capture(page, "after-restart-m31");
    await zoom(page, 85); await select(page, "织女星"); await zoom(page, 85);
    const final = await capture(page, "final-wide");
    await program.evaluate(name => wx.getFileSystemManager().unlinkSync(wx.env.USER_DATA_PATH + "/" + name), guardName);
    result = { restored, sharedSessionAcrossConsumers: true, encodedFilesAfterDecode: files, final, finalFiles: await fileSnapshot(), controlledGuardRemovedAfterValidation: true };
  }
  assert.equal((await fingerprintBundle(path.join(root, candidate.bundle))).sha256, candidate.fingerprint.sha256);
  const record = { scope: "Same-project native generated-file ownership development check; no phone, whole-quality, OS kill, memory/FPS/cloud-cost or independent-review acceptance", stage, port, candidateHash: candidate.fingerprint.sha256, ...result };
  await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(record));
} finally { program.disconnect(); }
