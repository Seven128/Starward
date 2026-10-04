// Analyze only two task-owned official DevTools PNGs under the same public scene.
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
const { PNG } = createRequire(import.meta.url)("pngjs");
const base = path.resolve(".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const names = ["experience-horizon-85-native-2026-09-28.png",
  "experience-horizon-85-brightened-native-2026-09-28.png"];
const images = await Promise.all(names.map(async name => PNG.sync.read(await readFile(path.join(base, name)))));
const domeReturn = PNG.sync.read(await readFile(path.join(base,"experience-horizon-dome-return-2026-09-28.png")));
if (images.some(image => image.width !== 197 || image.height !== 423))
  throw new Error("unexpected_observation_dimensions");
if (domeReturn.width !== 197 || domeReturn.height !== 423)
  throw new Error("unexpected_return_dimensions");
const region = { left: 20, top: 321, rightExclusive: 177, bottomExclusive: 394 };
function stats(image) {
  let sum = 0, square = 0, count = 0;
  for (let y = region.top; y < region.bottomExclusive; y++)
    for (let x = region.left; x < region.rightExclusive; x++) {
      const i = (y * image.width + x) * 4;
      const luma = 0.2126 * image.data[i] + 0.7152 * image.data[i + 1] + 0.0722 * image.data[i + 2];
      sum += luma; square += luma * luma; count++;
    }
  const mean = sum / count;
  return { meanSrgbLuma: Number(mean.toFixed(2)), sdSrgbLuma: Number(Math.sqrt(square / count - mean * mean).toFixed(2)) };
}
let returnChangedPixels=0;
for(let y=44;y<400;y++)for(let x=0;x<197;x++){
  const i=(y*197+x)*4;
  if(images[1].data[i]!==domeReturn.data[i] ||
    images[1].data[i+1]!==domeReturn.data[i+1] ||
    images[1].data[i+2]!==domeReturn.data[i+2])returnChangedPixels++;
}
console.log(JSON.stringify({ scope: "development_simulator_observation", region,
  samples: names.map((name, i) => ({ file: name, ...stats(images[i]) })),
  domeReturn: { from: names[1], to: "experience-horizon-dome-return-2026-09-28.png",
    region: {left:0,top:44,rightExclusive:197,bottomExclusive:400},
    changedPixels: returnChangedPixels },
  limitation: "sRGB screenshot code values only; not photometric brightness or phone display measurement" }, null, 2));
