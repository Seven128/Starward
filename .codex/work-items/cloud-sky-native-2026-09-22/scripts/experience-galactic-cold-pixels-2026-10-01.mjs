import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22',output=task+'/evidence/experience-galactic-cold-native-pixels-2026-10-01.json';
await assert.rejects(fs.access(output),{code:'ENOENT'});
const pairs=[['before-baseline','landscape-empty-view-mask-owner-final','galactic-cold-baseline'],
 ['before-noon','landscape-empty-view-noon','galactic-cold-noon'],
 ['cancel-return','galactic-cold-baseline','galactic-cold-restored'],
 ['local-return','galactic-cold-baseline','galactic-cold-return']];
const rows=[];
for(const [name,beforeName,currentName] of pairs){
 const paths=[beforeName,currentName].map(stage=>task+'/evidence/experience-current-native-'+stage+'-2026-10-01.png');
 const bytes=await Promise.all(paths.map(file=>fs.readFile(file))),images=bytes.map(body=>PNG.sync.read(body));
 assert.equal(images[0].width,427);assert.equal(images[0].height,919);assert.equal(images[1].width,427);assert.equal(images[1].height,919);
 let changedPixels=0,maxDelta=0;const region={x:3,y:96,width:421,height:799};
 for(let y=region.y;y<region.y+region.height;y++)for(let x=region.x;x<region.x+region.width;x++){
  let changed=false;for(let channel=0;channel<4;channel++){const i=(y*427+x)*4+channel,delta=Math.abs(images[0].data[i]-images[1].data[i]);if(delta)changed=true;maxDelta=Math.max(maxDelta,delta);}if(changed)changedPixels++;
 }
 rows.push({name,inputs:paths.map((path,i)=>({path,sha256:createHash('sha256').update(bytes[i]).digest('hex')})),region:{...region,changedPixels,maxDelta}});
}
await fs.writeFile(output,JSON.stringify({scope:'Actual finite native scene-region comparisons at the recorded original Context and view scale. Pixels do not measure file/decoded/GPU/OS memory or full composition.',rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,rows:rows.map(row=>({name:row.name,...row.region}))}));
for(const row of rows)assert(row.region.maxDelta<=1,row.name+': native difference exceeds the previously observed single-step rounding bound');
