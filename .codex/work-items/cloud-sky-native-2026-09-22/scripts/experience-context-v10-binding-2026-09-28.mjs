import sdk from "miniprogram-automator";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";
const root = path.resolve("."), evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const output = path.join(evidence, "experience-context-v10-binding-2026-09-28.json");
assert.equal(await fs.access(output).then(() => true, () => false), false, "preserve historical evidence");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const candidate = JSON.parse(await fs.readFile(path.join(evidence, "experience-combined-clean-v10-candidate-2026-09-28.json"), "utf8"));
const observation = JSON.parse(await fs.readFile(path.join(evidence, "experience-context-native-v10-2026-09-28.json"), "utf8"));
const fingerprint = await fingerprintBundle(path.join(root, candidate.bundle));
assert.equal(fingerprint.sha256, candidate.fingerprint.sha256); assert.equal(fingerprint.fileCount, 257);
assert.equal(observation.captures.length, 8);
const captures = [], decoded = new Map();
for (const capture of observation.captures) {
  const bytes = await fs.readFile(path.join(evidence, capture.filename)), image = PNG.sync.read(bytes);
  assert.equal(image.width, capture.width); assert.equal(image.height, capture.height);
  assert.equal(image.width, 192); assert.equal(image.height, 413);
  decoded.set(capture.filename, image); captures.push({ ...capture, sha256: sha(bytes), bytes: bytes.length });
}
const imageFor = name => decoded.get(`experience-combined-clean-v10-${name}-2026-09-28.png`);
const bounds = { left: 4, rightExclusive: 188, top: 52, bottomExclusive: 395 };
const difference = (before, after) => {
  const result = { samples: 0, changedPixels: 0, maximumChannelDifference: 0 };
  for (let y = bounds.top; y < bounds.bottomExclusive; y++) for (let x = bounds.left; x < bounds.rightExclusive; x++) {
    const i = (y * before.width + x) * 4, delta = [0, 1, 2].map(c => Math.abs(before.data[i+c] - after.data[i+c]));
    result.samples++; result.changedPixels += Number(delta.some(Boolean));
    result.maximumChannelDifference = Math.max(result.maximumChannelDifference, ...delta);
  }
  return result;
};
const timeChange = difference(imageFor("context-tracking-start"), imageFor("context-lost-response-tracking-confirmed"));
assert.ok(timeChange.changedPixels > 0, "fresh state must affect actual native Canvas output");
const sourceReturn = difference(imageFor("context-lost-response-tracking-confirmed"), imageFor("context-tracking-source-return"));
const { baseline, rejected, retrySuccess, trackingBaseline, lostResponseTracking, mapReentry, final } = observation;
assert.equal(rejected.context.selectedAtUtc, baseline.context.selectedAtUtc); assert.equal(rejected.context.revision, baseline.context.revision);
assert.ok(rejected.inlineNotification.includes("观测时间未更新"));
assert.equal(retrySuccess.context.selectedAtUtc, "2026-09-28T17:00:00.000Z"); assert.equal(retrySuccess.inlineNotification, null);
assert.equal(lostResponseTracking.context.selectedAtUtc, "2026-09-28T17:30:00.000Z"); assert.equal(lostResponseTracking.inlineNotification, null);
assert.equal(lostResponseTracking.context.revision, trackingBaseline.context.revision + 1);
assert.equal(lostResponseTracking.proxy.puts - trackingBaseline.proxy.puts, 1);
assert.equal(lostResponseTracking.proxy.gets - trackingBaseline.proxy.gets, 1);
assert.equal(lostResponseTracking.proxy.lostSuccessfulResponses - trackingBaseline.proxy.lostSuccessfulResponses, 1);
assert.ok(lostResponseTracking.description.includes("已选择跟踪Vega") && lostResponseTracking.trackingStatus.includes("跟踪中"));
assert.equal(observation.nativeDurableContextReadback.selectedAtUtc, lostResponseTracking.context.selectedAtUtc);
assert.equal(mapReentry.context.selectedAtUtc, lostResponseTracking.context.selectedAtUtc); assert.ok(mapReentry.description.includes(mapReentry.context.selectedAtUtc));
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9443" }), 5000);
boundWechatProtocol(program, 5000);
try {
  const page = await program.currentPage(); assert.equal(page.path, "sky/detail/index");
  const canvas = await page.$(".sky-orientation-canvas"); assert.ok(canvas);
  const description = await canvas.attribute("aria-label"), theme = await (await page.$(".sky-orientation-page")).attribute("class");
  assert.equal(description, final.description); assert.equal(theme, final.theme);
  // Context/route IDs stay only in memory; this is a public fixture projection.
  const response = await fetch("http://127.0.0.1:8789/v2/observation-contexts/" + encodeURIComponent(decodeURIComponent(page.query.contextId)), { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200); const context = (await response.json()).data;
  assert.equal(context.selectedAtUtc, "2026-09-28T16:00:00.000Z"); assert.equal(context.revision, final.context.revision);
  assert.ok(description.includes(context.selectedAtUtc));
  const proxy = await (await fetch("http://127.0.0.1:8791/__sky_test/context-status")).json(); assert.equal(proxy.mode, "pass");
  const manifest = await (await fetch("http://127.0.0.1:8789/v2/sky/landscape/manifest", { signal: AbortSignal.timeout(5000) })).json();
  assert.equal(manifest.publicationHash, "e5d1e76069fa002b5e2435a3f78615c2bb32ee52b18003cab036a50ed80056c5");
  assert.equal(sha(await fs.readFile(path.join(root, "workers/miniapp-api/assets/landscape/manifest.json"))), manifest.publicationHash);
  const resources = [];
  for (const resource of manifest.resources) {
    const response = await fetch("http://127.0.0.1:8789" + resource.image.downloadUrl, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200); assert.equal(sha(new Uint8Array(await response.arrayBuffer())), resource.image.sha256);
    resources.push({ id: resource.id, status: response.status, sha256: resource.image.sha256 });
  }
  assert.ok(observation.finalPaintedPhotoSource.includes(manifest.publicationHash + "/panorama-2048.png"));
  const result = {
    scope: "Immutable v10/native painted output, real local BFF, public control-tree and durable-state readback. Reduced captures and rounded FOV are not phone composition, exact camera, backend atomicity, complete quality/performance or independent acceptance.",
    candidateSha256: fingerprint.sha256, candidateFileCount: fingerprint.fileCount, totalRawBytes: fingerprint.totalBytes,
    rawPackageBytes: candidate.rawPackageBytes, description, theme, canvasSize: await canvas.size(),
    selectedAtUtc: context.selectedAtUtc, localDate: context.localDate, revision: context.revision, proxy,
    publicationHash: manifest.publicationHash, resources, captures,
    nativePixelObservations: { bounds, timeChange, sourceReturn },
  };
  await fs.writeFile(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ candidateSha256: result.candidateSha256, files: result.candidateFileCount, captures: captures.length,
    nativePixelObservations: result.nativePixelObservations, selectedAtUtc: result.selectedAtUtc, revision: result.revision, proxyMode: proxy.mode }));
} finally { await program.disconnect(); }
