/** Actual complete consumer modules; controlled React/query, file lease/decode callbacks. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..'),OUT=path.join(ROOT,'output/prepared-consumer-independent-1003-r2');mkdirSync(OUT);
const requireApp=createRequire(path.join(ROOT,'apps/wechat-miniapp/package.json')),ts=requireApp('typescript');
const read=(p:string)=>readFileSync(path.isAbsolute(p)?p:path.join(ROOT,p)),json=(p:string)=>JSON.parse(read(p).toString());
const digest=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const save=(n:string,v:unknown)=>writeFileSync(path.join(OUT,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const dir='apps/wechat-miniapp/src/features/sky/',parent='output/prepared-optical-consumer-1003-r1/';
const contract=await import(pathToFileURL(path.join(ROOT,'packages/miniapp-contracts/src/index.ts')).href);
const frameOwner=await import(pathToFileURL(path.join(ROOT,dir+'sky-sdss-optical-frame.ts')).href);
const tan=await import(pathToFileURL(path.join(ROOT,dir+'sky-tan-optical-registration.ts')).href);
const scienceTan=await import(pathToFileURL(path.join(ROOT,dir+'sky-sdss-science-registration.ts')).href);
const artwork=await import(pathToFileURL(path.join(ROOT,dir+'sky-artwork-registration.ts')).href);
const selection=await import(pathToFileURL(path.join(ROOT,dir+'sky-sdss-optical-selection.ts')).href);
const status=await import(pathToFileURL(path.join(ROOT,dir+'sky-fixed-image-status.ts')).href);
const prepared=json('output/prepared-optical-publication-1003-r4/publication/manifest.json');
const science=json('output/sdss-science-optical-writer-1002-r1/publication/manifest.json');
contract.assertPreparedOpticalManifest(prepared,'M:51',prepared.publicationHash);
contract.assertSdssScienceOpticalManifest(science,'M:51',science.publicationHash);
const sources=['use-sky-target-optical.ts','use-sky-sdss-optical.ts','use-sky-prepared-optical.ts','use-sky-artwork.ts',
 'sky-artwork-loader.ts','sky-artwork-request.ts','sky-sdss-optical-frame.ts','sky-tan-optical-registration.ts',
 'sky-sdss-science-registration.ts','sky-sdss-optical-selection.ts','sky-fixed-image-status.ts','sky-observation-frame.ts',
 'sky-artwork-registration.ts','sky-view-projection.ts','sky-viewport.ts','sky-time-frame.ts'];
const preserved=json('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json');
const inputs=[...new Set([fileURLToPath(import.meta.url),process.execPath,requireApp.resolve('typescript'),
 ...sources.map(s=>dir+s),'apps/wechat-miniapp/src/services/sky-image-bytes.ts',
 ...json(parent+'inputs-before.json').map((r:any)=>r.path),...preserved.map((r:any)=>r.path)])];
const bindings=()=>inputs.sort().map(p=>{const b=read(p);return{path:p,bytes:b.length,sha256:digest(b)};});
const before=bindings();save('inputs-before.json',before);writeFileSync(path.join(OUT,'executed-script.mts'),readFileSync(fileURLToPath(import.meta.url)),{flag:'wx'});
mkdirSync(path.join(OUT,'sources'));for(const s of sources)writeFileSync(path.join(OUT,'sources',s+'.txt'),read(dir+s),{flag:'wx'});
for(const r of preserved)assert.equal(digest(read(r.path)),r.sha256);
function compile(name:string,imports:Record<string,any>,source?:string){const exports:any={};
 vm.runInNewContext(ts.transpileModule(source??read(dir+name).toString(),{fileName:name,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
 {exports,Map,Set,WeakMap,ArrayBuffer,Uint8Array,DataView,Object,JSON,Error,Promise,require(n:string){assert(n in imports,'Unbound import '+n);return imports[n];}});return exports;}
class ReactDriver{
 slots:any[]=[];index=0;pending=new Map<number,any>();dirty=false;
 next(){return this.index++;} changed(a:any[],b:any[]|undefined){return !b||a.length!==b.length||a.some((v,i)=>!Object.is(v,b[i]));}
 api={useRef:(value:any)=>{const i=this.next();return(this.slots[i]??={current:value});},
 useState:(value:any)=>{const i=this.next();const s=this.slots[i]??={value:typeof value==='function'?value():value};return[s.value,(v:any)=>{s.value=typeof v==='function'?v(s.value):v;this.dirty=true;}];},
 useMemo:(fn:any,deps:any[])=>{const i=this.next(),s=this.slots[i]??={};if(this.changed(deps,s.deps)){s.deps=deps;s.value=fn();}return s.value;},
 useCallback:(fn:any,deps:any[])=>{const i=this.next(),s=this.slots[i]??={};if(this.changed(deps,s.deps)){s.deps=deps;s.value=fn;}return s.value;},
 useEffect:(fn:any,deps:any[])=>{const i=this.next(),s=this.slots[i]??={};if(this.changed(deps,s.deps))this.pending.set(i,{fn,deps});}};
 render(fn:()=>any){this.index=0;this.dirty=false;return fn();}
 commit(){const jobs=[...this.pending];this.pending.clear();for(const [i,job]of jobs){const s=this.slots[i];s.cleanup?.();s.deps=job.deps;s.cleanup=job.fn();}}
 dispose(){for(const s of this.slots)s?.cleanup?.();this.pending.clear();}
}
async function drain(){for(let i=0;i<40;i++)await Promise.resolve();}
function world(mutant?:string){
 const react=new ReactDriver(),leases:any[]=[],images:any[]=[],queries:any[]=[];let metadata:any,epochCurrent=true,refetches=0,legacyCalls=0,queryCalls=0;
 const resource=(p:any)=>({publication:p,isCurrent:()=>epochCurrent});
 const loader=compile('sky-artwork-loader.ts',{});
 const bytes=compile('sky-image-bytes.ts',{'@starward/miniapp-contracts':contract},read('apps/wechat-miniapp/src/services/sky-image-bytes.ts').toString());
 const request=compile('sky-artwork-request.ts',{'../../services/sky-image-bytes':bytes,'./sky-artwork-loader':loader});
 const canvas={createImage(){const img:any={width:512,height:512,onload:null,onerror:null,src:'',number:images.length};images.push(img);return img;}};
 const runtime={acquirePublishedSkyImage(asset:any,url:string,hash:string){
  const callbacks=new Set<()=>void>();const lease:any={asset,url,hash,current:true,releases:0,cancels:0,filePath:'/controlled/'+asset.sha256+'.png',
   isCurrent(){return lease.current&&lease.releases===0;},onRetire(cb:()=>void){callbacks.add(cb);return()=>callbacks.delete(cb);},
   release(){if(!lease.releases)lease.releases++;},retire(){lease.current=false;for(const cb of [...callbacks])cb();}};leases.push(lease);
  return{promise:Promise.resolve(lease),cancel(){lease.cancels++;}};
 }};
 const native=compile('use-sky-artwork.ts',{react:react.api,'@tarojs/taro':{default:{getFileSystemManager(){throw Error('session path forbidden');}}},
 '@/services/api-client':{constellationAssetUrl(){throw Error('not_constellation');}},'../../services/sky-image-file-session':{skyImageFileSession:{}},
 '../../services/sky-public-image-runtime':runtime,'./sky-artwork-loader':loader,'./sky-artwork-request':request});
 const commonBindings:any={react:react.api,'@/hooks/use-resource-query':{useResourceQuery(options:any){queries.push(options);return{data:metadata,isError:false,isFetching:metadata===undefined,
 refetch(){refetches++;epochCurrent=true;return Promise.resolve();}};}},
 '@/services/sdss-optical-client':{getSdssOpticalManifest(){legacyCalls++;return Promise.resolve(metadata);},sdssOpticalImageUrl:(p:string)=>p},
 '@/services/prepared-optical-client':{preparedOpticalImageUrl:(p:string)=>p},
 '@/services/prepared-optical-resource':{getPreparedOpticalResource(...args:any[]){queryCalls++;return Promise.resolve(resource(prepared));}},
 '@/services/sdss-science-optical-resource':{getSdssScienceOpticalResource(){queryCalls++;return Promise.resolve(resource(science));}},
 './sky-sdss-optical-selection':selection,'./sky-fixed-image-status':status,'./use-sky-artwork':native};
 const common=compile('use-sky-target-optical.ts',commonBindings,mutant);
 const wrappers={sdss:compile('use-sky-sdss-optical.ts',{'./use-sky-target-optical':common}),prepared:compile('use-sky-prepared-optical.ts',{'./use-sky-target-optical':common})};
 let args:any={kind:'prepared-optical-v1',ref:'M:51',hash:prepared.publicationHash,fov:.05,canvas,revision:1,active:true};
 const render=()=>react.render(()=>common.useSkyTargetOptical(args.kind,args.ref,args.fov,args.canvas,args.revision,args.active,args.hash));
 async function settle(){let value:any;for(let i=0;i<5;i++){value=render();react.commit();await drain();}return render();}
 return{render,settle,commit:()=>react.commit(),leases,images,queries,wrappers,react,
 update(v:any){args={...args,...v};},metadata(p:any=prepared){metadata=resource(p);},legacy(p:any){metadata=p;},retire(){epochCurrent=false;},
 ready(n:number){assert(images[n].onload);images[n].onload();},fail(n:number){assert(images[n].onerror);images[n].onerror();},
 get counts(){return{refetches,legacyCalls,queryCalls,released:leases.reduce((n,r)=>n+r.releases,0),created:images.length,acquired:leases.length};},
 snapshot(){return leases.map(({retire,release,isCurrent,onRetire,...l})=>l);}};
}
const observations:any[]=[];
const w=world();const cold=w.render();assert.equal(cold.image,null);assert.equal(w.queries.at(-1).enabled,true);assert.equal(w.queries.at(-1).queryKey[0],'prepared-optical-manifest');
w.metadata();await w.settle();assert.equal(w.leases.length,2);assert(w.leases.every(l=>l.asset.id.startsWith('prepared:M:51:')&&l.hash===prepared.publicationHash));
w.ready(1);w.fail(0);const fallback=await w.settle();assert.equal(fallback.renderedLevel,'MEDIUM');assert.equal(fallback.failed,false);assert.equal(fallback.updateFailed,true);
assert.strictEqual(fallback.renderedAsset,prepared.levels.MEDIUM);const parentImage=fallback.image;fallback.retry();await w.settle();assert.equal(w.images.length,3);
w.ready(2);const fine=await w.settle();assert.equal(fine.renderedLevel,'DETAIL');assert.strictEqual(fine.coarser.image,parentImage);
const frame=frameOwner.skyPreparedOpticalFrame(fine);assert(frame);assert.strictEqual(frame.asset,prepared.levels.DETAIL);assert.strictEqual(frame.coarser!.asset,prepared.levels.MEDIUM);
w.leases[2].retire();const retiredFine=await w.settle();assert.strictEqual(retiredFine.image,parentImage);assert.equal(retiredFine.updateFailed,true);
w.update({active:false});assert.equal(w.render().image,null);w.commit();await drain();assert.equal(w.counts.released,3);
observations.push({case:'fine-failure-ready-parent-retry-native-retire-hide',counts:w.counts,leases:w.snapshot()});

const gap=world();gap.metadata();gap.render();gap.retire();gap.commit();await drain();assert.equal(gap.leases.length,0,'actual resolver must check the old metadata after render');
const afterGap=await gap.settle();assert.equal(afterGap.image,null);assert.equal(afterGap.publication,undefined);assert.equal(afterGap.failed,true);afterGap.retry();await gap.settle();assert.equal(gap.leases.length,2);
const heldOnload=gap.images[0].onload;gap.update({hash:'0'.repeat(64)});assert.equal(gap.render().image,null);gap.commit();await drain();assert.equal(gap.counts.released,2);
heldOnload();assert.equal((await gap.settle()).image,null);gap.react.dispose();
observations.push({case:'render-effect-retirement-no-acquire-explicit-retry-hash-change-late-ready',counts:gap.counts});

const kinds=world();kinds.metadata();await kinds.settle();kinds.ready(0);const oldImage=(await kinds.settle()).image;
kinds.update({kind:'science-optical-v2',hash:science.publicationHash});assert.equal(kinds.render().image,null);kinds.commit();await drain();
kinds.metadata(science);await kinds.settle();assert.equal(kinds.leases.length,4);assert(kinds.leases.slice(2).every(l=>l.asset.id.startsWith('sdss:M:51:')));
kinds.update({ref:'M:82'});assert.equal(kinds.render().publication,undefined);kinds.commit();await drain();kinds.react.dispose();
observations.push({case:'kind-and-ref-transition',oldImageRetired:!kinds.leases[0].isCurrent(),counts:kinds.counts});
assert(oldImage);
const legacy=world(),legacyPub=json('workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json');
const offer=contract.SDSS_OPTICAL_PUBLICATIONS['M:51'];legacyPub.publicationHash=offer.publicationHash;
legacy.update({kind:'sdss-legacy',hash:undefined,fov:.2});legacy.legacy(legacyPub);await legacy.settle();assert.equal(legacy.queries.at(-1).queryKey.length,2);
assert(legacy.leases.every(l=>l.asset.format==='jpeg'));legacy.react.dispose();observations.push({case:'legacy-default',counts:legacy.counts});

// Bounded meaningful mutants: bypassing either synchronous identity or the
// delayed acquisition fence must violate this exact same control.
const source=read(dir+'use-sky-target-optical.ts').toString();
const gapMutant=source.replace('if (immutable && resource?.isCurrent() !== true)','if (false)');assert.notEqual(gapMutant,source);
const mg=world(gapMutant);mg.metadata();mg.render();mg.retire();mg.commit();await drain();assert.equal(mg.leases.length,2);mg.react.dispose();
const kindMutant=source.replace('candidate.imageVersion === kind','true');assert.notEqual(kindMutant,source);
const mk=world(kindMutant);mk.update({hash:science.publicationHash});mk.metadata(science);assert.notEqual(mk.render().publication,undefined);mk.react.dispose();
const cg=world();cg.update({hash:science.publicationHash});cg.metadata(science);assert.equal(cg.render().publication,undefined);cg.react.dispose();
observations.push({case:'two-guard-mutants-detected',gapMutantAcquires:mg.leases.length,sourceGapAcquires:gap.leases.length-2,kindMutantAdmitsForeign:true,sourceRejectsForeign:true});
save('hook-controls.json',{observations,scope:'Complete actual common/native Hook + loader/request. Controlled React/query, already-admitted mocked file leases and native callback objects; not actual cache/HTTP/native decode/GPU.'});

const img={},coarse={};const loaded={image:img,renderedLevel:'DETAIL',renderedAsset:prepared.levels.DETAIL,publication:prepared,
 coarser:{image:coarse,level:'MEDIUM',asset:prepared.levels.MEDIUM}};
assert.equal(frameOwner.skyTargetOpticalFrame({...loaded,renderedAsset:{...prepared.levels.DETAIL}} as any),null);
assert.equal(frameOwner.skySdssOpticalFrame(loaded as any),null);
assert.equal(frameOwner.skyTargetOpticalFrame({...loaded,publication:{...prepared,imageVersion:'foreign'}} as any),null);
assert.equal(frameOwner.skyPreparedOpticalFrame({...loaded,coarser:{...loaded.coarser,asset:{...prepared.levels.MEDIUM}}} as any)!.coarser,null);
const frameMutation=compile('sky-sdss-optical-frame.ts',{},read(dir+'sky-sdss-optical-frame.ts').toString().replace('loaded.renderedAsset !== publication.levels[level]','false'));
assert(frameMutation.skyTargetOpticalFrame({...loaded,renderedAsset:{...prepared.levels.DETAIL}}));

// Independent direct spherical TAN inversion, including actual non-orthogonal
// admitted raw-plane deviation. No source sampler or mother-image regeneration.
const geometric:any[]=[];const mats=[[1,0,0,0,1,0,0,0,1],[0,1,0,-1,0,0,0,0,1],[1,4e-7,0,0,1,0,0,0,1]];
const fixture=json(dir+'sky-prepared-optical-registration.fixture.json');assert.equal(digest(read(dir+'sky-prepared-optical-registration.fixture.json')),'9edd295faa6cf21a9926b4a4e72cb62a8c776a913f80eab3bfd7b3aa56008009');
for(const pub of [prepared,science])for(const M of mats){const observation:any={at:'2026-10-03T00:00:00Z',equatorialToEnu:M};contract.assertStellarRotation(M);
 for(const level of contract.OPTICAL_IMAGE_LEVELS){const a=pub.levels[level],reg=tan.registerSkyTanOpticalField(pub,a,observation);assert(reg);
 if(pub===science)assert.deepEqual(scienceTan.registerSkyScienceOpticalField(pub,a,observation),reg);
 const R=pub.center.raDeg*Math.PI/180,D=pub.center.decDeg*Math.PI/180,c=[Math.cos(D)*Math.cos(R),Math.cos(D)*Math.sin(R),Math.sin(D)],
 e=[-Math.sin(R),Math.cos(R),0],n=[-Math.sin(D)*Math.cos(R),-Math.sin(D)*Math.sin(R),Math.cos(D)],h=Math.tan(a.fieldDegrees*Math.PI/360);
 let max=0;for(const [u,v]of [[0,0],[1,0],[1,1],[0,1],[.5,.5],[.31,.78]]){
 const ray=c.map((x,i)=>x+(1-2*u)*h*e[i]+(1-2*v)*h*n[i]);const rotated=[0,1,2].map(i=>M[i*3]*ray[0]+M[i*3+1]*ray[1]+M[i*3+2]*ray[2]);
 const uv=artwork.skyArtworkUvAtDirection(reg,rotated as any);assert(uv);max=Math.max(max,Math.hypot(uv[0]-u,uv[1]-v)*512);}
 assert(max<1e-6);assert.equal(tan.registerSkyTanOpticalField(pub,{...a},observation),null);geometric.push({imageVersion:pub.imageVersion,level,matrix:M,maxPixelError:max});
 }}
save('frame-tan.json',{exactFrameAndUnknownVersionGuards:true,foreignDescriptorMutantDetected:true,geometric,preparedAstropyFixtureIdentity:true,
 angularPolicyUnchanged:[.3,.1,.05,.31].map(fov=>({fov,science:selection.skyTargetOpticalLevelForFov(fov,science),prepared:selection.skyTargetOpticalLevelForFov(fov,prepared)})),
 scope:'Exact shared TAN nominal geometry and frame methods, not AVM physical accuracy, 5 arcsec measurement, prepared Scene or original source distortion.'});
const ownerBefore=json(parent+'inputs-before.json'),ownerAfter=json(parent+'inputs-after.json');assert.deepEqual(ownerBefore,ownerAfter);
for(const row of ownerBefore){const b=read(row.path);assert.equal(b.length,row.bytes);assert.equal(digest(b),row.sha256);}
const parentResult=json(parent+'result.json');assert.equal(digest(read(parent+'result.json')),'a5a0db5d66ac7ae3d0a49e13486f817f67dace84c3cb3bad8feb554ec49d7823');
for(const section of ['checks','types'])for(const kind of ['stdout','stderr']){const r=parentResult[section][kind];const b=read(r.path);assert.equal(b.length,r.bytes);assert.equal(digest(b),r.sha256);}
assert.match(read(parentResult.checks.stdout.path).toString(),/pass 55/);assert.equal(parentResult.types.exitCode,0);
const after=bindings();save('inputs-after.json',after);assert.deepEqual(before,after);
save('result.json',{status:'PASS_BOUNDED_INDEPENDENT_PREPARED_CONSUMER',node:process.version,typescript:ts.version,inputs:before.length,beforeAfterExact:true,
 author55InputsCurrentExact:true,authorChecksReadbackOnly:true,mutants:['remove epoch at actual acquisition','allow wrong source version','remove exact frame asset identity'],
 hookControls:'actual complete Hook/native loader/request with controlled scheduling, mocked approved leases and callback image objects',
 sourceDecode:0,TANProduction:0,network:0,GPU:0,native:0,defaultAdoption:false,
 sourceVersions:before.filter(r=>sources.slice(0,11).map(s=>dir+s).includes(r.path)),outputs:['hook-controls.json','frame-tan.json']});
console.log(JSON.stringify({output:OUT,sha256:digest(readFileSync(path.join(OUT,'result.json'))),inputs:before.length}));
