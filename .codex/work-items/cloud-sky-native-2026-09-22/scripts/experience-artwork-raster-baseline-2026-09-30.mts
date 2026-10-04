import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {attachSkyCatalog} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {artworkIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {skyArtworkViewParameters} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts';
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const sources=['apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts'];
const sourceHashes=await Promise.all(sources.map(async file=>({path:file,sha256:sha(await fs.readFile(file))})));
const reportBytes=await fs.readFile(task+'/tmp/v49-current-public-report.json');
const raw=projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())).data;
const reads:any[]=[];
const get=async(route:string)=>{const response=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());reads.push({route,bytes:bytes.length,sha256:sha(bytes)});return JSON.parse(bytes.toString());};
const publication=(await get('/v2/sky/constellations')).data;
const reference=raw.skyScene.catalog!;
const stars=(await get(`/v2/sky/catalogs/${reference.catalogVersion}/${reference.catalogHash}`)).data;
const report=attachSkyCatalog(presentSkyTime(raw,raw.context.at)!.report,stars);
const frame=resolveConstellationFrame(publication,report.skyScene,raw.context.at)!;assert(frame);
const measured=JSON.parse(await fs.readFile('output/playwright/cloud-sky-current-point-submission-0930/result.json','utf8'));
assert.equal(measured.reportSha256,sha(reportBytes));
const rows=[];
for(const name of ['common','wide']){
 const condition=measured.rows.find((row:any)=>row.condition.name===name)!.condition;
 const view={basis:condition.basis,verticalFovDeg:condition.fov};
 const parameters=skyArtworkViewParameters(view,390,844)!;
 const eligible=frame.images.filter(figure=>artworkIntersectsView(figure.registration,view,390,844));
 const images=eligible.map(figure=>{
  const {center,radius}=figure.registration.bounds;
  const padded=radius+8*2**-23/Math.abs(figure.registration.determinant);
  const dot=(other:number[])=>center.reduce((sum,value,index)=>sum+value*other[index]!,0);
  const denominator=dot(view.basis.forward)+Math.cos(padded);
  let area=390*844;
  if(padded<Math.PI/2&&denominator>1e-6){
   const x=parameters.center.x+parameters.scale*dot(view.basis.right)/denominator;
   const y=parameters.center.y-parameters.scale*dot(view.basis.up)/denominator;
   const r=parameters.scale*Math.sin(padded)/denominator;
   const loX=Math.min(390,Math.max(0,Math.floor(x-r-2))),hiX=Math.min(390,Math.max(0,Math.ceil(x+r+2)));
   const loY=Math.min(844,Math.max(0,Math.floor(y-r-2))),hiY=Math.min(844,Math.max(0,Math.ceil(y+r+2)));
   area=(hiX-loX)*(hiY-loY);
  }
  return {id:figure.source.id,determinant:figure.registration.determinant,radius,area,fullArea:390*844};
 });
 rows.push({name,fov:condition.fov,images,fullRasterArea:eligible.length*390*844,estimatedBoundedArea:images.reduce((sum,row)=>sum+row.area,0)});
}
const output=task+'/tmp/artwork-raster-baseline-0930.json';
await fs.writeFile(output,JSON.stringify({scope:'Current eligible source bounds and actual full-viewport artwork submission mechanism; projected bound is a candidate, not adopted/native timing',at:raw.context.at,reportSha256:sha(reportBytes),publicationHash:publication.catalogHash,sourceHashes,reads,rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(rows.map(row=>({name:row.name,images:row.images.length,fullArea:row.fullRasterArea,candidateArea:row.estimatedBoundedArea}))));
