import sdk from "miniprogram-automator";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";
const root = path.resolve("."), evidence = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const output = path.join(evidence, "experience-environment-v8-readback-2026-09-28.json");
assert.equal(await fs.access(output).then(() => true, () => false), false);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const candidate = JSON.parse(await fs.readFile(path.join(evidence, "experience-combined-clean-v8-candidate-2026-09-28.json"), "utf8"));
const fingerprint = await fingerprintBundle(path.join(root, candidate.bundle));
assert.equal(fingerprint.sha256, candidate.fingerprint.sha256);
assert.equal(fingerprint.fileCount, candidate.fingerprint.fileCount);
const observations = JSON.parse(await fs.readFile(path.join(evidence, "experience-environment-native-v8-2026-09-28.json"), "utf8"));
assert.equal(observations.captures.length, 8);
const captures = [], images = new Map();
for (const item of observations.captures) {
  const bytes = await fs.readFile(path.join(evidence, item.filename)), image = PNG.sync.read(bytes);
  assert.equal(image.width, item.width); assert.equal(image.height, item.height);
  images.set(item.filename, image); captures.push({ ...item, bytes: bytes.length, sha256: sha(bytes) });
}
function label(name) { return images.get("experience-combined-clean-v8-" + name + "-2026-09-28.png"); }
const before = label("environment-night-return-vega-local"), after = label("environment-normal-after-red");
assert.equal(before.width, after.width); assert.equal(before.height, after.height);
const bounds = { left: 4, rightExclusive: 188, top: 52, bottomExclusive: 395, divisionY: 282 };
assert.ok(before.width >= bounds.rightExclusive && before.height >= bounds.bottomExclusive);
const group = () => ({ samples: 0, changedPixels: 0, maximumChannelDifference: 0, absoluteChannelDifference: 0 });
const groups = { sky: group(), ground: group() };
for (let y = bounds.top; y < bounds.bottomExclusive; y++) for (let x = bounds.left; x < bounds.rightExclusive; x++) {
  const result = y < bounds.divisionY ? groups.sky : groups.ground, i = (y * before.width + x) * 4;
  const delta = [0, 1, 2].map(c => Math.abs(before.data[i+c] - after.data[i+c]));
  result.samples++; result.changedPixels += Number(delta.some(Boolean));
  result.maximumChannelDifference = Math.max(result.maximumChannelDifference, ...delta);
  result.absoluteChannelDifference += delta.reduce((sum, value) => sum + value, 0);
}
for (const result of Object.values(groups)) result.meanAbsoluteChannelDifference = result.absoluteChannelDifference / (result.samples * 3);
const regionStats = [];
for (const name of ["environment-night-return-vega-local", "environment-dusk-vega-direction-local", "environment-noon-vega-direction-local", "environment-red-vega-local"]) {
  const image = label(name), regions = { sky: { n: 0, sum: [0,0,0] }, ground: { n: 0, sum: [0,0,0] } };
  // Observational image-space samples only; neither solar photometry nor a semantic terrain segmentation.
  for (let y = bounds.top; y < bounds.bottomExclusive; y++) for (let x = bounds.left; x < bounds.rightExclusive; x++) {
    const region = y < bounds.divisionY ? regions.sky : regions.ground, i = (y * image.width + x) * 4;
    region.n++; for (let c = 0; c < 3; c++) region.sum[c] += image.data[i+c];
  }
  regionStats.push({ name, regions: Object.fromEntries(Object.entries(regions).map(([key,r]) => [key,{ samples:r.n,meanSrgb:r.sum.map(sum=>sum/r.n) }])) });
}
const program = await boundedWechatConnect(() => sdk.launcher.connectTool({ wsEndpoint: "ws://127.0.0.1:9441" }), 5000);
boundWechatProtocol(program);
try {
  const page = await program.currentPage(); assert.equal(page.path, "sky/detail/index");
  const canvas = await page.$(".sky-orientation-canvas"), description = await canvas.attribute("aria-label");
  const theme = await (await page.$(".sky-orientation-page")).attribute("class");
  assert.equal(description, observations.state.description); assert.equal(theme, observations.currentMode);
  const size = await canvas.size();
  // Keep route/context/account IDs in memory; persist only the public fixture observation conditions.
  const response = await fetch("http://127.0.0.1:8789/v2/observation-contexts/" + encodeURIComponent(decodeURIComponent(page.query.contextId)), { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200); const context = (await response.json()).data;
  assert.equal(context.selectedAtUtc, "2026-09-28T16:00:00.000Z"); assert.ok(description.includes(context.selectedAtUtc));
  const manifest = await (await fetch("http://127.0.0.1:8789/v2/sky/landscape/manifest", {signal:AbortSignal.timeout(5000)})).json();
  assert.equal(manifest.publicationHash, "e5d1e76069fa002b5e2435a3f78615c2bb32ee52b18003cab036a50ed80056c5");
  assert.equal(sha(await fs.readFile(path.join(root, "workers/miniapp-api/assets/landscape/manifest.json"))), manifest.publicationHash);
  const resources = [];
  for (const resource of manifest.resources) {
    const response = await fetch("http://127.0.0.1:8789" + resource.image.downloadUrl, {signal:AbortSignal.timeout(5000)});
    assert.equal(response.status, 200); assert.equal(sha(new Uint8Array(await response.arrayBuffer())), resource.image.sha256);
    resources.push({ id: resource.id, sha256: resource.image.sha256, status: response.status });
  }
  const record = { scope: "Eight actual clean-v8 DevTools observations of night/dusk/noon, local/all-sky and red/normal. Recovery comparison is bounded to these reduced PNGs, public rounded 85.0-degree label and observed states. No phone, exact camera astrometry, weather/site data, native GPU failure, peak/FPS/package or complete experience acceptance.",
    generation: "v8", sdkPort: 9441, candidateSha256: fingerprint.sha256, candidateFileCount: fingerprint.fileCount, totalRawBytes: fingerprint.totalBytes,
    selectedAtUtc: context.selectedAtUtc, localDate: context.localDate, timezone: context.timezone, description, theme, canvasSize: size,
    located: await (await page.$(".sky-located-object"))?.attribute("aria-label") ?? null,
    publicationHash: manifest.publicationHash, resources, captures,
    redReturnPixels: { before: "environment-night-return-vega-local", after: "environment-normal-after-red", bounds, groups },
    regionStats, reference: "experience-environment-reference-unmatched-2026-09-28.json" };
  await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ candidateSha256: record.candidateSha256, files: record.candidateFileCount, captures: captures.length, canvasSize: size, redReturnPixels: groups, regionStats }));
} finally { await program.disconnect(); }
