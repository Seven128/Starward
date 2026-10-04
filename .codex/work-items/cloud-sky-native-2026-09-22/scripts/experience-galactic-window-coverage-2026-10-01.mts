import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {build} from 'esbuild';
import {runInNewContext} from 'node:vm';
import {createSkyViewBasis,unprojectSkyPoint} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {skyArtworkViewBounds} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {galacticEquirectUv} from '../../../../apps/wechat-miniapp/src/features/sky/sky-galactic-band.ts';
const task='.codex/work-items/cloud-sky-native-2026-09-22',sky='apps/wechat-miniapp/src/features/sky';
const frozen='output/playwright/cloud-sky-galactic-window-trial-1001-v4/galactic-window-trial.ts';
async function owner(file:string){const code=await fs.readFile(file,'utf8');const bundle=await build({stdin:{contents:code,resolveDir:path.resolve(sky),loader:'ts'},bundle:true,write:false,platform:'node',format:'cjs',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});const module={exports:{}};runInNewContext(bundle.outputFiles[0].text,{module,exports:module.exports});return (module.exports as any).skyGalacticImageWindow;}
const band={pole:[0,0,1] as const,center:[1,0,0] as const,strength:1},width=390,height=844,imageWidth=2048,imageHeight=1024;
const camera=(longitude:number,roll:number)=>{const right=[Math.sin(longitude),-Math.cos(longitude),0],up=[0,0,1];return {forward:[Math.cos(longitude),Math.sin(longitude),0],right:right.map((n,i)=>n*Math.cos(roll)+up[i]*Math.sin(roll)),up:up.map((n,i)=>n*Math.cos(roll)-right[i]*Math.sin(roll))} as any;};
const base={basis:camera(0,Math.atan(height/width)),verticalFovDeg:85};
const radius=skyArtworkViewBounds(base,width,height)!.radius;
const longitude=Math.PI-radius-2*Math.PI*.5/imageWidth;
const wrapped={...base,basis:camera(longitude,Math.atan(height/width))};
const views=[wrapped,{...wrapped,basis:camera(longitude,-Math.atan(height/width))}];
for(const fov of [13,45,85,139,195,274.9])for(const azimuth of [0,90,179.9,270])for(const roll of [0,65])views.push({basis:createSkyViewBasis(azimuth,135,roll)!,verticalFovDeg:fov});
views.push({...base,center:{x:137,y:351}} as any);
function samples(windowOwner:any){const misses:any[]=[];let checks=0;for(let viewIndex=0;viewIndex<views.length;viewIndex++){const view=views[viewIndex];const window=windowOwner(view,width,height,band,imageWidth,imageHeight);for(let row=0;row<=12;row++)for(let col=0;col<=8;col++){const ray=unprojectSkyPoint(width*col/8,height*row/12,view.basis,width,height,view.verticalFovDeg,(view as any).center)!;const uv=galacticEquirectUv(ray,band.pole,band.center);for(const du of [-1.2,0,1.2])for(const dv of [-1.2,0,1.2]){const u=((uv[0]+du/imageWidth)%1+1)%1,v=Math.max(0,Math.min(1,uv[1]+dv/imageHeight));const x=Math.max(0,Math.min(imageWidth-1,Math.floor(u*imageWidth-.5))),y=Math.max(0,Math.min(imageHeight-1,Math.floor(v*imageHeight-.5)));const x1=Math.min(imageWidth-1,x+1),y1=Math.min(imageHeight-1,y+1);checks++;if(x<window.x||x1>=window.x+window.width||y<window.y||y1>=window.y+window.height)misses.push({viewIndex,row,col,du,dv,window,x,y,x1,y1});}}}return {checks,misses};}
const before=samples(await owner(frozen)),after=samples(await owner(task+'/tmp/galactic-window-trial.ts'));
assert(before.misses.length>0,'The escaped filter-seam defect must fail against the frozen prior candidate');
console.log(JSON.stringify({views:views.length,checks:after.checks,beforeMisses:before.misses.length,afterMisses:after.misses.length,example:before.misses[0]}));
if(process.argv.includes('--fixed'))assert.equal(after.misses.length,0,'Every tested original LINEAR/filter neighbour remains in the conservative crop');
await fs.writeFile(task+'/evidence/experience-galactic-window-coverage-'+(process.argv.includes('--fixed')?'fixed':'before')+'-2026-10-01.json',JSON.stringify({scope:'Current source-window candidate coverage, original periodic +/-1.2 source filter and LINEAR neighbours, canonical axes/controlled seam plus varied full/local/rolled/offset camera. Analytic cap remains the continuous bound; samples are a regression, not exhaustive sky/phone acceptance.',views,checks:after.checks,beforeMisses:before.misses.length,afterMisses:after.misses.length,example:before.misses[0]},null,2)+'\n',{flag:'wx'});
