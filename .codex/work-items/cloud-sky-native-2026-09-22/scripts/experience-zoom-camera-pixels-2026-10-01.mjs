import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const output=task+'/evidence/experience-zoom-camera-native-pixels-2026-10-01.json';
await assert.rejects(fs.access(output),{code:'ENOENT'});
const events=(await fs.readFile(task+'/evidence/experience-current-native-events-2026-10-01.jsonl','utf8')).trim().split(/\r?\n/).map(JSON.parse);
const view=stage=>{const value=events.findLast(row=>row.stage===stage+'-view')?.value.view;assert(value,stage);return value;};
const pairs=[['legacy-ratio-return','zoom-camera-baseline','zoom-camera-return'],
  ['matched-input-return','zoom-camera-matched-baseline','zoom-camera-matched-return']];
const rows=[];
for(const [name,beforeName,afterName] of pairs){
  const paths=[beforeName,afterName].map(stage=>task+'/evidence/experience-current-native-'+stage+'-2026-10-01.png');
  const bytes=await Promise.all(paths.map(file=>fs.readFile(file))),images=bytes.map(body=>PNG.sync.read(body));
  for(const image of images){assert.equal(image.width,427);assert.equal(image.height,919);}
  const region={x:3,y:96,width:421,height:799};let changedPixels=0,maxDelta=0,totalChannelDelta=0;
  for(let y=region.y;y<region.y+region.height;y++)for(let x=region.x;x<region.x+region.width;x++){
    let changed=false;for(let c=0;c<4;c++){const i=(y*427+x)*4+c,delta=Math.abs(images[0].data[i]-images[1].data[i]);if(delta)changed=true;maxDelta=Math.max(maxDelta,delta);totalChannelDelta+=delta;}if(changed)changedPixels++;
  }
  const before=view(beforeName),after=view(afterName);
  rows.push({name,inputs:paths.map((path,i)=>({path,sha256:createHash('sha256').update(bytes[i]).digest('hex')})),beforeView:before,afterView:after,
    exactCompletedCameraEqual:JSON.stringify(before)===JSON.stringify(after),
    differences:{fovDeg:after.verticalFovDeg-before.verticalFovDeg,scalePx:after.scale-before.scale,
      basisMax:Math.max(...['right','up','forward'].flatMap(key=>before.basis[key].map((v,i)=>Math.abs(v-after.basis[key][i])))),
      centerMax:Math.max(Math.abs(before.center.x-after.center.x),Math.abs(before.center.y-after.center.y))},
    region:{...region,changedPixels,maxDelta,totalChannelDelta}});
}
await fs.writeFile(output,JSON.stringify({scope:'Finite actual DevTools scene region, same current source/Context. Camera equality is checked before claiming return pixel equality. No threshold relaxation or old-camera reconstruction.',rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,rows:rows.map(row=>({name:row.name,exactCameraEqual:row.exactCompletedCameraEqual,differences:row.differences,region:row.region}))}));
assert.equal(rows[0].exactCompletedCameraEqual,false,'the prior ratio stream must not be classified as a matching camera');
assert.equal(rows[1].exactCompletedCameraEqual,true,'the matched public touch stream must return the same complete submitted view');
assert(rows[1].region.maxDelta<=1,'matching-camera native return exceeds the existing single-step rounding bound');
