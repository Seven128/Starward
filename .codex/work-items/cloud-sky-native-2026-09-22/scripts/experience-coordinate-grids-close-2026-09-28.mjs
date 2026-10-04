import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root = process.cwd(), item = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22");
const evidence = path.join(item, "evidence"), output = path.join(root, "output/playwright/cloud-sky-coordinate-grids-0928-final");
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const read = async file => JSON.parse(await fs.readFile(file, "utf8"));
const results = await read(path.join(output, "result.json"));
for (const source of results.sourceHashes) assert.equal(digest(await fs.readFile(path.join(root, source.file))), source.sha256);
const candidate = await read(path.join(evidence, "experience-combined-clean-v14-candidate-2026-09-28.json"));
assert.deepEqual(await fingerprintBundle(path.join(root, candidate.bundle)), candidate.fingerprint);
const previous = await read(path.join(evidence, "experience-combined-clean-v13-candidate-2026-09-28.json"));
assert.deepEqual(await fingerprintBundle(path.join(root, previous.bundle)), previous.fingerprint);
const decode = async (directory, row) => {
  const bytes = await fs.readFile(path.join(directory, row.filename));
  assert.equal(digest(bytes), row.sha256);
  return PNG.sync.read(bytes);
};
function difference(a, b, fromY = 0) {
  assert.equal(a.width, b.width); assert.equal(a.height, b.height);
  let changed = 0;
  for (let y = fromY; y < a.height; y++) for (let x = 0; x < a.width; x++) {
    const index = (y * a.width + x) * 4;
    if ([0, 1, 2, 3].some(channel => a.data[index + channel] !== b.data[index + channel])) changed++;
  }
  return changed;
}
const comparisons = [];
for (const fov of [85, 267.8]) {
  const group = results.rows.filter(row => row.at === "2026-09-28T16:00:00.000Z" && row.mode === "NIGHT" && row.fov === fov);
  assert.equal(group.length, 4);
  assert(group[0].snapshotObjects > 0);
  assert(group.every(row => row.paintedObjectsSha256 === group[0].paintedObjectsSha256 && row.paintedLandscape === group[0].paintedLandscape));
  const off = await decode(output, group.find(row => row.name === "night-off"));
  for (const row of group.filter(row => row.name !== "night-off")) {
    const current = await decode(output, row), changed = difference(off, current);
    assert(changed > 0, "selected grid must affect actual pixels");
    if (fov === 85) assert.equal(difference(off, current, 610), 0, "foreground must cover grid strokes");
    comparisons.push({ fov, variant: row.name, changedPixels: changed, samePaintedObjectIdentityAndPositions: true,
      ...(fov === 85 ? { coveredForegroundFromY: 610, changedForegroundPixels: 0 } : {}) });
  }
}
const baselineDirectory = path.join(root, "output/playwright/cloud-sky-environment-whole-scene-0928");
const baseline = await read(path.join(baselineDirectory, "result.json"));
const migrations = [];
for (const fov of [85, 267.8]) {
  const old = baseline.rows.find(row => row.name === "night" && row.fov === fov);
  const current = results.rows.find(row => row.name === "night-horizontal" && row.fov === fov);
  const changedPixels = difference(await decode(baselineDirectory, old), await decode(output, current));
  assert.equal(changedPixels, 0, "shared projection/rotation migration must preserve this actual existing scene");
  migrations.push({ fov, changedPixels });
}
const red = await decode(output, results.rows.find(row => row.name === "red-equatorial"));
let nonWarmRedPixels = 0;
const oneCodeTies = [];
for (let index = 0; index < red.data.length; index += 4) {
  const r = red.data[index], g = red.data[index + 1], b = red.data[index + 2];
  if ((g > 0 && g >= r) || (b > 0 && b >= r)) {
    if (Math.max(r, g, b) <= 1) oneCodeTies.push({ x: index / 4 % red.width, y: Math.floor(index / 4 / red.width), r, g, b });
    else nonWarmRedPixels++;
  }
}
assert.equal(nonWarmRedPixels, 0, "no neutral/green/blue dominance above one RGBA8 code in this red-mode sample");
const record = {
  scope: "Actual production full-Canvas software WebGL grid effects and unchanged object/foreground behavior, source and candidate binding. No Taro controls, native v14, phone, full quality/performance/cost or independent review acceptance.",
  productionSourceBundleSha256: results.sourceBundleSha256, sourceHashes: results.sourceHashes,
  unopenedCandidateHash: candidate.fingerprint.sha256, preservedUnopenedPreviousCandidateHash: previous.fingerprint.sha256,
  comparisons, migrations, nonWarmRedPixels, oneCodeTies, gridGeometryMeasurements: results.gridGeometryMeasurements,
  correctedCheck: "An initial check incorrectly required zero green/blue channels. Established warm-red colors legitimately retain smaller green/blue components; production palette was preserved and the check now rejects neutral/green/blue dominance.",
  referenceCapture: "appearance only; measured CSS canvas matches logical size but IAB host capture is scaled/padded, so no cross-reference pixel comparison",
  beforeFixObservedFailures: ["coordinate grid off: expected one horizon stroke group, received three", "grazing -60° parallel missing at sidereal 0.2°", "quick settings omitted: top inset 183 instead of 288 logical px"],
  afterFixChecks: "34 affected scene/grid/production-page/dome/viewport checks pass; tests log retained. Typecheck and final WEAPP build recorded separately.",
};
await fs.writeFile(path.join(evidence, "experience-coordinate-grids-close-2026-09-28.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ unopenedCandidateHash: record.unopenedCandidateHash, comparisons, migrations, nonWarmRedPixels, gridGeometryMeasurements: record.gridGeometryMeasurements }));
