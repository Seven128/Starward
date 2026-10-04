/** Independent whole-Hook/source-epoch handoff probe. Offline bytes/controlled React and native callbacks. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import * as contracts from '../../../../packages/miniapp-contracts/src/index.ts';
import {createSkyPublicImageCache} from '../../../../apps/wechat-miniapp/src/services/sky-public-image-cache.ts';
import {createSkyArtworkLoader,skyNativeImageIsCurrent} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts';
import {startSkyArtworkRequest} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts';
import {sdssOpticalLevelForFov,sdssScienceOpticalLevelForFov} from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection.ts';
import {skyFixedImageStatus} from '../../../../apps/wechat-miniapp/src/features/sky/sky-fixed-image-status.ts';

const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),OUT=process.argv[2];
assert.match(OUT??'',/^output\/sdss-science-hook-independent-1002-r\d+$/u);assert(!fs.existsSync(path.join(ROOT,OUT!)));fs.mkdirSync(path.join(ROOT,OUT!));
const raw=(p:string)=>fs.readFileSync(path.join(ROOT,p)),sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const bind=(p:string)=>{const b=raw(p);return{path:p,bytes:b.length,sha256:sha(b)};};
const admitted=new Map<string,ReturnType<typeof bind>>();
const admit=(p:string,e?:{bytes?:number;sha256?:string})=>{const b=bind(p);if(e?.bytes!==undefined)assert.equal(b.bytes,e.bytes,p);if(e?.sha256)assert.equal(b.sha256,e.sha256,p);const before=admitted.get(p);if(before)assert.deepEqual(before,b);admitted.set(p,b);return b;};
const save=(p:string,v:unknown)=>fs.writeFileSync(path.join(ROOT,OUT!,p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(ROOT,OUT!,'executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const source={hook:'apps/wechat-miniapp/src/features/sky/use-sky-sdss-optical.ts',native:'apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts',resource:'apps/wechat-miniapp/src/services/sdss-science-optical-resource.ts',runtime:'apps/wechat-miniapp/src/services/sky-public-image-runtime.ts',bare:'apps/wechat-miniapp/src/services/bare-sky-resource.ts',client:'apps/wechat-miniapp/src/services/sdss-optical-client.ts'};
const worlds:any[]=[];
try{
 for(const p of [...Object.values(source),'apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection.ts','apps/wechat-miniapp/src/features/sky/sky-fixed-image-status.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts','apps/wechat-miniapp/src/services/sky-public-image-cache.ts','apps/wechat-miniapp/src/services/sky-image-bytes.ts','packages/miniapp-contracts/src/sdss-science-optical-publication.ts','packages/miniapp-contracts/src/sdss-optical-publication.ts']){
  admit(p);const f=path.join(ROOT,OUT!,'sources',p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,raw(p),{flag:'wx'});
 }
 assert.equal(bind(source.resource).sha256,'daafee434d960fba8681b01e9ca549f4cf55fb71fe74261e24df4cddaa616466');
 assert.equal(bind(source.hook).sha256,'6a9be6b649d0d04d115039532f9a6028e3fcbad1e52bdaa92e6a568601ce12f2');
 const PUB='output/sdss-science-optical-writer-1002-r1/publication',manifest=JSON.parse(raw(PUB+'/manifest.json').toString('utf8'));
 admit(PUB+'/manifest.json',{bytes:18078,sha256:'3eaf04b366827c86ece835f48ed37089d5406be2ed4d73c2252960e7e9aa1dd5'});contracts.assertSdssScienceOpticalManifest(manifest,'M:51',manifest.publicationHash);
 const pngs=new Map<string,Buffer>();for(const a of Object.values(manifest.levels) as any[]){admit(PUB+'/'+a.file,a);pngs.set(a.downloadUrl,raw(PUB+'/'+a.file));}
 const author='output/sdss-science-optical-resource-after-1002-r2';admit(author+'/resource-traces.json',{sha256:'ff4ecd3f4995ddb255d0f234998ab6fd84e5ac10152b68535dd598bb0c967a4b'});
 for(const f of ['bindings-before.json','bindings-after.json','executed-resource-source.ts.txt','executed-runtime-source.ts.txt','executed-test-source.ts.txt','actual-after-test.log'])admit(author+'/'+f);
 const bs=JSON.parse(raw(author+'/bindings-before.json').toString('utf8'));assert.equal(bs.length,21);assert.deepEqual(bs,JSON.parse(raw(author+'/bindings-after.json').toString('utf8')));
 const testPath='apps/wechat-miniapp/src/services/sdss-science-optical-resource.test.ts';
 for(const b of bs)if(b.path===testPath){admit(author+'/executed-test-source.ts.txt',b);admit(testPath);}else admit(b.path,b);
 assert.deepEqual(raw(author+'/executed-resource-source.ts.txt'),raw(source.resource));assert.deepEqual(raw(author+'/executed-runtime-source.ts.txt'),raw(source.runtime));
 const currentTest=raw(testPath).toString('utf8'),executedTest=raw(author+'/executed-test-source.ts.txt').toString('utf8');
 const cases=(body:string)=>{const ast=ts.createSourceFile('test.ts',body,ts.ScriptTarget.Latest,true);return ast.statements.filter((n):n is ts.ExpressionStatement=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&n.expression.expression.getText(ast)==='test').map(n=>n.getText(ast));};
 assert.equal(cases(executedTest).length,6);assert.deepEqual(cases(currentTest),cases(executedTest));
 const traces=JSON.parse(raw(author+'/resource-traces.json').toString('utf8'));assert.equal(traces.fixture,'EXACT_WRITER_R1');assert.equal(traces.publicationHash,manifest.publicationHash);assert.equal(traces.resourceSourceSha256,bind(source.resource).sha256);assert.equal(traces.runtimeSourceSha256,bind(source.runtime).sha256);
 const one=(name:string)=>{const rows=traces.evidence.filter((r:any)=>r.case===name);assert.equal(rows.length,1,name);return rows[0];};
 assert(one('source-and-outer-snapshot').outerFrozen);assert(one('source-and-outer-snapshot').nestedFrozen);assert.equal(one('pre-aborted-no-acquisition').snapshot.requestCount,0);
 for(const fault of ['none','taro-abort-throws','controller-abort-throws']){
  const before=traces.evidence.find((r:any)=>r.case==='pending-clear-before-late-callback'&&r.fault===fault),after=traces.evidence.find((r:any)=>r.case==='pending-clear-after-late-callback'&&r.fault===fault);assert(before&&after);
  assert.equal(before.snapshot.pendingMetadataListeners,0);assert.equal(before.snapshot.caches[0].epoch,1);assert.equal(before.snapshot.controllers[0].listeners,0);
  assert.equal(before.snapshot.requests[0].completed,fault==='none');assert.equal(before.snapshot.controllers[1].listeners,fault==='controller-abort-throws'?1:0);
  assert.equal(after.snapshot.requests[0].completed,true);assert(after.snapshot.controllers.every((r:any)=>r.listeners===0));assert.equal(after.snapshot.pendingMetadataListeners,0);
 }
 assert.equal(one('returned-response-before-clear-microtask').snapshot.pendingMetadataListeners,0);assert.equal(one('resolved-acquire-gap-retired').snapshot.requestCount,1);
 const lease=one('explicit-retry-shared-real-png-retired-live-lease');assert.equal(lease.encodedSha256,manifest.levels.DETAIL.sha256);assert.equal(lease.snapshot.caches[0].leased,1);assert.equal(lease.snapshot.caches[0].retired,1);assert.equal(lease.snapshot.caches[0].bytes,manifest.levels.DETAIL.bytes);
 const final=one('explicit-retry-final-file-owner').snapshot;assert.equal(final.pendingMetadataListeners,0);for(const k of ['leased','retired','pending','running','reserved','bytes'])assert.equal(final.caches[0][k],0);
 const errors=traces.evidence.filter((r:any)=>r.case==='metadata-error-cleanup');assert.deepEqual(errors.map((r:any)=>r.scenario),['not-found','transport-fail','foreign-publication','synchronous-request-throw','query-abort']);for(const r of errors){assert.equal(r.snapshot.pendingMetadataListeners,0);assert(r.snapshot.controllers.every((c:any)=>c.listeners===0));}
 const old='output/sdss-science-optical-resource-before-1002-r1';for(const f of ['executed-resource-source.ts.txt','resource-traces.json','actual-before-test.log'])admit(old+'/'+f);
 const oldSource=raw(old+'/executed-resource-source.ts.txt').toString('utf8');assert.equal(raw(source.resource).toString('utf8').replace('return Object.freeze({ publication: snapshot, isCurrent: generation.isCurrent });','return { publication: snapshot, isCurrent: generation.isCurrent };'),oldSource);
 assert.equal(JSON.parse(raw(old+'/resource-traces.json').toString('utf8')).evidence[0].outerFrozen,false);assert(raw(old+'/actual-before-test.log').toString('utf8').includes('shared readonly capability'));

 const hookText=raw(source.hook).toString('utf8'),guard='if (science && resource?.isCurrent() !== true) throw new Error("sdss_science_optical_resource_cancelled");';assert.equal(hookText.split(guard).length,2);
 const badHook=hookText.replace(guard,'/* independent bounded mutation: missing resolved-metadata epoch guard */');fs.writeFileSync(path.join(ROOT,OUT!,'mutated-acquisition-epoch-guard.ts.txt'),badHook,{flag:'wx'});
 const compile=(p:string,bindings:Record<string,unknown>,text=raw(p).toString('utf8'),globals:object={})=>{
  const exports:Record<string,any>={};vm.runInNewContext(ts.transpileModule(text,{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,
   {exports,ArrayBuffer,Uint8Array,DataView,AbortController,Object,JSON,Error,setTimeout,clearTimeout,queueMicrotask,__MINIAPP_API_BASE__:'https://independent-hook.invalid',...globals,require(n:string){assert(n in bindings,'unbound '+n);return bindings[n];}});return exports;
 };
 function world(text=hookText){
  const files=new Map<string,ArrayBuffer>(),events:any[]=[],caches:ReturnType<typeof createSkyPublicImageCache>[]=[];let failDetail=true,sequence=0;
  const reply=(run:()=>void)=>queueMicrotask(run);
  const Taro={env:{USER_DATA_PATH:'/independent-hook'},getFileSystemManager:()=>({
   mkdir(o:any){reply(o.success);},readdir(o:any){reply(()=>o.success({files:[...files.keys()].filter(p=>p.startsWith(o.dirPath+'/')).map(p=>p.slice(o.dirPath.length+1))}));},
   stat(o:any){reply(()=>files.has(o.path)?o.success({stats:{isFile:()=>true,size:files.get(o.path)!.byteLength}}):o.fail({errMsg:'no such file or directory'}));},
   readFile(o:any){reply(()=>files.has(o.filePath)?o.success({data:files.get(o.filePath)!.slice(o.position??0,(o.position??0)+o.length)}):o.fail({errMsg:'no such file or directory'}));},
   writeFile(o:any){reply(()=>{files.set(o.filePath,o.data.slice(0));o.success();});},rename(o:any){reply(()=>{assert(files.has(o.oldPath));files.set(o.newPath,files.get(o.oldPath)!);files.delete(o.oldPath);o.success();});},unlink(o:any){reply(()=>{files.delete(o.filePath);o.success();});},
  }),request(o:any){
   const pathname=o.url.replace('https://independent-hook.invalid','');const event={type:o.responseType==='arraybuffer'?'image-transfer':'metadata',pathname,aborted:0,completed:false};events.push(event);
   reply(()=>{if(event.completed)return;event.completed=true;if(o.responseType==='arraybuffer'){const b=pngs.get(pathname);assert(b,pathname);o.success({statusCode:200,data:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)});}else o.success({statusCode:200,data:structuredClone(manifest)});});
   return {abort(){event.aborted++;if(!event.completed){event.completed=true;o.fail({errMsg:'controlled abort'});}},catch(){}};
  }};
  const taroModule={__esModule:true,default:Taro};
  const runtime=compile(source.runtime,{'@tarojs/taro':taroModule,'@starward/miniapp-contracts':contracts,'./sky-public-image-cache':{createSkyPublicImageCache(deps:any){const cache=createSkyPublicImageCache({...deps,cleanupWaitMs:10});caches.push(cache);return cache;}}});
  const acquire=runtime.acquirePublishedSkyImage;
  runtime.acquirePublishedSkyImage=function(...args:any[]){
   events.push({type:'public-acquisition-call',sha256:args[0].sha256,url:args[1],publicationHash:args[2]});
   const request=acquire.apply(this,args);
   request.promise.then((lease:any)=>events.push({type:'public-acquisition-ready',filePath:lease.filePath}), (cause:any)=>events.push({type:'public-acquisition-rejected',error:String(cause)}));
   return request;
  };
  const bare=compile(source.bare,{'@tarojs/taro':taroModule}),client=compile(source.client,{'@starward/miniapp-contracts':contracts,'./bare-sky-resource':bare,'./sdss-optical-publication':contracts});
  const resource=compile(source.resource,{'./sdss-optical-client':client,'./sky-public-image-runtime':runtime});
  let cursor=0,dirty=false;const slots:any[]=[],scheduled=new Map<number,()=>void>();
  const same=(a:readonly unknown[]|undefined,b:readonly unknown[]|undefined)=>!!a&&!!b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const memo=(fn:()=>unknown,deps:readonly unknown[])=>{const i=cursor++,previous=slots[i];if(!previous||!same(previous.deps,deps))slots[i]={kind:'memo',deps:[...deps],value:fn()};return slots[i].value;};
  const React={useMemo:memo,useCallback:(fn:unknown,deps:readonly unknown[])=>memo(()=>fn,deps),useRef:(value:unknown)=>{const i=cursor++;return(slots[i]??={kind:'ref',current:value});},
   useState:(value:unknown)=>{const i=cursor++;const row=slots[i]??={kind:'state',value};row.set??=(v:any)=>{row.value=typeof v==='function'?v(row.value):v;dirty=true;};return[row.value,row.set];},
   useEffect:(effect:()=>void|(()=>void),deps:readonly unknown[])=>{const i=cursor++,row=slots[i];if(!row||!same(row.deps,deps)){scheduled.set(i,()=>{row?.cleanup?.();slots[i]={kind:'effect',deps:[...deps],cleanup:effect()};});}},
  };
  let queryData:any,queryError=false,queryFetching=true,lastQuery:any,refetches=0;
  const fetchMetadata=async()=>{assert(lastQuery.enabled,'disabled metadata is never dispatched');queryFetching=true;try{queryData=await lastQuery.queryFn(new AbortController().signal);queryError=false;return queryData;}catch(e){queryError=true;throw e;}finally{queryFetching=false;dirty=true;}};
  const native=compile(source.native,{react:React,'@tarojs/taro':taroModule,'@/services/api-client':{constellationAssetUrl(){throw Error('unused constellation path');}},'../../services/sky-image-file-session':{skyImageFileSession:{nextRequestSuffix(){throw Error('science must not enter legacy session storage');}}},'../../services/sky-public-image-runtime':runtime,'./sky-artwork-loader':{createSkyArtworkLoader},'./sky-artwork-request':{startSkyArtworkRequest}});
  const hook=compile(source.hook,{react:React,'@/hooks/use-resource-query':{useResourceQuery(o:any){lastQuery=o;return{data:queryData,isError:queryError,isFetching:queryFetching,refetch(){refetches++;const p=fetchMetadata();p.catch(()=>undefined);return p;}};}},'@/services/sdss-optical-client':client,'@/services/sdss-science-optical-resource':resource,'./sky-sdss-optical-selection':{sdssOpticalLevelForFov,sdssScienceOpticalLevelForFov},'./sky-fixed-image-status':{skyFixedImageStatus},'./use-sky-artwork':native},text);
  const canvas={createImage(){const image:any={id:++sequence,width:512,height:512,onload:null,onerror:null};Object.defineProperty(image,'src',{get(){return image.filePath;},set(filePath:string){image.filePath=filePath;events.push({type:'decode',image:image.id,filePath});reply(()=>{if(!image.onload&&!image.onerror)return;const b=files.get(filePath);assert(b,'decode file must exist');const digest=sha(new Uint8Array(b));const asset=Object.values(manifest.levels).find((a:any)=>a.sha256===digest) as any;assert(asset,'actual decoded file must be an admitted real PNG');if(failDetail&&digest===manifest.levels.DETAIL.sha256){failDetail=false;events.push({type:'decode-error',image:image.id,sha256:digest});image.onerror?.();}else{events.push({type:'decode-ready',image:image.id,sha256:digest,bytes:b.byteLength});image.onload?.();}});}});return image;}};
  let args:any[]=['M:51',.05,canvas,1,true,manifest.publicationHash],last:any;
  const read=(changes:any[]=[])=>(args=changes.length?changes:args,cursor=0,dirty=false,last=hook.useSkySdssOptical(...args),last);
  const commit=()=>{const todo=[...scheduled.entries()].sort((a,b)=>a[0]-b[0]);scheduled.clear();for(const[,effect]of todo)effect();};
  const turn=()=>new Promise<void>(r=>setImmediate(r));
  const settle=async()=>{for(let i=0;i<20;i++){commit();await turn();if(dirty){read();continue;}if(!scheduled.size&&caches.every(c=>c.inspect().pending===0&&c.inspect().running===0))return;}throw Error('bounded hook fixture failed to settle');};
  const snapshot=(label:string)=>({label,queryKey:Array.from(lastQuery.queryKey),queryEnabled:lastQuery.enabled,queryFetching,queryError,resourceCurrent:queryData?.isCurrent()??null,requested:last.requested,renderedLevel:last.renderedLevel,fieldDegrees:last.fieldDegrees,imageId:last.image?.id??null,coarserImageId:last.coarser?.image?.id??null,failed:last.failed,updateFailed:last.updateFailed,publicationHash:last.publication?.publicationHash??null,renderedAsset:last.renderedAsset??null,coarserAsset:last.coarser?.asset??null,cache:caches[0]?.inspect()??null,events:[...events],refetches});
  const dispose=()=>{for(const row of slots)if(row?.kind==='effect')row.cleanup?.();scheduled.clear();};
  const result={read,commit,settle,fetchMetadata,snapshot,dispose,runtime,events,caches,canvas,resource,client,files,get current(){return last;},get lastQuery(){return lastQuery;},get queryData(){return queryData;},get refetches(){return refetches;},allowFine(){failDetail=false;}};worlds.push(result);return result;
 }
 const w=world(),rows:any[]=[];
 w.read(['M:51',.31,w.canvas,1,true,manifest.publicationHash]);assert(w.lastQuery.enabled,'cold metadata must not use old JPEG level gate');assert.equal(w.current.publication,undefined);assert.equal(w.events.length,0);assert(w.current.requested);rows.push(w.snapshot('cold-valid-intent-outside-old-scale'));
 await w.fetchMetadata();assert(Object.isFrozen(w.queryData));assert(Object.isFrozen(w.queryData.publication.levels.DETAIL));w.read();await w.settle();assert.equal(w.current.requested,false);assert(!w.events.some((r:any)=>r.type==='image-transfer'));rows.push(w.snapshot('actual-field-outside-image-policy'));
 w.read(['M:51',.05,w.canvas,1,true,manifest.publicationHash]);await w.settle();assert.equal(w.current.renderedLevel,'MEDIUM');assert.equal(w.current.fieldDegrees,manifest.levels.MEDIUM.fieldDegrees);assert(w.current.updateFailed);assert.equal(w.current.renderedAsset.sha256,manifest.levels.MEDIUM.sha256);assert.equal(w.current.renderedAsset.format,'png');rows.push(w.snapshot('fine-decode-failed-real-medium-recovery'));
 const transfers=w.events.filter((r:any)=>r.type==='image-transfer').length;assert.equal(transfers,2);w.current.retry();await w.settle();assert.equal(w.refetches,1);assert.equal(w.current.renderedLevel,'DETAIL');assert.equal(w.current.coarser.level,'MEDIUM');assert.equal(w.events.filter((r:any)=>r.type==='image-transfer').length,transfers,'existing valid compressed file is reused on explicit decoder retry');
 assert.equal(w.current.renderedAsset.masterRgbSha256,w.current.coarser.asset.masterRgbSha256);assert.equal(w.current.renderedAsset.masterAvailabilitySha256,w.current.coarser.asset.masterAvailabilitySha256);assert.equal(w.current.renderedAsset.sampleAvailability,'joint-area-alpha');assert.equal(w.current.renderedAsset.crpixFitsOneBased,256.5);rows.push(w.snapshot('explicit-retry-fine-plus-same-master-coarse'));
 const readyImage=w.current.image;w.read(['M:51',.05,w.canvas,1,true,'0'.repeat(64)]);assert.equal(w.current.publication,undefined);assert.equal(w.current.image,null);await w.settle();await assert.rejects(w.fetchMetadata(),/manifest_invalid|publication_invalid/u);assert(!w.events.some((r:any)=>r.type==='metadata'&&r.pathname==='/v2/sky/sdss-optical/manifest'));rows.push(w.snapshot('wrong-pin-no-legacy-fallback'));
 w.read(['M:82',.05,w.canvas,1,true,manifest.publicationHash]);assert.equal(w.current.image,null);assert.equal(w.current.publication,undefined);await w.settle();await assert.rejects(w.fetchMetadata(),/publication_invalid/u);rows.push(w.snapshot('foreign-reference-not-relabeled'));
 w.read(['M:51',.05,w.canvas,1,true,manifest.publicationHash]);await w.fetchMetadata();w.read();await w.settle();const currentBitmap=w.current.image;assert(currentBitmap&&skyNativeImageIsCurrent(currentBitmap));await w.runtime.clearSkyPublicImageCache();assert(!skyNativeImageIsCurrent(currentBitmap));assert(!skyNativeImageIsCurrent(readyImage));w.read();await w.settle();assert.equal(w.current.image,null);assert(w.current.failed);rows.push(w.snapshot('clear-ready-stamp-and-native-graph-retired'));
 const imagesAtClear=w.events.filter((r:any)=>r.type==='image-transfer').length;w.read();await w.settle();assert.equal(w.events.filter((r:any)=>r.type==='image-transfer').length,imagesAtClear);w.current.retry();await w.settle();assert(w.current.image&&skyNativeImageIsCurrent(w.current.image));assert.equal(w.events.filter((r:any)=>r.type==='image-transfer').length,imagesAtClear+2);rows.push(w.snapshot('explicit-retry-new-generation-only'));
 w.read(['M:51',.05,w.canvas,1,false,manifest.publicationHash]);await w.settle();assert.equal(w.current.image,null);assert.equal(w.caches[0].inspect().leased,0);w.dispose();await w.runtime.clearSkyPublicImageCache();await w.settle();for(const k of ['leased','pending','running','reserved','retired','bytes'])assert.equal(w.caches[0].inspect()[k as keyof ReturnType<typeof w.caches[0]['inspect']>],0);rows.push(w.snapshot('final-owner-cleanup'));
 const gaps:any[]=[];
 for(const [name,text]of [['current',hookText],['missing-acquisition-epoch-guard',badHook]]){
  const g=world(text);g.allowFine();g.read();await g.fetchMetadata();g.read();assert(g.queryData.isCurrent());const before=g.events.filter((r:any)=>r.type==='public-acquisition-call').length;
  await g.runtime.clearSkyPublicImageCache();assert(!g.queryData.isCurrent());g.commit();await g.settle();const opened=g.events.filter((r:any)=>r.type==='public-acquisition-call').length-before;
  assert.equal(opened,name==='current'?0:2,'effect gap mutation must invoke the actual public acquisition owner');gaps.push({...g.snapshot(name),publicAcquisitionAttemptsAfterStaleRender:opened,imageTransfersAfterStaleRender:g.events.filter((r:any)=>r.type==='image-transfer').length});g.dispose();await g.runtime.clearSkyPublicImageCache();await g.settle();
 }
 const selections=[.3,.1,.05,.31,0,Number.NaN].map(fov=>({fov:Number.isFinite(fov)?fov:'NaN',science:sdssScienceOpticalLevelForFov(fov,manifest)}));assert.deepEqual(selections.map(r=>r.science),['OVERVIEW','MEDIUM','DETAIL',null,null,null]);
 const bindings=[...admitted.values()];assert.deepEqual(bindings.map(b=>bind(b.path)),bindings);
 save('whole-hook-observations.json',rows);save('effect-gap-mutation.json',gaps);save('result.json',{status:'INDEPENDENT_SCIENCE_OPTICAL_HOOK_BOUNDARY_PASS',publicationHash:manifest.publicationHash,authorResourceReadback:{trace:bind(author+'/resource-traces.json'),currentInputs:21,executedTest:bind(author+'/executed-test-source.ts.txt'),currentTest:bind(testPath),sameSixCaseBodies:true,beforeOuterFreeze:bind(old+'/executed-resource-source.ts.txt'),actualBeforeFailurePreserved:true,borrowedSnapshotAndOuterFrozen:true,pendingRetireAndNativeAbortFaultDifferencesExact:true,sharedLeaseRetirementAndFinalZeroExact:true},wholeHook:{conditions:rows.length,imageTransfers:rows.at(-1).events.filter((r:any)=>r.type==='image-transfer').length,final:rows.at(-1).cache,normalNoLegacyDiscovery:true,renderedFineAndCoarseSameMaster:true,explicitRetryAfterClear:true},effectGapMutation:gaps.map(r=>({variant:r.label,publicAcquisitionAttemptsAfterStaleRender:r.publicAcquisitionAttemptsAfterStaleRender,imageTransfersAfterStaleRender:r.imageTransfersAfterStaleRender})),selections,scope:['Complete production optical Hook + native Hook + request/loader/cache and metadata helper/client/runtime modules. Controlled React/query scheduling, MapFS/Taro callbacks and Canvas dimensions/error callbacks; real cached writer bytes/hash qualification. Not actual React/Tanstack UI timing, WEAPP native decode, GPU, HTTP, deployment or image quality adoption.','Clear render/effect interleaving is explicitly controlled. The mutant alone bypasses the acquisition resolver guard; the original remains unchanged. The two variants have a common readonly public acquisition method tap with returns/this/exception preserved; actual later retirement may cancel jobs before an encoded transfer occurs. No ordinary scene/page/group v2 integration, painted contribution/credit, native memory/FPS or 200DAU capacity claim.']});
 save('binding.json',{inputsBefore:bindings,inputsAfter:bindings.map(b=>bind(b.path)),unchanged:true});console.log(JSON.stringify({result:bind(OUT!+'/result.json'),binding:bind(OUT!+'/binding.json')}));
}catch(cause){for(const w of worlds)w.dispose();save('failed.json',{status:'FAILED_INDEPENDENT_HOOK_PROBE',error:String(cause),worlds:worlds.map(w=>w.snapshot('failure')),inputs:[...admitted.values()]});throw cause;}
