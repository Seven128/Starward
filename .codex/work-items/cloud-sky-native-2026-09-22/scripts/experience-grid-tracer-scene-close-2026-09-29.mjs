import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";

const root = process.cwd(), item = path.join(root, ".codex/work-items/cloud-sky-native-2026-09-22");
const resultFile = path.join(item, "evidence/grid-tracer-cost-2026-09-29/scene-comparison.json");
await assert.rejects(fs.access(resultFile), { code: "ENOENT" });
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const oldDir = path.join(root, "output/playwright/cloud-sky-coordinate-grids-0928-final");
const nextDir = path.join(root, "output/playwright/cloud-sky-coordinate-grids-0929-optimized");
const old = JSON.parse(await fs.readFile(path.join(oldDir, "result.json"), "utf8"));
const next = JSON.parse(await fs.readFile(path.join(nextDir, "result.json"), "utf8"));
assert.deepEqual(next.observer, old.observer); assert.deepEqual(next.logicalCanvas, old.logicalCanvas); assert.deepEqual(next.backing, old.backing);
assert.deepEqual(next.images, old.images); assert.equal(next.catalogHash, old.catalogHash); assert.equal(next.constellationHash, old.constellationHash);
const sourceChanges = [];
for (const source of next.sourceHashes) {
  assert.equal(digest(await fs.readFile(path.join(root, source.file))), source.sha256, "current_renderer_source_changed");
  const previous = old.sourceHashes.find(value => value.file === source.file);
  assert(previous, "source_owner_added");
  if (previous.sha256 !== source.sha256) sourceChanges.push(source.file);
}
assert.deepEqual(sourceChanges, ["apps/wechat-miniapp/src/features/sky/sky-grid-projection.ts"]);
assert.equal(next.rows.length, old.rows.length);
const rows = [];
for (const row of next.rows) {
  const prior = old.rows.find(value => value.filename === row.filename); assert(prior);
  assert.equal(row.at, prior.at); assert.equal(row.paintedObjectsSha256, prior.paintedObjectsSha256);
  assert.deepEqual(row.grids, prior.grids); assert.deepEqual(row.failures, []); assert.equal(row.error, 0);
  const a = PNG.sync.read(await fs.readFile(path.join(oldDir, prior.filename)));
  const b = PNG.sync.read(await fs.readFile(path.join(nextDir, row.filename)));
  assert.equal(a.width, b.width); assert.equal(a.height, b.height);
  let changedPixels = 0, maximumChannelDelta = 0;
  for (let index = 0; index < a.data.length; index += 4) {
    let changed = false;
    for (let channel = 0; channel < 4; channel++) {
      const delta = Math.abs(a.data[index + channel] - b.data[index + channel]);
      maximumChannelDelta = Math.max(maximumChannelDelta, delta); changed ||= delta !== 0;
    }
    if (changed) changedPixels++;
  }
  assert.equal(changedPixels, 0, `actual_full_scene_pixels_changed:${row.filename}`);
  rows.push({ filename: row.filename, width: b.width, height: b.height, changedPixels, maximumChannelDelta,
    paintedObjectsSha256: row.paintedObjectsSha256, snapshotObjectCount: row.snapshotObjects,
    snapshotCountMeaning: "production pre-mask object entries, not a visible/pickable count", afterImageSha256: row.sha256 });
}
const preservedCandidates = [];
for (const generation of ["v13", "v14"]) {
  const candidate = JSON.parse(await fs.readFile(path.join(item, `evidence/experience-combined-clean-${generation}-candidate-2026-09-28.json`), "utf8"));
  assert.equal((await fingerprintBundle(path.join(root, candidate.bundle))).sha256, candidate.fingerprint.sha256);
  preservedCandidates.push({ generation, sha256: candidate.fingerprint.sha256, openedByThisDiagnostic: false });
}
await fs.writeFile(resultFile, JSON.stringify({ at: new Date().toISOString(),
  scope: "Current production Canvas/GPU comparison against pre-optimization production output, same public data/camera/time/images/palette. This certifies only these software-rendered samples; no Taro UI/control composition, sensor, native, phone, absolute astrometry, whole-scene quality or full-frame performance acceptance.",
  sourceChanges, beforeSourceBundleSha256: old.sourceBundleSha256, afterSourceBundleSha256: next.sourceBundleSha256,
  preservedCandidates, rows }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ cases: rows.length, changedPixels: rows.reduce((sum, row) => sum + row.changedPixels, 0), sourceChanges, preservedCandidates }));
