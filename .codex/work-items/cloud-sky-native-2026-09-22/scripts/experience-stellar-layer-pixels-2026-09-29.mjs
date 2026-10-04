import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';

const evidence=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22/evidence');
const output=path.join(evidence,'experience-stellar-layer-pixels-2026-09-29.json');
await assert.rejects(fs.access(output),{code:'ENOENT'});
const off=JSON.parse(await fs.readFile(path.join(evidence,'experience-stellar-layer-off-marker-2026-09-29.json'),'utf8'));
const wide=JSON.parse(await fs.readFile(path.join(evidence,'experience-stellar-layer-wide-projection-2026-09-29.json'),'utf8'));
const finePoint={x:off.width/2,y:off.height/2};
const cases=[
 ['fine-visible',finePoint],['fine-settled',finePoint],['fine-unblocked',finePoint],
 ['vega-anchor-wide-stars',off.results[1].painted],['vega-fine-return',off.results[1].painted],
 ['vega-return-wide-hidden',wide.results[1].target],
];
const decoded=new Map();
async function image(stage){
 const file=`experience-stellar-v30-${stage}-2026-09-29.png`;
 if(!decoded.has(file)){
  const bytes=await fs.readFile(path.join(evidence,file));
  const png=PNG.sync.read(bytes);assert.equal(png.width,427);assert.equal(png.height,919);
  decoded.set(file,{file,sha256:createHash('sha256').update(bytes).digest('hex'),png});
 }
 return decoded.get(file);
}
function sample(png,x,y){const p=4*(y*png.width+x);const rgb=Array.from(png.data.subarray(p,p+3));return{x,y,rgb,luma:rgb.reduce((a,b)=>a+b,0)/3};}
const measurements=[];
for(const [stage,point] of cases){
 const data=await image(stage);
 // Full-image scaling is only a bounded neighbourhood estimate. Exact native
 // capture-to-CSS calibration and ordinary overlay composition remain open.
 const x=Math.round(point.x*data.png.width/off.width),y=Math.round(point.y*data.png.height/off.height);
 const core=[],background=[];
 for(let dy=-10;dy<=10;dy++)for(let dx=-10;dx<=10;dx++){
  if(Math.abs(dx)<=5&&Math.abs(dy)<=5)core.push(sample(data.png,x+dx,y+dy));
  else if(Math.max(Math.abs(dx),Math.abs(dy))>=8)background.push(sample(data.png,x+dx,y+dy).luma);
 }
 core.sort((a,b)=>b.luma-a.luma);background.sort((a,b)=>a-b);
 const backgroundMedian=background[Math.floor(background.length/2)];
 measurements.push({stage,file:data.file,sha256:data.sha256,logicalPoint:point,predictedImagePoint:{x,y},
  peak:core[0],backgroundMedian,peakMinusBackground:core[0].luma-backgroundMedian,
  scope:'Read-only original PNG samples; local point evidence, not flux calibration or whole-field registration'});
}
const crop={left:4,right:423,top:100,bottom:890};
async function compare(left,right){
 const a=(await image(left)).png,b=(await image(right)).png;
 let changedPixels=0,maxChannelDifference=0;
 for(let y=crop.top;y<crop.bottom;y++)for(let x=crop.left;x<crop.right;x++){
  const p=4*(y*a.width+x);let changed=false;
  for(let c=0;c<4;c++){const delta=Math.abs(a.data[p+c]-b.data[p+c]);changed||=delta>0;maxChannelDifference=Math.max(maxChannelDifference,delta);}
  changedPixels+=Number(changed);
 }
 return{left,right,crop,changedPixels,maxChannelDifference};
}
const comparisons={fineInitialToSettled:await compare('fine-visible','fine-settled'),
 fineBeforeToAfterPublicOverlay:await compare('fine-settled','fine-unblocked'),
 fineWideFineReturn:await compare('vega-anchor-wide-stars','vega-fine-return')};
const record={scope:'Native original Canvas pixels sampled without editing, resizing or synthetic image generation.',
 measurements,comparisons,limits:['Image-to-CSS scaling is approximate; only the measured bounded neighbourhood is claimed.',
  'Independent off-marker coordinate picks establish actual selected identities; pixels alone do not identify a star.',
  'Fine-to-settled comparison does not prove asynchronous arrival if both captures already contain the target.',
  'Ordinary DOM overlays, phone/GPU memory, target performance and full scientific registration remain unverified.']};
await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,measurements:measurements.map(({stage,peak,backgroundMedian,peakMinusBackground})=>({stage,peak,backgroundMedian,peakMinusBackground})),comparisons}));
