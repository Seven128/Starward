import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=process.cwd(),dir=process.argv[2];if(!dir)throw Error('exact completed run required');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,dir,name),'utf8'));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const result=read('result.json'),final=read('actual-final-owner.json'),conditions=read('conditions.json').conditions;
const rows=conditions.map(c=>read(c.name+'.json')),frames=rows.flatMap(r=>r.passes);
const p95=values=>values.slice().sort((a,b)=>a-b)[Math.ceil(values.length*.95)-1];
const hidden=['source-back','hide-return'].map(name=>{const r=read(name+'-hidden.json');return {name,leases:r.cache.leased,current:r.current.length,presented:r.presented,gpuLive:r.gpu.live,credit:r.credit,tracking:r.tracking};});
for(const r of hidden){assert.equal(r.leases,0,'pure hide releases active leases');assert.equal(r.current,0);assert.equal(r.presented,null);assert.deepEqual(r.gpuLive,{texture:0,buffer:0,renderbuffer:0});}
const mapPath='apps/wechat-miniapp/dist/weapp/sky/detail/index.js.map',map=JSON.parse(fs.readFileSync(mapPath,'utf8'));
const buildBindings=['use-sky-landscape.ts','spot-sky-page.tsx'].map(name=>{const i=map.sources.findIndex(p=>p.endsWith(name)),p='apps/wechat-miniapp/src/features/sky/'+name;
 if(i<0)throw Error('source map input absent '+name);return {path:p,sourceSha256:hash(p),mapSource:map.sources[i],mapSourceSha256:createHash('sha256').update(map.sourcesContent[i]).digest('hex'),matchesCurrent:map.sourcesContent[i]===fs.readFileSync(p,'utf8')};});
const summary={run:dir,resultSha256:hash(path.join(root,dir,'result.json')),resultStatus:result.status,
 sourceRgbaPeaks:final.resourcePeaks,gpuPeaks:final.afterClear.gpu.totalPeak,retirement:read('retirement-observations.json'),
 hidden,build:{mapPath,mapSha256:hash(mapPath),bindings:buildBindings,scope:'Current watch emitted sources, not DevTools load/render proof.'},
 timing:{frames:frames.length,p95InstrumentedSubmitMs:p95(frames.map(f=>f.softwareGpuWallMs)),
  conditions:rows.map(r=>({name:r.condition.name,firstSceneMs:r.passes.find(f=>f.snapshot.references.length)?.elapsedFromConditionMs??null,
   settledSceneMs:r.passes.find(f=>f.label==='normal-settled')?.elapsedFromConditionMs??null,decodeCount:r.newDecodes.length,
   imageTransfers:r.transfers.filter(t=>t.type==='image').length,imageTransferBytes:r.transfers.filter(t=>t.type==='image').reduce((n,t)=>n+t.bytes,0),
   readyRgba:r.ready.resources.ownerRgbaModel,readyLeases:r.ready.resources.leases,at:r.ready.at,
   actualFamilies:r.ready.resources.owners.filter(o=>o.entries.some(e=>e.current)).map(o=>o.name)})),
  scope:'Instrumented controlled software GL with instantaneous local adapters and frozen weather/context. First Scene content is not first usable Mini Program UI. Includes diagnostic CPU overhead; not native FPS, 12Mbps latency or 200DAU.'},
 gaps:['Actual native WXML/Canvas composition remains FAILED_DEVTOOLS.','Actual source route page and Back event/native gestures are not executed here; actual navigation action plus controlled hide/show only.','Time is delivered to the actual geometry/tracking consumers; shared time-picker preview/commit UI is not exercised.','Complete imagery quality including M51 background/seams and M82 source gap remains open.','Diagnostic images/offers retained; source RGBA/pending/GPU/encoded models must not be summed into physical memory.','Independent review, physical device/new moon, production mixed capacity remain unverified.']};
fs.writeFileSync(path.join(root,dir,'current-scene-summary.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({run:dir,sha256:hash(path.join(root,dir,'current-scene-summary.json')),frames:frames.length,peaks:summary.sourceRgbaPeaks,gpu:summary.gpuPeaks,hidden: hidden.map(r=>({name:r.name,leases:r.leases,current:r.current,gpu:r.gpuLive})),p95:summary.timing.p95InstrumentedSubmitMs,build:buildBindings.map(r=>({path:r.path,matchesCurrent:r.matchesCurrent}))}));
