/** Independent bounded review. No listener, network, decoder, GPU or publisher. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const OUT=path.join(ROOT,'output/prepared-transport-cache-independent-1003-r2');
mkdirSync(OUT);
const requireApp=createRequire(path.join(ROOT,'apps/wechat-miniapp/package.json'));
const ts=requireApp('typescript');
const requireWorker=createRequire(path.join(ROOT,'workers/miniapp-api/package.json'));
requireWorker('reflect-metadata');
const load=(p:string)=>import(pathToFileURL(path.join(ROOT,p)).href);
const contracts=await load('packages/miniapp-contracts/src/index.ts');
const { PreparedOpticalImageryService }=await load('workers/miniapp-api/src/prepared-optical-imagery.ts');
const { SdssOpticalImageryService }=await load('workers/miniapp-api/src/sdss-optical-imagery.ts');
const { skyPublicAssetHeaders }=await load('workers/miniapp-api/src/sky-public-asset-headers.ts');
const staticOwner=await load('tools/deployment/sky-static-bundle.mjs');
const digest=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const read=(p:string)=>readFileSync(path.isAbsolute(p)?p:path.join(ROOT,p));
const json=(p:string)=>JSON.parse(read(p).toString());
const save=(name:string,data:unknown)=>writeFileSync(path.join(OUT,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const serviceDir='apps/wechat-miniapp/src/services/';
const transportDir='output/prepared-optical-transport-1003-r1/';
const preparedDir='output/prepared-optical-publication-1003-r4/publication/';
const scienceDir='output/sdss-science-optical-writer-1002-r1/publication/';
const rawPrepared=json(preparedDir+'manifest.json'), rawScience=json(scienceDir+'manifest.json');
const preparedHash=rawPrepared.publicationHash, scienceHash=rawScience.publicationHash;
const preserved=json('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json');
const files=new Set<string>([fileURLToPath(import.meta.url),process.execPath,requireApp.resolve('typescript'),
 'workers/miniapp-api/src/prepared-optical-imagery.ts','workers/miniapp-api/src/target-optical-image-file.ts',
 'workers/miniapp-api/src/sdss-optical-imagery.ts','workers/miniapp-api/src/controller.ts','workers/miniapp-api/src/miniapp-service.ts',
 'workers/miniapp-api/src/sky-public-asset-headers.ts','tools/deployment/sky-static-bundle.mjs',
 'packages/miniapp-contracts/api/miniapp.operations.json','tools/miniapp/generate-miniapp-sdk.mjs',
 'tools/run-node.cjs','package-lock.json',
 ...['sky-image-bytes.ts','sky-public-image-cache.ts','sky-public-image-runtime.ts','bare-sky-resource.ts',
 'sky-publication-resource.ts','prepared-optical-client.ts','prepared-optical-resource.ts',
 'sdss-optical-client.ts','sdss-science-optical-resource.ts','sdss-optical-publication.ts',
 'sky-public-image-cache.test.ts','sdss-science-optical-resource.test.ts'].map(p=>serviceDir+p),
 'output/prepared-optical-resource-1003-r1/escaped-cache-before.ts.txt',
 ...preserved.map((r:any)=>r.path)]);
function addTree(dir:string){for(const f of readdirSync(path.join(ROOT,dir),{withFileTypes:true})){
 const p=dir+'/'+f.name;if(f.isDirectory())addTree(p);else files.add(p);}}
// Conservative source supersets for actual imported contract/catalog code.
addTree('packages/miniapp-contracts/src');addTree('packages/astronomy-core/src');
for(const p of [transportDir,'output/prepared-optical-resource-1003-r1/','output/prepared-optical-resource-1003-r2/'])addTree(p.slice(0,-1));
for(const d of [preparedDir,scienceDir]){
 files.add(d+'manifest.json');const m=json(d+'manifest.json');for(const a of Object.values(m.levels) as any[])files.add(d+a.file);
}
const bind=()=>[...files].sort().map(p=>{const b=read(p);return{path:path.isAbsolute(p)?p.replaceAll('\\','/'):p,bytes:b.length,sha256:digest(b)}});
const before=bind();save('inputs-before.json',before);
writeFileSync(path.join(OUT,'executed-script.mts'),readFileSync(fileURLToPath(import.meta.url)),{flag:'wx'});
for(const r of preserved)assert.equal(digest(read(r.path)),r.sha256);
const copies=path.join(OUT,'executed-sources');mkdirSync(copies);
for(const p of [...files].filter(p=>p.startsWith(serviceDir)||p.startsWith('workers/miniapp-api/src/')||p==='tools/deployment/sky-static-bundle.mjs'))
 writeFileSync(path.join(copies,p.replaceAll('/','__')),read(p),{flag:'wx'});

function compile(name:string,imports:Record<string,any>,source?:string,globals:Record<string,any>={}){
 const exports:any={};const code=ts.transpileModule(source??read(serviceDir+name).toString(),{fileName:name,
 compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports,ArrayBuffer,Uint8Array,DataView,Error,Object,JSON,Promise,setTimeout,clearTimeout,
 AbortController,__MINIAPP_API_BASE__:'https://independent.invalid',...globals,
 require(n:string){assert(n in imports,'Unbound VM import '+n);return imports[n];}});return exports;
}
const bytesOwner=compile('sky-image-bytes.ts',{'@starward/miniapp-contracts':contracts});
const coreCurrent=compile('sky-public-image-cache.ts',{'./sky-image-bytes':bytesOwner});
const oldBytes=read('output/prepared-optical-resource-1003-r1/escaped-cache-before.ts.txt');
assert.equal(digest(oldBytes),'2db3353d5e16333d6696b0ab33f3e9c0e244c9ea6774a9e3c33dc96476ea8085');
const coreBefore=compile('sky-public-image-cache.ts',{'./sky-image-bytes':bytesOwner},oldBytes.toString());
const buffer=(b:Buffer)=>b.buffer.slice(b.byteOffset,b.byteOffset+b.length);
const asset0=rawPrepared.levels.OVERVIEW;
const body0=buffer(read(preparedDir+asset0.file));
const descriptor={environment:'e'.repeat(64),sha256:asset0.sha256,bytes:asset0.bytes,width:512,height:512,format:'png',url:'https://independent.invalid/exact.png'};
async function spin(check:()=>boolean){for(let i=0;i<1500;i++){if(check())return;await Promise.resolve();}throw Error('controlled_callback_not_reached');}
async function drain(){for(let i=0;i<80;i++)await Promise.resolve();}
function coreFs(){
 const data=new Map<string,ArrayBuffer>();const events:any[]=[];let holdFirst=false,unblock:(()=>void)|undefined,failNextIndex=false;
 const fs={async mkdir(p:string){events.push(['mkdir',p]);},async list(p:string){return[...data.keys()].filter(k=>k.startsWith(p+'/')).map(k=>k.slice(p.length+1));},
 async size(p:string){const b=data.get(p);if(!b)throw Error('absent');return b.byteLength;},async read(p:string,n:number){const b=data.get(p);if(!b)throw Error('absent');return b.slice(0,n);},
 async write(p:string,b:ArrayBuffer){events.push(['write',p,b.byteLength]);if(p.includes('/index-')&&failNextIndex){failNextIndex=false;throw Error('independent_index_io_failure');}
 if(p.includes('/index-')&&holdFirst){holdFirst=false;await new Promise<void>(r=>{unblock=r;});}data.set(p,b.slice(0));},
 async rename(a:string,b:string){const v=data.get(a);assert(v);data.set(b,v);data.delete(a);events.push(['rename',a,b]);},
 async remove(p:string){data.delete(p);events.push(['remove',p]);}};
 return{data,events,fs,hold(){holdFirst=true;},get held(){return Boolean(unblock);},release(){assert(unblock);unblock();},failIndex(){failNextIndex=true;}};
}
async function bootClear(core:any){
 const f=coreFs();f.hold();let transfers=0;
 const cache=core.createSkyPublicImageCache({fs:f.fs,root:'/independent',session:'probe',byteBudget:2*1024*1024,
 maxFileBytes:1024*1024,cleanupWaitMs:50,transfer(){transfers++;return{promise:Promise.resolve(body0.slice(0)),cancel(){}};}});
 const initial=cache.ready().then(()=>null,(e:Error)=>e.message);await spin(()=>f.held);
 const clearing=cache.clear().then((r:any)=>({result:r}),(e:Error)=>({error:e.message}));f.release();
 const staleBoot=await initial,result=await clearing;assert.equal(staleBoot,'sky_public_image_cancelled');
 const indexBeforeRetry=f.data.get('/independent/index-v1.json');
 const lease=await cache.acquire(descriptor).promise;assert(lease.isCurrent());lease.release();await drain();
 const clearAfter=await cache.clear();await cache.ready();await drain();
 assert.equal(cache.inspect().leased,0);assert.equal(cache.inspect().bytes,0);
 return{staleBoot,...result,indexBeforeRetry:indexBeforeRetry?JSON.parse(Buffer.from(indexBeforeRetry).toString()):null,
 transfers,explicitRetryCurrent:true,final:cache.inspect(),clearAfter,events:f.events};
}
const oldRace=await bootClear(coreBefore),newRace=await bootClear(coreCurrent);
assert.equal(oldRace.error,'sky_public_image_cancelled');assert.equal(newRace.result.status,'complete');
assert.deepEqual(newRace.indexBeforeRetry.entries,[]);
const io=coreFs();io.failIndex();const recovery=coreCurrent.createSkyPublicImageCache({fs:io.fs,root:'/independent',session:'fail',
 byteBudget:2*1024*1024,maxFileBytes:1024*1024,transfer(){return{promise:Promise.resolve(body0.slice(0)),cancel(){}};}});
await assert.rejects(recovery.ready(),/independent_index_io_failure/);
const recovered=await recovery.acquire(descriptor).promise;assert(recovered.isCurrent());
await spin(()=>recovery.inspect().running===0);
assert.equal((await recovery.clear()).status,'partial');assert(!recovered.isCurrent());assert(io.data.has(recovered.filePath));
recovered.release();await drain();await recovery.clear();assert.equal(recovery.inspect().bytes,0);
save('boot-clear.json',{before:oldRace,current:newRace,otherIoFailure:'not_swallowed',explicitIoRetry:recovery.inspect()});

// Actual runtime/client/resource modules, controlled native callback delivery.
const f=coreFs(),requests:any[]=[],caches:any[]=[];
const nativeFs={mkdir(o:any){void f.fs.mkdir(o.dirPath).then(o.success,o.fail);},readdir(o:any){void f.fs.list(o.dirPath).then(files=>o.success({files}),o.fail);},
 stat(o:any){void f.fs.size(o.path).then(size=>o.success({stats:{isFile:()=>true,size}}),()=>o.fail({errMsg:'no such file or directory'}));},
 readFile(o:any){void f.fs.read(o.filePath,o.length).then(data=>o.success({data}),o.fail);},writeFile(o:any){void f.fs.write(o.filePath,o.data).then(o.success,o.fail);},
 rename(o:any){void f.fs.rename(o.oldPath,o.newPath).then(o.success,o.fail);},unlink(o:any){void f.fs.remove(o.filePath).then(o.success,o.fail);}};
const Taro={env:{USER_DATA_PATH:'/native-controlled'},getFileSystemManager:()=>nativeFs,request(o:any){
 const r={url:o.url,image:o.responseType==='arraybuffer',aborts:0,completed:false,success(body:any,statusCode=200){r.completed=true;o.success({data:body,statusCode});}};requests.push(r);
 if(r.image){const b=read(preparedDir+o.url.split('/').at(-1));queueMicrotask(()=>r.success(buffer(b)));}
 return{abort(){r.aborts++;r.completed=true;o.fail({errMsg:'independent_abort'});},catch(){}};}};
const runtime=compile('sky-public-image-runtime.ts',{'@tarojs/taro':{default:Taro},'@starward/miniapp-contracts':contracts,
 './sky-public-image-cache':{createSkyPublicImageCache(d:any){const c=coreCurrent.createSkyPublicImageCache({...d,cleanupWaitMs:50});caches.push(c);return c;}}});
const bare=compile('bare-sky-resource.ts',{'@tarojs/taro':{default:Taro}});
const client=compile('prepared-optical-client.ts',{'@starward/miniapp-contracts':contracts,'./bare-sky-resource':bare});
const scienceClient=compile('sdss-optical-client.ts',{'@starward/miniapp-contracts':contracts,'./bare-sky-resource':bare,'./sdss-optical-publication':contracts});
const common=compile('sky-publication-resource.ts',{'./sky-public-image-runtime':runtime});
const resource=compile('prepared-optical-resource.ts',{'./prepared-optical-client':client,'./sky-publication-resource':common});
const scienceResource=compile('sdss-science-optical-resource.ts',{'./sdss-optical-client':scienceClient,'./sky-publication-resource':common});
const req=(hash:string)=>requests.findLast(r=>!r.completed&&r.url.includes(hash));
const pending=resource.getPreparedOpticalResource('M:51',preparedHash).catch((e:Error)=>e.message);
await runtime.clearSkyPublicImageCache();assert.equal(await pending,'prepared_optical_resource_cancelled');
requests[0].success(rawPrepared);await drain();
const retry=resource.getPreparedOpticalResource('M:51',preparedHash);req(preparedHash).success(rawPrepared);const cap=await retry;
assert(Object.isFrozen(cap)&&Object.isFrozen(cap.publication.source));assert(cap.isCurrent());
const s=scienceResource.getSdssScienceOpticalResource('M:51',scienceHash);req(scienceHash).success(rawScience);const sc=await s;assert(sc.isCurrent());
const aa={...asset0,width:512,height:512,format:'png'};
const url=client.preparedOpticalImageUrl(asset0.downloadUrl);
const [l1,l2]=await Promise.all([runtime.acquirePublishedSkyImage(aa,url,preparedHash).promise,runtime.acquirePublishedSkyImage(aa,url,preparedHash).promise]);
assert.equal(l1.filePath,l2.filePath);assert.equal(requests.filter(r=>r.image).length,1);
await spin(()=>caches[0].inspect().running===0);
l1.release();assert(l2.isCurrent());let retired=0;l2.onRetire(()=>retired++);
const heldClear=await runtime.clearSkyPublicImageCache();assert.equal(heldClear.status,'partial');
assert(!cap.isCurrent()&&!sc.isCurrent()&&!l2.isCurrent());assert.equal(retired,1);assert(f.data.has(l2.filePath));
l2.release();await drain();await runtime.clearSkyPublicImageCache();assert.equal(caches[0].inspect().leased,0);assert.equal(caches[0].inspect().bytes,0);
const wrong=resource.getPreparedOpticalResource('M:51',preparedHash).catch((e:Error)=>e.message);req(preparedHash).success(rawScience);assert.match(await wrong,/prepared_optical_publication_invalid/);
const changed=resource.getPreparedOpticalResource('M:51',preparedHash).catch((e:Error)=>e.message);const changedCredit=structuredClone(rawPrepared);changedCredit.source.credit+=' x';req(preparedHash).success(changedCredit);assert.match(await changed,/prepared_optical_publication_invalid/);
const priorRequests=requests.length;
for(const p of [asset0.downloadUrl.replace(preparedHash,scienceHash),asset0.downloadUrl.replace('M-51-overview.png','../raw.npy'),asset0.downloadUrl+'.jpg'])
 assert.throws(()=>runtime.acquirePublishedSkyImage(aa,'https://independent.invalid'+p,preparedHash),/route_invalid/);
assert.equal(requests.length,priorRequests);
save('resource.json',{requests:requests.map(({success,...r})=>r),retired,sharedBothEpochStampsRetired:true,
 immutableCredit:cap.publication.source.credit,final:caches[0].inspect(),controlledFs:true,nativeDecode:false});

// Server method and immutable saved byte joins. No new HTTP listener.
const descriptorUrl=pathToFileURL(path.join(ROOT,preparedDir,'manifest.json'));
const owner=new PreparedOpticalImageryService([{reference:'M:51',expectedHash:preparedHash,manifestUrl:descriptorUrl}]);
descriptorUrl.pathname='/changed-after-registration.json';
const envelope=owner.manifest(preparedHash);assert.deepEqual(envelope,rawPrepared);envelope.source.credit='caller modification';
assert.equal(owner.manifest(preparedHash).source.credit,rawPrepared.source.credit);
assert.throws(()=>new PreparedOpticalImageryService().manifest(preparedHash),/not_found/);
for(const [h,file] of [[scienceHash,asset0.file],[preparedHash,'writer-receipt.json'],[preparedHash,'M-82-detail.png']])
 assert.throws(()=>owner.getByFile(h,file),/not_found/);
assert.throws(()=>owner.source('M:82',preparedHash),/not_found/);
assert.deepEqual(owner.source('M:51',preparedHash),json(transportDir+'source.json'));
const oldSdss=new SdssOpticalImageryService();assert.equal(oldSdss.currentManifest().schemaVersion,'sdss-dr17-m51-optical-publication-v1');
assert.throws(()=>oldSdss.manifest(preparedHash),/not_found/);
const oldAsset=oldSdss.currentManifest().levels.DETAIL;
assert.equal((await oldSdss.getByFile(oldSdss.currentManifest().publicationHash,oldAsset.file)).contentType,'image/jpeg');
const actualResult=json(transportDir+'result.json');assert.equal(digest(read(transportDir+'result.json')),'5781b89fe9c020762898e21deb6a00b6f8a984293b1560dbeff5cfefcba240a7');
assert.deepEqual(json(transportDir+'http-manifest.json'),rawPrepared);
const staticDir=path.join(ROOT,transportDir,'static-bundle/publication');const validated=await staticOwner.validateSkyStaticBundle(staticDir);
const joins=[];for(const level of contracts.OPTICAL_IMAGE_LEVELS){const a=rawPrepared.levels[level],b=read(preparedDir+a.file),http=read(transportDir+a.file);
 const record=validated.records.find((r:any)=>r.route===a.downloadUrl);assert(record);assert.equal(digest(b),a.sha256);assert.equal(b.length,a.bytes);assert(b.equals(http));
 assert(read(path.join(staticDir,'files',a.downloadUrl.slice(1))).equals(b));assert.deepEqual(record.headers,skyPublicAssetHeaders('prepared-optical','image/png',a.fieldDegrees));
 const httpRow=actualResult.rows.find((r:any)=>r.level===level);for(const [k,v] of Object.entries(record.headers))assert.equal(httpRow.headers[k],v);
 joins.push({level,bytes:b.length,sha256:digest(b),route:a.downloadUrl});}
for(const suffix of ['manifest','raw.npy','M-51-overview.jpg','M-111-detail.png','../M-51-detail.png','%4d-51-detail.png','M-51-detail.png/extra'])
 assert.equal(staticOwner.validSkyStaticRoute(`/v2/sky/prepared-optical/${preparedHash}/${suffix}`),false);
const operations=json('packages/miniapp-contracts/api/miniapp.operations.json').operations;
for(const id of ['preparedOpticalManifestGet','preparedOpticalImageGet']){const op=operations.find((r:any)=>r.id===id);assert(op&&op.responseEnvelope===false);assert(op.responseType.startsWith('PreparedOptical'));}
save('transport-readback.json',{joins,bytes:joins.reduce((n,r)=>n+r.bytes,0),staticHash:validated.publicationHash,
 defaultRegistryEmpty:true,oldSdssDefaultJpeg:true,source:owner.source('M:51',preparedHash),actualSavedHttpOnly:true,newListeningServer:false});
const after=bind();save('inputs-after.json',after);assert.deepEqual(after,before);
save('result.json',{status:'PASS_BOUNDED_INDEPENDENT_PREPARED_TRANSPORT_CACHE',node:process.version,typescript:ts.version,
 sources:before.filter(r=>r.path.startsWith(serviceDir)||r.path.includes('prepared-optical-imagery')||r.path.includes('target-optical-image')),
 inputs:before.length,allInputsBeforeAfterExact:true,retained:preserved.length,oldBootClearRejected:true,currentBootClearCompleted:true,
 realImageBytes:asset0.bytes,serverSavedPngBytes:1315239,outputs:['boot-clear.json','resource.json','transport-readback.json'],
 scope:'Actual source methods and VM-transpiled owners with controlled MapFS/native callbacks; stored real HTTP/static-byte readback. No decode/TAN/publication/GPU/WEAPP/deployment/quality/capacity or default adoption claim.'});
console.log(JSON.stringify({output:OUT,sha256:digest(readFileSync(path.join(OUT,'result.json'))),inputs:before.length}));
