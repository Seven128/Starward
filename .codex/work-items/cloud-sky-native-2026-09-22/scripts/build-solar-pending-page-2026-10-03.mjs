/** Reuse final compiled shared owner; new solar/pending-path consumers only. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));let s=fs.readFileSync(path.join(dir,'experience-shared-page-journey-2026-10-03.mts'),'utf8').replaceAll('\r','');
const once=(before,after)=>{assert.equal(s.split(before).length,2,before.slice(0,100));s=s.replace(before,after);};
once('current-execution-state-2026-10-03-r46.json','current-execution-state-2026-10-03-r47.json');
const constructor=s.indexOf('const currentJourneyExecutor=Function('),constructorEnd=s.indexOf('\n',constructor);assert(constructor>0);
const pending=`
if(requested.pendingHide){
 await wait(()=>w.heldPageReads.length===1);
 const beforeHeld=w.sampleResources('actual-page-json-held');
 w.lastPageInput=input;w.lastPageResult=result;w.lifecycle.hide();w.rendererWasReleased=true;
 w.commit(()=>api.pageImages({...input,pageVisible:false,canvasRevision:w.canvasGenerationRef.current}));
 await new Promise(r=>setTimeout(r,30));
 const afterHide=w.sampleResources('pending-page-hidden');
 if(w.presentedSkyFrame!==null||w.images.some(r=>api.taskNativeImageMembership(r.image)==='CURRENT'))throw Error('pending hide kept active image/frame');
 if(afterHide.leases!==1)throw Error('actual native held JSON read did not retain exactly one lease');
 const held=w.heldPageReads.shift(),acceptedBeforeLate=w.acceptedCount;
 held.release();await new Promise(r=>setTimeout(r,30));
 const afterLate=w.sampleResources('pending-page-late-read');
 if(afterLate.leases!==0||w.acceptedCount!==acceptedBeforeLate||w.presentedSkyFrame!==null)throw Error('late page read published or kept lease');
 const retired=w.stellarLoaders.map(l=>l.__measure());
 if(retired.some(l=>!l.disposed||l.loaded.length||l.pending.length))throw Error('late read entered retired SAO owner');
 w.pagePendingEvidence={beforeHeld,afterHide,afterLate,retired,held:{path:held.path,bytes:held.bytes},acceptedBeforeLate,acceptedAfterLate:w.acceptedCount,scope:'Actual page Hook and lifecycle; hold only delivery of a completed real native UTF8 read. No guessed network failure or actual WEAPP scheduling claim.'};
 w.lifecycle.show();commit();
}
`;
let line=s.slice(constructor,constructorEnd);
line=line.replace('journeySource.replace','solarJourneySource.replace');
s=s.slice(0,constructor)+`let solarJourneySource=journeySource;
const requestMarker='const startRequest =';assert.equal(solarJourneySource.split(requestMarker).length,2);
solarJourneySource=solarJourneySource.replace(requestMarker,"if(requested.pendingHide){w.holdPageJson=true;w.heldPageReads=[];} "+requestMarker);
const pendingMarker=/submit\\((['"])accepted-feedback-pending\\1\\);/g;
assert.equal([...solarJourneySource.matchAll(pendingMarker)].length,1);
solarJourneySource=solarJourneySource.replace(pendingMarker,match=>match+${JSON.stringify(pending)});
`+line+s.slice(constructorEnd);
// Already verified GET/HEAD/304 contract is not replayed in this solar lane.
const contract=s.indexOf(' const staticPublication='),bootstrap=s.indexOf(' const bootstrapPromise=',contract);assert(contract>0&&bootstrap>contract);s=s.slice(0,contract)+s.slice(bootstrap);
const conditions=s.indexOf(' const conditions=['),end=s.indexOf(' const sceneRows:',conditions);assert(conditions>0&&end>conditions);
s=s.slice(0,conditions)+` const conditions=[
 {name:'solar-moon-pending-hide',manualPan:true,body:'MOON',fov:1,reference:null,pendingHide:true},
 ...['MERCURY','VENUS','MARS','JUPITER','SATURN','URANUS','NEPTUNE'].map(body=>({name:'solar-'+body.toLowerCase(),manualPan:true,body,fov:.05,reference:null})),
 {name:'solar-moon-warm-return',manualPan:true,body:'MOON',fov:1,reference:null,hideRoundTrip:true}];
 save('conditions.json',{conditions,scope:'Only new solar family consumers of final single encoded owner; per-body actual current row values, cached publication bytes. No old wide/fullsky/M51 matrix or static contract replay, no phone/quality/capacity claim.'});
`+s.slice(end);
const gpu=' await page.evaluate(currentGpuExecutor);';
once(gpu,gpu+`
 await page.evaluate(()=>{const w=globalThis.__controlled,fs=w.Taro.getFileSystemManager(),original=fs.readFile;
  fs.readFile=o=>original({...o,success:result=>{if(w.holdPageJson&&o.encoding==='utf8'&&/\\/[a-f0-9]{64}-[a-f0-9]{64}-.*\\.json$/.test(o.filePath)){
   w.holdPageJson=false;w.heldPageReads.push({path:o.filePath,bytes:new TextEncoder().encode(result.data).byteLength,release:()=>o.success(result)});
  }else o.success(result);}});
 });`);
once('const bounded={...row,passes,actualFacts,jointOwner};',`const solarFacts=await page.evaluate(body=>{const w=globalThis.__controlled,row=w.stable.current.hourly.find(r=>r.at===w.lastPageInput.at);
 const bodyGeometry=body==='MOON'?{azimuthDeg:row.moonAzimuthDeg,altitudeDeg:row.moonAltitudeDeg,angularDiameterDeg:row.moonAngularDiameterDeg,bodyFrame:row.moonBodyFrame}:row.planets.find(p=>p.body===body);
 return {body,bodyGeometry,pending:body==='MOON'?w.pagePendingEvidence??null:null,queries:w.queryRetention()};},condition.body);
 const bounded={...row,passes,actualFacts,jointOwner,solarFacts};`);
once('const loggedNonHead=access.slice(3).map(r=>r.status', 'const loggedNonHead=access.map(r=>r.status');
once('receivedNonHead=success.slice(3).map(r=>r.status','receivedNonHead=success.map(r=>r.status');
once('head:{loggedSize:access[1].size,receivedBytes:rows[1].encodedBodyBytes}', 'head:null');
once("status:'LIVE_FINAL_SAO_IMAGE_SINGLE_OWNER_PAGE_SCENE_DEVELOPMENT'","status:'LIVE_SOLAR_AND_PENDING_PAGE_SINGLE_OWNER_DEVELOPMENT'");
const scope=s.indexOf("scope:'Final source full API and extracted actual page/effects/lifecycle/Scene,"),scopeEnd=s.indexOf("'});",scope);assert(scope>0&&scopeEnd>scope);
s=s.slice(0,scope)+"scope:'Final actual API/page Hook/lifecycle/Scene solar consumers and completed native UTF8 late-delivery hold across hide. Actual current astronomy owner values with test algorithmVersion/config and fixture spot/weather/repository; softwareGL/controlled ReactTaroMapFSclock. One encoded owner, no static contract or old five/wide/fullcold matrix replay. Historical source artwork semantics and nativeDevice/wholephysical/quality/productioncapacity/independentreview remain unverified.'"+s.slice(scopeEnd+1);
fs.writeFileSync(path.join(dir,'experience-solar-pending-page-2026-10-03.mts'),s,{flag:'wx'});
console.log(JSON.stringify({generated:'experience-solar-pending-page-2026-10-03.mts',productionChanged:false}));
