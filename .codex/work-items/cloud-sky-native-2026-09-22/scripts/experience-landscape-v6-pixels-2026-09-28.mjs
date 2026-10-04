import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
const evidence = path.resolve(".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const output = path.join(evidence, "experience-landscape-v6-return-pixels-2026-09-28.json");
assert.equal(await fs.access(output).then(() => true, () => false), false);
const beforeName = "experience-combined-clean-v6-panorama-restored-normal-night85-r2-2026-09-28.png";
const afterName = "experience-combined-clean-v6-panorama-daymode-restored-night85-final-2026-09-28.png";
const before = PNG.sync.read(await fs.readFile(path.join(evidence, beforeName)));
const after = PNG.sync.read(await fs.readFile(path.join(evidence, afterName)));
assert.equal(before.width, after.width); assert.equal(before.height, after.height);
const groups = { sky: { samples: 0, changedPixels: 0, maximumChannelDifference: 0, absoluteChannelDifference: 0 },
  ground: { samples: 0, changedPixels: 0, maximumChannelDifference: 0, absoluteChannelDifference: 0 } };
for (let y = 150; y < 1000; y++) for (let x = 6; x < before.width - 6; x++) {
  const group = y < 630 ? groups.sky : groups.ground, i = (y * before.width + x) * 4;
  const deltas = [0, 1, 2].map(channel => Math.abs(before.data[i + channel] - after.data[i + channel]));
  group.samples++; group.changedPixels += Number(deltas.some(Boolean));
  group.maximumChannelDifference = Math.max(group.maximumChannelDifference, ...deltas);
  group.absoluteChannelDifference += deltas.reduce((sum, value) => sum + value, 0);
}
for (const group of Object.values(groups)) group.meanAbsoluteChannelDifference = group.absoluteChannelDifference / (group.samples * 3);
const record = { scope: "Actual fixed-v6 PNGs before/after public red mode then DAY Settings return; same 16Z/85-degree manual Rastaban. Static screenshot regions exclude OS/menu chrome, approximate sky/ground separation. Observation only, not phone, physical gestures, peak memory, complete quality or astrometry acceptance",
  before: beforeName, after: afterName, width: before.width, height: before.height,
  bounds: { left: 6, rightExclusive: before.width - 6, top: 150, bottomExclusive: 1000, divisionY: 630 }, groups };
await fs.writeFile(output, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(groups));
