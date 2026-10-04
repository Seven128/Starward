import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as contracts from '@starward/miniapp-contracts';
import {DeepSkyImageryService} from '../../../../workers/miniapp-api/src/deep-sky-imagery.ts';
import {createSkyPublicImageCache} from '../../../../apps/wechat-miniapp/src/services/sky-public-image-cache.ts';
import {startDeepSkyImageRequest} from '../../../../apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts';
import {startSkyArtworkRequest} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts';
import {createSkyArtworkLoader,registerSkyNativeImageLifetime,skyNativeImageIsCurrent} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts';
import {createSkyGpuTextures} from '../../../../apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),file=(p:string)=>path.join(root,p),sha=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
const bind=(p:string)=>{const b=fs.readFileSync(file(p));return{path:p,bytes:b.length,sha256:sha(b)}};
const out=process.argv[2];assert.match(out??'',/^output\/[a-z0-9-]+$/);assert.ok(!fs.existsSync(file(out)));fs.mkdirSync(file(out));
const save=(p:string,v:unknown)=>fs.writeFileSync(file(out+'/'+p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
fs.copyFileSync(fileURLToPath(import.meta.url),file(out+'/executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const sourceNames=['apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx','apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts',
 'apps/wechat-miniapp/src/services/deep-sky-image-client.ts','apps/wechat-miniapp/src/services/bare-sky-resource.ts','apps/wechat-miniapp/src/services/sky-public-image-cache.ts',
 'apps/wechat-miniapp/src/services/sky-public-image-runtime.ts','apps/wechat-miniapp/src/services/sky-image-bytes.ts','apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts',
 'apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts','apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts','apps/wechat-miniapp/src/features/sky/sky-gpu-textures.ts',
 'packages/miniapp-contracts/src/deep-sky-image-publication.ts','packages/miniapp-contracts/src/sky-image-display-support.ts','packages/miniapp-contracts/src/generated/miniapp-api.generated.ts',
 'workers/miniapp-api/src/deep-sky-imagery.ts'];
const sources=sourceNames.map(bind);for(let i=0;i<sourceNames.length;i++)fs.copyFileSync(file(sourceNames[i]!),file(out+'/'+i+'-'+path.basename(sourceNames[i]!)+'.txt'),fs.constants.COPYFILE_EXCL);
const protectedFiles=[...sources],baseline=JSON.parse(fs.readFileSync(file('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
for(const b of baseline){assert.equal(bind(b.path).sha256,b.sha256);protectedFiles.push(bind(b.path))}
for(const p of fs.readdirSync(file('workers/miniapp-api/assets/deep-sky'),{recursive:true,withFileTypes:true}) as any[])if(p.isFile())protectedFiles.push(bind(path.relative(root,path.join(p.parentPath,p.name)).replaceAll('\\','/')));
const approvedPNG='workers/miniapp-api/assets/constellations/triangulum-australe.png';protectedFiles.push(bind(approvedPNG));
const asBuffer=(b:Uint8Array)=>Uint8Array.from(b).buffer;
const until=async(predicate:()=>boolean)=>{for(let i=0;i<200&&!predicate();i++)await new Promise(r=>setTimeout(r,5));assert.ok(predicate(),'bounded callback did not arrive')};
const cases:any[]=[],calls:any[]=[],nativeImages:any[]=[];
const base='https://independent.fixture.invalid',preview='independent-preview-fixture';
const producer=new DeepSkyImageryService(),original=producer.discovery('M:42'),archiveHash='87ab6341b43d660e3c93a2430994c0f38b409dafa86216e7e3313e98cdbbc073';
const archiveManifest=JSON.parse(fs.readFileSync(file('workers/miniapp-api/assets/deep-sky/publications/'+archiveHash+'.json'),'utf8'));
const archiveEntry=archiveManifest.entries.find((e:any)=>e.objectRef==='M:42');
const archiveDiscovery={...JSON.parse(JSON.stringify(original)),publicationHash:archiveHash,publicationId:archiveManifest.publicationId,
 sourceId:`imagery:${archiveManifest.publicationId}:${archiveHash}`,source:producer.source('M:42',{publicationHash:archiveHash}),levels:{}} as any;
for(const level of ['OVERVIEW','MEDIUM','DETAIL'] as const){const raw=archiveEntry.levels[level];archiveDiscovery.levels[level]={file:raw.file,downloadUrl:`/v2/sky/deep-sky/${archiveHash}/${raw.file}`,
 sha256:raw.sha256,bytes:raw.bytes,format:raw.imageFormat==='png'?'png':'jpeg',pixels:raw.pixels,width:raw.pixels,height:raw.pixels,fieldDegrees:raw.fieldDegrees,validFraction:null,coverageState:'NOT_MEASURED',
 ...(raw.sourceFiniteMask?{sourceFiniteMask:raw.sourceFiniteMask}:{}),...(raw.displaySupport?{displaySupport:raw.displaySupport}:{})}}
contracts.assertDeepSkyImageDiscovery(archiveDiscovery,'M:42');
let metadata:any=JSON.parse(JSON.stringify(original)),holdImage=false,abortThrows=false,bareBehavior:'normal'|'hold'|'throw'|'reject'='normal';
const held:any[]=[],heldBare:any[]=[],runtimeRoot=file(out+'/native-runtime');
const finish=(promise:Promise<any>,options:any,map:(v:any)=>any=v=>v)=>{void promise.then(value=>options.success(map(value)),cause=>options.fail({errMsg:String(cause.code??cause.message)}))};
const fsManager={
 mkdir(o:any){finish(fsp.mkdir(o.dirPath,{recursive:true}),o)},readdir(o:any){finish(fsp.readdir(o.dirPath),o,files=>({files}))},
 stat(o:any){finish(fsp.stat(o.path),o,stats=>({stats}))},readFile(o:any){finish(fsp.readFile(o.filePath).then(b=>asBuffer(o.length===undefined?b:b.subarray(o.position??0,(o.position??0)+o.length))),o,data=>({data}))},
 writeFile(o:any){finish(fsp.writeFile(o.filePath,Buffer.from(o.data)),o)},rename(o:any){finish(fsp.rename(o.oldPath,o.newPath),o)},
 unlink(o:any){void fsp.unlink(o.filePath).then(o.success,(cause:any)=>o.fail({errMsg:cause.code==='ENOENT'?'unlink:fail no such file or directory':String(cause)}))},
};
const taro={env:{USER_DATA_PATH:runtimeRoot},getFileSystemManager:()=>fsManager,request(options:any){
 const kind=options.responseType==='arraybuffer'?'image':'discovery';calls.push({kind,url:options.url,headers:options.header??null,timeout:options.timeout});
 const task={abort(){if(abortThrows)throw Error('independent_native_abort_throw');options.fail() },catch(){}};
 if(kind==='discovery'){
  if(bareBehavior==='throw')throw Error('independent_request_throw');if(bareBehavior==='reject')return Promise.reject(Error('independent_request_promise_reject'));
  const complete=()=>options.success({statusCode:200,data:metadata});if(bareBehavior==='hold')heldBare.push({task,options,complete});else queueMicrotask(complete);
 }else{
  const relative=new URL(options.url).pathname.split('/').slice(5).join('/');const complete=()=>options.success({statusCode:200,data:asBuffer(fs.readFileSync(file('workers/miniapp-api/assets/deep-sky/'+relative)))});
  if(holdImage)held.push({task,options,complete});else queueMicrotask(complete);
 }
 return task;
}};
const loadModule=(p:string,dependencies:Record<string,any>,append='')=>{const exports:any={},module={exports};
 const text=ts.transpileModule(fs.readFileSync(file(p),'utf8'),{fileName:p,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(text+'\n'+append,{exports,module,ArrayBuffer,Uint8Array,DataView,Error,Promise,AbortController,Date,Math,Map,Set,WeakMap,setTimeout,clearTimeout,
  __MINIAPP_API_BASE__:base,__MINIAPP_OPERATOR_PREVIEW_TOKEN__:preview,require(name:string){assert.ok(Object.hasOwn(dependencies,name),name);return dependencies[name]}});return module.exports;};
const bare=loadModule('apps/wechat-miniapp/src/services/bare-sky-resource.ts',{'@tarojs/taro':{__esModule:true,default:taro}});
const runtime=loadModule('apps/wechat-miniapp/src/services/sky-public-image-runtime.ts',{'@tarojs/taro':{__esModule:true,default:taro},'@starward/miniapp-contracts':contracts,'./sky-public-image-cache':{createSkyPublicImageCache}},'module.exports.__reviewOwner=owner;');
const client=loadModule('apps/wechat-miniapp/src/services/deep-sky-image-client.ts',{'@starward/miniapp-contracts':contracts,'./bare-sky-resource':bare,'./sky-public-image-runtime':runtime});
const page=ts.createSourceFile('page.tsx',fs.readFileSync(file('apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function find<T extends ts.Node>(predicate:(n:ts.Node)=>boolean):T{let selected:T|undefined;function visit(n:ts.Node){if(predicate(n))selected=n as T;ts.forEachChild(n,visit)}visit(page);assert.ok(selected);return selected}
const compile=(source:string,bindings:object)=>vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,bindings);
const callback=(name:string,bindings:object)=>{const n=find<ts.VariableDeclaration>(n=>ts.isVariableDeclaration(n)&&n.name.getText(page)===name);assert.ok(n.initializer&&ts.isCallExpression(n.initializer));return compile('('+n.initializer.arguments[0]!.getText(page)+')',bindings)};
const decodeEffect=find<ts.CallExpression>(n=>ts.isCallExpression(n)&&n.expression.getText(page)==='useEffect'&&Boolean(n.arguments[0]?.getText(page).includes('const image = node.createImage()')));
const retirementEffect=find<ts.CallExpression>(n=>ts.isCallExpression(n)&&n.expression.getText(page)==='useEffect'&&Boolean(n.arguments[0]?.getText(page).includes('const subscriptions = owned.map')));
const credit=find<ts.VariableDeclaration>(n=>ts.isVariableDeclaration(n)&&n.name.getText(page)==='deepSkyImagePresented');assert.ok(credit.initializer);
const creditFor=(asset:any)=>compile(credit.initializer!.getText(page),{presentedSceneCurrent:true,nativeCanvasMounted:true,canvasSize:{width:390,height:844},presentedSkyFrame:{deepSkyImage:asset}});
const pageBindings:any={deepSkyImageFileRef:{current:null},deepSkyRecoveryFileRef:{current:null},canvasDeepSkyImageRef:{current:null},storeDeepSkyImageAsset(){},storeCanvasDeepSkyImage(){}};
const setFile=callback('setDeepSkyImageAsset',pageBindings),setDecoded=callback('setCanvasDeepSkyImage',pageBindings);
const startSelected=(level:string,meta:any=original)=>new Promise<any>((resolve,reject)=>{metadata=JSON.parse(JSON.stringify(meta));startDeepSkyImageRequest({reference:'M:42',level:level as any,demand:client.beginDeepSkyImageDemand(),discover:signal=>client.getDeepSkyImageDiscovery('M:42',signal),acquire:(asset,hash)=>client.acquireDeepSkyImage(asset,hash),onReady:resolve,onError:()=>reject(Error('selected_failed'))})});
try{
 await runtime.initializeSkyPublicImageCache();
 bareBehavior='hold';abortThrows=true;let metadataErrors=0,metadataReadies=0;
 for(const level of ['DETAIL','OVERVIEW'] as const)startDeepSkyImageRequest({reference:'M:42',level,demand:client.beginDeepSkyImageDemand(),
  discover:signal=>client.getDeepSkyImageDiscovery('M:42',signal),acquire:(asset,hash)=>client.acquireDeepSkyImage(asset,hash),onReady(){metadataReadies++},onError(){metadataErrors++}});
 assert.equal(heldBare.length,2);const metadataClear=await runtime.clearSkyPublicImageCache();for(const held of heldBare.splice(0))held.complete();await new Promise(r=>setTimeout(r,10));
 assert.equal(metadataErrors,2);assert.equal(metadataReadies,0);assert.equal(calls.filter(c=>c.kind==='image').length,0);assert.equal(runtime.__reviewOwner().inspect().pending,0);
 cases.push({name:'actual clear retires all pending discovery demands even when each native abort throws',status:'PASS',clear:metadataClear,metadataErrors,metadataReadies,imageTransfers:0});
 bareBehavior='normal';abortThrows=false;let acquireCalls=0,resolvedGapErrors=0,gapClear:Promise<any>|undefined;
 startDeepSkyImageRequest({reference:'M:42',level:'DETAIL',demand:client.beginDeepSkyImageDemand(),discover:signal=>client.getDeepSkyImageDiscovery('M:42',signal).then((value:any)=>{gapClear=runtime.clearSkyPublicImageCache();return value}),
  acquire:(asset,hash)=>{acquireCalls++;return client.acquireDeepSkyImage(asset,hash)},onReady(){metadataReadies++},onError(){resolvedGapErrors++}});
 await until(()=>resolvedGapErrors===1);await gapClear;await new Promise(r=>setTimeout(r,10));assert.equal(acquireCalls,0);assert.equal(metadataReadies,0);assert.equal(calls.filter(c=>c.kind==='image').length,0);
 cases.push({name:'actual clear after validated discovery resolves but before starter acquisition forbids the microtask gap',status:'PASS',acquireCalls,resolvedGapErrors,imageTransfers:0});
 holdImage=true;
 const first=startSelected('DETAIL');await until(()=>held.length===1);
 metadata.sourceId='imagery:caller-mutated:'+'0'.repeat(64);metadata.levels.DETAIL.fieldDegrees=8;metadata.levels.DETAIL.displaySupport={version:'bad'};held.shift().complete();const a=await first;holdImage=false;
 assert.equal(a.publicationHash,original.publicationHash);assert.equal(a.sourceId,original.sourceId);assert.equal(a.fieldDegrees,original.levels.DETAIL.fieldDegrees);assert.deepEqual(a.displaySupport,original.levels.DETAIL.displaySupport);
 const beforeB=calls.filter(c=>c.kind==='image').length,b=await startSelected('DETAIL',archiveDiscovery),afterB=calls.filter(c=>c.kind==='image').length;
 assert.equal(a.tempFilePath,b.tempFilePath);assert.equal(beforeB,afterB);assert.notEqual(a.release,b.release);assert.notEqual(a.sourceId,b.sourceId);assert.equal(b.displaySupport,undefined);assert.deepEqual(a.displaySupport,original.levels.DETAIL.displaySupport);
 setFile(a);setFile(b);assert.equal(a.isCurrent(),false);assert.equal(b.isCurrent(),true);setFile(null);assert.equal(b.isCurrent(),false);
 cases.push({name:'actual discovery/client/runtime/core/WindowsFS snapshots separate same-path publication leases',status:'PASS',sourceA:a.sourceId,sourceB:b.sourceId,sameEncodedPath:a.tempFilePath===b.tempFilePath,
  imageTransfersBeforeB:beforeB,imageTransfersAfterB:afterB,oldLeaseReleased:!a.isCurrent(),newLeaseReleased:!b.isCurrent(),snapshotField:a.fieldDegrees,currentSupport:a.displaySupport,archiveSupport:b.displaySupport??null});
 const fine=await startSelected('DETAIL'),coarse=await startSelected('OVERVIEW');assert.ok(fine.isCurrent()&&coarse.isCurrent());
 const node={createImage(){const image:any={width:512,height:512,onload:null,onerror:null,src:''};nativeImages.push(image);return image}};
 const decodeBindings:any={...pageBindings,pageVisible:true,canvasNodeRevision:1,canvasGenerationRef:{current:1},canvasNodeRef:{current:node},selectedDeepSkyEntry:{objectRef:'M:42'},desiredDeepSkyImageLevel:'DETAIL',
  deepSkyImageAsset:fine,deepSkyImageFailureRef:{current:null},retireDeepSkyDecode(){},setDeepSkyImageState(state:string){decodeBindings.state=state},setCanvasDeepSkyImage:setDecoded,registerSkyNativeImageLifetime};
 setFile(fine);const runDecode=()=>compile('('+decodeEffect.arguments[0]!.getText(page)+')',decodeBindings)();
 let cleanup=runDecode();nativeImages.at(-1).onload();assert.equal(pageBindings.canvasDeepSkyImageRef.current.release,fine.release);assert.equal(creditFor(pageBindings.canvasDeepSkyImageRef.current),true);
 let uploads=0,deletes=0;const gl:any={NO_ERROR:0,TEXTURE_2D:1,TEXTURE_MIN_FILTER:2,TEXTURE_MAG_FILTER:3,TEXTURE_WRAP_S:4,TEXTURE_WRAP_T:5,LINEAR:6,CLAMP_TO_EDGE:7,RGBA:8,UNSIGNED_BYTE:9,
  getError:()=>0,createTexture:()=>({}),bindTexture(){},texParameteri(){},pixelStorei(){},texImage2D(){uploads++},deleteTexture(){deletes++},isContextLost:()=>false};
 const textures=createSkyGpuTextures(gl);const fineBitmap=pageBindings.canvasDeepSkyImageRef.current.image;assert.ok(textures.get(fineBitmap));assert.equal(uploads,1);
 const beforeClear=runtime.__reviewOwner().inspect();const unsubscribe=compile('('+retirementEffect.arguments[0]!.getText(page)+')',decodeBindings)();const captured=nativeImages.at(-1).onload;
 const clear=await runtime.clearSkyPublicImageCache();captured();assert.equal(pageBindings.canvasDeepSkyImageRef.current,null);assert.equal(fine.isCurrent(),false);assert.equal(coarse.isCurrent(),false);
 assert.equal(creditFor({...fine,image:fineBitmap}),false);assert.equal(skyNativeImageIsCurrent(fineBitmap),false);assert.equal(textures.get(fineBitmap),null);assert.equal(uploads,1);assert.equal(deletes,1);textures.begin();textures.dispose();
 const afterClear=runtime.__reviewOwner().inspect();assert.equal(afterClear.leased,1,'unused independent coarse lease still owned until explicitly released');coarse.release();await runtime.clearSkyPublicImageCache();
 assert.equal(runtime.__reviewOwner().inspect().leased,0);unsubscribe?.();cleanup?.();
 cases.push({name:'actual selected ready retirement withdraws pixel/credit and prevents cached GPU texture reuse',status:'PASS',beforeClear,clear,afterClear,uploads,deletes,retiredCredit:false,
  scope:'controlled Canvas/GL calls, real cache state and Windows bytes; unused coarse lease deliberately released by its independent owner'});
 const retryFine=await startSelected('DETAIL'),retryCoarse=await startSelected('OVERVIEW');assert.ok(retryFine.isCurrent());setFile(retryFine);
 pageBindings.deepSkyRecoveryFileRef.current=retryCoarse;pageBindings.canvasDeepSkyImageRef.current={...retryCoarse,image:{},canvasGeneration:1};decodeBindings.deepSkyImageAsset=retryFine;
 decodeBindings.canvasNodeRevision=2;decodeBindings.canvasGenerationRef.current=2;const imageStart=nativeImages.length;cleanup=runDecode();assert.equal(nativeImages.length,imageStart+2);
 const recovery=nativeImages[imageStart],preferred=nativeImages[imageStart+1];recovery.width=256;recovery.height=256;recovery.onload();preferred.width=511;preferred.onload();
 assert.equal(decodeBindings.state,'ERROR');assert.equal(pageBindings.canvasDeepSkyImageRef.current.release,retryCoarse.release);assert.equal(retryCoarse.isCurrent(),true);assert.equal(creditFor(pageBindings.canvasDeepSkyImageRef.current),true);
 const oldRecoveryOnload=recovery.onload;decodeBindings.canvasNodeRef.current={createImage:node.createImage};decodeBindings.canvasGenerationRef.current=3;oldRecoveryOnload();assert.equal(skyNativeImageIsCurrent(recovery),false);cleanup?.();
 cases.push({name:'fine native decode failure preserves actually-painted valid coarse and Canvas-generation fence',status:'PASS',paintedLevel:pageBindings.canvasDeepSkyImageRef.current.level,preferredState:decodeBindings.state,coarseLeaseCurrent:retryCoarse.isCurrent(),oldCanvasBitmapCurrent:skyNativeImageIsCurrent(recovery)});
 const coarseUnsubscribe=compile('('+retirementEffect.arguments[0]!.getText(page)+')',decodeBindings)(),coarseClear=await runtime.clearSkyPublicImageCache();
 assert.equal(pageBindings.canvasDeepSkyImageRef.current,null);assert.equal(retryFine.isCurrent(),false);assert.equal(retryCoarse.isCurrent(),false);assert.equal(runtime.__reviewOwner().inspect().leased,0);coarseUnsubscribe?.();setFile(null);
 cases.push({name:'actual selected page subscribes and releases distinct requested/recovery coarse leases on clear',status:'PASS',clear:coarseClear,after:runtime.__reviewOwner().inspect(),decoded:null,requestedCurrent:false,recoveryCurrent:false});
 const lateFine=await startSelected('DETAIL');setFile(lateFine);decodeBindings.deepSkyImageAsset=lateFine;decodeBindings.canvasNodeRevision=3;
 const lateCleanup=runDecode(),lateImage=nativeImages.at(-1),lateOnload=lateImage.onload;
 const lateUnsubscribe=compile('('+retirementEffect.arguments[0]!.getText(page)+')',decodeBindings)();await runtime.clearSkyPublicImageCache();lateOnload();
 assert.equal(pageBindings.canvasDeepSkyImageRef.current,null);assert.equal(lateFine.isCurrent(),false);assert.equal(creditFor({...lateFine,image:lateImage}),false);assert.equal(runtime.__reviewOwner().inspect().leased,0);
 lateUnsubscribe?.();lateCleanup?.();setFile(null);
 cases.push({name:'actual public clear before initial native decode onload rejects late pixels at current Canvas generation',status:'PASS',canvasGeneration:3,paintedRetiredLease:false,creditAfterRetirement:false,cache:runtime.__reviewOwner().inspect()});
 holdImage=true;abortThrows=true;let cancels=0,errors=0,readies=0;metadata=JSON.parse(JSON.stringify(original));
 const cancel=startDeepSkyImageRequest({reference:'M:42',level:'MEDIUM',demand:client.beginDeepSkyImageDemand(),discover:signal=>client.getDeepSkyImageDiscovery('M:42',signal),acquire:(asset,hash)=>client.acquireDeepSkyImage(asset,hash),onReady(){readies++},onError(){errors++},onCancel(){cancels++}});
 await until(()=>held.length===1);cancel();const pending=runtime.__reviewOwner().inspect();assert.equal(pending.running,1);assert.ok(pending.reserved>0);held.shift().complete();await until(()=>runtime.__reviewOwner().inspect().running===0);
 assert.equal(cancels,1);assert.equal(errors,0);assert.equal(readies,0);assert.equal(runtime.__reviewOwner().inspect().leased,0);abortThrows=false;holdImage=false;
 cases.push({name:'actual selected cancellation survives throwing native abort and waits actual late image settlement',status:'PASS',whileNativeHeld:pending,afterNativeSettlement:runtime.__reviewOwner().inspect(),cancels,errors,readies});
 bareBehavior='throw';await assert.rejects(client.getDeepSkyImageDiscovery('M:42'),/request_failed/);bareBehavior='reject';await assert.rejects(client.getDeepSkyImageDiscovery('M:42'),/request_failed/);
 bareBehavior='hold';abortThrows=true;const controller=new AbortController(),cancelled=client.getDeepSkyImageDiscovery('M:42',controller.signal);const rejected=assert.rejects(cancelled,/request_cancelled/);controller.abort();await rejected;heldBare.shift().complete();await new Promise(r=>setTimeout(r,5));abortThrows=false;bareBehavior='normal';
 for(const c of calls){assert.equal(c.headers['X-Starward-Operator-Preview'],preview);assert.ok(c.url.startsWith(base+'/v2/sky/deep-sky/'));assert.equal(c.timeout,c.kind==='image'?15000:10000)}
 cases.push({name:'actual bare transport synchronous throw/Promise rejection/throwing abort fences late discovery and propagates preview header',status:'PASS',calls:calls.length,normalAndFailureBoundaries:true});
 // Independent shared owner proof: actual loader/request/core, separate native Windows filesystem.
 const png=fs.readFileSync(file(approvedPNG)),asset={id:'independent-art',bytes:png.length,sha256:sha(png),width:128,height:128};let transfers=0,latest:any,loaded:any,decoded:any;
 const sharedRoot=file(out+'/native-shared'),core=createSkyPublicImageCache({root:sharedRoot,byteBudget:32*1024*1024,maxFileBytes:8*1024*1024,session:'independent_client',
  fs:{mkdir:async p=>{await fsp.mkdir(p,{recursive:true})},list:p=>fsp.readdir(p),size:async p=>(await fsp.stat(p)).size,read:async(p,length)=>asBuffer((await fsp.readFile(p)).subarray(0,length)),write:async(p,b)=>{await fsp.writeFile(p,Buffer.from(b))},rename:(a,b)=>fsp.rename(a,b),remove:async p=>{try{await fsp.unlink(p)}catch(e:any){if(e.code!=='ENOENT')throw e}}},
  transfer(){transfers++;return{promise:Promise.resolve(asBuffer(png)),cancel(){}}}});await core.ready();
 const loader=createSkyArtworkLoader({start(value:any,ready,fail){return startSkyArtworkRequest({asset:value,url:'https://shared.fixture.invalid/art',canvas:{createImage(){decoded={width:128,height:128,onload:null,onerror:null,src:''};return decoded}},
  acquire:()=>core.acquire({...value,format:'png',environment:'a'.repeat(64),url:'https://shared.fixture.invalid/art'}),ready(v){loaded=v;ready(v)},fail})},changed(state){latest=state}});
 loader.update([asset]);await until(()=>Boolean(decoded?.onload));decoded.onload();assert.equal(latest.images.size,1);const sharedReady=loaded,sharedImage=loaded.image;await core.clear();
 assert.equal(latest.images.size,0);assert.equal(latest.failed,true);assert.equal(sharedReady.isCurrent(),false);assert.equal(skyNativeImageIsCurrent(sharedImage),false);assert.equal(core.inspect().leased,0);
 loader.update([asset]);await new Promise(r=>setTimeout(r,5));assert.equal(latest.images.size,0);const transfersBeforeRetry=transfers;loader.retry();await until(()=>Boolean(decoded?.onload));decoded.onload();assert.equal(latest.images.size,1);assert.ok(transfers>transfersBeforeRetry);
 loader.update([]);loader.suspendUnusedDecoded();assert.equal(skyNativeImageIsCurrent(loaded.image),false);const beforeColdClear=core.inspect();assert.equal(beforeColdClear.leased,1);await core.clear();assert.equal(core.inspect().leased,0);
 loader.update([asset]);assert.equal(latest.images.size,0);assert.equal(latest.failed,true);loader.retry();await until(()=>Boolean(decoded?.onload));const late=decoded.onload;await core.clear();late();assert.equal(latest.images.size,0);assert.equal(core.inspect().leased,0);loader.dispose();
 const durable=JSON.parse(fs.readFileSync(path.join(sharedRoot,'index-v1.json'),'utf8'));assert.equal(durable.entries.length,0);
 cases.push({name:'actual shared ready/cold retirement and explicit retry fence captured late decode and durably release lease',status:'PASS',beforeColdClear,after:core.inspect(),durable,transfers});
 const hookCells:any[]=[],hookImages:any[]=[];let hookCursor=0,hookDirty=true,hookPending:any[]=[],hookValue:any,hookWanted:any[]=[];
 const changedDeps=(a:any[]|undefined,b:any[]|undefined)=>!a||!b||a.length!==b.length||a.some((v,i)=>!Object.is(v,b[i]));
 const react={useRef(value:any){const i=hookCursor++;return hookCells[i]??=( {current:value} )},useState(value:any){const i=hookCursor++;const cell=hookCells[i]??=( {value,set(next:any){cell.value=typeof next==='function'?next(cell.value):next;hookDirty=true}} );return[cell.value,cell.set]},
  useCallback(value:any,deps:any[]){const i=hookCursor++,cell=hookCells[i];if(!cell||changedDeps(cell.deps,deps))hookCells[i]={value,deps};return hookCells[i].value},
  useEffect(effect:any,deps:any[]){const i=hookCursor++,cell=hookCells[i]??={};if(changedDeps(cell.deps,deps)){cell.deps=deps;cell.effect=effect;hookPending.push(cell)}}};
 const hook=loadModule('apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts',{'react':react,'@tarojs/taro':{__esModule:true,default:taro},'@/services/api-client':{constellationAssetUrl(){throw Error('unselected_hook_helper')}},
  '../../services/sky-image-file-session':{skyImageFileSession:{nextRequestSuffix(){throw Error('public_must_not_use_session')}}},'../../services/sky-public-image-runtime':runtime,
  './sky-artwork-loader':{createSkyArtworkLoader},'./sky-artwork-request':{startSkyArtworkRequest}});
 const hookCanvas={createImage(){const image:any={width:0,height:0,onload:null,onerror:null,src:''};hookImages.push(image);return image}},hookAsset={...original.levels.OVERVIEW,id:'hook-overview'};
 const flushHook=()=>{let rounds=0;while(hookDirty){assert.ok(++rounds<20,'hook scheduling loop');hookDirty=false;hookCursor=0;hookPending=[];
   hookValue=hook.useSkyNativeImages(hookCanvas,1,original.publicationHash,true,hookWanted,(value:any)=>({url:base+value.downloadUrl,format:value.format}));
   for(const cell of hookPending){cell.cleanup?.();cell.cleanup=cell.effect()}}
  return hookValue;};
 const settleHookImage=()=>{const image=hookImages.at(-1),encoded=fs.readFileSync(image.src);image.width=encoded.readUInt32BE(16);image.height=encoded.readUInt32BE(20);image.onload();return image};
 hookWanted=[hookAsset];flushHook();await until(()=>Boolean(hookImages.at(-1)?.onload));const hookFirst=settleHookImage();flushHook();assert.equal(hookValue.images.size,1);assert.equal(skyNativeImageIsCurrent(hookFirst),true);
 await runtime.clearSkyPublicImageCache();flushHook();assert.equal(hookValue.images.size,0);assert.equal(hookValue.failed,true);assert.equal(skyNativeImageIsCurrent(hookFirst),false);
 hookDirty=true;flushHook();assert.equal(hookValue.images.size,0);hookValue.retryImages();await until(()=>Boolean(hookImages.at(-1)?.onload));settleHookImage();flushHook();assert.equal(hookValue.images.size,1);
 hookWanted=[];hookDirty=true;flushHook();hookValue.suspendUnusedDecoded();flushHook();const hookCold=runtime.__reviewOwner().inspect();assert.equal(hookCold.leased,1);
 await runtime.clearSkyPublicImageCache();flushHook();hookWanted=[hookAsset];hookDirty=true;flushHook();assert.equal(hookValue.images.size,0);assert.equal(hookValue.failed,true);
 for(const cell of hookCells)cell.cleanup?.();assert.equal(runtime.__reviewOwner().inspect().leased,0);
 cases.push({name:'actual full native-image hook consumes real public runtime ready/cold retirement and explicit retry',status:'PASS',readyCleared:true,cold:hookCold,after:runtime.__reviewOwner().inspect(),nativeImageCallbacks:hookImages.length,
  scope:'actual entire hook module and React effect/state scheduling fixture, actual runtime/core/request/loader, real Windows task FS; controlled native image dimensions/callbacks, no WEAPP'});
 await runtime.clearSkyPublicImageCache();const runtimeIndex=JSON.parse(fs.readFileSync(path.join(runtimeRoot,'sky-public-images-v1','index-v1.json'),'utf8'));assert.equal(runtimeIndex.entries.length,0);
 save('result.json',{status:'PASS',scope:'Actual selected discovery client/bare/runtime/request/core and native Windows task FS; actual page AST ownership/decode/retire/credit callbacks; actual shared loader/request and GPU texture owner with controlled Canvas/native callbacks/GL. No remote HTTP/WEAPP/driver/performance/full experience claim.',sources,cases,calls,finalRuntime:runtime.__reviewOwner().inspect(),runtimeIndex});
}catch(e){save('failure.json',{message:String(e),stack:(e as Error).stack,sources,cases,calls,heldImages:held.length});throw e}
finally{const after=protectedFiles.map(b=>bind(b.path));save('binding.json',{script:bind(out+'/executed-script.mts.txt'),inputsBefore:protectedFiles,inputsAfter:after,unchanged:JSON.stringify(after)===JSON.stringify(protectedFiles)});assert.deepEqual(after,protectedFiles)}
console.log(JSON.stringify({result:bind(out+'/result.json'),binding:bind(out+'/binding.json'),cases:cases.length,calls:calls.length}));
