// Measure registered original-source sampling at current fields. This is a
// resource-selection trial, not an adopted LOD rule or target-memory claim.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {createSkyViewBasis,unprojectSkyPoint} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {skyArtworkUvAtDirection} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts';
import {artworkIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {constellationVisibility} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts';

const task=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22');
const destination=path.join(task,'evidence/experience-scene-v47-sampling-2026-09-30.json');
await assert.rejects(fs.access(destination),{code:'ENOENT'});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const read=async(file:string)=>JSON.parse(await fs.readFile(path.join(task,file),'utf8'));
const current=await read('evidence/experience-scene-v46-binding-2026-09-30.json');
for(const file of ['sky-view-projection.ts','sky-artwork-registration.ts','sky-artwork-visibility.ts','sky-constellation-visibility.ts']){
  const relative='apps/wechat-miniapp/src/features/sky/'+file;
  assert.equal(sha(await fs.readFile(relative)),current.sourceHashes.find((source:any)=>source.path===relative).sha256);
}
const context=(await read('tmp/v46-context-readback.json')).data;
const rawBytes=await fs.readFile(path.join(task,'tmp/v45-current-public-report.json'));
const time=presentSkyTime(projectAdoptedSkyCatalog(JSON.parse(rawBytes.toString())).data,context.selectedAtUtc);assert(time);
const publication=(await read('tmp/v45-public-constellations.json')).data;
const frame=resolveConstellationFrame(publication,time.report.skyScene,context.selectedAtUtc);assert(frame);
const coexistence=JSON.parse(await fs.readFile('output/playwright/cloud-sky-scene-v46-coexistence-0930/result.json','utf8'));
const altair=coexistence.rows[0].scenario.field;
const fields=[altair,{...altair,name:'recognition-45',fov:45},{...altair,name:'local-25',fov:25},
  {name:'fading-pressure',fov:115,azimuth:30,altitude:60},{name:'near-hidden-pressure',fov:139,azimuth:60,altitude:75}];
const width=390,height=844,step=12,rows=[];
for(const field of fields){
  const view={basis:createSkyViewBasis(field.azimuth,90+field.altitude,0)!,verticalFovDeg:field.fov};
  const figures=constellationVisibility(field.fov,true)>0?frame.images.filter(figure=>artworkIntersectsView(figure.registration,view,width,height)):[];
  const probes=[];
  for(let y=.5;y<height;y+=step)for(let x=.5;x<width;x+=step){
    const at=(dx:number,dy:number)=>unprojectSkyPoint(x+dx,y+dy,view.basis,width,height,field.fov)!;
    const center=at(0,0);if(center[2]<0)continue;
    probes.push({center,left:at(-.5,0),right:at(.5,0),up:at(0,-.5),down:at(0,.5)});
  }
  const measured=figures.map(figure=>{
    const source=figure.source;let visibleProbes=0,minTexelsPerLogicalPixel=Infinity;
    for(const probe of probes){
      const uv=skyArtworkUvAtDirection(figure.registration,probe.center);
      if(!uv||uv.some(value=>value<0||value>1))continue;
      const left=skyArtworkUvAtDirection(figure.registration,probe.left),right=skyArtworkUvAtDirection(figure.registration,probe.right),
        up=skyArtworkUvAtDirection(figure.registration,probe.up),down=skyArtworkUvAtDirection(figure.registration,probe.down);
      if(!left||!right||!up||!down){minTexelsPerLogicalPixel=0;continue;}
      const a=(right[0]-left[0])*source.width,b=(down[0]-up[0])*source.width,
        c=(right[1]-left[1])*source.height,d=(down[1]-up[1])*source.height;
      const trace=a*a+b*b+c*c+d*d,det=a*d-b*c;
      const singular=Math.sqrt(Math.max(0,(trace-Math.sqrt(Math.max(0,trace*trace-4*det*det)))/2));
      minTexelsPerLogicalPixel=Math.min(minTexelsPerLogicalPixel,singular);visibleProbes++;
    }
    return {id:source.id,width:source.width,height:source.height,rgbaBytes:source.width*source.height*4,
      visibleProbes,minTexelsPerLogicalPixel:Number.isFinite(minTexelsPerLogicalPixel)?minTexelsPerLogicalPixel:null};
  });
  const trials=[1,2,3].map(pixelRatio=>{
    const assets=measured.map(source=>{
      // A half-sized image needs >=2 original texels per physical pixel to
      // avoid deliberate undersampling in this sampled estimate. Unmeasured
      // or uncertain planes keep the original. A proof needs stronger bounds.
      const texelsPerPhysicalPixel=(source.minTexelsPerLogicalPixel??0)/pixelRatio;
      const half=source.visibleProbes>0&&texelsPerPhysicalPixel>=2;
      return {id:source.id,texelsPerPhysicalPixel,half,candidateRgbaBytes:half?source.rgbaBytes/4:source.rgbaBytes};
    });
    return {pixelRatio,originalBytes:measured.reduce((sum,source)=>sum+source.rgbaBytes,0),
      candidateBytes:assets.reduce((sum,source)=>sum+source.candidateRgbaBytes,0),
      reducedImages:assets.filter(asset=>asset.half).length,assets};
  });
  rows.push({field,eligibleImages:figures.length,measured,trials});
}
const result={recordedAtUtc:new Date().toISOString(),scope:'Current original registered images and sampled source-to-physical-pixel Jacobian; estimates only',
  at:context.selectedAtUtc,reportSha256:sha(rawBytes),catalogHash:publication.catalogHash,logicalSize:{width,height},step,rows,
  limits:['No production source or image change; no downsampling or new publication',
    'A 12-logical-pixel probe grid does not bound every visible fragment or certify a production LOD rule',
    'DPR1/2/3 are distinct tested inputs, not an assertion about the current simulator or a phone',
    'Opaque pixels/alpha, transient decodes, native bitmap/driver/GC peak and target quality are separate evidence']};
await fs.writeFile(destination,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(rows.map(({field,trials})=>({field:field.name,trials:trials.map(({assets,...value})=>value)}))));
