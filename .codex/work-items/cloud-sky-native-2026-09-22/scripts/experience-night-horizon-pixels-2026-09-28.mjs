// Compare task-owned native PNG outputs. These sRGB code values are not
// photometry, physical-device pixels or whole-experience acceptance.
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
const { PNG } = createRequire(import.meta.url)("pngjs");
const base = path.resolve(".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const names = ["experience-night-horizon-baseline-fenced-native-2026-09-28.png",
  "experience-night-horizon-85-fenced-native-2026-09-28.png"];
const images = await Promise.all(names.map(async name=>PNG.sync.read(await readFile(path.join(base,name)))));
if (images.some(image=>image.width!==197||image.height!==423)) throw new Error("unexpected_dimensions");
function compare(region) {
  let changed=0,count=0; const sums=[0,0,0],before=[0,0,0],after=[0,0,0];
  for (let y=region.top;y<region.bottom;y++) for(let x=region.left;x<region.right;x++) {
    const i=(y*197+x)*4;
    let different=false;
    for(let c=0;c<3;c++) {
      const delta=images[1].data[i+c]-images[0].data[i+c];
      sums[c]+=delta; before[c]+=images[0].data[i+c]; after[c]+=images[1].data[i+c];
      different ||= delta!==0;
    }
    if(different)changed++; count++;
  }
  const mean=values=>values.map(value=>Number((value/count).toFixed(3)));
  return {region,pixels:count,changedPixels:changed,meanBeforeRgb:mean(before),meanAfterRgb:mean(after),meanDeltaRgb:mean(sums)};
}
console.log(JSON.stringify({scope:"development_simulator_observation",from:names[0],to:names[1],
  regions:{upperSky:compare({left:10,top:55,right:187,bottom:175}),
    lowSky:compare({left:10,top:295,right:187,bottom:326}),
    ground:compare({left:10,top:342,right:187,bottom:399})},
  limitation:"Actual PNG comparison; sRGB screenshot code values only, not field sky brightness or phone display measurements"},null,2));
