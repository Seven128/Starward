import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const root = process.cwd(), prefix = "output/playwright/cloud-sky-galactic-causal-0929-";
const before = JSON.parse(await fs.readFile(prefix + "before/result.json", "utf8"));
const after = JSON.parse(await fs.readFile(prefix + "after/result.json", "utf8"));
assert.equal(before.inputsSha256, after.inputsSha256); assert.deepEqual(before.publications, after.publications);
for (const input of before.sourceHashes) if (!input.file.endsWith("/sky-gpu-renderer.ts"))
  assert.equal(after.sourceHashes.find(next => next.file === input.file)?.sha256, input.sha256, input.file);
const pixels = async (phase, row) => fs.readFile(prefix + phase + "/" + row.filename.replace(".png", ".rgba"));
const sourceMetrics = (published, disabled) => {
  const count = published.length / 4, source = new Float64Array(count);
  for (let i = 0; i < count; i++) source[i] = [0, 1, 2].reduce((sum, c) =>
    sum + Math.max(0, published[4 * i + c] - disabled[4 * i + c]), 0) / 3;
  let sum = 0, squared = 0, laplace = 0, samples = 0;
  for (const value of source) { sum += value; squared += value * value; }
  for (let y = 1; y < 843; y++) for (let x = 1; x < 389; x++) {
    const i = y * 390 + x;
    const value = source[i] - (source[i - 1] + source[i + 1] + source[i - 390] + source[i + 390]) / 4;
    laplace += value * value; samples++;
  }
  return { meanDisplayContribution: sum / count, displayStandardDeviation: Math.sqrt(squared / count - (sum / count) ** 2),
    highFrequencyRms: Math.sqrt(laplace / samples), scope: "RGB code-value contribution to the final full scene, not radiance, astrometry or a quality acceptance threshold" };
};
const delta = (a, b) => {
  let changedPixels = 0, maxChannelDifference = 0;
  for (let i = 0; i < a.length; i += 4) {
    let changed = false;
    for (let c = 0; c < 4; c++) { const d = Math.abs(a[i + c] - b[i + c]); maxChannelDifference = Math.max(maxChannelDifference, d); changed ||= d > 0; }
    changedPixels += Number(changed);
  }
  return { changedPixels, maxChannelDifference };
};
const rows = [];
for (const old of before.rows.filter(row => row.control === "published")) {
  const next = after.rows.find(row => row.name === old.name && row.control === "published");
  assert.equal(next.objectsSha256, old.objectsSha256); assert.deepEqual(next.picks, old.picks); assert.equal(next.landscape, old.landscape);
  const oldPixels = await pixels("before", old), nextPixels = await pixels("after", next);
  const oldOff = before.rows.find(row => row.name === old.name && row.control === "disabled-study-only");
  const nextOff = after.rows.find(row => row.name === old.name && row.control === "disabled-study-only");
  const offPixels = await pixels("before", oldOff);
  assert.equal(oldOff.rgbaSha256, nextOff.rgbaSha256, "independent layers remain pixel-identical");
  const oldFallback = before.rows.find(row => row.name === old.name && row.control === "schematic");
  const nextFallback = after.rows.find(row => row.name === old.name && row.control === "schematic");
  assert.equal(oldFallback.rgbaSha256, nextFallback.rgbaSha256, "actual schematic recovery unchanged");
  const a = sourceMetrics(oldPixels, offPixels), b = sourceMetrics(nextPixels, offPixels);
  const change = delta(oldPixels, nextPixels);
  if (old.name === "dome" || old.mode === "OBSERVATION") assert.deepEqual(change, { changedPixels: 0, maxChannelDifference: 0 });
  else { assert(b.meanDisplayContribution > 0, "the real Galactic background must remain");
    assert(b.highFrequencyRms < a.highFrequencyRms, "magnified panorama grain must actually decrease"); }
  rows.push({ name: old.name, fov: old.fov, objects: old.objects.length, catalogueAndPicksIdentical: true,
    independentLayerPixelsIdentical: true, schematicPixelsIdentical: true, publishedChange: change, before: a, after: b,
    highFrequencyReductionPercent: a.highFrequencyRms ? 100 * (1 - b.highFrequencyRms / a.highFrequencyRms) : null,
    beforeImage: prefix + "before/" + old.filename, afterImage: prefix + "after/" + next.filename });
}
// Escaped-defect regression: the unchanged old renderer substituted for the
// proposed fix cannot satisfy the same actual-pixel grain reduction check.
const local = rows.find(row => row.name === "polaris-local");
assert.throws(() => assert(local.before.highFrequencyRms < local.before.highFrequencyRms,
  "magnified panorama grain must actually decrease"), { code: "ERR_ASSERTION" });
const record = { scope: "Same immutable actual inputs and completed production GPU scenes. Self-reviewed display evidence and bounded old-renderer counterfactual; no native/device quality or performance acceptance.",
  inputsSha256: before.inputsSha256, beforeBundle: before.sourceBundleSha256, afterBundle: after.sourceBundleSha256,
  sourceImageSha256: before.images.find(asset => asset.id === "galactic").sha256,
  oldRendererCounterfactual: "fails actual high-frequency reduction check", rows };
const output = ".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-galactic-causal-validation-2026-09-29.json";
await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ output, rows: rows.map(row => ({ name: row.name, changedPixels: row.publishedChange.changedPixels,
  reductionPercent: row.highFrequencyReductionPercent, meanBefore: row.before.meanDisplayContribution, meanAfter: row.after.meanDisplayContribution })) }));
