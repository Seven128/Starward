import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { PNG } from "pngjs";

const evidence = path.resolve(".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const mode = process.argv[2] ?? "first"; assert.ok(["first", "bounds"].includes(mode));
const output = path.join(evidence, `experience-resource-native-pixels${mode === "bounds" ? "-bounds" : ""}-2026-09-28.json`);
assert.ok(!await fs.access(output).then(() => true, () => false), "preserve prior evidence");
const captureBounds = mode === "bounds" ? JSON.parse(await fs.readFile(path.join(evidence,
  "experience-resource-native-capture-bounds-2026-09-28.json"), "utf8")) : null;
const results = [];
for (const [scenario, suffix] of [["moon", "after"], ["m31", "after"], ["m31", "source-back"],
  ...(mode === "bounds" ? [["m31", "stable"]] : [])]) {
  const beforeName = `experience-combined-clean-v4-resources-${scenario}-before-2026-09-28.png`;
  const afterName = `experience-combined-clean-v4-resources-${scenario}-${suffix}-2026-09-28.png`;
  const before = PNG.sync.read(await fs.readFile(path.join(evidence, beforeName)));
  const after = PNG.sync.read(await fs.readFile(path.join(evidence, afterName)));
  assert.equal(after.width, before.width); assert.equal(after.height, before.height);
  const top = captureBounds ? Math.ceil(captureBounds.capsule.bottom * before.height / captureBounds.screenHeight) + 4 : 40;
  const crop = { x: 4, y: top, right: before.width - 4, bottom: before.height - 15 };
  let wholeChanged = 0, skyChanged = 0, maxSkyChannelDelta = 0;
  for (let y = 0; y < before.height; y++) for (let x = 0; x < before.width; x++) {
    const offset = (y * before.width + x) * 4;
    let delta = 0;
    for (let channel = 0; channel < 4; channel++) delta = Math.max(delta, Math.abs(before.data[offset + channel] - after.data[offset + channel]));
    if (delta) wholeChanged++;
    if (x >= crop.x && x < crop.right && y >= crop.y && y < crop.bottom) {
      if (delta) skyChanged++;
      maxSkyChannelDelta = Math.max(maxSkyChannelDelta, delta);
    }
  }
  results.push({ scenario, transition: suffix, before: beforeName, after: afterName,
    imageSize: { width: before.width, height: before.height }, crop, wholeChanged, skyChanged, maxSkyChannelDelta });
}
const record = { scope: mode === "bounds"
  ? "Read-only native DevTools PNG comparison; same public observer/time/FOV/object. Crop derives its top from actual native capsule bounds with a 4px UI-shadow guard, excludes screen edges/bottom gesture area. No phone composition or physical precision acceptance."
  : "First read-only native DevTools PNG analysis; its y=40 crop was subsequently found to include the native capsule edge. Preserve the measured values, use the bounds-derived analysis for sky-only interpretation.",
  captureBounds, results };
await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(record));
