import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
const folder = new URL("../evidence/", import.meta.url);
const names = ["experience-flow-recovery-manual-native-2026-09-28.png", "experience-flow-recovery-returned-native-2026-09-28.png"];
const bytes = await Promise.all(names.map(name => readFile(new URL(name, folder))));
const frames = bytes.map(buffer => PNG.sync.read(buffer));
if (frames.some(frame => frame.width !== 197 || frame.height !== 423)) throw new Error("unexpected_native_screenshot_dimensions");
const regions = [["sky", 2, 50, 194, 329], ["ground", 2, 341, 194, 410]];
const result = { scope: "development_native_output_comparison", marker: "FLOW0928", port: 9430,
  inputs: names.map((name, index) => ({ name, sha256: createHash("sha256").update(bytes[index]).digest("hex") })),
  regions: regions.map(([name, x0, y0, x1, y1]) => {
    let pixels = 0, changed = 0, maximumChannelDelta = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const offset = (y * frames[0].width + x) * 4;
      const differences = [0, 1, 2, 3].map(channel => Math.abs(frames[0].data[offset + channel] - frames[1].data[offset + channel]));
      pixels++; if (differences.some(Boolean)) changed++;
      maximumChannelDelta = Math.max(maximumChannelDelta, ...differences);
    }
    return { name, bounds: { x0, y0, x1, y1 }, pixels, changed, maximumChannelDelta };
  }), phoneVerified: false, calibrationVerified: false };
await writeFile(new URL("experience-flow-recovery-pixels-2026-09-28.json", folder), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(result));
