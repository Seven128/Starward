import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {registerSkyArtwork} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts';
import {artworkIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {createSkyViewBasis,type SkyVector} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';

// Same corrected, nonsingular regression geometry as the checked-in owner test.
// Original production bundle must demonstrate both false-positive demands.
const output='output/playwright/cloud-sky-image-demand-1001';
const original=runInNewContext(await fs.readFile(output+'/baseline.js','utf8')+';raster50After;');
const camera=createSkyViewBasis(60,120,0)!;
const ray=(x:number,y:number):SkyVector=>{
 const vector=camera.forward.map((value,i)=>value+x*camera.right[i]!+y*camera.up[i]!);
 return vector.map(value=>value/Math.hypot(...vector)) as unknown as SkyVector;
};
const results=[];
for(const [fov,left,right] of [[85,.425,.52],[139,.9,1]]){
 const image=registerSkyArtwork([
  {uv:[0,0],direction:ray(left!,.04)},
  {uv:[1,0],direction:ray(right!,.04)},
  {uv:[1,1],direction:ray(right!,-.04)},
 ])!;
 const view={basis:camera,verticalFovDeg:fov!};
 const before=original.artworkIntersectsView(image,view,390,844),after=artworkIntersectsView(image,view,390,844);
 assert.equal(before,true);assert.equal(after,false);
 results.push({fov,before,after});
}
await fs.writeFile(output+'/regression.json',JSON.stringify({scope:'Frozen original production owner fails the current false-positive demand regression; current owner excludes both certified empty source caps.',results},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({failBeforePassAfter:true,results}));
