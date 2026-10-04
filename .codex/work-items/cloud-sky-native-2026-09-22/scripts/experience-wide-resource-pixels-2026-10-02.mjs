import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const events=(await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl','utf8')).trim().split(/\r?\n/).map(JSON.parse);
const event=stage=>{const value=events.findLast(row=>row.stage===stage)?.value;assert(value,stage);return value;};
const rows=[];
for(const [before,after,beforeView,afterView,qualification] of [
  ['wide-resource-before-wide139','wide-resource-current208','wide-resource-before-actual208-view','wide-resource-current208-view','Same complete208.386 camera; before/after W3 demand also permits landscape refinement. Historical before filename says139; actual serialized camera controls.'],
  ['wide-resource-cold-return208','wide-resource-source-return','wide-resource-cold-return208-view','wide-resource-source-return-view','Same complete208.386 camera and underlying Canvas layers; Vega selection/info state differs. This cannot certify full source journey or WXML composition.'],
  ['artwork-window-final','wide-resource-final','artwork-window-final-view','wide-resource-final-view','Same complete North45 camera/time; after public exit and same owned Context reentry.'],
]){
  assert.deepEqual(event(beforeView).view,event(afterView).view);
  const files=[before,after].map(stage=>task+'/evidence/experience-current-native-'+stage+'-2026-10-01.png');
  const bytes=await Promise.all(files.map(file=>fs.readFile(file))),images=bytes.map(bytes=>PNG.sync.read(bytes));
  assert(images.every(image=>image.width===427&&image.height===919));
  const region={x:1,y:91,width:425,height:799};let changedPixels=0,maxDelta=0;
  const changedColumns=new Map();
  for(let y=region.y;y<region.y+region.height;y++)for(let x=region.x;x<region.x+region.width;x++){
    let changed=false;for(let c=0;c<4;c++){
      const i=(y*427+x)*4+c,delta=Math.abs(images[0].data[i]-images[1].data[i]);
      changed ||= delta>0;maxDelta=Math.max(maxDelta,delta);
    }
    if(changed){changedPixels++;changedColumns.set(x,(changedColumns.get(x)??0)+1);}
  }
  rows.push({before,after,qualification,completedView:event(afterView).view,identicalCompletedView:true,
    inputs:files.map((path,i)=>({path,sha256:createHash('sha256').update(bytes[i]).digest('hex')})),
    region:{...region,changedPixels,maxDelta,strictStatus:changedPixels===0?'EXACT':'DIFFERENT',changedColumns:[...changedColumns]}});
}
const output=task+'/evidence/experience-wide-resource-native-pixels-2026-10-02.json';
await fs.writeFile(output,JSON.stringify({scope:'Original finite scene ROI; actual complete camera equality, qualifications and every difference retained. Native compositor, target/full quality and previous875/1254 failed comparisons remain open.',rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(rows.map(row=>({before:row.before,after:row.after,...row.region}))));
