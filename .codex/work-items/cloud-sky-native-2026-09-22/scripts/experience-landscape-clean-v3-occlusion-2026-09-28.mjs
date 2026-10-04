import sdk from "miniprogram-automator";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";

const root = path.resolve(".");
const evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const output = path.join(evidence, "experience-landscape-clean-v3-occlusion-2026-09-28.json");
assert.ok(!await fs.access(output).then(() => true, () => false), "preserve prior evidence");
const candidate = JSON.parse(await fs.readFile(path.join(evidence, "experience-combined-clean-v3-candidate-2026-09-28.json"), "utf8"));
async function verifyFiles() {
  for (const file of candidate.fingerprint.files) {
    const bytes = await fs.readFile(path.join(root, candidate.bundle, file.path));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256, "candidate bytes changed: " + file.path);
  }
}
await verifyFiles();
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9436" }), 5000);
boundWechatProtocol(program, 5000);
async function until(read, accept, label) {
  const end = Date.now() + 12000;
  while (Date.now() < end) {
    const value = await read(); if (accept(value)) return value;
    await new Promise(resolve => setTimeout(resolve, 120));
  }
  throw Error(label);
}
try {
  const page = await program.currentPage(); assert.equal(page.path, "sky/detail/index");
  const read = async () => ({
    description: await (await page.$(".sky-orientation-canvas")).attribute("aria-label"),
    located: await (await page.$(".sky-located-object")).attribute("aria-label"),
    modal: Boolean(await page.$(".sky-object-modal")), choices: Boolean(await page.$(".sky-object-choice")),
  });
  if (await page.$(".sky-object-choice__cancel")) await (await page.$(".sky-object-choice__cancel")).tap();
  if (await page.$(".sky-object-modal__close")) await (await page.$(".sky-object-modal__close")).tap();
  if (!(await read()).located?.includes("模拟地景遮挡")) await (await page.$(".sky-view-mode__landscape")).tap();
  const before = await until(read, s => s.located?.startsWith("Rastaban") && s.located.includes("模拟地景遮挡") && !s.modal && !s.choices, "covered frame not ready");
  assert.ok(before.description.includes("45.0 度") && before.description.includes("2026-09-28T16:00:00.000Z"));
  const style = await (await page.$(".sky-located-object")).attribute("style");
  const x = Number(style.match(/left: ([0-9.e+-]+)px/)?.[1]);
  const y = Number(style.match(/top: ([0-9.e+-]+)px/)?.[1]); assert.ok(Number.isFinite(x) && Number.isFinite(y));
  const canvas = await page.$("#spot-night-sky-scene");
  async function canvasTouch() {
    const touches = [{ identifier: 0, x, y, clientX: x, clientY: y }];
    await canvas.touchstart({ touches, changedTouches: touches });
    await canvas.touchend({ touches: [], changedTouches: touches });
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  await canvasTouch(); const blocked = await read(); assert.ok(!blocked.modal && !blocked.choices, "covered point opened an object");
  await (await page.$(".sky-view-mode__landscape")).tap();
  await until(read, s => s.located?.startsWith("Rastaban") && !s.located.includes("模拟地景遮挡"), "uncovered frame not ready");
  await canvasTouch();
  await until(read, s => s.modal || s.choices, "uncovered point has no selection effect");
  const choice = await page.$(".sky-object-choice"); const overlap = choice ? await choice.text() : null;
  if (choice) {
    const wanted = [];
    for (const row of await page.$$(".sky-object-choice__row")) if ((await row.text()).includes("HR 6536")) wanted.push(row);
    assert.equal(wanted.length, 1); await wanted[0].tap();
  }
  const modal = await until(() => page.$(".sky-object-modal"), Boolean, "correct object information missing");
  // The official SDK does not expose this custom data attribute reliably.
  // Read the real rendered identity facts after the detail response arrives.
  await until(() => modal.text(), text => /HR 6536/.test(text), "Rastaban identity facts missing");
  const title = await (await page.$(".sky-object-modal__title")).text(); assert.equal(title, "Rastaban");
  await (await page.$(".sky-object-modal__close")).tap();
  await until(read, s => !s.modal && !s.choices, "information not closed");
  await (await page.$(".sky-view-mode__landscape")).tap();
  const restored = await until(read, s => s.located?.includes("模拟地景遮挡"), "covered scene not restored");
  assert.equal(restored.description, before.description); assert.equal(restored.located, before.located);
  assert.equal((await program.currentPage()).pageId, page.pageId); await verifyFiles();
  const record = { scope: "Official SDK Canvas touch handlers and actual UI; CLI-bound clean-v3/9436; no phone or physical touch/composition claim",
    candidate: candidate.bundle, candidateHash: candidate.fingerprint.sha256, filesChecked: candidate.fingerprint.fileCount,
    before, blocked, openSelection: { overlap, title, reference: "HR:6536" }, restored };
  await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(record));
} finally { program.disconnect(); }
