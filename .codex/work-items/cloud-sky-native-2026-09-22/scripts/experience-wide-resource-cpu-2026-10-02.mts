import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {presentSkyTime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-time-presentation.ts';
import {exactSkyObservationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-observation-frame.ts';
import {selectSkyHipsTiles} from '../../../../apps/wechat-miniapp/src/features/sky/sky-hips-tile-selection.ts';
import {skyHipsTileIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-hips-tile-mesh.ts';
const task='.codex/work-items/cloud-sky-native-2026-09-22',sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const baselineBytes=await fs.readFile('output/playwright/cloud-sky-wide-resource-composition-1002/result.json'),baseline=JSON.parse(baselineBytes.toString());
const reportBytes=await fs.readFile(baseline.report.path);assert.equal(sha(reportBytes),baseline.report.sha256);
const raw=projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())).data;
const cases=baseline.rows.filter((row:any)=>row.w3Pixels.length).map((row:any)=>({row,
  frame:exactSkyObservationFrame(presentSkyTime(raw,row.at)!.report,row.at)!,view:{basis:row.basis,verticalFovDeg:row.fov}}));
const query=(value:typeof cases[number])=>selectSkyHipsTiles({frame:value.frame,view:value.view,width:390,height:844,maxOrder:0,minOrder:0});
const demand=(value:typeof cases[number])=>value.row.w3Pixels.filter((pixel:number)=>
  skyHipsTileIntersectsView(0,pixel,value.frame.equatorialToEnu,value.view,390,844));
for(let i=0;i<20;i++)for(const value of cases){query(value);demand(value);}
const rows=[];
const stats=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return{samples:values.length,
  meanMs:values.reduce((a,b)=>a+b,0)/values.length,p50Ms:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)]};};
for(const value of cases){
  const cap:number[]=[],mesh:number[]=[];
  for(let i=0;i<100;i++){
    let at=performance.now();const selection=query(value);cap.push(performance.now()-at);
    assert(selection.state==='SELECTED');assert.deepEqual(selection.pixels,value.row.w3Pixels);
    at=performance.now();const pixels=demand(value);mesh.push(performance.now()-at);
    assert.deepEqual(pixels,value.row.submittedPixels);
  }
  rows.push({name:value.row.name,candidates:value.row.w3Pixels.length,requested:value.row.submittedPixels.length,
    existingCapQuery:stats(cap),additionalSharedMeshFootprint:stats(mesh)});
}
const result={at:new Date().toISOString(),scope:'Bounded warmed Node CPU cost of the existing HEALPix cap query and new request footprint. At most twelve cached289-vertex base faces. This is not native render time, FPS, gesture latency, total application CPU or a target performance budget.',
  baseline:{path:'output/playwright/cloud-sky-wide-resource-composition-1002/result.json',sha256:sha(baselineBytes)},rows};
await fs.writeFile(task+'/evidence/experience-wide-resource-cpu-2026-10-02.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(rows));
