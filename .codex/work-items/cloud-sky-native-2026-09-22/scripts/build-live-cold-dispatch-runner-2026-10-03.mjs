/** Repair only the measured dispatch/storage ports; reuse current bundles and owners. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
let s=fs.readFileSync(path.join(dir,'experience-live-mixed-api-scene-2026-10-03.mts'),'utf8');
const once=(before,after)=>{assert.equal(s.split(before).length,2,before.slice(0,100));s=s.replace(before,after);};
once("const started=performance.now(),pending=new Map<string,any>();let browser:any;",`const started=performance.now(),pending=new Map<string,any>();let browser:any;
const dispatch:any={queued:[],released:false,queuedCount:0,releasedCount:0,trigger:null};
function dispatchHttp(input:any){
 if(input.client>0&&input.phase==='ordinary-coordinated'&&!dispatch.released){
  dispatch.queuedCount++;return new Promise((resolve,reject)=>dispatch.queued.push({input,resolve,reject}));
 }
 if(input.client===0&&input.phase==='live-cold-dispatch'&&!dispatch.released){
  assert.equal(dispatch.queued.length,8);dispatch.released=true;dispatch.trigger={client:input.client,phase:input.phase};
  const scene=wire(input);
  for(const q of dispatch.queued.splice(0)){dispatch.releasedCount++;wire(q.input).then(q.resolve,q.reject);}
  return scene;
 }
 return wire(input);
}`);
once("method:input.method??'GET',phase:input.phase,startedMs:start-started,status:null", "method:input.method??'GET',phase:input.phase,conditionalRequest:!!input.header?.['If-None-Match'],startedMs:start-started,status:null");
once("async(input:any)=>wire({...input,client})", "async(input:any)=>dispatchHttp({...input,client})");
once("let sequence=0,running=0,peak=0;w.phase='bootstrap';w.liveEvents=[];", "let sequence=0,running=0,peak=0,storagePending=0,storageWrites=0;w.phase='bootstrap';w.liveEvents=[];");
once("w.Taro.getEnv=()=>",`w.Taro.setStorage=async({key,data}:any)=>{storagePending++;try{await Promise.resolve();storage.set(key,structuredClone(data));storageWrites++;return {errMsg:'setStorage:ok'};}finally{storagePending--;}};
   w.storageState=()=>{const manifest=storage.get('starward.wechat-miniapp.response-cache.current');
    return {pending:storagePending,asyncWrites:storageWrites,schemaVersion:manifest?.schemaVersion??null,
     entries:(manifest?.entries??[]).map(([key,d]:any)=>({family:key.split(':')[0],bytes:d.bytes,storageBytes:d.storageBytes,chunks:d.chunks})),
     chunkCount:[...storage.keys()].filter(k=>k.startsWith('starward.wechat-miniapp.response-cache.chunk.')).length};};
   w.waitStorageIdle=async()=>{let quiet=0;for(let i=0;i<50;i++){await new Promise(r=>setTimeout(r,0));quiet=storagePending===0?quiet+1:0;if(quiet>=3)return w.storageState();}throw Error('task storage did not settle');};
   w.Taro.getEnv=()=>`);
once("if(client)return ordinary();", "if(client){await api.ensureFavoriteOwner();return {preparedContext:true,authenticatedFixture:true};}");
const start=s.indexOf(' const ordinaryPromises=');const end=s.indexOf(" const final=await page.evaluate(currentFinalExecutor)",start);
assert(start>0&&end>start);
s=s.slice(0,start)+` const readWarm=async(label:string)=>{
  await page.evaluate(()=>globalThis.__controlled.waitStorageIdle());
  await page.evaluate((phase:string)=>{globalThis.__controlled.phase=phase;},label);
  const begin=rows.length;
  const state=await page.evaluate(async()=>{const w=globalThis.__controlled,api=globalThis.liveApi;
   const before=w.storageState(),report=await api.getSkyReport(w.spotId,w.context.contextId),catalog=await api.getStellarCatalog(report.data.skyScene.catalog),figures=await api.getConstellationCatalog();
   if(JSON.stringify(report.data)!==JSON.stringify(w.reportEnvelope.data))throw Error('warm report changed facts');
   return {before,after:await w.waitStorageIdle(),catalogRows:catalog.data.rows.length,figures:figures.data.images.length};});
  const requests=rows.slice(begin);assert.equal(requests.length,3);
  return {label,state,requests:requests.map(r=>({ordinal:r.ordinal,conditionalRequest:r.conditionalRequest,status:r.status,encodedBodyBytes:r.encodedBodyBytes}))};
 };
 const warm:any[]=[await readWarm('bootstrap-warm')];
 const preparation=await Promise.all([bootstrap(pages[1],1),bootstrap(pages[2],2)]);
 lanes.push(...preparation.map((result,client)=>({client:client+1,preparation:result})));
 const ordinaryPromises=pages.slice(1).map(p=>p.evaluate(async({filters}:any)=>{
  const w=globalThis.__controlled,api=globalThis.liveApi;w.phase='ordinary-coordinated';
  const results=await Promise.all([api.getMapScene(w.context.contextId,filters),api.getSpotOverview(w.spotId,w.context.contextId),api.getSpotGuides(w.spotId),api.getSpotSite(w.spotId)]);
  if(!results[0].data.spots.length||results[1].data.spot.spotId!==w.spotId)throw Error('ordinary business has no actual effect');
  return {mapSpots:results[0].data.spots.length,overviewSpotMatched:true,states:results.map(r=>r.dataState)};
 },{filters:requireWorker('@starward/miniapp-contracts').EMPTY_FILTER_STATE}));
 ordinaryPromises.forEach(p=>p.catch(()=>{}));
 const queuedDeadline=performance.now()+5000;
 while(dispatch.queued.length!==8){assert(performance.now()<queuedDeadline,'ordinary dispatch did not queue');await new Promise(r=>setTimeout(r,5));}
 const condition={name:'live-cold-dispatch',pose:[0,135,0],fov:45,reference:null,cold:true};
 await page.evaluate((phase:string)=>{globalThis.__controlled.phase=phase;},condition.name);
 const row=await page.evaluate(currentJourneyExecutor,{condition});
 const passes=[];
 for(const p of row.passes){const label=condition.name+'-'+p.label,rgba=Buffer.from(p.rgba,'base64'),png=Buffer.from(p.capture.split(',')[1],'base64');
  fs.writeFileSync(path.join(out,label+'.rgba'),rgba,{flag:'wx'});fs.writeFileSync(path.join(out,label+'.png'),png,{flag:'wx'});
  const {rgba:ignored,capture:alsoIgnored,...rest}=p;passes.push({...rest,rgbaSha256:sha(rgba),pngSha256:sha(png)});}
 const bounded={...row,passes},sceneRows=[bounded];save(condition.name+'.json',bounded);assert.deepEqual(row.gpuFailures,[]);
 const ordinary=await Promise.all(ordinaryPromises);lanes.push(...ordinary.map((result,client)=>({client:client+1,result})));
 const ordinaryRows=rows.filter(r=>r.client>0&&r.phase==='ordinary-coordinated'),sceneRequests=rows.filter(r=>r.client===0&&r.phase==='live-cold-dispatch');
 const overlaps=ordinaryRows.flatMap(a=>sceneRequests.filter(b=>Math.min(a.startedMs+a.elapsedMs,b.startedMs+b.elapsedMs)>Math.max(a.startedMs,b.startedMs)).map(b=>({ordinary:a.ordinal,scene:b.ordinal,overlapMs:Math.min(a.startedMs+a.elapsedMs,b.startedMs+b.elapsedMs)-Math.max(a.startedMs,b.startedMs)})));
 assert(dispatch.released&&dispatch.releasedCount===8);assert(overlaps.length>0,'no actual HTTP interval overlap');
 save('dispatch-overlap.json',{queuedCount:dispatch.queuedCount,releasedCount:dispatch.releasedCount,trigger:dispatch.trigger,overlaps,
  scope:'Coordinates request dispatch only. No response/server delay or rate shaping. Context/auth preparation and API bootstrap precede the mixed image-demand lane. One software renderer/two ordinary fixture clients, not 10/20 cold-entry capacity.'});
 warm.push(await readWarm('after-cold-warm'));
 await page.addScriptTag({content:fs.readFileSync(path.join(out,'api-bundle.js'),'utf8')});
 warm.push(await readWarm('persisted-restart-warm'));
 save('warm-owner-readback.json',warm);
 console.log(JSON.stringify({condition:condition.name,frames:passes.length,overlapPairs:overlaps.length,warm:warm.map(r=>({label:r.label,statuses:r.requests.map(q=>q.status),asyncWrites:r.state.after.asyncWrites}))}));
`+s.slice(end);
once("status:'LIVE_CURRENT_API_PAGE_SCENE_WITH_ORDINARY_OVERLAP_DEVELOPMENT'", "status:'LIVE_COLD_DISPATCH_STORAGE_PORT_DEVELOPMENT'");
once("scope:'One current real software renderer plus two isolated ordinary clients.", "scope:'Affected cold demand and warm persistence lane only. Coordinated dispatch releases eight ordinary requests with the first cold scene request; actual interval intersection required. Async storage now implements the actual owner port. Current real software renderer plus two isolated ordinary clients.");
once("Five conditions do not repeat full R5 matrix", "One affected condition does not repeat full R5 or prior five-condition matrix");
once("finally{await browser?.close();", "finally{for(const q of dispatch.queued.splice(0))q.reject(new Error('owned_dispatch_shutdown'));await browser?.close();");
fs.writeFileSync(path.join(dir,'experience-live-cold-dispatch-2026-10-03.mts'),s,{flag:'wx'});
console.log(JSON.stringify({generated:'experience-live-cold-dispatch-2026-10-03.mts',changes:'Task dispatch/native async storage only; production source unchanged.'}));
