/** Read-only original-view source membership at actual changed pixels; not a shader-error cause oracle. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {unprojectSkyPoint} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {skyArtworkUvAtDirection} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts';
import {skyArtworkTextureWindow} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-texture-window.ts';
import {sourcePlaneWindowCandidate} from './experience-source-plane-window-candidate-2026-10-02.mts';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const bind=async(p:string)=>{const b=await fs.readFile(path.join(ROOT,p));return {path:p,bytes:b.length,sha256:hash(b)};};
const priorPath='output/playwright/cloud-sky-full-hook-resource-1002-r4/result.json';
const readbackPath='output/source-plane-window-gpu-readback-1002-r1/result.json';
const prior=JSON.parse(await fs.readFile(path.join(ROOT,priorPath),'utf8'));
assert.equal((await bind(priorPath)).sha256,'548b96c4dd399fcc88ff24cb3d73a18a09d884463890bb2a67eb24a4661ba20b');
assert.equal((await bind(readbackPath)).sha256,'2ab3d389c4883de60056fd6c0134c09480b0672f219920323502960e52f7a9fd');
const rb=JSON.parse(await fs.readFile(path.join(ROOT,readbackPath),'utf8'));
for(const r of prior.sourceBindings)assert.deepEqual(await bind(r.path),r);
const raw=projectAdoptedSkyCatalog(JSON.parse(await fs.readFile(path.join(ROOT,prior.report.path),'utf8'))).data;
const metadata=async(route:string)=>{const i=prior.inputs.find((r:any)=>r.route===route&&r.transport==='FROZEN_LOCAL_BFF_JSON');assert(i);
 const b=await fs.readFile(path.join(ROOT,i.path));assert.equal(hash(b),i.sha256);return JSON.parse(b.toString()).data;};
const stars=await metadata(`/v2/sky/catalogs/${raw.skyScene.catalog!.catalogVersion}/${raw.skyScene.catalog!.catalogHash}`),figures=await metadata('/v2/sky/constellations');
const at=new Date(raw.context.at).toISOString(),report=attachSkyCatalog(presentSkyTime(raw,at)!.report,stars);
const frame=resolveConstellationFrame(figures,report.skyScene,at)!;
const rows=[];
for(const condition of rb.comparisons){
 const sourceRow=prior.rows[condition.index],wanted=sourceRow.ready.hooks.find((h:any)=>h.name==='artwork').wanted;
 const view={basis:sourceRow.condition.basis,verticalFovDeg:sourceRow.condition.fov,center:{x:195,y:422}};
 for(const pixel of condition.variants.candidate.allChangedPixelCoordinates){
  const ray=unprojectSkyPoint(pixel.x+.5,pixel.pngY+.5,view.basis,390,844,view.verticalFovDeg,view.center)!;
  const sources=[];
  for(const asset of wanted){
   const image=frame.images.find(i=>i.source.id===asset.id)!;assert.equal(image.source.sha256,asset.sha256);
   const uv=skyArtworkUvAtDirection(image.registration,ray);
   if(!uv||uv.some(v=>v<0||v>1))continue;
   const candidate=sourcePlaneWindowCandidate(image.registration,view,390,844,asset.width,asset.height).window;
   const neighbors=uv.map((v,axis)=>{const size=axis===0?asset.width:asset.height,px=Math.max(0,Math.min(size-1,v*size-.5));return [Math.floor(px),Math.ceil(px)];});
   const inside=neighbors[0]!.every(x=>x>=candidate.x&&x<candidate.x+candidate.width)&&neighbors[1]!.every(y=>y>=candidate.y&&y<candidate.y+candidate.height);
   const input=prior.inputs.find((i:any)=>i.transport==='ACTUAL_LOCAL_PUBLISHED_BYTES_OFFER_ONLY'&&i.id===asset.id)!;
   sources.push({id:asset.id,source:{path:input.path,sha256:asset.sha256,bytes:asset.bytes},originalUv:uv,linearNeighborCoordinates:neighbors,
    previousWindow:skyArtworkTextureWindow(image.registration,view,390,844,asset.width,asset.height)??{x:0,y:0,width:asset.width,height:asset.height},candidateWindow:candidate,allOriginalLinearNeighborsIncluded:inside});
  }
  rows.push({conditionIndex:condition.index,pixel,originalCpuRay:ray,sources});
 }
}
const output='output/source-plane-window-difference-membership-1002-r1';await fs.mkdir(path.join(ROOT,output),{recursive:false});
await fs.copyFile(fileURLToPath(import.meta.url),path.join(ROOT,output,'executed-script.mts.txt'));
await fs.writeFile(path.join(ROOT,output,'result.json'),JSON.stringify({status:'ACTUAL_DIFFERENCE_LOCATED_NO_CAUSE_ASSIGNED',input:await bind(readbackPath),original:await bind(priorPath),rows,
 limits:['Original CPU double inverse-ray/UV membership only, not actual float32 shader execution or unique causal source attribution. No margin/source/window tuning.',
 'All original LINEAR-neighbor inclusion here does not erase observed one-byte differences or supply a universal shader precision certificate. Candidate remains unadopted.']},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,result:await bind(output+'/result.json'),rows},null,2));
