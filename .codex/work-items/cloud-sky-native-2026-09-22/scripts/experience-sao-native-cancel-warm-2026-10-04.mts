/** Actual original SAO client/cache/native callback boundary; no Scene/UI replay. */
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {createRequire,syncBuiltinESMExports} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..'),out=path.resolve(root,process.argv[2]);
assert.equal(path.dirname(out),path.join(root,'output/playwright'));
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex'),save=(n:string,v:unknown)=>fs.writeFile(path.join(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const bind=async(p:string)=>{const b=await fs.readFile(path.join(root,p));return {path:p,bytes:b.length,sha256:hash(b)};};
await fs.copyFile(fileURLToPath(import.meta.url),path.join(out,'executed-script.mts'));
const sources=JSON.parse(await fs.readFile(path.join(out,'source-bindings-before.json'),'utf8'));
for(const row of sources)assert.deepEqual(await bind(row.path),row);
const checkpoint=process.argv[3]??'.codex/work-items/cloud-sky-native-2026-09-22/evidence/current-execution-state-2026-10-04-r69.json';
assert(/^\.codex\/work-items\/cloud-sky-native-2026-09-22\/evidence\/current-execution-state-[\d-]+-r\d+\.json$/.test(checkpoint));
const baseline=JSON.parse(await fs.readFile(path.join(root,checkpoint),'utf8'));
const allowed=new Set<string>();
const currentBaseline=[];const transitions=[];for(const row of baseline.currentSources){const current=await bind(row.path);
 if(current.sha256!==row.sha256){assert(allowed.has(row.path));transitions.push({before:row,after:current});}else assert.deepEqual(current,row);currentBaseline.push(current);}
for(const row of baseline.protected)assert.deepEqual(await bind(row.path),row);baseline.currentSources=currentBaseline;await save('runtime-input-transitions.json',transitions);
await save('current-baseline-before.json',{currentSources:baseline.currentSources,protected:baseline.protected});
const req=createRequire(path.join(root,'workers/miniapp-api/package.json'));req('reflect-metadata');
const script=await fs.readFile(fileURLToPath(import.meta.url),'utf8');
const direct=[...script.matchAll(/await import\('..\/..\/..\/..\/(workers\/miniapp-api\/src\/[^']+)'\)/g)].map(m=>m[1]);
for(const p of ['controller.ts','miniapp-service.ts','test-fixtures/create-test-service.ts','sao-publication.controller.ts','api-exception.filter.ts'])assert(direct.includes('workers/miniapp-api/src/'+p));
const graph=await req('esbuild').build({stdin:{contents:direct.map(p=>`import '${path.join(root,p).replaceAll('\\','/')}';`).join('\n'),resolveDir:root,sourcefile:'task-backend-graph.ts',loader:'ts'},
 absWorkingDir:root,bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',treeShaking:false,tsconfig:path.join(root,'workers/miniapp-api/tsconfig.json'),logLevel:'silent',
 plugins:[{name:'actual-workspace-packages',setup(b){b.onResolve({filter:/^@starward\//},a=>({path:req.resolve(a.path)}));}}]});
const backendSources=await Promise.all(Object.keys(graph.metafile.inputs).filter(p=>p!=='task-backend-graph.ts').map(p=>bind(p.replaceAll('\\','/'))));
await save('backend-source-bindings-before.json',backendSources);await save('backend-metafile.json',graph.metafile);
const publicReads:any[]=[],promiseFs=req('node:fs/promises'),originalRead=promiseFs.readFile;
promiseFs.readFile=async(...args:any[])=>{const bytes=await originalRead(...args);const p=path.resolve(args[0] instanceof URL?fileURLToPath(args[0]):String(args[0]));
 if(p.startsWith(path.join(root,'workers/miniapp-api/assets')+path.sep)){const b=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);publicReads.push({path:path.relative(root,p).replaceAll('\\','/'),bytes:b.length,sha256:hash(b)});}return bytes;};syncBuiltinESMExports();
const {Module}=req('@nestjs/common'),{NestFactory}=req('@nestjs/core'),{FastifyAdapter}=req('@nestjs/platform-fastify');
const {chromium}=req('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const imageOwner=req('image-size'),imageSize=typeof imageOwner==='function'?imageOwner:imageOwner.imageSize;
const {TEST_PUBLISHED_SPOT}=req('@starward/miniapp-contracts/test-fixtures');
const {MiniappController}=await import('../../../../workers/miniapp-api/src/controller.ts');
const {MiniappService}=await import('../../../../workers/miniapp-api/src/miniapp-service.ts');
const {createTestMiniappService}=await import('../../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts');
const {createBsc5pSkyCatalogProvider}=await import('../../../../workers/miniapp-api/src/sky-scene-catalog-provider.ts');
const {StellarCatalogController}=await import('../../../../workers/miniapp-api/src/stellar-catalog.controller.ts');
const {StellarCatalogPublicationService}=await import('../../../../workers/miniapp-api/src/stellar-catalog-publication.ts');
const {ConstellationController}=await import('../../../../workers/miniapp-api/src/constellation.controller.ts');
const {ConstellationPublicationService}=await import('../../../../workers/miniapp-api/src/constellation-publication.ts');
const {SaoPublicationController}=await import('../../../../workers/miniapp-api/src/sao-publication.controller.ts');
const {SaoPublicationService}=await import('../../../../workers/miniapp-api/src/sao-publication.ts');
const {ApiExceptionFilter}=await import('../../../../workers/miniapp-api/src/api-exception.filter.ts');
const {EtagInterceptor}=await import('../../../../workers/miniapp-api/src/etag.interceptor.ts');
const service=createTestMiniappService({skyCatalog:createBsc5pSkyCatalogProvider('bsc5p-bright-stars.v3')});
class PageDevelopmentModule{}
Module({controllers:[MiniappController,StellarCatalogController,ConstellationController,SaoPublicationController],providers:[{provide:MiniappService,useValue:service},
 {provide:StellarCatalogPublicationService,useValue:new StellarCatalogPublicationService()},
 {provide:ConstellationPublicationService,useValue:new ConstellationPublicationService()}, {provide:SaoPublicationService,useValue:new SaoPublicationService()}]})(PageDevelopmentModule);
const backend=await NestFactory.create(PageDevelopmentModule,new FastifyAdapter(),{logger:false});backend.useGlobalFilters(new ApiExceptionFilter());backend.useGlobalInterceptors(new EtagInterceptor());
const requests:any[]=[],errors:string[]=[];let browser:any,page:any;
const scaffoldPath='output/playwright/cloud-sky-live-mixed-1003-r10/runtime-executor.js.txt';
const scaffold=await fs.readFile(path.join(root,scaffoldPath),'utf8');
await save('native-scaffold-origin.json',await bind(scaffoldPath));
const nativeExecutor=Function('return ('+scaffold.replace(/^export const runtimeExecutor = /,'').trim().replace(/;$/,'')+')')();
try {
 await backend.listen(0,'127.0.0.1');const endpoint=await backend.getUrl();
 await save('backend.json',{endpoint,scope:'Original isolated controllers/providers; only SAO index/file endpoints invoked. No shared BFF restart or outside business mutation.'});
 browser=await chromium.launch({headless:true});page=await browser.newPage();page.on('pageerror',(e:any)=>errors.push(String(e)));
 await page.exposeFunction('__actualPageHttp',async(input:any)=>{
  assert(/^\/v2\/sky\/supplements\/sao\/v2(?:|\/[a-f0-9]{64}\/assets\/\d{2}-\d{2}-7-\d{1,3})$/.test(input.route),input.route);
  const row:any={id:requests.length+1,route:input.route,phase:input.phase,binary:input.binary};requests.push(row);
  const response=await fetch(endpoint+input.route,{headers:input.header});const raw=Buffer.from(await response.arrayBuffer());
  Object.assign(row,{status:response.status,receivedBytes:raw.length,sha256:hash(raw)});
  return {id:row.id,status:response.status,header:Object.fromEntries(response.headers),...(input.binary?{base64:raw.toString('base64')}:{data:raw.length?JSON.parse(raw.toString('utf8')):null})};
 });
 await page.setContent('<body></body>');await page.addScriptTag({content:'globalThis.__name=(fn,name)=>fn;'});
 await page.evaluate(nativeExecutor,{metadata:{},assets:[]});
 await page.evaluate(()=>{
  const w=globalThis.__controlled,p=w.Taro,storage=new Map();w.phase='sao-bootstrap';w.nativeTrace=[];w.heldReply=null;w.holdNextBinary=false;w.pendingNativeRequests=0;
  globalThis.__actualSkyPagePort=p;globalThis.__pageFileOwners=[];globalThis.__pageOrientationOwners=[];globalThis.__pageSceneInputs=[];globalThis.__pageCompletedPaints=[];
  p.getStorageSync=k=>storage.get(k);p.setStorageSync=(k,v)=>storage.set(k,structuredClone(v));p.removeStorageSync=k=>storage.delete(k);
  p.setStorage=async({key,data})=>{storage.set(key,structuredClone(data));return {};};p.getStorageInfoSync=()=>({keys:[...storage.keys()]});
  p.getEnv=()=> 'WEAPP';p.getDeviceInfo=()=>({platform:'android'});p.getSystemInfoSync=()=>({windowWidth:390,windowHeight:844,platform:'devtools',SDKVersion:'3.15.0'});
  p.request=o=>{
   const route=o.url.slice('https://approved.fixture.invalid'.length),binary=o.responseType==='arraybuffer';
   const hold=binary&&w.holdNextBinary;if(hold)w.holdNextBinary=false;
   const row={id:w.nativeTrace.length+1,route,binary,phase:w.phase,start:performance.now(),done:false,aborted:false,hold};w.nativeTrace.push(row);w.pendingNativeRequests++;
   const finish=(reply,error)=>{
    if(row.done){row.lateIgnored=true;return;}row.done=true;row.delivered=performance.now();w.pendingNativeRequests--;
    if(error){row.failed=true;o.fail?.({errMsg:String(error)});return;}
    let data=reply.data;if(binary)data=Uint8Array.from(atob(reply.base64),c=>c.charCodeAt(0)).buffer;
    o.success?.({statusCode:reply.status,data,header:reply.header});
   };
   Promise.resolve(globalThis.__actualPageHttp({route,binary,header:o.header??{},phase:w.phase})).then(reply=>{
    row.httpId=reply.id;row.responseSeen=performance.now();row.status=reply.status;
    if(hold){if(w.heldReply)throw Error('only one controlled response barrier');w.heldReply={deliver:()=>finish(reply,null),row};}
    else finish(reply,null);
   },error=>finish(null,error));
   return {abort(){if(row.done)return;row.aborted=true;row.abortAt=performance.now();finish(null,'request:fail abort');},catch(){}};
  };
  w.deliverHeld=()=>{const held=w.heldReply;if(!held)throw Error('actual reply not held');w.heldReply=null;held.deliver();return structuredClone(held.row);};
 });
 await page.addScriptTag({path:path.join(out,'page-bundle.js')});assert.equal(errors.length,0);await page.evaluate(()=>{if(!globalThis.actualSkyPage)throw Error('original export bootstrap absent');});
 const snapshot=async(name:string)=>{
  const r=await page.evaluate(async name=>{
   const w=globalThis.__controlled;return {name,phase:w.phase,owners:globalThis.__pageFileOwners.map(o=>o.inspect()),pendingNative:w.pendingNativeRequests,
    outcomes:structuredClone(w.outcomes??{}),nativeTrace:structuredClone(w.nativeTrace),files:[...w.files].map(([path,bytes])=>{const parts=[];const data=new Uint8Array(bytes);for(let i=0;i<data.length;i+=32768)parts.push(String.fromCharCode(...data.subarray(i,i+32768)));return {path,bytes:bytes.byteLength,base64:btoa(parts.join(''))};})};
  },name);r.files=r.files.map(({base64,...row})=>({...row,sha256:hash(Buffer.from(base64,'base64'))}));await save(name+'.json',r);return r;
 };
 const begin=async(phase:string,held:boolean,consumers:number)=>page.evaluate(async({phase,held,consumers})=>{
  const w=globalThis.__controlled,a=globalThis.actualSkyPage;w.phase=phase;
  const index=await a.saoCatalogClient.getIndex(),id='07-05-7-0',asset=index.data.index.tiles.find(t=>t.id===id);if(!asset)throw Error('original repeated tile absent');
  w.publication=index.data;w.asset=asset;w.holdNextBinary=held;w.aborters=Array.from({length:consumers},()=>new AbortController());w.outcomes={};
  w.promises=w.aborters.map((c,i)=>a.saoCatalogClient.getTile(index.data,id,c.signal).then(r=>{w.outcomes[i]={state:'fulfilled',tileId:r.data.tile.tileId,rows:r.data.tile.rows.length,publicationHash:r.data.publicationHash};},e=>{w.outcomes[i]={state:'rejected',error:String(e)};}));
  return {asset,indexPublicationHash:index.data.publicationHash};
 },{phase,held,consumers});
 const settle=async()=>page.evaluate(async()=>{await Promise.all(globalThis.__controlled.promises);});
 const clear=async(phase:string)=>{await page.evaluate(async phase=>{globalThis.__controlled.phase=phase;await globalThis.actualSkyPage.clearSkyPublicImageCache();},phase);};
 const firstAsset=await begin('normal-cold',false,1);await save('actual-asset.json',firstAsset);await settle();const cold=await snapshot('normal-cold');
 assert.equal(cold.outcomes[0].state,'fulfilled');
 await begin('normal-warm',false,1);await settle();const warm=await snapshot('normal-warm');
 assert.equal(warm.nativeTrace.filter(r=>r.binary).length,1);assert.equal(warm.outcomes[0].state,'fulfilled');
 await clear('retire-normal-generation');await snapshot('normal-cleared');
 await begin('response-before-native-callback-cancel',true,1);await page.waitForFunction(()=>globalThis.__controlled.heldReply!==null);
 const held=await snapshot('one-response-held');assert.equal(held.nativeTrace.at(-1).done,false);
 await page.evaluate(()=>globalThis.__controlled.aborters[0].abort());await settle();const cancelled=await snapshot('one-cancelled');
 assert.equal(cancelled.outcomes[0].state,'rejected');assert.equal(cancelled.nativeTrace.at(-1).aborted,true);
 await page.evaluate(()=>globalThis.__controlled.deliverHeld());await snapshot('one-late-native-reply-ignored');
 await begin('retry-after-cancel',false,1);await settle();const retried=await snapshot('one-retried');assert.equal(retried.outcomes[0].state,'fulfilled');
 await begin('warm-after-retry',false,1);await settle();await snapshot('one-retry-warm');
 assert.equal(requests.filter(r=>r.binary).length,3);
 await clear('retire-retry-generation');
 await begin('two-shared-consumers',true,2);await page.waitForFunction(()=>globalThis.__controlled.heldReply!==null);
 const two=await snapshot('two-response-held');assert.equal(two.pendingNative,1);assert.equal(requests.filter(r=>r.binary).length,4);
 await page.evaluate(async()=>{const w=globalThis.__controlled;w.aborters[0].abort();await w.promises[0];});const oneLeft=await snapshot('two-one-cancelled');
 assert.equal(oneLeft.outcomes[0].state,'rejected');assert.equal(oneLeft.nativeTrace.at(-1).aborted,false);assert.equal(oneLeft.pendingNative,1);
 await page.evaluate(()=>globalThis.__controlled.deliverHeld());await settle();const shared=await snapshot('two-survivor-completed');assert.equal(shared.outcomes[1].state,'fulfilled');
 await begin('two-after-warm',false,1);await settle();await snapshot('two-warm');assert.equal(requests.filter(r=>r.binary).length,4);
 await clear('final-clear');const final=await snapshot('final-cleared');assert.equal(final.pendingNative,0);
 assert(final.owners.every(o=>['entries','leased','bytes','reserved','running','pending','retired'].every(k=>o[k]===0)));
 const unique=new Map(publicReads.map(r=>[r.path,r]));for(const row of unique.values())assert.deepEqual(await bind(row.path),row);
 await save('public-asset-read-bindings.json',{reads:publicReads,unique:[...unique.values()]});
 await save('requests.json',requests);await save('browser-errors.json',errors);assert.equal(errors.length,0);
 await save('source-bindings-after.json',await Promise.all(sources.map(r=>bind(r.path))));assert.deepEqual(JSON.parse(await fs.readFile(path.join(out,'source-bindings-after.json'),'utf8')),sources);
 const afterBackend=await Promise.all(backendSources.map(r=>bind(r.path)));assert.deepEqual(afterBackend,backendSources);await save('backend-source-bindings-after.json',afterBackend);
 const currentAfter={currentSources:await Promise.all(baseline.currentSources.map(r=>bind(r.path))),protected:await Promise.all(baseline.protected.map(r=>bind(r.path)))};
 assert.deepEqual(currentAfter,{currentSources:baseline.currentSources,protected:baseline.protected});await save('current-baseline-after.json',currentAfter);
 await save('result.json',{status:'ORIGINAL_SAO_NATIVE_CANCEL_WARM_BOUNDARY_DEVELOPMENT',frontend:sources.length,backend:backendSources.length,binaryTransfers:4,
  normalWarmAdditionalBinary:0,retryWarmAdditionalBinary:0,sharedWarmAdditionalBinary:0,controlledAbortBoundary:'Actual Node HTTP response received, then original native success callback held; original client signal abort; late callback ignored.',
  originalFailedDuplicateScope:'Saved full journey had two200 on this same tile; it lacked native abort/callback trace. This controlled reachable boundary reproduces2transfers with correct cancellation, not proof of that historical cause.',
  scope:'Original exported API/SAO validation/public-file cache/UTF8 read/lease/epoch + actual immutable tile and isolated HTTP; controlled native callback/MapFS only. No Scene/UI replay, production cache policy change, target latency/phone/physical memory/capacity or independent review.'});
 console.log(JSON.stringify({status:'ORIGINAL_SAO_NATIVE_CANCEL_WARM_BOUNDARY_DEVELOPMENT',requests:requests.length,binaryTransfers:4}));
} catch(error) {
 await save('failed.json',{error:String(error),requests,errors});throw error;
} finally {
 if(browser)await browser.close();await backend.close();promiseFs.readFile=originalRead;syncBuiltinESMExports();
}
