// Diagnose encoded alpha separately from the existing infrared display opacity.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSkyViewBasis,unprojectSkyPoint} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {registerSkySurvey} from '../../../../apps/wechat-miniapp/src/features/sky/sky-survey-registration.ts';
import {skyArtworkUvAtDirection} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts';

const task='.codex/work-items/cloud-sky-native-2026-09-22';
const prior=JSON.parse(await fs.readFile('output/playwright/cloud-sky-area-support-0930-final/result.json','utf8'));
const png=await fs.readFile(`${task}/tmp/area-source-m42-detail.png`);
assert.equal(createHash('sha256').update(png).digest('hex'),prior.source.sha256);
const pixels=await fs.readFile(`${task}/tmp/area-source-m42-detail.rgba`);assert.equal(pixels.length,512*512*4);
const basis=createSkyViewBasis(prior.point[1],90+prior.point[2],0)!;
const registration=registerSkySurvey(prior.point,prior.source.field,512,256)!;
const rows=[];
for(const fov of [.05,.12,.8])for(const flip of [false,true]){
  const row={fov,flip,fragments:0,alphaZero:0,finiteBlack:0,finiteColor:0,
    filterOnlyAlpha:0,filterColor:0,maxContribution:0,minUv:[1,1],maxUv:[0,0]};
  for(let y=0;y<844;y++)for(let x=0;x<390;x++){
    const ray=unprojectSkyPoint(x+.5,y+.5,basis,390,844,fov)!;
    const uv=skyArtworkUvAtDirection(registration,ray)!;
    if(uv.some(v=>v<0||v>1))continue;
    row.fragments++;uv.forEach((v,i)=>{row.minUv[i]=Math.min(row.minUv[i]!,v);row.maxUv[i]=Math.max(row.maxUv[i]!,v);});
    const u=uv[0]*512-.5,v=(flip?1-uv[1]:uv[1])*512-.5;
    const left=Math.floor(u),top=Math.floor(v),fx=u-left,fy=v-top;
    let alpha=0,brightness=0,red=0,green=0,blue=0;
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
      const offset=(Math.max(0,Math.min(511,top+dy))*512+Math.max(0,Math.min(511,left+dx)))*4;
      const weight=(dx?fx:1-fx)*(dy?fy:1-fy);
      alpha+=pixels[offset+3]!/255*weight;
      red+=pixels[offset]!/255*weight;green+=pixels[offset+1]!/255*weight;blue+=pixels[offset+2]!/255*weight;
    }
    brightness=.2126*red+.7152*green+.0722*blue;
    if(alpha===0)row.alphaZero++;
    else if(brightness===0)row.finiteBlack++;
    else row.finiteColor++;
    // Exactly the production display opacity; no missing-data classification.
    const contribution=Math.max(red,green,blue)*alpha*.58*brightness*brightness*(3-2*brightness);
    row.maxContribution=Math.max(row.maxContribution,contribution);
    if(alpha>0)row.filterOnlyAlpha++;if(contribution>0)row.filterColor++;
  }
  rows.push(row);
}
await fs.writeFile(`${task}/tmp/area-alpha-sampling-result.json`,JSON.stringify({sourceSha256:prior.source.sha256,rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(rows));
