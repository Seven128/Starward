/** Task runner from existing isolated API/Caddy setup and exact current page executors. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),task='.codex/work-items/cloud-sky-native-2026-09-22';
const source=fs.readFileSync(path.join(root,task,'scripts/experience-business-cold-egress-2026-10-03.mts'),'utf8');
const once=(text,before,after)=>{assert.equal(text.split(before).length,2,before);return text.replace(before,after);};
let header=source.slice(0,source.indexOf('/** Full response headers/body'));
header=once(header,"path.join(root,'output')","path.join(root,'output/playwright')");
header=once(header,'/^business-cold-egress-[a-z0-9-]+$/','/^cloud-sky-live-mixed-1003-r[1-9][0-9]*$/');
header=once(header,'fs.mkdirSync(out);',"assert(fs.existsSync(path.join(out,'bundle.js')));");
header=header.replace('current-execution-state-2026-10-03-r41.json','current-execution-state-2026-10-03-r42.json');
header=once(header,'controllers:[MiniappController,StellarCatalogController]','controllers:[MiniappController,StellarCatalogController,ConstellationController,SaoPublicationController]');
header=once(header,'{provide:StellarCatalogPublicationService,useValue:catalogs}]}','{provide:StellarCatalogPublicationService,useValue:catalogs},{provide:ConstellationPublicationService,useValue:new ConstellationPublicationService()},{provide:SaoPublicationService,useValue:new SaoPublicationService()}]}');
let setup=source.slice(source.indexOf('  await app.listen'),source.indexOf("  const localDate='2026-10-03'"));
const body=String.raw`
const {chromium}=requireWorker('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sizeOwner=requireWorker('image-size'),imageSize=typeof sizeOwner==='function'?sizeOwner:sizeOwner.imageSize;
const originalRuntime=fs.readFileSync(path.join(out,'runtime-executor.js.txt'),'utf8');
const runtimeExecutor=Function('return ('+originalRuntime.replace(/^export const runtimeExecutor = /,'').trim().replace(/;$/,'')+')')();
const started=performance.now(),pending=new Map<string,any>();let browser:any;
async function wire(input:any){
 assert(typeof input.route==='string'&&input.route.startsWith('/v2/')&&!input.route.includes('://'));
 const ordinal=rows.length+1,start=performance.now();
 const family=input.route.includes('/auth/')?'auth':input.route.includes('observation-context')?'context':input.route.includes('/spots/')&&input.route.includes('/sky')?'sky_report_position':input.route.includes('/sky/')?'sky_public':input.route.includes('/terrain/')?'terrain':'ordinary';
 const r:any={ordinal,client:input.client,family,method:input.method??'GET',phase:input.phase,startedMs:start-started,status:null,encodedBodyBytes:0,decodedBodyBytes:null,completed:false,aborted:false};rows.push(r);
 const sent=input.data===undefined?undefined:Buffer.from(JSON.stringify(input.data));r.requestBodyBytes=sent?.length??0;
 let response:any;
 try{response=await new Promise<any>((resolve,reject)=>{
  const req=https.request({hostname:'127.0.0.1',port,servername:'localhost',ca,path:input.route,method:r.method,
   headers:{Host:'localhost','Accept-Encoding':'gzip',...(sent?{'Content-Type':'application/json','Content-Length':String(sent.length)}:{}),...input.header}},res=>{
    r.status=res.statusCode;const parts:Buffer[]=[];res.on('data',b=>{parts.push(Buffer.from(b));r.encodedBodyBytes+=b.length;});res.on('error',reject);
    res.on('end',()=>resolve({headers:res.headers,raw:Buffer.concat(parts)}));});
  pending.set(input.id,req);req.setTimeout(15000,()=>req.destroy(new Error('live_wire_timeout')));req.on('error',reject);req.end(sent);
 });}catch(error){r.aborted=true;r.error='controlled_transport_failed_or_aborted';r.elapsedMs=performance.now()-start;throw new Error(r.error);}
 finally{pending.delete(input.id);}
 const encoding=String(response.headers['content-encoding']??'identity'),decoded=encoding==='gzip'?gunzipSync(response.raw):response.raw;
 assert(['identity','gzip'].includes(encoding));r.completed=true;r.contentEncoding=encoding;r.decodedBodyBytes=decoded.length;r.elapsedMs=performance.now()-start;r.encodedSha256=sha(response.raw);r.decodedSha256=sha(decoded);
 const type=String(response.headers['content-type']??'');
 const binary=input.binary===true,image=type.startsWith('image/')?imageSize(decoded):null;
 return {status:r.status,header:response.headers,body:binary?undefined:decoded.length?JSON.parse(decoded.toString()):undefined,
  base64:binary?decoded.toString('base64'):undefined,image:image?{width:image.width,height:image.height,format:image.type,bytes:decoded.length,sha256:sha(decoded)}:null,encodedBodyBytes:r.encodedBodyBytes,decodedBodyBytes:decoded.length};
}
try{
 SETUP_BLOCK
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 const pages:any[]=[],errors:any[]=[],lanes:any[]=[];
 // One actual renderer plus two ordinary business clients overlap; no guessed
 // DAU distribution and no claim that this is the required 10/20 capacity lane.
 for(let client=0;client<3;client++){
  const page=await browser.newPage({viewport:{width:390,height:844}});pages.push(page);
  page.on('pageerror',(error:any)=>errors.push({client,message:error.message}));
  await page.exposeFunction('__liveHttp',async(input:any)=>wire({...input,client}));
  await page.exposeFunction('__liveAbort',(id:string)=>{pending.get(id)?.destroy(new Error('browser_owner_abort'));});
  await page.setContent('<canvas width="390" height="844"></canvas>');await page.addScriptTag({content:'globalThis.__name=(fn,name)=>fn;'});
  await page.evaluate(runtimeExecutor,{metadata:{},assets:[]});
  await page.evaluate(({client}:any)=>{
   const w=(globalThis as any).__controlled,storage=new Map(),originalCounters=w.counters;
   let sequence=0,running=0,peak=0;w.phase='bootstrap';w.liveEvents=[];
   w.Taro.getStorageSync=(key:string)=>storage.get(key);w.Taro.setStorageSync=(key:string,value:any)=>storage.set(key,structuredClone(value));w.Taro.removeStorageSync=(key:string)=>storage.delete(key);
   w.Taro.getEnv=()=>"CONTROLLED_WEAPP_TRANSPORT";w.Taro.getStorageInfoSync=()=>({keys:[...storage.keys()]});w.Taro.login=async()=>({code:'local:isolated-live-page-client-'+client+'-0001'});
   w.storageInventory=()=>[...storage].map(([key,value])=>({role:key.includes('auth')?'fixture-auth':key.includes('cache')?'response-cache':'other',jsonBytes:new TextEncoder().encode(JSON.stringify(value)).byteLength}));
   w.counters=()=>({...originalCounters(),nativeRunning:running,nativeCallbackPeak:peak});
   w.Taro.request=(o:any)=>{
    const route=o.url.slice('https://approved.fixture.invalid'.length),id=client+':'+(++sequence);let done=false;
    const record:any={route,type:o.responseType==='arraybuffer'?'image':'metadata',completed:false,bytes:0,sha256:null};w.requests.push(record);
    running++;peak=Math.max(peak,running);const began=performance.now();
    const finish=(result:any,error:any)=>{if(done)return;done=true;running--;record.completed=true;record.elapsedMs=performance.now()-began;
     if(error){record.failed=true;o.fail?.({errMsg:'live controlled transport unavailable'});return;}
     record.bytes=result.decodedBodyBytes;record.encodedBodyBytes=result.encodedBodyBytes;
     let data=result.body;
     if(o.responseType==='arraybuffer'){
      const bytes=Uint8Array.from(atob(result.base64),(c:string)=>c.charCodeAt(0));data=bytes.buffer;
      if(result.image){const info=result.image;record.sha256=info.sha256;
       w.offers.set(o.url,{...info,id:'actual-live:'+info.sha256,url:route,bytes:data});}
     }
     o.success?.({statusCode:result.status,data,header:result.header});};
    Promise.resolve((globalThis as any).__liveHttp({id,route,binary:o.responseType==='arraybuffer',method:o.method,data:o.data,header:o.header??{},phase:w.phase})).then(result=>finish(result,null),error=>finish(null,error));
    return {abort(){if(done)return;done=true;running--;record.completed=true;record.aborted=true;(globalThis as any).__liveAbort(id);o.fail?.({errMsg:'live owner abort'});}};
   };
  },{client});
  await page.addScriptTag({content:fs.readFileSync(path.join(out,'api-bundle.js'),'utf8')});
 }
 const bootstrap=async(page:any,client:number)=>page.evaluate(async({spotId,client,filters}:any)=>{
  const w=(globalThis as any).__controlled,api=(globalThis as any).liveApi,began=performance.now();
  const context=(await api.resolveObservationContext({location:{kind:'FORMAL_SPOT',spotId},localDate:'2026-10-03'})).data;
  w.context=context;w.spotId=spotId;
  const ordinary=async()=>{
   w.phase='ordinary-cold';
   const results=await Promise.all([api.getMapScene(context.contextId,filters),api.getSpotOverview(spotId,context.contextId),api.getSpotGuides(spotId),api.getSpotSite(spotId)]);
   if(!results[0].data.spots.length||results[1].data.spot.spotId!==spotId)throw Error('ordinary business has no actual effect');
   return {mapSpots:results[0].data.spots.length,overviewSpotMatched:true,states:results.map(r=>r.dataState),elapsedMs:performance.now()-began};
  };
  if(client)return ordinary();
  w.phase='sky-cold-bootstrap';
  const report=await api.getSkyReport(spotId,context.contextId),[catalog,figures]=await Promise.all([api.getStellarCatalog(report.data.skyScene.catalog),api.getConstellationCatalog()]);
  const current=api.attachSkyCatalog(report.data,catalog.data),at=new Date(current.context.at).toISOString();
  const position=await api.getCelestialObjectPosition({reference:'M:51',...current.context,at},current.skyScene.deepSky.catalog);
  w.stable={current,figures:figures.data,at,positions:{0:position}};w.reportEnvelope=report;w.objectTracking=null;
  return {bootstrapMs:performance.now()-began,reportDataState:report.dataState,catalogRows:catalog.data.rows.length,figures:figures.data.images.length,positionAt:position.data.at,
   source:'actual full current API operation/cache/validation, controlled Taro -> live isolated HTTP, no preloaded responses'};
 },{spotId:TEST_PUBLISHED_SPOT.spotId,client,filters:requireWorker('@starward/miniapp-contracts').EMPTY_FILTER_STATE});
 const bootstrapPromise=bootstrap(pages[0],0);
 // Delay ordinary kickoff until rendering demand starts, rather than merely
 // claiming that setup Promise.all means ordinary traffic overlapped paint.
 const boot=await bootstrapPromise;lanes.push({client:0,bootstrap:boot});
 const page=pages[0];await page.addScriptTag({content:fs.readFileSync(path.join(out,'bundle.js'),'utf8')});
 await page.evaluate(currentGpuExecutor);
 await page.evaluate(()=>{const w=(globalThis as any).__controlled,api=(globalThis as any).fullHookProbe;
  w.objectTracking=api.createSkyObjectTracking();w.browsingCamera=api.createSkyBrowsingCamera();w.cameraClock=0;
  const canonical=JSON.stringify(w.stable);w.assertStableOwners=({afterRelease=false}={})=>{if(JSON.stringify(w.stable)!==canonical)throw Error('live report/catalog owner changed');if(afterRelease&&w.canvasNodeRef.current!==null)throw Error('live node not retired');return true;};
  api.initializeActualPageLifecycle();w.phase='sky-cold-scene';});
 const ordinaryPromises=[bootstrap(pages[1],1),bootstrap(pages[2],2)];
 const conditions=[{name:'live-cold-north45',pose:[0,135,0],fov:45,reference:null,cold:true},
  {name:'live-selected-overview',target:'M:51',fov:8,reference:'M:51'},
  {name:'live-selected-detail',target:'M:51',fov:.05,reference:'M:51'},
  {name:'live-source-back',target:'M:51',fov:.05,reference:'M:51',sourceRoundTrip:true},
  {name:'live-hide-return',pose:[0,135,0],fov:45,reference:null,hideRoundTrip:true}];
 const sceneRows:any[]=[];
 for(const condition of conditions){
  await page.evaluate((phase:string)=>{globalThis.__controlled.phase=phase;},condition.name);
  if(condition.sourceRoundTrip||condition.hideRoundTrip){const hidden=await page.evaluate(currentHideExecutor,{source:!!condition.sourceRoundTrip});
   assert.equal(hidden.presented,null);assert.equal(hidden.current.length,0);save(condition.name+'-hidden.json',hidden);await page.evaluate(currentShowExecutor);}
  const row=await page.evaluate(currentJourneyExecutor,{condition});
  const passes=[];for(const p of row.passes){const label=condition.name+'-'+p.label;const rgba=Buffer.from(p.rgba,'base64'),png=Buffer.from(p.capture.split(',')[1],'base64');
   fs.writeFileSync(path.join(out,label+'.rgba'),rgba,{flag:'wx'});fs.writeFileSync(path.join(out,label+'.png'),png,{flag:'wx'});
   const {rgba:ignored,capture:alsoIgnored,...rest}=p;passes.push({...rest,rgbaSha256:sha(rgba),pngSha256:sha(png)});}
  const bounded={...row,passes};save(condition.name+'.json',bounded);sceneRows.push(bounded);assert.deepEqual(row.gpuFailures,[]);
  console.log(JSON.stringify({condition:condition.name,accepted:row.passes.length,ownerRgbaModel:row.ready.resources.ownerRgbaModel,encodedFileBytes:row.ready.resources.filesBytes}));
 }
 const ordinary=await Promise.all(ordinaryPromises);lanes.push(...ordinary.map((result,client)=>({client:client+1,result})));
 const warm=await page.evaluate(async()=>{const w=globalThis.__controlled,api=globalThis.liveApi;w.phase='live-warm-entry';
  const report=await api.getSkyReport(w.spotId,w.context.contextId);const catalog=await api.getStellarCatalog(report.data.skyScene.catalog);const figures=await api.getConstellationCatalog();
  if(JSON.stringify(report.data)!==JSON.stringify(w.reportEnvelope.data))throw Error('warm report changed facts');
  return {catalogRows:catalog.data.rows.length,figures:figures.data.images.length,storage:w.storageInventory()};});
 const final=await page.evaluate(currentFinalExecutor);save('final-owner.json',final);
 assert(!final.afterClear.gpu.handles.some((h:any)=>h.alive));assert.equal(final.afterClear.counters.nativeRunning,0);assert.equal(final.afterClear.counters.decodedPending,0);
 assert(!final.afterHide.nativeCurrent.some((i:any)=>i.membership==='CURRENT'));assert.equal(final.afterHide.presented,null);
 const logs=docker(['logs',name]);fs.writeFileSync(path.join(out,'caddy.log'),logs+'\n',{flag:'wx'});
 const access=logs.split(/\r?\n/).flatMap(line=>{try{const r=JSON.parse(line);return r.logger?.startsWith('http.log.access.')?[r]:[];}catch{return[];}});
 for(const r of access){assert.equal(r.request,undefined);assert.equal(r.resp_headers,undefined);assert([undefined,''].includes(r.user_id));}
 const success=rows.filter(r=>r.completed&&!r.aborted);assert.equal(access.length,rows.length);
 assert.equal(access.reduce((sum,r)=>sum+r.size,0),success.reduce((sum,r)=>sum+r.encodedBodyBytes,0));
 assert.deepEqual(sources.map(bind),before);save('inputs-after.json',sources.map(bind));
 for(const file of ['source-binding-before.json','api-inputs.json'])for(const r of JSON.parse(fs.readFileSync(path.join(out,file),'utf8')).sourceBindings)assert.deepEqual(bind(r.path),{path:r.path,bytes:r.bytes,sha256:r.sha256});
 assert.deepEqual(errors,[]);save('wire-requests.json',rows);
 save('result.json',{status:'LIVE_CURRENT_API_PAGE_SCENE_WITH_ORDINARY_OVERLAP_DEVELOPMENT',lanes,warm,sceneRows,wire:rows,
  encodedSuccessfulBodyBytes:success.reduce((sum,r)=>sum+r.encodedBodyBytes,0),decodedSuccessfulBodyBytes:success.reduce((sum,r)=>sum+r.decodedBodyBytes,0),
  actualCaddySizeMatchesEncodedBodies:true,privacyFieldsRemoved:true,finalResourcePeaks:final.resourcePeaks,errors,
  scope:'One current real software renderer plus two isolated ordinary clients. Full current api-operation/response-cache/catalog/position/SAO consumers, controlled React/Taro/storage/MapFS/clock. Live API/Caddy bytes, real source assets, explicit fixture business/weather and AQ transport; warm host FS. No preloaded report/catalog/figures/positions/images. Body only, no transport overhead. Five conditions do not repeat full R5 matrix or prove entire native journey. Actual interval overlap requires readback, not assumed. Shared Node API/driver CPU/RSS not isolated. No production population/provider entitlement, actual WEAPP gzip, 12Mbps/10-20clients/200DAU capacity/physical resources/native/devices/quality/independent review.'});
}catch(error){save('live-failure.json',{error:String(error),stack:(error as Error).stack,wire:rows});throw error;}
finally{await browser?.close();for(const req of pending.values())req.destroy(new Error('owned_runner_shutdown'));
 if(running){if(!fs.existsSync(path.join(out,'caddy.log')))fs.writeFileSync(path.join(out,'caddy.log'),docker(['logs',name])+'\n',{flag:'wx'});docker(['stop','--time','5',name]);docker(['rm',name]);}await app.close();}
`;
const imports=`import {ConstellationController} from '../../../../workers/miniapp-api/src/constellation.controller.ts';
import {ConstellationPublicationService} from '../../../../workers/miniapp-api/src/constellation-publication.ts';
import {SaoPublicationController} from '../../../../workers/miniapp-api/src/sao-publication.controller.ts';
import {SaoPublicationService} from '../../../../workers/miniapp-api/src/sao-publication.ts';
import * as pageExecutors from './experience-current-scene-browser-2026-10-03.ts';
const {currentGpuExecutor,currentJourneyExecutor,currentHideExecutor,currentShowExecutor,currentFinalExecutor}=(pageExecutors as any).default??pageExecutors;
`;
fs.writeFileSync(path.join(root,task,'scripts/experience-live-mixed-api-scene-2026-10-03.mts'),imports+header+body.replace('SETUP_BLOCK',setup),{flag:'wx'});
console.log('current isolated live runner generated; no runtime started');
