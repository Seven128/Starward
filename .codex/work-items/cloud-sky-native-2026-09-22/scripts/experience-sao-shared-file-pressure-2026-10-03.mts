import {ConstellationController} from '../../../../workers/miniapp-api/src/constellation.controller.ts';
import {ConstellationPublicationService} from '../../../../workers/miniapp-api/src/constellation-publication.ts';
import {SaoPublicationController} from '../../../../workers/miniapp-api/src/sao-publication.controller.ts';
import {SaoPublicationService} from '../../../../workers/miniapp-api/src/sao-publication.ts';
import * as pageExecutors from './experience-current-scene-browser-2026-10-03.ts';
const {currentGpuExecutor,currentJourneyExecutor,currentHideExecutor,currentShowExecutor,currentFinalExecutor}=(pageExecutors as any).default??pageExecutors;
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
assert(fs.existsSync(path.join(out,'api-bundle.js')));
const sha=(raw:Buffer|string)=>createHash('sha256').update(raw).digest('hex');
const save=(name:string,value:unknown)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const bind=(file:string)=>{const raw=fs.readFileSync(path.join(root,file));return {path:file,bytes:raw.length,sha256:sha(raw)};};
const checkpoint=JSON.parse(fs.readFileSync(path.join(root,'.codex/work-items/cloud-sky-native-2026-09-22/evidence/current-execution-state-2026-10-03-r45.json'),'utf8'));
const authorisedChanged=new Set(["workers/miniapp-api/src/sao-publication.ts","workers/miniapp-api/src/sky-public-asset-export.ts","tools/deployment/sky-static-bundle.mjs","apps/wechat-miniapp/src/services/api-client.ts","apps/wechat-miniapp/src/services/sky-public-image-runtime.ts","apps/wechat-miniapp/src/services/sky-public-image-cache.ts"]);
for(const row of [...checkpoint.protected,...checkpoint.currentSources])if(!authorisedChanged.has(row.path))assert.deepEqual(bind(row.path),row);
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
sources.push('apps/wechat-miniapp/src/services/sky-public-file-bytes.ts','apps/wechat-miniapp/src/services/sky-public-image-cache.ts','apps/wechat-miniapp/src/services/sao-catalog-client.ts','tools/deployment/sky-static-bundle.mjs');
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
}
async function wire(input:any){
 assert(typeof input.route==='string'&&input.route.startsWith('/v2/')&&!input.route.includes('://'));
 const ordinal=rows.length+1,start=performance.now();
 const family=input.route.includes('/auth/')?'auth':input.route.includes('observation-context')?'context':input.route.includes('/spots/')&&input.route.includes('/sky')?'sky_report_position':input.route.includes('/sky/')?'sky_public':input.route.includes('/terrain/')?'terrain':'ordinary';
 const r:any={ordinal,client:input.client,family,method:input.method??'GET',phase:input.phase,conditionalRequest:!!input.header?.['If-None-Match'],startedMs:start-started,status:null,encodedBodyBytes:0,decodedBodyBytes:null,completed:false,aborted:false};rows.push(r);
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
  await page.exposeFunction('__liveHttp',async(input:any)=>dispatchHttp({...input,client}));
  await page.exposeFunction('__liveAbort',(id:string)=>{pending.get(id)?.destroy(new Error('browser_owner_abort'));});
  await page.setContent('<canvas width="390" height="844"></canvas>');await page.addScriptTag({content:'globalThis.__name=(fn,name)=>fn;'});
  await page.evaluate(runtimeExecutor,{metadata:{},assets:[]});
  await page.evaluate(({client}:any)=>{
   const w=(globalThis as any).__controlled,storage=new Map(),originalCounters=w.counters;
   let sequence=0,running=0,peak=0,storagePending=0,storageWrites=0;w.phase='bootstrap';w.liveEvents=[];
   w.Taro.getStorageSync=(key:string)=>storage.get(key);w.Taro.setStorageSync=(key:string,value:any)=>storage.set(key,structuredClone(value));w.Taro.removeStorageSync=(key:string)=>storage.delete(key);
   w.Taro.setStorage=async({key,data}:any)=>{storagePending++;try{await Promise.resolve();storage.set(key,structuredClone(data));storageWrites++;return {errMsg:'setStorage:ok'};}finally{storagePending--;}};
   w.storageState=()=>{const manifest=storage.get('starward.wechat-miniapp.response-cache.current');
    return {pending:storagePending,asyncWrites:storageWrites,schemaVersion:manifest?.schemaVersion??null,
     entries:(manifest?.entries??[]).map(([key,d]:any)=>({family:key.split(':')[0],bytes:d.bytes,storageBytes:d.storageBytes,chunks:d.chunks})),
     chunkCount:[...storage.keys()].filter(k=>k.startsWith('starward.wechat-miniapp.response-cache.chunk.')).length};};
   w.waitStorageIdle=async()=>{let quiet=0;for(let i=0;i<50;i++){await new Promise(r=>setTimeout(r,0));quiet=storagePending===0?quiet+1:0;if(quiet>=3)return w.storageState();}throw Error('task storage did not settle');};
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
  if(client){await api.ensureFavoriteOwner();return {preparedContext:true,authenticatedFixture:true};}
  w.phase='sky-cold-bootstrap';
  const report=await api.getSkyReport(spotId,context.contextId),[catalog,figures]=await Promise.all([api.getStellarCatalog(report.data.skyScene.catalog),api.getConstellationCatalog()]);
  const current=api.attachSkyCatalog(report.data,catalog.data),at=new Date(current.context.at).toISOString();
  const position=await api.getCelestialObjectPosition({reference:'M:51',...current.context,at},current.skyScene.deepSky.catalog);
  w.stable={current,figures:figures.data,at,positions:{0:position}};w.reportEnvelope=report;w.objectTracking=null;
  return {bootstrapMs:performance.now()-began,reportDataState:report.dataState,catalogRows:catalog.data.rows.length,figures:figures.data.images.length,positionAt:position.data.at,
   source:'actual full current API operation/cache/validation, controlled Taro -> live isolated HTTP, no preloaded responses'};
 },{spotId:TEST_PUBLISHED_SPOT.spotId,client,filters:requireWorker('@starward/miniapp-contracts').EMPTY_FILTER_STATE});
 const boot=await bootstrap(pages[0],0);lanes.push({client:0,bootstrap:boot});
 const history=JSON.parse(fs.readFileSync(path.join(root,'output/playwright/cloud-sky-live-mixed-1003-r4/final-owner.json'),'utf8'));
 const tileIds=[...new Set(history.requests.map((r:any)=>r.route).filter((r:string)=>r.includes('/sky/supplements/sao/')&&r.includes('/tiles/')).map((r:string)=>r.split('/').at(-1)))];
 save('pressure-origin.json',{source:'output/playwright/cloud-sky-live-mixed-1003-r4/final-owner.json',sha256:sha(fs.readFileSync(path.join(root,'output/playwright/cloud-sky-live-mixed-1003-r4/final-owner.json'))),tileIds,
  scope:'Bounded actual SAO client/response-cache owner pressure using previously demanded real tile identities; no page/Scene or9condition/fullcold replay.'});
 const page=pages[0];
 const measured=await page.evaluate(async({tileIds}:any)=>{
  const w=globalThis.__controlled,api=globalThis.liveApi,observer=w.cacheObservers[0];if(w.cacheObservers.length!==1)throw Error('unexpected response cache owner count');
  await observer.flush();const initial=observer.snapshot(),snapshots:any[]=[];
  const readBase=async(phase:string)=>{w.phase=phase;const first=w.requests.length;
   const report=await api.getSkyReport(w.spotId,w.context.contextId),catalog=await api.getStellarCatalog(report.data.skyScene.catalog),figures=await api.getConstellationCatalog();
   if(JSON.stringify(report.data)!==JSON.stringify(w.reportEnvelope.data)||catalog.data.rows.length!==8404||figures.data.images.length===0)throw Error('pressure warm facts changed');
   await observer.flush();return {phase,requestCount:w.requests.length-first};};
  const beforePressure=await readBase('cache-baseline-warm');w.phase='cache-sao-pressure';
  const index=await api.saoCatalogClient.getIndex();await observer.flush();
  let consumed=0;for(const id of tileIds){if(!index.data.index.tiles.some(t=>t.id===id))throw Error('history tile not in current index');
   const response=await api.saoCatalogClient.getTile(index.data,id);if(!response.data.tile.rows.length)throw Error('empty tile does not prove pressure effect');
   await observer.flush();consumed++;const state=observer.snapshot();snapshots.push({consumed,tileId:id,state});
   if(['spot-sky','stellar-catalog','constellation-catalog'].every(f=>!state.memory.some(v=>v.family===f)&&!state.disk.some(v=>v.family===f)))break;
   if(consumed>=22)break;
  }
  const beforeWarm=observer.snapshot(),afterPressure=await readBase('cache-after-pressure-warm'),afterWarm=observer.snapshot();
  if(w.publicFileOwners.length!==1)throw Error('duplicate public encoded owners');const fileOwner=w.publicFileOwners[0];
  const waitFor=async(predicate:()=>boolean)=>{for(let i=0;i<500;i++){if(predicate())return;await new Promise(r=>setTimeout(r,2));}throw Error('bounded JSON reader callback not reached');};
  await waitFor(()=>fileOwner.inspect().running===0&&fileOwner.inspect().leased===0);
  const afterColdFiles=fileOwner.inspect(),first=index.data.index.tiles.find(t=>t.id===tileIds[0]);
  w.phase='cache-sao-file-warm';const warmStart=w.requests.length;const warmTile=await api.saoCatalogClient.getTile(index.data,first.id);
  if(warmTile.data.tile.rows.length!==first.rowCount||w.requests.length!==warmStart)throw Error('warm file body/request mismatch');
  await waitFor(()=>fileOwner.inspect().running===0&&fileOwner.inspect().leased===0);
  const afterWarmFiles=fileOwner.inspect();
  const originalFS=w.Taro.getFileSystemManager();let heldRead:(()=>void)|undefined,hold=false;
  w.Taro.getFileSystemManager=()=>({...originalFS,readFile(o:any){if(hold&&o.encoding==='utf8'){hold=false;heldRead=()=>originalFS.readFile(o);}else originalFS.readFile(o);}});
  hold=true;w.phase='cache-sao-aborted-file-read';const abort=new AbortController();
  const cancelled=api.saoCatalogClient.getTile(index.data,first.id,abort.signal).then(()=>({accepted:true}),error=>({accepted:false,message:String(error.message)}));
  await waitFor(()=>!!heldRead);abort.abort();const abortResult=await cancelled,abortHeld=fileOwner.inspect();
  if(abortResult.accepted||abortHeld.leased!==1)throw Error('aborted native reader did not retain its lease');heldRead!();heldRead=undefined;
  await waitFor(()=>fileOwner.inspect().leased===0);const afterAbort=fileOwner.inspect();
  hold=true;w.phase='cache-sao-clear-late-read';const cleared=api.saoCatalogClient.getTile(index.data,first.id).then(()=>({accepted:true}),error=>({accepted:false,message:String(error.message)}));
  await waitFor(()=>!!heldRead&&fileOwner.inspect().running===0);const clearResult=await api.clearSkyPublicImageCache(),clearRejected=await cleared,clearHeld=fileOwner.inspect();
  if(clearRejected.accepted||clearHeld.leased!==1||clearHeld.retired!==1)throw Error('clear fabricated native read completion');heldRead!();heldRead=undefined;
  await waitFor(()=>fileOwner.inspect().leased===0&&fileOwner.inspect().retired===0);const afterClearFiles=fileOwner.inspect();
  const stale=await api.saoCatalogClient.getTile(index.data,first.id).then(()=>false,error=>String(error.message).includes('retired_index'));if(!stale)throw Error('retired metadata escaped generation fence');
  w.phase='cache-sao-after-clear-recovery';const freshIndex=await api.saoCatalogClient.getIndex();const fresh=await api.saoCatalogClient.getTile(freshIndex.data,first.id);
  if(fresh.data.tile.rows.length!==first.rowCount)throw Error('clear recovery source mismatch');await waitFor(()=>fileOwner.inspect().leased===0&&fileOwner.inspect().running===0);
  const recoveredFiles=fileOwner.inspect();
  const files={afterColdFiles,afterWarmFiles,warmHttpRequests:w.requests.length-warmStart-2,abortResult,abortHeld,afterAbort,
   clearResult,clearRejected,clearHeld,afterClearFiles,retiredIndexRejected:stale,recoveredFiles,
   scope:'Actual shared core with controlled MapFS/native UTF8. Abort/clear hold the native read callback, not HTTP. File lease remains until actual callback; late value is rejected. No physical memory/native device or complete page claim.'};
  return {initial,beforePressure,snapshots,consumed,beforeWarm,afterPressure,afterWarm,files,events:w.cacheEvidence,
   scope:'Actual current response cache and validated real SAO client; forced flush only makes persistence observation deterministic. Serial bounded pressure is causal owner development evidence, not exact historical concurrent scheduling or native capacity/physical RSS.'};
 },{tileIds});save('cache-owner-observation.json',measured);
 const logs=docker(['logs',name]);fs.writeFileSync(path.join(out,'caddy.log'),logs+'\n',{flag:'wx'});
 const access=logs.split(/\r?\n/).flatMap(line=>{try{const r=JSON.parse(line);return r.logger?.startsWith('http.log.access.')?[r]:[];}catch{return[];}});
 for(const r of access){assert.equal(r.request,undefined);assert.equal(r.resp_headers,undefined);assert([undefined,''].includes(r.user_id));}
 assert.equal(access.length,rows.length);const success=rows.filter(r=>r.completed&&!r.aborted);
 assert.equal(access.reduce((n,r)=>n+r.size,0),success.reduce((n,r)=>n+r.encodedBodyBytes,0));
 assert.deepEqual(sources.map(bind),before);save('inputs-after.json',sources.map(bind));
 for(const file of ['api-inputs.json'])for(const r of JSON.parse(fs.readFileSync(path.join(out,file),'utf8')).sourceBindings)assert.deepEqual(bind(r.path),{path:r.path,bytes:r.bytes,sha256:r.sha256});
 assert.deepEqual(errors,[]);save('wire-requests.json',rows);
 save('result.json',{status:'LIVE_SAO_SHARED_FILE_PRESSURE_AND_LATE_READ_DEVELOPMENT',measured,wire:rows,privacyStatusSizeMatched:true,
  encodedSuccessfulBodyBytes:success.reduce((n,r)=>n+r.encodedBodyBytes,0),decodedSuccessfulBodyBytes:success.reduce((n,r)=>n+r.decodedBodyBytes,0),
  scope:'Current full API/new raw SAO/static export and one shared file owner, controlled native transport/storage/UTF8 with real HTTP+cached local Caddy. Fixture report/weather/business remain. Same22 source tile pressure; warm and cancelled/clear native read outcomes. No page/Scene/firstusable/native/physical/capacity or otherbusinesslogic claim; generic response-cache policy unchanged.'});
 console.log(JSON.stringify({tiles:measured.consumed,baseline:rows.filter(r=>r.phase==='cache-baseline-warm').map(r=>r.status),after:rows.filter(r=>r.phase==='cache-after-pressure-warm').map(r=>r.status),events:measured.events.length}));
}catch(error){save('live-failure.json',{error:String(error),stack:(error as Error).stack,wire:rows});throw error;}
finally{for(const q of dispatch.queued.splice(0))q.reject(new Error('owned_dispatch_shutdown'));await browser?.close();for(const req of pending.values())req.destroy(new Error('owned_runner_shutdown'));
 if(running){if(!fs.existsSync(path.join(out,'caddy.log')))fs.writeFileSync(path.join(out,'caddy.log'),docker(['logs',name])+'\n',{flag:'wx'});docker(['stop','--time','5',name]);docker(['rm',name]);}await app.close();}
