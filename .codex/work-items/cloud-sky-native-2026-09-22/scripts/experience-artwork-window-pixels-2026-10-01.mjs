import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const raw=await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl');
const events=raw.toString().trim().split(/\r?\n/).map(JSON.parse);
const event=stage=>{const row=events.findLast(row=>row.stage===stage);assert(row,stage);return row.value;};
const previous=JSON.parse(await fs.readFile(task+'/evidence/experience-fixed-image-cold-binding-2026-10-01.json','utf8'));
const current=event('artwork-window-final-view').view,entry=event('artwork-window-north-view').view;
assert.deepEqual(current,entry);assert.deepEqual(current,previous.native.views.final);
const rows=[];
for(const [before,after] of [['fixed-image-cold-final','artwork-window-north'],['artwork-window-north','artwork-window-final']]){
  const names=[before,after].map(stage=>task+'/evidence/experience-current-native-'+stage+'-2026-10-01.png');
  const bytes=await Promise.all(names.map(file=>fs.readFile(file))),images=bytes.map(bytes=>PNG.sync.read(bytes));
  for(const image of images)assert(image.width===427&&image.height===919);
  const region={x:1,y:91,width:425,height:799};let changedPixels=0,maxDelta=0;
  for(let y=region.y;y<region.y+region.height;y++)for(let x=region.x;x<region.x+region.width;x++){
    let changed=false;for(let c=0;c<4;c++){const i=(y*427+x)*4+c,delta=Math.abs(images[0].data[i]-images[1].data[i]);
      changed ||= delta>0;maxDelta=Math.max(maxDelta,delta);}if(changed)changedPixels++;
  }
  rows.push({before,after,inputs:names.map((path,i)=>({path,sha256:createHash('sha256').update(bytes[i]).digest('hex')})),
    identicalCompletedView:true,region:{...region,changedPixels,maxDelta,strictStatus:changedPixels===0?'EXACT':'DIFFERENT'}});
}
const output=task+'/evidence/experience-artwork-window-native-pixels-2026-10-01.json';
await fs.writeFile(output,JSON.stringify({scope:'Original finite scene ROI and independently equal full completed North45 camera/time. Not full WXML or target quality acceptance. Initial Moon tracking had no full serialized camera readback, so no qualified Moon/Source ROI comparison is claimed.',
  completedView:current,rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,rows:rows.map(row=>({before:row.before,after:row.after,...row.region}))}));
for(const row of rows)assert(row.region.maxDelta<=1,'Existing finite numerical bound exceeded');
