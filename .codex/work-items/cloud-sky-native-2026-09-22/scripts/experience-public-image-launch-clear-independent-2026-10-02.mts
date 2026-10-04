/** Independent actual App/service/runtime/core path, controlled native callbacks only. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {skyImageContentHash} from '../../../../packages/miniapp-contracts/src/sky-image-display-support.ts';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const require=createRequire(path.join(ROOT,'apps/wechat-miniapp/package.json'));
const {QueryClient}=require('@tanstack/react-query');
const file=(name:string)=>path.join(ROOT,name);
const read=(name:string)=>fs.readFileSync(file(name));
const sha=(raw:Uint8Array|string)=>createHash('sha256').update(raw).digest('hex');
const bound=(name:string)=>{const raw=read(name);return{path:name,bytes:raw.length,sha256:sha(raw)}};
const inputNames={app:'apps/wechat-miniapp/src/app.tsx',api:'apps/wechat-miniapp/src/services/api-client.ts',
  runtime:'apps/wechat-miniapp/src/services/sky-public-image-runtime.ts',core:'apps/wechat-miniapp/src/services/sky-public-image-cache.ts',
  bytes:'apps/wechat-miniapp/src/services/sky-image-bytes.ts',legacy:'apps/wechat-miniapp/src/services/sky-image-file-session.ts',
  response:'apps/wechat-miniapp/src/services/response-cache.ts',lifecycle:'apps/wechat-miniapp/src/services/request-lifecycle.ts',
  policy:'apps/wechat-miniapp/src/services/cache-policy.ts',fixture:'apps/wechat-miniapp/src/services/api-request-test-support.ts',
  digest:'packages/miniapp-contracts/src/sky-image-display-support.ts',
  hook:'apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts',adapter:'apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts',
  loader:'apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts',optical:'apps/wechat-miniapp/src/features/sky/use-sky-optical-hips.ts',
  selected:'apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts'};
const source=Object.fromEntries(Object.entries(inputNames).map(([name,p])=>[name,read(p).toString()]));
const sources=Object.values(inputNames).map(bound);
// These were read by r10 but not included in its before/after input set. Bind
// them explicitly in the final generation; no production behavior is changed.
const auxiliaryNames={catalog:'packages/astronomy-core/data/stellarium-modern-v24.4.v3.json',
  oldAdapter:'output/sky-public-file-cache-independent-1002-r4/adapter.ts.txt',
  keptBaseline:'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'};
const auxiliaryInputs=Object.values(auxiliaryNames).map(bound);
const kept=JSON.parse(read('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json').toString());
for(const item of kept)assert.equal(bound(item.path).sha256,item.sha256);
const catalog=JSON.parse(read('packages/astronomy-core/data/stellarium-modern-v24.4.v3.json').toString());
const images=[...catalog.images].sort((a,b)=>a.bytes-b.bytes).slice(0,2).map(image=>{
  const p='workers/miniapp-api/assets/constellations/'+image.file,raw=read(p);assert.equal(sha(raw),image.sha256);assert.equal(raw.length,image.bytes);
  return{asset:{...image,format:'png'},raw,source:bound(p)};
});
const originalDeepSky:any[]=[];
function inventory(p:string){for(const item of fs.readdirSync(file(p),{withFileTypes:true})){
  const name=p+'/'+item.name;if(item.isDirectory())inventory(name);else if(item.isFile())originalDeepSky.push(bound(name));
}}
inventory('workers/miniapp-api/assets/deep-sky');assert.equal(originalDeepSky.length,201);
const base='https://controlled.invalid',publication='f'.repeat(64);
const urls=images.map(i=>`${base}/v2/sky/constellations/${publication}/${i.asset.file}`);
const asBuffer=(raw:Uint8Array)=>raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength) as ArrayBuffer;
const output=process.argv[2];assert.ok(output?.startsWith('output/'));
assert.ok(!fs.existsSync(file(output)));fs.mkdirSync(file(output));
const save=(name:string,value:unknown)=>fs.writeFileSync(file(output+'/'+name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
for(const [name,text]of Object.entries(source))fs.writeFileSync(file(output+'/'+name+'.ts.txt'),text,{flag:'wx'});
for(const [name,input]of Object.entries(auxiliaryNames))fs.copyFileSync(file(input),file(output+'/'+name+'.input.txt'),fs.constants.COPYFILE_EXCL);
fs.copyFileSync(fileURLToPath(import.meta.url),file(output+'/executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const compile=(text:string,bindings:Record<string,unknown>,extra:Record<string,unknown>={})=>{
  const exports:Record<string,any>={};
  vm.runInNewContext(ts.transpileModule(text,{fileName:text.includes('function App(')?'app.tsx':'owner.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:false}}).outputText,
    {exports,ArrayBuffer,Uint8Array,DataView,Error,Date,Map,Set,Promise,setTimeout,clearTimeout,
      require(name:string){assert.ok(name in bindings,name);return bindings[name]},...extra},{timeout:5000});
  return exports;
};
const bytes=compile(source.bytes,{'@starward/miniapp-contracts':{skyImageContentHash}});
const core=compile(source.core,{'./sky-image-bytes':bytes});
const legacy=compile(source.legacy,{}),response=compile(source.response,{}),lifecycle=compile(source.lifecycle,{}),policy=compile(source.policy,{});
const declaration=(name:string,all:string)=>{
  const parsed=ts.createSourceFile(name,all,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const target=parsed.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
  assert.ok(target,name);return target.getText(parsed);
};
const tick=async()=>{for(let i=0;i<300;i++)await Promise.resolve()};
const until=async(predicate:()=>boolean)=>{for(let i=0;i<4000;i++){if(predicate())return;await Promise.resolve()}throw Error('bounded callback not reached')};
function world(){
  const root='/controlled',files=new Map<string,ArrayBuffer>(),events:any[]=[],caches:any[]=[],calls:any[]=[];
  let holdTransfer=false,abortThrows=false,removeThrows=false;
  const corruptOnce=new Set<number>();
  const deliver=(callback:()=>void)=>queueMicrotask(callback);
  const nativeFS={
    mkdir(o:any){events.push(['mkdir',o.dirPath]);deliver(o.success)},
    readdir(o:any){events.push(['list',o.dirPath]);deliver(()=>o.success({files:[...files.keys()].filter(p=>p.startsWith(o.dirPath+'/')&&!p.slice(o.dirPath.length+1).includes('/')).map(p=>p.slice(o.dirPath.length+1))}))},
    stat(o:any){deliver(()=>files.has(o.path)?o.success({stats:{isFile:()=>true,size:files.get(o.path)!.byteLength}}):o.fail({errMsg:'no such file or directory'}))},
    readFile(o:any){events.push(['read',o.filePath,o.length]);deliver(()=>files.has(o.filePath)?o.success({data:files.get(o.filePath)!.slice(o.position,o.position+o.length)}):o.fail({errMsg:'no such file or directory'}))},
    writeFile(o:any){events.push(['write',o.filePath,o.data.byteLength]);deliver(()=>{files.set(o.filePath,o.data.slice(0));o.success()})},
    rename(o:any){events.push(['rename',o.oldPath,o.newPath]);deliver(()=>{if(!files.has(o.oldPath)){o.fail({errMsg:'missing'});return}files.set(o.newPath,files.get(o.oldPath)!);files.delete(o.oldPath);o.success()})},
    unlink(o:any){events.push(['unlink',o.filePath]);deliver(()=>{if(removeThrows){o.fail?.({errMsg:'controlled remove failed'});return}files.delete(o.filePath);o.success?.()})},
  };
  const Taro={env:{USER_DATA_PATH:root},getFileSystemManager:()=>nativeFS,request(o:any){
    const id=urls.indexOf(o.url);assert.ok(id>=0,'unknown controlled url');events.push(['transfer',id]);calls.push(o);
    if(!holdTransfer)deliver(()=>{const data=asBuffer(images[id]!.raw);if(corruptOnce.delete(id))new Uint8Array(data)[30]^=1;o.success({statusCode:200,data})});
    return{catch(){},abort(){events.push(['abort',id]);if(abortThrows)throw Error('controlled native abort throws');o.fail({errMsg:'abort'})}};
  }};
  const newRuntime=()=>compile(source.runtime,{'@tarojs/taro':{default:Taro},'@starward/miniapp-contracts':{skyImageContentHash},
    './sky-public-image-cache':{createSkyPublicImageCache(deps:any){const cache=core.createSkyPublicImageCache({...deps,cleanupWaitMs:10});caches.push(cache);return cache}}},
    {__MINIAPP_API_BASE__:base});
  const runtime=newRuntime();
  return{root,files,events,caches,calls,Taro,nativeFS,runtime,newRuntime,corruptOnce,set holdTransfer(v:boolean){holdTransfer=v},set abortThrows(v:boolean){abortThrows=v},set removeThrows(v:boolean){removeThrows=v},
    snapshot(){return{files:[...files].map(([p,b])=>({path:p,bytes:b.byteLength,sha256:sha(new Uint8Array(b))})),cache:caches.map(c=>c.inspect()),events:[...events]}}};
}
function service(w:ReturnType<typeof world>){
  const events:any[]=[],storage=new Map<string,unknown>();
  const persistent={getStorageSync:(k:string)=>storage.get(k),setStorageSync:(k:string,v:unknown)=>storage.set(k,v),removeStorageSync:(k:string)=>storage.delete(k),getStorageInfoSync:()=>({keys:[...storage.keys()]}),setStorage:async({key,data}:any)=>{storage.set(key,data)}};
  const responseCache=response.createResponseCache(persistent),requests=new lifecycle.LatestRequestRegistry(),queryClient=new QueryClient({defaultOptions:{queries:{gcTime:Infinity,retry:false}}});
  const envelope={apiVersion:'v2',generatedAt:'2026-10-02T00:00:00.000Z',requestId:'controlled',etag:'controlled',warnings:[],sources:[],data:{value:'cache state'},dataState:'FRESH'};
  for(const key of ['map-scene:temporary','plans:retained','weather:retained','account-profile:retained']){responseCache.set(key,envelope);queryClient.setQueryData([key.split(':')[0],'fixture'],key)}
  storage.set('auth:retained','controlled private marker');storage.set('draft:retained','authored controlled draft');
  for(const key of ['map-scene:read-1','map-scene:read-2'])requests.register(key,()=>events.push(['api-cancel',key,w.caches[0]?.inspect().epoch]),true,true);
  requests.register('plans:private-read',()=>events.push(['private-read-cancel']),true);
  requests.register('map-scene:write',()=>events.push(['write-cancel']),false);
  const clearCode=declaration('clearTemporaryApiCache',source.api);
  const nativeClear=w.runtime.clearSkyPublicImageCache;
  const exported=compile(clearCode,{}, {clearSkyPublicImageCache(){events.push(['public-clear-start']);return nativeClear()},requests,responseCache,
    isTemporaryCacheKey:policy.isTemporaryCacheKey,miniappQueryClient:queryClient});
  return{clear:exported.clearTemporaryApiCache,events,storage,responseCache,requests,queryClient,envelope,
    check(){assert.equal(responseCache.get('map-scene:temporary'),undefined);assert.equal(queryClient.getQueryData(['map-scene','fixture']),undefined);
      for(const root of ['plans','weather','account-profile']){assert.ok(responseCache.get(root+':retained'));assert.equal(queryClient.getQueryData([root,'fixture']),root+':retained')}
      assert.equal(storage.get('auth:retained'),'controlled private marker');assert.equal(storage.get('draft:retained'),'authored controlled draft');
      assert.equal(requests.has('plans:private-read'),true);assert.equal(requests.has('map-scene:write'),true)},
    dispose(){queryClient.clear()}};
}
function hookConsumer(w:ReturnType<typeof world>,runtime=w.runtime,requestSource=source.adapter){
  const slots:any[]=[],effects:(()=>void)[]=[],nativeImages:any[]=[],hookEvents:any[]=[];
  let cursor=0,dirty=false,result:any;
  const same=(old:unknown[]|undefined,current:unknown[])=>old?.length===current.length&&current.every((v,i)=>Object.is(old[i],v));
  const react={
    useRef(value:unknown){const id=cursor++;return slots[id]??=({current:value})},
    useState(value:unknown){const id=cursor++;if(!(id in slots))slots[id]=value;return[slots[id],(next:any)=>{next=typeof next==='function'?next(slots[id]):next;if(!Object.is(next,slots[id])){slots[id]=next;dirty=true}}]},
    useCallback(value:unknown,deps:unknown[]){const id=cursor++;if(!same(slots[id]?.deps,deps))slots[id]={deps,value};return slots[id].value},
    useEffect(body:()=>void|(()=>void),deps:unknown[]){const id=cursor++,previous=slots[id];if(same(previous?.deps,deps))return;
      slots[id]={deps};effects.push(()=>{previous?.cleanup?.();slots[id].cleanup=body()})},
  };
  const actualLoader=compile(source.loader,{}),actualRequest=compile(requestSource,{'../../services/sky-image-bytes':bytes});
  const actual=compile(source.hook,{react,'@tarojs/taro':{default:w.Taro},'@/services/api-client':{constellationAssetUrl(){throw Error('unused in direct shared owner trial')}},
    '../../services/sky-image-file-session':{skyImageFileSession:legacy.skyImageFileSession},'../../services/sky-public-image-runtime':runtime,
    './sky-artwork-loader':actualLoader,'./sky-artwork-request':actualRequest});
  const canvas=()=>({createImage(){const image={src:'',onload:null as null|(()=>void),onerror:null as null|(()=>void),width:128,height:128};nativeImages.push(image);hookEvents.push(['native-image-created',nativeImages.length-1]);return image}});
  const input={canvas:canvas() as any,revision:1,hash:publication as string|undefined,active:true,wanted:[images[0]!.asset] as any[],fallback:[] as string[],storage:'public',url:undefined as string|undefined};
  const resolve=(asset:any)=>({url:input.url??urls[images.findIndex(image=>image.asset.sha256===asset.sha256)],format:'png',storage:input.storage});
  const render=()=>{cursor=0;dirty=false;result=actual.useSkyNativeImages(input.canvas,input.revision,input.hash,input.active,input.wanted,resolve,2*128*128*4,input.fallback);return result};
  const commit=()=>{render();for(let pass=0;pass<50&&(dirty||effects.length);pass++){for(const effect of effects.splice(0))effect();if(dirty)render()}assert.equal(effects.length,0);return render()};
  const drain=async()=>{for(let i=0;i<300;i++){await Promise.resolve();commit()}return result};
  const wait=async(condition:()=>boolean)=>{for(let i=0;i<6000;i++){commit();if(condition())return;await Promise.resolve()}throw Error('bounded hook callback not reached')};
  const heldGraph=()=>slots.filter(slot=>slot?.owner&&slot?.value?.images instanceof Map);
  return{input,nativeImages,hookEvents,canvas,render,commit,drain,wait,heldGraph,get value(){return result},
    complete(index:number){const image=nativeImages[index];assert.ok(image?.onload);const body=w.files.get(image.src);assert.ok(body);assert.ok(images.some(item=>item.asset.sha256===skyImageContentHash(new Uint8Array(body))));image.onload();commit();return image}};
}
const cases:any[]=[];
async function recordCase(name:string,run:()=>Promise<unknown>){const detail=await run();cases.push({name,...detail as any});save(`case-${cases.length}.json`,cases.at(-1))}
try{
  await recordCase('actual App launch preserves namespace and current legacy files',async()=>{
    const w=world(),owner=legacy.createSkyImageFileSession('review_current');
    for(const name of ['sky-art-old-1.png','deep-sky-M-31-DETAIL-old-3.jpg','sky-art-review_current-1.png','draft.jpg','sky-public-images-v1'])w.files.set(w.root+'/'+name,new ArrayBuffer(24));
    let launch!:()=>void,chrome=0;const warnings:any[]=[];
    const exports=compile(declaration('App',source.app),{}, {useLaunch(cb:()=>void){launch=cb},skyImageFileSession:owner,Taro:w.Taro,
      initializeSkyPublicImageCache(){try{return w.runtime.initializeSkyPublicImageCache()}catch(e){w.events.push(['actual-initialize-throw',String(e)]);throw e}},useAppStore:{getState:()=>({mode:'DAY'})},syncNativeChrome:async()=>{chrome++},
      console:{warn(...parts:any[]){warnings.push(parts)}},React:{createElement:()=>null},QueryClientProvider:{},miniappQueryClient:{}});
    exports.default({children:null});launch();await tick();save('launch-diagnostics.json',{chrome,warnings,snapshot:w.snapshot()});assert.equal(chrome,1);assert.equal(warnings.length,0);
    assert.ok(!w.files.has(w.root+'/sky-art-old-1.png'));assert.ok(!w.files.has(w.root+'/deep-sky-M-31-DETAIL-old-3.jpg'));
    for(const name of ['sky-art-review_current-1.png','draft.jpg','sky-public-images-v1'])assert.ok(w.files.has(w.root+'/'+name));
    assert.equal(w.caches.length,1);return{status:'PASS',chrome,warnings,snapshot:w.snapshot()};
  });
  await recordCase('actual clear retires live lease and cleans independent response owners',async()=>{
    const w=world(),lease=await w.runtime.acquirePublishedSkyImage(images[0]!.asset,urls[0]!,publication).promise;await tick();
    const h=service(w);await h.responseCache.flush();let retired=0;lease.onRetire(()=>retired++);
    const result=h.clear();assert.equal(lease.isCurrent(),false,'epoch clear must synchronously retire live lease');assert.equal(retired,1);
    await assert.rejects(result,/local_cache_cleanup_incomplete/);h.check();assert.ok(w.files.has(lease.filePath),'actual active lease holds path after retirement');
    lease.release();await tick();assert.ok(!w.files.has(lease.filePath));const count=await h.clear();assert.equal(count,0);
    h.dispose();return{status:'PASS',retired,finalCancelledReadCount:count,events:h.events,snapshot:w.snapshot()};
  });
  await recordCase('actual runtime abort throws during public service clear',async()=>{
    const w=world(),lease=await w.runtime.acquirePublishedSkyImage(images[0]!.asset,urls[0]!,publication).promise;await tick();
    let retired=0;lease.onRetire(()=>retired++);w.holdTransfer=true;w.abortThrows=true;
    const waiting=w.runtime.acquirePublishedSkyImage(images[1]!.asset,urls[1]!,publication);const observed=waiting.promise.then(()=>({ready:true}),e=>({error:e.message}));
    await until(()=>w.calls.length===2);const h=service(w);await h.responseCache.flush();
    const result=h.clear();const immediate={oldLeaseCurrent:lease.isCurrent(),retiredSignals:retired,cache:w.caches[0].inspect()};
    await assert.rejects(result,/local_cache_cleanup_incomplete/);h.check();await tick();const pendingResult=await observed;
    const bugDetected=immediate.oldLeaseCurrent&&immediate.retiredSignals===0;
    const beforeRecovery=w.snapshot();w.abortThrows=false;w.calls[1]!.fail({errMsg:'controlled actual native terminal callback after abort failure'});lease.release();await tick();await w.runtime.clearSkyPublicImageCache();h.dispose();
    return{status:bugDetected?'FAILED_ACTUAL_CLEAR_FENCE':'PASS',bugDetected,immediate,pendingResult,events:h.events,beforeRecovery,afterRecovery:w.snapshot()};
  });
  await recordCase('runtime abort failure keeps real native transfer occupancy',async()=>{
    const w=world();w.holdTransfer=true;w.abortThrows=true;
    const a=w.runtime.acquirePublishedSkyImage(images[0]!.asset,urls[0]!,publication);
    const b=w.runtime.acquirePublishedSkyImage(images[1]!.asset,urls[1]!,publication);
    const observedA=a.promise.catch((e:Error)=>e.message),observedB=b.promise.catch((e:Error)=>e.message);
    await until(()=>w.calls.length===2);const before=w.caches[0].inspect();
    a.cancel();b.cancel();await observedA;await observedB;await tick();
    const afterCancel=w.caches[0].inspect();
    const c=w.runtime.acquirePublishedSkyImage(images[0]!.asset,urls[0]!,publication);
    const observedC=c.promise.catch((e:Error)=>e.message);await tick();
    const beforeNativeCallback={nativeCallbacksDelivered:0,nativeRequests:w.calls.length,cache:w.caches[0].inspect()};
    const bugDetected=w.calls.length>2;
    // Actually finish all still-held native callbacks; cancelling the waiters
    // does not pretend these callbacks already arrived in the native transport.
    for(const call of w.calls.slice(0,2))call.success({statusCode:200,data:asBuffer(images[urls.indexOf(call.url)]!.raw)});
    await until(()=>w.calls.length===3);const afterOldActualCallbacks={nativeOldCallbacksDelivered:2,nativeRequests:w.calls.length,cache:w.caches[0].inspect()};
    w.calls[2]!.success({statusCode:200,data:asBuffer(images[0]!.raw)});const currentLease=await c.promise;
    assert.equal(skyImageContentHash(new Uint8Array(w.files.get(currentLease.filePath)!)),images[0]!.asset.sha256);
    c.cancel();await observedC;await tick();w.abortThrows=false;await w.runtime.clearSkyPublicImageCache();
    return{status:bugDetected?'FAILED_ACTUAL_RUNTIME_NATIVE_CAPACITY':'PASS',bugDetected,before,afterCancel,beforeNativeCallback,afterOldActualCallbacks,
      newCurrentRequestResumedAfterActualCallback:!bugDetected,afterActualCallbacks:w.snapshot()};
  });
  await recordCase('full actual shared hook cold-return hide Canvas-replacement and owner restart',async()=>{
    const w=world(),h=hookConsumer(w);h.commit();await h.wait(()=>h.nativeImages.length===1);
    const first=h.complete(0),pathA=first.src;assert.equal(h.value.images.get(images[0]!.asset.id),first);assert.equal(w.calls.length,1);
    h.input.wanted=[];h.commit();h.value.suspendUnusedDecoded();h.commit();assert.equal(h.value.retainedImages.size,0);assert.equal(w.caches[0].inspect().leased,1);
    h.input.wanted=[images[0]!.asset];h.commit();await h.wait(()=>h.nativeImages.length===2);assert.equal(h.nativeImages[1].src,pathA);assert.equal(w.calls.length,1);assert.notEqual(h.complete(1),first);
    h.input.active=false;h.commit();await h.drain();assert.equal(h.heldGraph().length,0);assert.equal(w.caches[0].inspect().leased,0);assert.ok(w.files.has(pathA));
    h.input.canvas=h.canvas();h.input.revision++;h.input.active=true;h.commit();await h.wait(()=>h.nativeImages.length===3);assert.equal(w.calls.length,1);h.complete(2);
    h.input.active=false;h.commit();await h.drain();const restart=w.newRuntime();await restart.initializeSkyPublicImageCache();const next=hookConsumer(w,restart);
    next.commit();await next.wait(()=>next.nativeImages.length===1);assert.equal(w.calls.length,1);assert.equal(next.nativeImages[0].src,pathA);
    const late=next.nativeImages[0].onload;await restart.clearSkyPublicImageCache();late();await next.drain();assert.equal(next.value.images.size,0);assert.equal(next.value.failed,true);
    assert.equal(w.caches[1].inspect().leased,0);next.value.retryImages();await next.wait(()=>next.nativeImages.length===2);assert.equal(w.calls.length,2);next.complete(1);
    next.input.active=false;next.commit();await next.drain();assert.equal(next.heldGraph().length,0);assert.equal((await restart.clearSkyPublicImageCache()).status,'complete');
    return{status:'PASS',firstFile:pathA,coldAndRestartExtraTransfers:0,totalTransfers:w.calls.length,hookEvents:h.hookEvents,restartedHookEvents:next.hookEvents,snapshot:w.snapshot()};
  });
  await recordCase('actual two Hook owners dedup and retain independent leases',async()=>{
    const w=world(),a=hookConsumer(w),b=hookConsumer(w);a.commit();b.commit();await a.wait(()=>a.nativeImages.length===1);await b.wait(()=>b.nativeImages.length===1);
    a.complete(0);b.complete(0);assert.equal(w.calls.length,1);assert.equal(a.nativeImages[0].src,b.nativeImages[0].src);assert.equal(w.caches[0].inspect().leased,2);
    a.input.active=false;a.commit();await a.drain();assert.equal(w.caches[0].inspect().leased,1);assert.ok(w.files.has(b.nativeImages[0].src));
    b.input.active=false;b.commit();await b.drain();assert.equal(w.caches[0].inspect().leased,0);assert.equal((await w.runtime.clearSkyPublicImageCache()).status,'complete');
    return{status:'PASS',transfers:w.calls.length,snapshot:w.snapshot()};
  });
  await recordCase('actual changed bytes reject before decode and preserve ready fallback',async()=>{
    const w=world(),h=hookConsumer(w);h.input.fallback=[images[0]!.asset.id];h.commit();await h.wait(()=>h.nativeImages.length===1);const coarse=h.complete(0);
    w.corruptOnce.add(1);h.input.wanted=[images[1]!.asset];h.commit();await h.wait(()=>h.value.failed);
    assert.equal(h.nativeImages.length,1);assert.equal(h.value.retainedImages.get(images[0]!.asset.id),coarse);assert.equal(w.caches[0].inspect().leased,1);
    await h.drain();h.value.retryImages();await h.wait(()=>h.nativeImages.length===2);assert.equal(w.calls.length,3);assert.equal(h.value.retainedImages.get(images[0]!.asset.id),coarse);h.complete(1);assert.equal(h.value.failed,false);
    h.input.active=false;h.commit();await h.drain();assert.equal((await w.runtime.clearSkyPublicImageCache()).status,'complete');return{status:'PASS',changedByteOffset:30,nativeDecodesBeforeRetry:1,snapshot:w.snapshot()};
  });
  await recordCase('actual hook hide with native abort throw retains IO then rejects late decode',async()=>{
    const w=world();w.holdTransfer=true;w.abortThrows=true;const h=hookConsumer(w);h.input.wanted=[images[0]!.asset,images[1]!.asset];h.commit();await h.wait(()=>w.calls.length===2);
    h.input.active=false;assert.doesNotThrow(()=>h.commit());await h.drain();assert.equal(h.heldGraph().length,0);assert.equal(w.caches[0].inspect().running,2);assert.equal(w.caches[0].inspect().reserved,images[0]!.asset.bytes+images[1]!.asset.bytes);
    const afterHide=w.snapshot();for(const call of w.calls)call.success({statusCode:200,data:asBuffer(images[urls.indexOf(call.url)]!.raw)});await h.drain();
    assert.equal(h.nativeImages.length,0);assert.equal(w.caches[0].inspect().running,0);assert.equal(w.caches[0].inspect().reserved,0);assert.equal(h.value.images.size,0);
    w.holdTransfer=false;w.abortThrows=false;h.input.active=true;h.input.wanted=[images[0]!.asset];h.commit();await h.wait(()=>h.nativeImages.length===1);h.complete(0);
    h.input.active=false;h.commit();await h.drain();await w.runtime.clearSkyPublicImageCache();return{status:'PASS',afterHide,lateCallbacksReleasedSlotsWithoutDecode:true,final:w.snapshot()};
  });
  await recordCase('actual service cancellation counts and query failure do not expand private or weather cleanup',async()=>{
    const variants:any[]=[];
    for(const failure of ['none','query-throw','query-reject','response-flush','response-incomplete']){
      const w=world();await w.runtime.initializeSkyPublicImageCache();const h=service(w);await h.responseCache.flush();
      const flush=h.responseCache.flush;let flushAttempted=0;
      h.responseCache.flush=async()=>{flushAttempted++;if(failure==='response-flush')throw Error('controlled flush failure');return flush()};
      if(failure==='query-throw')h.queryClient.cancelQueries=()=>{throw Error('controlled query cancel throw')};
      if(failure==='query-reject')h.queryClient.cancelQueries=()=>Promise.reject(Error('controlled query cancel rejection'));
      if(failure==='response-incomplete')h.responseCache.cleanupComplete=()=>false;
      const clearing=h.clear();assert.equal(h.events[0][0],'public-clear-start');assert.ok(h.events.filter(event=>event[0]==='api-cancel').every(event=>event[2]===1));
      let cancelled:any,error:any;try{cancelled=await clearing}catch(e){error=(e as Error).message}
      if(failure==='none'){assert.equal(cancelled,2);assert.equal(error,undefined)}else assert.equal(error,'local_cache_cleanup_incomplete');
      assert.equal(flushAttempted,1);h.check();variants.push({failure,cancelled,error,flushAttempted,events:h.events,fileCache:w.caches[0].inspect(),privateAndWeatherRetained:true});h.dispose();
    }
    return{status:'PASS',variants};
  });
  await recordCase('actual external acquisition cancel throw cannot stop Hook disposal and real lease release',async()=>{
    const oldPath='output/sky-public-file-cache-independent-1002-r4/adapter.ts.txt',old=read(oldPath).toString();
    assert.equal(sha(old),'2f06ad71c33a70e4da651d1415f84740fdbf196503500d5fde97bd241e58d5cf');
    const variants:any[]=[];
    for(const variant of ['actual-old-adapter','current-adapter']){
      const w=world();let cancelCalls=0;
      const fault={...w.runtime,acquirePublishedSkyImage(...args:any[]){const acquisition=w.runtime.acquirePublishedSkyImage(...args);return{promise:acquisition.promise,cancel(){cancelCalls++;throw Error('controlled external acquisition cancel throws')}}}};
      const h=hookConsumer(w,fault,variant==='actual-old-adapter'?old:source.adapter);h.input.wanted=[images[0]!.asset,images[1]!.asset];h.commit();await h.wait(()=>h.nativeImages.length===2);await h.drain();
      assert.equal(w.caches[0].inspect().leased,2);const late=h.nativeImages.map(image=>image.onload);h.input.active=false;
      let error:any;try{h.commit()}catch(e){error=String(e)};await h.drain();const immediate={error,cancelCalls,heldGraphs:h.heldGraph().length,cache:w.caches[0].inspect(),attachedCallbacks:h.nativeImages.filter(image=>image.onload||image.onerror).length};
      if(variant==='actual-old-adapter'){assert.ok(error);assert.ok(immediate.cache.leased>0);assert.ok(immediate.heldGraphs>0)}
      else{assert.equal(error,undefined);assert.equal(cancelCalls,2);assert.equal(immediate.cache.leased,0);assert.equal(immediate.heldGraphs,0);assert.equal(immediate.attachedCallbacks,0);
        for(const callback of late)callback();assert.equal(h.value.images.size,0);assert.equal((await w.runtime.clearSkyPublicImageCache()).status,'complete')}
      variants.push({variant,actualAdapter:variant==='actual-old-adapter'?bound(oldPath):bound(inputNames.adapter),immediate,snapshot:w.snapshot()});
    }
    return{status:'PASS',oldActualSnapshotCounterexamplePreserved:true,variants};
  });
  await recordCase('session variation explicit and rejected public routes cannot escape into temporary files',async()=>{
    const w=world(),h=hookConsumer(w);h.input.storage='session';h.commit();await h.wait(()=>h.nativeImages.length===1);const image=h.complete(0);
    assert.equal(w.caches.length,0);assert.match(image.src,/\/sky-art-[a-z0-9_]+-\d+\.png$/);h.input.active=false;h.commit();await h.drain();assert.ok(!w.files.has(image.src));
    const deniedWorld=world(),denied=hookConsumer(deniedWorld);denied.input.url=base+'/v2/sky/optical/fixture/0/0';denied.commit();await denied.wait(()=>denied.value.failed);
    assert.equal(deniedWorld.calls.length,0);assert.equal(denied.nativeImages.length,0);assert.equal(deniedWorld.caches.length,0);denied.input.active=false;denied.commit();
    assert.ok(source.optical.includes('storage:"session"'));assert.ok(!source.selected.includes('acquirePublishedSkyImage'));
    return{status:'PASS',explicitSession:w.snapshot(),rejectedPublic:deniedWorld.snapshot(),selectedW3PersistentAdmission:'NOT_MIGRATED'};
  });
  save('review.json',{scope:'Independent actual App/API/runtime/core controlled native callbacks; no HTTP/device/GPU/storage certification',sources,auxiliaryInputs,fixtures:images.map(i=>i.source),
    publication:'synthetic controlled route identity; no actual publication adoption claim',cases,status:cases.some(c=>c.bugDetected)?'FAILED_ACTUAL_INTEGRATION':'INDEPENDENT_APP_CLEAR_HOOK_CONTROLLED_INTEGRATION_PASS'});
  const protectedItems=[...sources,...auxiliaryInputs,...images.map(i=>i.source),...originalDeepSky,...kept.map((i:any)=>bound(i.path))];
  const after=protectedItems.map(item=>bound(item.path));assert.deepEqual(after,protectedItems);
  save('binding.json',{script:bound(output+'/executed-script.mts.txt'),review:bound(output+'/review.json'),inputsBefore:protectedItems,inputsAfter:after,unchanged:true});
  console.log(JSON.stringify({review:bound(output+'/review.json'),binding:bound(output+'/binding.json'),cases:cases.map(c=>({name:c.name,status:c.status,bugDetected:c.bugDetected}))}));
}catch(e){save('failure.json',{message:String(e),stack:(e as Error).stack,sources,cases});throw e}
