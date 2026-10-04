import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)('pngjs');
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const names=['sky-reentered','galactic-production-ready','galactic-samples-recovered'];
const images=await Promise.all(names.map(async name=>{const file=task+'/evidence/experience-current-native-'+name+'-2026-10-01.png',b=await fs.readFile(file);return {name,file,sha256:createHash('sha256').update(b).digest('hex'),png:PNG.sync.read(b)};}));
const comparisons=[];
for(const [a,b]of [[images[0],images[2]],[images[1],images[2]]]){
 let maximum=0,changed=0,total=0;
 for(let y=110;y<895;y++)for(let x=0;x<427;x++)for(let c=0;c<4;c++){const i=(y*427+x)*4+c,d=Math.abs(a.png.data[i]-b.png.data[i]);maximum=Math.max(maximum,d);changed+=Number(d!==0);total++;}
 comparisons.push({before:a.name,after:b.name,maxDelta:maximum,changedChannels:changed,totalChannels:total});
}
const points=[[255,250],[197,264]];
const atPoint=points.map(([x,y])=>({x,y,colours:images.map(image=>({name:image.name,rgb:[...image.png.data.subarray((y*427+x)*4,(y*427+x)*4+3)]}))}));
let brightest={x:255,y:250,sum:0,rgb:[]};
for(let y=245;y<=255;y++)for(let x=250;x<=260;x++){const p=[...images[2].png.data.subarray((y*427+x)*4,(y*427+x)*4+3)],sum=p.reduce((a,b)=>a+b,0);if(sum>brightest.sum)brightest={x,y,sum,rgb:p};}
const record={at:new Date().toISOString(),scope:'Original 427x919 native captures; central region only, no image edits. Same public North 45-degree label/time/base count; old full layer/pose/backing readiness not bound, causal conclusion unresolved.',images:images.map(({png,...image})=>image),region:{x:0,y:110,width:427,height:785},comparisons,atPoint,currentObservedPoint:brightest};
await fs.writeFile(task+'/evidence/experience-galactic-native-recovered-pixels-2026-10-01.json',JSON.stringify(record,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({comparisons,atPoint,currentObservedPoint:brightest}));
