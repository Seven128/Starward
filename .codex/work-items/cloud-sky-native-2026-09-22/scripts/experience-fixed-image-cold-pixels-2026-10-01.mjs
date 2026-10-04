import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const pairs=[['before-current-local','tracking-composition-moon-local-first','fixed-image-cold-moon-local'],
 ['same-canvas-wide-return','fixed-image-cold-moon-local','fixed-image-cold-moon-return'],
 ['active-ruler-source-cancel','fixed-image-cold-moon-return','fixed-image-cold-source-return'],
 ['paused-source-return','fixed-image-cold-moon-paused','fixed-image-cold-paused-source-return'],
 ['night-final','twilight-gradient-reentered-final','fixed-image-cold-final']];
const rows=[];
for(const [name,before,after] of pairs){
 const paths=[before,after].map(stage=>task+'/evidence/experience-current-native-'+stage+'-2026-10-01.png');
 const bodies=await Promise.all(paths.map(file=>fs.readFile(file))),images=bodies.map(body=>PNG.sync.read(body));
 for(const image of images){assert.equal(image.width,427);assert.equal(image.height,919);}
 const region={x:1,y:91,width:425,height:799};let changedPixels=0,maxDelta=0,absoluteDelta=0;
 for(let y=region.y;y<region.y+region.height;y++)for(let x=region.x;x<region.x+region.width;x++){
  let changed=false;for(let c=0;c<4;c++){const i=(y*427+x)*4+c,d=Math.abs(images[0].data[i]-images[1].data[i]);if(d)changed=true;maxDelta=Math.max(maxDelta,d);if(c<3)absoluteDelta+=d;}if(changed)changedPixels++;
 }
 rows.push({name,inputs:paths.map((path,i)=>({path,sha256:createHash('sha256').update(bodies[i]).digest('hex')})),region:{...region,changedPixels,maxDelta,rgbMae:absoluteDelta/(region.width*region.height*3)}});
}
const output=task+'/evidence/experience-fixed-image-cold-native-pixels-2026-10-01.json';
await fs.writeFile(output,JSON.stringify({scope:'Finite native scene-region comparisons at separately checked completed cameras and instants. Not full overlay, physical input, target quality or memory acceptance.',rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,rows:rows.map(row=>({name:row.name,...row.region}))}));
for(const row of rows)assert(row.region.maxDelta<=1,row.name+': finite native scene difference exceeds the existing rounding bound');
