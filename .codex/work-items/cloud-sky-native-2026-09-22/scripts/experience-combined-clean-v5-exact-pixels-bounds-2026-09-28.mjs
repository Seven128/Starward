import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {PNG} from "pngjs";
const evidence=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const exact=JSON.parse(await fs.readFile(path.join(evidence,"experience-combined-clean-v5-exact-zoom-2026-09-28.json"),"utf8"));
const flow=JSON.parse(await fs.readFile(path.join(evidence,"experience-combined-clean-v5-flow-r5-restore-2026-09-28.json"),"utf8"));
const bounds=JSON.parse(await fs.readFile(path.join(evidence,"experience-combined-clean-v5-exact-capture-bounds-2026-09-28.json"),"utf8"));
assert.equal(exact.candidateHash,bounds.candidateHash);assert.equal(exact.candidateHash,flow.candidateHash);
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
async function image(event){const bytes=await fs.readFile(path.join(evidence,event.filename));assert.equal(digest(bytes),event.sha256);return PNG.sync.read(bytes);}
const captures=new Map(flow.events.filter(e=>e.capture).map(e=>[e.capture,e]));
const pairs=[["exact25-full-dome25",exact.events.find(e=>e.capture==="before"),exact.events.find(e=>e.capture==="after")],
 ["source-return-0000",captures.get("vega-0000-before"),captures.get("vega-0000-after")],
 ["source-return-tracked-0030",captures.get("vega-tracked-0030-before"),captures.get("vega-tracked-0030-after")],
 ["rounded-readout-zoom-return",captures.get("vega-tracked-0030-before"),captures.get("tracked-detail-return")]];
const results=[];
for(const [label,beforeEvent,afterEvent] of pairs){const before=await image(beforeEvent),after=await image(afterEvent);
 assert.equal(before.width,after.width);assert.equal(before.height,after.height);
 const edge=Math.ceil(8*before.width/exact.metrics.canvas.width);
 const crop={x:edge,y:Math.ceil((exact.metrics.capsule.bottom+8)*before.height/bounds.screenHeight),right:before.width-edge,bottom:Math.floor((bounds.safeArea.bottom-8)*before.height/bounds.screenHeight)};
 let changed=0,maxChannelDelta=0,greaterThanOne=0;
 for(let y=crop.y;y<crop.bottom;y++)for(let x=crop.x;x<crop.right;x++){const i=(y*before.width+x)*4;let delta=0;
  for(let c=0;c<4;c++)delta=Math.max(delta,Math.abs(before.data[i+c]-after.data[i+c]));
  if(delta)changed++;if(delta>1)greaterThanOne++;maxChannelDelta=Math.max(maxChannelDelta,delta);}
 results.push({label,before:beforeEvent.filename,after:afterEvent.filename,imageSize:{width:before.width,height:before.height},crop,changed,maxChannelDelta,greaterThanOne});
}
const result={scope:"Read-only actual safe-area/scale-derived comparison; 8 logical-pixel edge/shadow guard, same convention across resolutions. Raw first crops and strict exact-zero failure preserved. No tolerance acceptance, phone quality or performance claim",candidateHash:exact.candidateHash,bounds,firstExactResult:{changed:exact.skyChanged,maxChannelDelta:exact.maxSkyChannelDelta},results};
await fs.writeFile(path.join(evidence,"experience-combined-clean-v5-exact-pixels-bounds-2026-09-28.json"),JSON.stringify(result,null,2)+"\n",{flag:"wx"});console.log(JSON.stringify(result));
