import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {PNG} from "pngjs";

const evidence=path.resolve(".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const source="experience-combined-clean-v5-flow-r5-restore-2026-09-28.json";
const flow=JSON.parse(await fs.readFile(path.join(evidence,source),"utf8"));
const bounds=JSON.parse(await fs.readFile(path.join(evidence,"experience-combined-clean-v5-flow-capture-bounds-2026-09-28.json"),"utf8"));
assert.equal(bounds.candidateHash,flow.candidateHash);
const captures=new Map(flow.events.filter(event=>event.capture).map(event=>[event.capture,event]));
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
async function image(label){const event=captures.get(label);assert.ok(event);const bytes=await fs.readFile(path.join(evidence,event.filename));
 assert.equal(digest(bytes),event.sha256);return {filename:event.filename,png:PNG.sync.read(bytes)};}
const results=[];
for(const [beforeLabel,afterLabel] of [["vega-0000-before","vega-0000-after"],["vega-tracked-0030-before","vega-tracked-0030-after"],["vega-tracked-0030-before","tracked-detail-return"],["vega-0000-before","final-restored"]]){
 const before=await image(beforeLabel),after=await image(afterLabel);const {width,height}=before.png;
 assert.equal(after.png.width,width);assert.equal(after.png.height,height);
 const crop={x:4,y:Math.ceil(bounds.capsule.bottom*height/bounds.screenHeight)+4,right:width-4,bottom:height-15};
 let wholeChanged=0,skyChanged=0,maxSkyChannelDelta=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const offset=(y*width+x)*4;let delta=0;
  for(let channel=0;channel<4;channel++)delta=Math.max(delta,Math.abs(before.png.data[offset+channel]-after.png.data[offset+channel]));
  if(delta)wholeChanged++;
  if(x>=crop.x&&x<crop.right&&y>=crop.y&&y<crop.bottom){if(delta)skyChanged++;maxSkyChannelDelta=Math.max(maxSkyChannelDelta,delta);}
 }
 results.push({before:before.filename,after:after.filename,imageSize:{width,height},crop,wholeChanged,skyChanged,maxSkyChannelDelta});
}
const result={scope:"Read-only exact DevTools PNG comparison, capture hashes bound to public state and immutable candidate. Excludes actual native capsule/status area, screen edges and gesture area; no phone composition, sensor, memory or performance acceptance",source,candidateHash:flow.candidateHash,bounds,results};
await fs.writeFile(path.join(evidence,"experience-combined-clean-v5-flow-native-pixels-2026-09-28.json"),JSON.stringify(result,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify(result));
