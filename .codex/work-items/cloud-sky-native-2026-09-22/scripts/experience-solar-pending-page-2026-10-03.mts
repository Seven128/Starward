import {ConstellationController} from '../../../../workers/miniapp-api/src/constellation.controller.ts';
import {ConstellationPublicationService} from '../../../../workers/miniapp-api/src/constellation-publication.ts';
import {SaoPublicationController} from '../../../../workers/miniapp-api/src/sao-publication.controller.ts';
import {SaoPublicationService} from '../../../../workers/miniapp-api/src/sao-publication.ts';
import * as pageExecutors from './experience-current-scene-browser-2026-10-03.ts';
const {currentGpuExecutor,currentJourneyExecutor:baseJourneyExecutor,currentHideExecutor,currentShowExecutor,currentFinalExecutor}=(pageExecutors as any).default??pageExecutors;
const journeySource=baseJourneyExecutor.toString();
const pendingReadiness='w.counters().decodedPending === 0 && true';
if(journeySource.split(pendingReadiness).length!==2)throw Error('task readiness wait source mismatch');
if(journeySource.split('const input = {').length!==2)throw Error('task manual command insertion mismatch');
let solarJourneySource=journeySource;
const requestMarker='const startRequest =';assert.equal(solarJourneySource.split(requestMarker).length,2);
solarJourneySource=solarJourneySource.replace(requestMarker,"if(requested.pendingHide){w.holdPageJson=true;w.heldPageReads=[];} "+requestMarker);
const pendingMarker=/submit\((['"])accepted-feedback-pending\1\);/g;
assert.equal([...solarJourneySource.matchAll(pendingMarker)].length,1);
solarJourneySource=solarJourneySource.replace(pendingMarker,match=>match+"\nif(requested.pendingHide){\n await wait(()=>w.heldPageReads.length===1);\n const beforeHeld=w.sampleResources('actual-page-json-held');\n w.lastPageInput=input;w.lastPageResult=result;w.lifecycle.hide();w.rendererWasReleased=true;\n w.commit(()=>api.pageImages({...input,pageVisible:false,canvasRevision:w.canvasGenerationRef.current}));\n await new Promise(r=>setTimeout(r,30));\n const afterHide=w.sampleResources('pending-page-hidden');\n if(w.presentedSkyFrame!==null||w.images.some(r=>api.taskNativeImageMembership(r.image)==='CURRENT'))throw Error('pending hide kept active image/frame');\n if(afterHide.leases!==1)throw Error('actual native held JSON read did not retain exactly one lease');\n const held=w.heldPageReads.shift(),acceptedBeforeLate=w.acceptedCount;\n held.release();await new Promise(r=>setTimeout(r,30));\n const afterLate=w.sampleResources('pending-page-late-read');\n if(afterLate.leases!==0||w.acceptedCount!==acceptedBeforeLate||w.presentedSkyFrame!==null)throw Error('late page read published or kept lease');\n const retired=w.stellarLoaders.map(l=>l.__measure());\n if(retired.some(l=>!l.disposed||l.loaded.length||l.pending.length))throw Error('late read entered retired SAO owner');\n w.pagePendingEvidence={beforeHeld,afterHide,afterLate,retired,held:{path:held.path,bytes:held.bytes},acceptedBeforeLate,acceptedAfterLate:w.acceptedCount,scope:'Actual page Hook and lifecycle; hold only delivery of a completed real native UTF8 read. No guessed network failure or actual WEAPP scheduling claim.'};\n w.lifecycle.show();commit();\n}\n");
const currentJourneyExecutor=Function('return ('+solarJourneySource.replace(pendingReadiness,'w.counters().decodedPending === 0 && (!result.landscapeImage.panorama || result.landscapeImage.opacity >= 1)').replace('const input = {', 'if(requested.manualPan){w.browsingCamera.pan(queuedBasis,condition.requestedCamera.progress);w.manualBasisRef.current=queuedBasis;} const input = {')+')')();
/** Isolated current HTTP owners through cached local Caddy; not deployed capacity. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import {createHash,generateKeyPairSync} from 'node:crypto';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const requireWorker=createRequire(path.join(root,'workers/miniapp-api/package.json'));
requireWorker('reflect-metadata');
const {Module}=requireWorker('@nestjs/common'),{NestFactory}=requireWorker('@nestjs/core');
const {FastifyAdapter}=requireWorker('@nestjs/platform-fastify');
const {TEST_PUBLISHED_SPOT}=requireWorker('@starward/miniapp-contracts/test-fixtures');
const {MiniappController}=await import('../../../../workers/miniapp-api/src/controller.ts');
const {MiniappService}=await import('../../../../workers/miniapp-api/src/miniapp-service.ts');
const {createTestMiniappService}=await import('../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts');
const {createTestRuntimeConfig}=await import('../../../../workers/miniapp-api/src/runtime-config.ts');
const {DeterministicRecentWeatherAdapter}=await import('../../../../workers/miniapp-api/src/test-fixtures/deterministic-recent-weather-adapter.ts');
const {QWeatherAirQualityAdapter}=await import('../../../../workers/miniapp-api/src/air-quality-provider.ts');
const {createBsc5pSkyCatalogProvider}=await import('../../../../workers/miniapp-api/src/sky-scene-catalog-provider.ts');
const {StellarCatalogController}=await import('../../../../workers/miniapp-api/src/stellar-catalog.controller.ts');
const {StellarCatalogPublicationService}=await import('../../../../workers/miniapp-api/src/stellar-catalog-publication.ts');
const {ApiExceptionFilter}=await import('../../../../workers/miniapp-api/src/api-exception.filter.ts');
const {EtagInterceptor}=await import('../../../../workers/miniapp-api/src/etag.interceptor.ts');
const out=path.resolve(root,process.argv[2]);
assert.equal(path.dirname(out),path.join(root,'output/playwright'));
assert.match(path.basename(out),/^cloud-sky-live-mixed-1003-r[1-9][0-9]*$/);
assert(fs.existsSync(path.join(out,'bundle.js')));
const sha=(raw:Buffer|string)=>createHash('sha256').update(raw).digest('hex');
const save=(name:string,value:unknown)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const bind=(file:string)=>{const raw=fs.readFileSync(path.join(root,file));return {path:file,bytes:raw.length,sha256:sha(raw)};};
const checkpoint=JSON.parse(fs.readFileSync(path.join(root,'.codex/work-items/cloud-sky-native-2026-09-22/evidence/current-execution-state-2026-10-03-r47.json'),'utf8'));
for(const row of [...checkpoint.protected,...checkpoint.currentSources])assert.deepEqual(bind(row.path),row);
const sources=[...new Set([...checkpoint.protected,...checkpoint.currentSources].map((row:any)=>row.path).concat([
  path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/'),
  'workers/miniapp-api/src/controller.ts','workers/miniapp-api/src/miniapp-service.ts',
  'workers/miniapp-api/src/auth-service.ts','workers/miniapp-api/src/observation-context-service.ts',
  'workers/miniapp-api/src/api-exception.filter.ts','workers/miniapp-api/src/etag.interceptor.ts',
  'workers/miniapp-api/src/test-fixtures/create-test-service.ts',
  'workers/miniapp-api/src/test-fixtures/in-memory-repository.ts',
  'workers/miniapp-api/src/test-fixtures/deterministic-weather-adapter.ts',
  'workers/miniapp-api/src/test-fixtures/deterministic-recent-weather-adapter.ts',
  'workers/miniapp-api/src/sky-scene-catalog-provider.ts','workers/miniapp-api/src/stellar-catalog-publication.ts',
  'workers/miniapp-api/src/stellar-catalog.controller.ts','workers/miniapp-api/src/terrain-publication.ts',
  'workers/miniapp-api/assets/terrain/publication.json','workers/miniapp-api/assets/terrain/glo30-greater-bay-area-85km.png',
  'infrastructure/deployment/Caddyfile','infrastructure/deployment/sky-resource-logging.caddy',
  'infrastructure/deployment/sky-static-empty.caddy']))];
const before=sources.map(bind);save('inputs-before.json',before);
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(out,'executed-script.mts'),fs.constants.COPYFILE_EXCL);
const config=createTestRuntimeConfig({qweather:{apiHost:'test.qweatherapi.com',projectId:'isolated-test',credentialId:'isolated-test',forecastHours:24,
  privateKeyPem:generateKeyPairSync('ed25519').privateKey.export({format:'pem',type:'pkcs8'}).toString()}});
let aqCalls=0;
const fixedNow=Date.now();
const airQuality=new QWeatherAirQualityAdapter(config,async(request:any)=>{
  aqCalls++;const current=new URL(request.toString()).pathname.includes('/current/');
  const index={code:'cn-mee',name:'中国 AQI',aqi:32,aqiDisplay:'32'};
  return new Response(JSON.stringify(current?{indexes:[index]}:{hours:[{forecastTime:new Date(fixedNow).toISOString(),indexes:[index]}]}),{headers:{'content-type':'application/json'}});
},()=>fixedNow);
const service=createTestMiniappService({config,airQuality,recentWeather:new DeterministicRecentWeatherAdapter(),
  skyCatalog:createBsc5pSkyCatalogProvider('bsc5p-bright-stars.v3')});
const catalogs=new StellarCatalogPublicationService();
class LocalModule{}
Module({controllers:[MiniappController,StellarCatalogController,ConstellationController,SaoPublicationController],providers:[{provide:MiniappService,useValue:service},
  {provide:StellarCatalogPublicationService,useValue:catalogs},{provide:ConstellationPublicationService,useValue:new ConstellationPublicationService()},{provide:SaoPublicationService,useValue:new SaoPublicationService()}]})(LocalModule);
const app=await NestFactory.create(LocalModule,new FastifyAdapter(),{logger:false});
app.useGlobalFilters(new ApiExceptionFilter());app.useGlobalInterceptors(new EtagInterceptor());
const image='caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648';
const name=path.basename(out);
const docker=(args:string[],timeout=20000)=>{const r=spawnSync('docker',args,{encoding:'utf8',windowsHide:true,timeout,maxBuffer:8*1024*1024});
  if(r.error)throw r.error;if(r.status!==0)throw new Error(`owned_docker_${args[0]}_failed`);
  return (args[0]==='logs'?r.stdout+r.stderr:r.stdout).trim();};
let running=false,port=0,ca:Buffer;
const rows:any[]=[];

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
 const encoding=String(response.headers['content-encoding']??'identity'),decoded=encoding==='gzip'&&response.raw.length?gunzipSync(response.raw):response.raw;
 assert(['identity','gzip'].includes(encoding));r.completed=true;r.contentEncoding=encoding;r.skyDelivery=response.headers['x-starward-sky-delivery']??null;r.publicDataSource=response.headers['x-starward-data-source']??null;r.decodedBodyBytes=decoded.length;r.elapsedMs=performance.now()-start;r.encodedSha256=sha(response.raw);r.decodedSha256=sha(decoded);
 const type=String(response.headers['content-type']??'');
 const binary=input.binary===true,image=type.startsWith('image/')?imageSize(decoded):null;
 return {status:r.status,header:response.headers,body:binary?undefined:decoded.length?JSON.parse(decoded.toString()):undefined,
  base64:binary?decoded.toString('base64'):undefined,image:image?{width:image.width,height:image.height,format:image.type,bytes:decoded.length,sha256:sha(decoded)}:null,encodedBodyBytes:r.encodedBodyBytes,decodedBodyBytes:decoded.length};
}
try{
   await app.listen(0,'0.0.0.0');const apiPort=app.getHttpAdapter().getInstance().server.address().port;
  const source=fs.readFileSync(path.join(root,'infrastructure/deployment/Caddyfile'),'utf8').replaceAll('\r','');
  const caddy=source.replace('\temail {$CADDY_EMAIL}','\temail isolated-business@starward.invalid\n\tskip_install_trust')
    .replace('{$STARWARD_API_DOMAIN} {','https://localhost:8443 {\n tls internal')
    .replaceAll('api:8787',`host.docker.internal:${apiPort}`).replaceAll('health_uri /health/ready','health_uri /v2/capabilities');
  fs.writeFileSync(path.join(out,'Caddyfile'),caddy,{flag:'wx'});
  const mounts=['--mount',`type=bind,source=${path.join(out,'Caddyfile')},target=/etc/caddy/Caddyfile,readonly`,
    '--mount',`type=bind,source=${path.join(root,'output/sky-sao-public-files-1003-r1/standard-export/publication/delivery.caddy')},target=/etc/caddy/sky-static-delivery.caddy,readonly`,
    '--mount',`type=bind,source=${path.join(root,'infrastructure/deployment/sky-resource-logging.caddy')},target=/etc/caddy/sky-resource-logging.caddy,readonly`,
    '--mount',`type=bind,source=${path.join(root,'output/sky-sao-public-files-1003-r1/standard-export/publication/files')},target=/srv/sky-public/files,readonly`];
  save('caddy-validation.json',{image,adaptedSha256:sha(docker(['run','--rm','--pull','never',...mounts,image,'caddy','adapt','--config','/etc/caddy/Caddyfile','--validate']))});
  const id=docker(['run','-d','--pull','never','--name',name,'--memory','128m','--cpus','1','--pids-limit','64','--read-only',
    '--tmpfs','/data:size=16m','--tmpfs','/config:size=8m','--tmpfs','/tmp:size=8m','-p','127.0.0.1::8443',...mounts,image]);running=true;
  port=Number(docker(['port',name,'8443/tcp']).split(':').at(-1));
  save('container.json',{id,name,image,port,memoryLimitBytes:128*1024*1024,cpuLimit:1,scope:'Owned loopback Docker Desktop proxy, not production deployment.'});
  docker(['exec',name,'sh','-c','i=0; while [ ! -s /data/caddy/pki/authorities/local/root.crt ] && [ $i -lt 50 ]; do i=$((i+1)); sleep 0.1; done; test -s /data/caddy/pki/authorities/local/root.crt'],8000);
  ca=Buffer.from(docker(['exec',name,'cat','/data/caddy/pki/authorities/local/root.crt'])+'\n');

 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
 const pages:any[]=[],errors:any[]=[],lanes:any[]=[];
 // One actual renderer plus two ordinary business clients overlap; no guessed
 // DAU distribution and no claim that this is the required 10/20 capacity lane.
 for(let client=0;client<1;client++){
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
   w.Taro.setStorage=async({key,data}:any)=>{await Promise.resolve();storage.set(key,structuredClone(data));return {errMsg:'setStorage:ok'};};
   w.Taro.getEnv=()=>"CONTROLLED_WEAPP_TRANSPORT";w.Taro.getStorageInfoSync=()=>({keys:[...storage.keys()]});w.Taro.login=async()=>({code:'local:isolated-live-page-client-'+client+'-0001'});
   w.storageInventory=()=>[...storage].map(([key,value])=>({role:key.includes('auth')?'fixture-auth':key.includes('cache')?'response-cache':'other',jsonBytes:new TextEncoder().encode(JSON.stringify(value)).byteLength}));
   w.counters=()=>({...originalCounters(),nativeRunning:running,nativeCallbackPeak:peak});
   w.Taro.request=(o:any)=>{
    const route=o.url.slice('https://approved.fixture.invalid'.length),id=client+':'+(++sequence);let done=false;
    const record:any={route,type:route.includes('/supplements/sao/v2/')&&route.includes('/assets/')?'json-file':o.responseType==='arraybuffer'?'image':'metadata',completed:false,bytes:0,sha256:null};w.requests.push(record);
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
    const held=w.holdDetail&&route.includes('/v2/sky/sdss-optical/')&&route.endsWith('/M-51-detail.jpg');
    if(held){w.holdDetail=false;record.held=true;w.heldTransfers.push({fail(){record.controlledCallbackFailure=true;finish(null,new Error('task native delivery failure'));}});}
    Promise.resolve((globalThis as any).__liveHttp({id,route,binary:o.responseType==='arraybuffer',method:o.method,data:o.data,header:o.header??{},phase:w.phase})).then(result=>{if(held)record.actualHttpCompletedBeforeDelivery=true;else finish(result,null);},error=>finish(null,error));
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
  const positions:any={0:position};
  for(const seconds of [1,60]){const instant=new Date(Date.parse(at)+seconds*1000).toISOString();
   positions[seconds]=await api.getCelestialObjectPosition({reference:'M:51',...current.context,at:instant},current.skyScene.deepSky.catalog);
   if(positions[seconds].data.at!==instant)throw Error('live position time mismatch');}
  w.stable={current,figures:figures.data,at,positions};w.reportEnvelope=report;w.objectTracking=null;
  return {bootstrapMs:performance.now()-began,reportDataState:report.dataState,catalogRows:catalog.data.rows.length,figures:figures.data.images.length,positionAt:position.data.at,
   source:'actual full current API operation/cache/validation, controlled Taro -> live isolated HTTP, no preloaded responses'};
 },{spotId:TEST_PUBLISHED_SPOT.spotId,client,filters:requireWorker('@starward/miniapp-contracts').EMPTY_FILTER_STATE});
 const bootstrapPromise=bootstrap(pages[0],0);
 // Delay ordinary kickoff until rendering demand starts, rather than merely
 // claiming that setup Promise.all means ordinary traffic overlapped paint.
 const boot=await bootstrapPromise;lanes.push({client:0,bootstrap:boot});
 const page=pages[0];await page.addScriptTag({content:fs.readFileSync(path.join(out,'bundle.js'),'utf8')});
 await page.evaluate(currentGpuExecutor);
 await page.evaluate(()=>{const w=globalThis.__controlled,fs=w.Taro.getFileSystemManager(),original=fs.readFile;
  fs.readFile=o=>original({...o,success:result=>{if(w.holdPageJson&&o.encoding==='utf8'&&/\/[a-f0-9]{64}-[a-f0-9]{64}-.*\.json$/.test(o.filePath)){
   w.holdPageJson=false;w.heldPageReads.push({path:o.filePath,bytes:new TextEncoder().encode(result.data).byteLength,release:()=>o.success(result)});
  }else o.success(result);}});
 });
 await page.evaluate(()=>{const w=globalThis.__controlled,base=w.resourceSnapshot;
  w.resourceSnapshot=()=>{const s=base(),stellar=w.stellarLoaders.map(l=>l.__measure()).filter(l=>!l.disposed);
   const loaded=stellar.flatMap(l=>l.loaded),sourceFiles=s.files.filter(f=>/\/[a-f0-9]{64}-[a-f0-9]{64}-.*\.json$/.test(f.path));
   return {...s,stellar,stellarTuples:loaded.reduce((n,t)=>n+t.tuples,0),stellarNumericPayloadModel:loaded.reduce((n,t)=>n+t.tupleNumericPayloadModel,0),
    stellarPublicationJsonBytes:loaded.reduce((n,t)=>n+t.decodedPublicationJsonBytes,0),stellarJsObjectBytes:null,jsonSourceEncodedBytes:sourceFiles.reduce((n,f)=>n+f.bytes,0),
    publicEncodedOwners:(w.publicFileOwners??[]).length,scope:s.scope+' SAO parsed-publication JSON/numeric models kept separate from encoded files and RGBA; not physical total.'};};
 });
 await page.evaluate(()=>{const w=(globalThis as any).__controlled,api=(globalThis as any).fullHookProbe;
  w.objectTracking=api.createSkyObjectTracking();w.browsingCamera=api.createSkyBrowsingCamera();w.cameraClock=0;
  const canonical=JSON.stringify(w.stable);w.assertStableOwners=({afterRelease=false}={})=>{if(JSON.stringify(w.stable)!==canonical)throw Error('live report/catalog owner changed');if(afterRelease&&w.canvasNodeRef.current!==null)throw Error('live node not retired');return true;};
  api.initializeActualPageLifecycle();w.phase='sky-cold-scene';});
 const ordinaryPromises:any[]=[];
 const conditions=[
 {name:'solar-moon-pending-hide',manualPan:true,body:'MOON',fov:1,reference:null,pendingHide:true},
 ...['MERCURY','VENUS','MARS','JUPITER','SATURN','URANUS','NEPTUNE'].map(body=>({name:'solar-'+body.toLowerCase(),manualPan:true,body,fov:.05,reference:null})),
 {name:'solar-moon-warm-return',manualPan:true,body:'MOON',fov:1,reference:null,hideRoundTrip:true}];
 save('conditions.json',{conditions,scope:'Only new solar family consumers of final single encoded owner; per-body actual current row values, cached publication bytes. No old wide/fullsky/M51 matrix or static contract replay, no phone/quality/capacity claim.'});
 const sceneRows:any[]=[];
 for(const condition of conditions){
  await page.evaluate((phase:string)=>{globalThis.__controlled.phase=phase;},condition.name);
  if(condition.sourceRoundTrip||condition.hideRoundTrip){const hidden=await page.evaluate(currentHideExecutor,{source:!!condition.sourceRoundTrip});
   assert.equal(hidden.presented,null);assert.equal(hidden.current.length,0);save(condition.name+'-hidden.json',hidden);await page.evaluate(currentShowExecutor);}
  const resolvedCondition=condition.fov==='DOME'?{...condition,fov:await page.evaluate(()=>globalThis.fullHookProbe.skyDomeFieldOfView(390,844,globalThis.fullHookProbe.NO_SKY_INSETS))}:condition;
  const row=await page.evaluate(currentJourneyExecutor,{condition:resolvedCondition});
  if(condition.fov==='DOME')assert.equal(row.passes.at(-1).actualPaintCamera.fov,resolvedCondition.fov);
  const passes=[];for(const p of row.passes){const label=condition.name+'-'+p.label;const rgba=Buffer.from(p.rgba,'base64'),png=Buffer.from(p.capture.split(',')[1],'base64');
   fs.writeFileSync(path.join(out,label+'.rgba'),rgba,{flag:'wx'});fs.writeFileSync(path.join(out,label+'.png'),png,{flag:'wx'});
   const {rgba:ignored,capture:alsoIgnored,...rest}=p;passes.push({...rest,rgbaSha256:sha(rgba),pngSha256:sha(png)});}
  const actualFacts=await page.evaluate(()=>{const w=globalThis.__controlled,landscape=w.paintedSkyObjectsRef.current?.view?.landscape;
   return {readiness:w.lastPageResult.landscapeImage.opacity,landscape:landscape?{kind:landscape.kind,opacity:landscape.opacity??null,background:landscape.background?{kind:landscape.background.kind,opacity:landscape.background.opacity}:null,foreground:landscape.foreground?{kind:landscape.foreground.kind,opacity:landscape.foreground.opacity}:null}:null,tracking:w.objectTracking.snapshot(),acceptedAt:w.presentedSkyFrame?.frameAt};});
  const jointOwner=await page.evaluate(()=>{const w=globalThis.__controlled;if(w.caches.length!==1||w.publicFileOwners.length!==1||w.caches[0]!==w.publicFileOwners[0])throw Error('duplicate encoded owner or budget');return {owners:1,cache:w.caches[0].inspect(),resources:w.resourceSnapshot()};});
  const solarFacts=await page.evaluate(body=>{const w=globalThis.__controlled,row=w.stable.current.hourly.find(r=>r.at===w.lastPageInput.at);
 const bodyGeometry=body==='MOON'?{azimuthDeg:row.moonAzimuthDeg,altitudeDeg:row.moonAltitudeDeg,angularDiameterDeg:row.moonAngularDiameterDeg,bodyFrame:row.moonBodyFrame}:row.planets.find(p=>p.body===body);
 return {body,bodyGeometry,pending:body==='MOON'?w.pagePendingEvidence??null:null,queries:w.queryRetention()};},condition.body);
 const bounded={...row,passes,actualFacts,jointOwner,solarFacts};save(condition.name+'.json',bounded);sceneRows.push(bounded);assert.deepEqual(row.gpuFailures,[]);
  console.log(JSON.stringify({condition:condition.name,accepted:row.passes.length,ownerRgbaModel:row.ready.resources.ownerRgbaModel,encodedFileBytes:row.ready.resources.filesBytes}));
 }
 const ordinary=await Promise.all(ordinaryPromises);lanes.push(...ordinary.map((result,client)=>({client:client+1,result})));
 const warm=await page.evaluate(async()=>{const w=globalThis.__controlled,api=globalThis.liveApi;w.phase='live-warm-entry';
  const report=await api.getSkyReport(w.spotId,w.context.contextId);const catalog=await api.getStellarCatalog(report.data.skyScene.catalog);const figures=await api.getConstellationCatalog();
  if(JSON.stringify(report.data)!==JSON.stringify(w.reportEnvelope.data))throw Error('warm report changed facts');
  return {catalogRows:catalog.data.rows.length,figures:figures.data.images.length,storage:w.storageInventory()};});
 save('warm-entry.json',warm);
 const final=await page.evaluate(currentFinalExecutor);save('final-owner.json',final);
 assert(!final.afterClear.gpu.handles.some((h:any)=>h.alive));assert.equal(final.afterClear.counters.nativeRunning,0);assert.equal(final.afterClear.counters.decodedPending,0);
 assert(!final.afterHide.nativeCurrent.some((i:any)=>i.membership==='CURRENT'));assert.equal(final.afterHide.presented,null);
 const logs=docker(['logs',name]);fs.writeFileSync(path.join(out,'caddy.log'),logs+'\n',{flag:'wx'});
 const access=logs.split(/\r?\n/).flatMap(line=>{try{const r=JSON.parse(line);return r.logger?.startsWith('http.log.access.')?[r]:[];}catch{return[];}});
 for(const r of access){assert.equal(r.request,undefined);assert.equal(r.resp_headers,undefined);assert([undefined,''].includes(r.user_id));}
 const success=rows.filter(r=>r.completed&&!r.aborted);assert.equal(access.length,rows.length);
 const loggedNonHead=access.map(r=>r.status+':'+r.size),receivedNonHead=success.map(r=>r.status+':'+r.encodedBodyBytes);
 for(const value of receivedNonHead){const i=loggedNonHead.indexOf(value);assert(i>=0,'successful non-HEAD receipt missing from log');loggedNonHead.splice(i,1);}
 assert.equal(loggedNonHead.length,rows.filter(r=>r.aborted).length);
 const deliveryAccounting={receivedSuccessfulBytes:success.reduce((n,r)=>n+r.encodedBodyBytes,0),loggedSize:access.reduce((n,r)=>n+r.size,0),head:null,unmatchedCancelledLogStatusSizes:loggedNonHead,cancelledPhysicalReceiptBytes:null};
 save('delivery-accounting.json',deliveryAccounting);
 assert.deepEqual(sources.map(bind),before);save('inputs-after.json',sources.map(bind));
 for(const file of ['source-binding-before.json','api-inputs.json'])for(const r of JSON.parse(fs.readFileSync(path.join(out,file),'utf8')).sourceBindings)assert.deepEqual(bind(r.path),{path:r.path,bytes:r.bytes,sha256:r.sha256});
 assert.deepEqual(errors,[]);save('wire-requests.json',rows);
 save('result.json',{status:'LIVE_SOLAR_AND_PENDING_PAGE_SINGLE_OWNER_DEVELOPMENT',lanes,warm,sceneRows,wire:rows,
  encodedSuccessfulBodyBytes:success.reduce((sum,r)=>sum+r.encodedBodyBytes,0),decodedSuccessfulBodyBytes:success.reduce((sum,r)=>sum+r.decodedBodyBytes,0),
  deliveryAccounting,successfulNonHeadCaddyStatusSizeMultisetMatches:true,privacyFieldsRemoved:true,finalResourcePeaks:final.resourcePeaks,errors,
  scope:'Final actual API/page Hook/lifecycle/Scene solar consumers and completed native UTF8 late-delivery hold across hide. Actual current astronomy owner values with test algorithmVersion/config and fixture spot/weather/repository; softwareGL/controlled ReactTaroMapFSclock. One encoded owner, no static contract or old five/wide/fullcold matrix replay. Historical source artwork semantics and nativeDevice/wholephysical/quality/productioncapacity/independentreview remain unverified.'});
}catch(error){save('live-failure.json',{error:String(error),stack:(error as Error).stack,wire:rows});throw error;}
finally{await browser?.close();for(const req of pending.values())req.destroy(new Error('owned_runner_shutdown'));
 if(running){if(!fs.existsSync(path.join(out,'caddy.log')))fs.writeFileSync(path.join(out,'caddy.log'),docker(['logs',name])+'\n',{flag:'wx'});docker(['stop','--time','5',name]);docker(['rm',name]);}await app.close();}
