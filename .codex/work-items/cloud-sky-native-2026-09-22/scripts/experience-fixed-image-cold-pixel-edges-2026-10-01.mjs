import fs from 'node:fs/promises';
import {PNG} from 'pngjs';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const comparison=JSON.parse(await fs.readFile(task+'/evidence/experience-fixed-image-cold-native-pixels-2026-10-01.json','utf8'));
const rows=[];
for(const row of comparison.rows.filter(row=>row.region.maxDelta>1)){
 const images=await Promise.all(row.inputs.map(async input=>PNG.sync.read(await fs.readFile(input.path))));
 const columns=new Map(),samples=[];let interiorChangedPixels=0,interiorMaxDelta=0;
 const r=row.region;
 for(let y=r.y;y<r.y+r.height;y++)for(let x=r.x;x<r.x+r.width;x++){
  let delta=0;const i=(y*images[0].width+x)*4;
  for(let c=0;c<4;c++)delta=Math.max(delta,Math.abs(images[0].data[i+c]-images[1].data[i+c]));
  if(delta){columns.set(x,(columns.get(x)??0)+1);if(samples.length<4)samples.push({x,y,before:[...images[0].data.subarray(i,i+4)],after:[...images[1].data.subarray(i,i+4)]});}
  if(x>=3&&x<424){if(delta)interiorChangedPixels++;interiorMaxDelta=Math.max(interiorMaxDelta,delta);}
 }
 rows.push({name:row.name,originalRegion:row.region,columns:[...columns].map(([x,count])=>({x,count})),samples,
  separatelyMeasuredInterior:{x:3,y:r.y,width:421,height:r.height,changedPixels:interiorChangedPixels,maxDelta:interiorMaxDelta}});
}
const output=task+'/evidence/experience-fixed-image-cold-pixel-edges-2026-10-01.json';
await fs.writeFile(output,JSON.stringify({scope:'Spatial diagnosis only. The original ROI comparison remains failed; a narrower interior is reported separately and does not upgrade full screenshot/composition acceptance.',rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,rows}));
