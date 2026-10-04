// Independent saved-output readback and bounded complete Hook scheduling controls.
// No browser/GL, source image decode, network or production writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {assertSdssOpticalManifest,assertSdssScienceOpticalManifest,assertPreparedOpticalManifest} from '../../../../packages/miniapp-contracts/src/index.ts';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {skyTargetOpticalIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-target-optical-visibility.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {registerSkySurvey} from '../../../../apps/wechat-miniapp/src/features/sky/sky-survey-registration.ts';
import {registerSkyTanOpticalField} from '../../../../apps/wechat-miniapp/src/features/sky/sky-tan-optical-registration.ts';
import {exactSkyObservationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-observation-frame.ts';
import {resolveSkyDeepSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {artworkIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {sdssOpticalLevelForFov,skyTargetOpticalLevelForFov} from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection.ts';
import {skyFixedImageStatus} from '../../../../apps/wechat-miniapp/src/features/sky/sky-fixed-image-status.ts';
import {createSkyArtworkLoader,skyNativeImageIsCurrent} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts';
import {startSkyArtworkRequest} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const TASK='.codex/work-items/cloud-sky-native-2026-09-22', OUT='output/target-optical-offscreen-independent-1003-r3';
const CACHE='output/target-optical-offscreen-cache-1003-r3';
const FEATURE='apps/wechat-miniapp/src/features/sky/';
assert(!fs.existsSync(path.resolve(ROOT,OUT)));fs.mkdirSync(path.resolve(ROOT,OUT));
const read=(p:string)=>fs.readFileSync(path.resolve(ROOT,p));
const sha=(b:any)=>createHash('sha256').update(b).digest('hex');
const json=(p:string)=>JSON.parse(read(p).toString('utf8'));
const bind=(p:string)=>{const b=read(p);return {path:p,bytes:b.length,sha256:sha(b)};};
const inputs=new Map<string,any>();
function admit(p:string,expected:any={}){const b=bind(p);if(expected.sha256)assert.equal(b.sha256,expected.sha256,p);if(expected.bytes!==undefined)assert.equal(b.bytes,expected.bytes,p);if(inputs.has(p))assert.deepEqual(b,inputs.get(p));inputs.set(p,b);return b;}
const save=(name:string,value:any)=>fs.writeFileSync(path.resolve(ROOT,OUT,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const appRequire=createRequire(path.resolve(ROOT,'apps/wechat-miniapp/package.json')),ts=appRequire('typescript');assert.equal(ts.version,'5.9.3');
const controlRows:any[]=[];
const copy=(x:any)=>JSON.parse(JSON.stringify(x));
const settle=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};

try {
admit(path.relative(ROOT,fileURLToPath(import.meta.url)).replaceAll('\\','/'));admit(process.execPath);admit(appRequire.resolve('typescript'));admit(appRequire.resolve('typescript/package.json'));
fs.copyFileSync(fileURLToPath(import.meta.url),path.resolve(ROOT,OUT,'executed-reader.mts'),fs.constants.COPYFILE_EXCL);
for(const folder of [CACHE,'output/target-optical-offscreen-regression-1003-r2','output/target-optical-offscreen-regression-1003-r1','output/target-optical-offscreen-checks-1003-r2'])
 for(const name of fs.readdirSync(path.resolve(ROOT,folder)))if(fs.statSync(path.resolve(ROOT,folder,name)).isFile())admit(folder+'/'+name);
admit(CACHE+'/result.json',{bytes:50629,sha256:'861d24df37789de680d3f71e0b72bdfa54e6614c4ec074e211fee15fdc56a31b'});
const author=json(CACHE+'/result.json');assert.deepEqual(author.before,author.after);assert.deepEqual(author.before,json(CACHE+'/inputs-before.json'));assert.deepEqual(author.after,json(CACHE+'/inputs-after.json'));
for(const row of author.before)admit(row.path,row);
const protectedPath=TASK+'/tmp/resume-preserved-hashes-2026-10-01.json';admit(protectedPath);for(const row of json(protectedPath))admit(row.path,row);
for(const name of ['use-sky-target-optical.ts','use-sky-sdss-optical.ts','use-sky-prepared-optical.ts','use-sky-artwork.ts','spot-sky-page.tsx','sky-target-optical-visibility.test.ts','use-sky-sdss-optical.test.ts','use-sky-sdss-science-optical.test.ts'])admit(FEATURE+name);
// Bind actual workspace import graph used by these scalar geometry/request imports.
// Platform modules are controlled in the VM, not advertised as runtime-executed.
const roots=['sky-target-optical-visibility.ts','sky-tan-optical-registration.ts','sky-artwork-loader.ts','sky-artwork-request.ts','sky-sdss-optical-selection.ts','sky-fixed-image-status.ts'].map(n=>FEATURE+n);
const configPath=path.resolve(ROOT,'apps/wechat-miniapp/tsconfig.json');admit('apps/wechat-miniapp/tsconfig.json');
const config=ts.parseJsonConfigFileContent(ts.readConfigFile(configPath,ts.sys.readFile).config,ts.sys,path.dirname(configPath));
const graphSeen=new Set<string>(),external=new Map<string,any>();
function graph(p:string){if(graphSeen.has(p))return;graphSeen.add(p);admit(p);const source=ts.createSourceFile(p,read(p).toString('utf8'),ts.ScriptTarget.Latest,true);
 for(const stmt of source.statements)if((ts.isImportDeclaration(stmt)||ts.isExportDeclaration(stmt))&&stmt.moduleSpecifier&&ts.isStringLiteral(stmt.moduleSpecifier)){
  const name=stmt.moduleSpecifier.text,res=ts.resolveModuleName(name,path.resolve(ROOT,p),config.options,ts.sys).resolvedModule;assert(res,'unresolved '+p+' -> '+name);
  const relative=path.relative(ROOT,res.resolvedFileName).replaceAll('\\','/');
  if(!relative.startsWith('..')&&!relative.includes('/node_modules/'))graph(relative);else{admit(res.resolvedFileName);external.set(name,{name,resolved:res.resolvedFileName,scope:'TypeScript resolved entry, not complete vendor loaded-module graph'});}
 }}roots.forEach(graph);graph('apps/wechat-miniapp/src/services/sky-report-catalog.ts');

const generated=json('output/playwright/cloud-sky-prepared-catalog-resource-1003-r2/generated-deep-sky-scene.json');
const projected=projectAdoptedSkyCatalog(json(TASK+'/tmp/current-native-report-2026-10-01.json')).data;
const at=generated.input.at,report={...projected,skyScene:{...projected.skyScene,deepSky:generated.scene}};
const catalog=generated.scene.catalog,idx=catalog.entries.findIndex((x:any)=>x.objectRef==='M:51');
const point=generated.scene.frames.find((x:any)=>x.at===at).points.find((x:any)=>x[0]===idx);assert(point&&point[2]<0);
const view=(offset=0)=>({report,at,width:390,height:844,view:{basis:createSkyViewBasis(point[1]+offset,90+point[2],0)!,verticalFovDeg:.05}});
const families=[
 {kind:'sdss-legacy',manifest:'output/playwright/cloud-sky-complete-resource-1003-r2/sdss-M-51-manifest.json',assets:'workers/miniapp-api/assets/deep-sky/sdss-m51',admit:assertSdssOpticalManifest},
 {kind:'science-optical-v2',manifest:'output/sdss-science-optical-writer-1002-r1/publication/manifest.json',assets:'output/sdss-science-optical-writer-1002-r1/publication',admit:assertSdssScienceOpticalManifest},
 {kind:'prepared-optical-v1',manifest:'output/prepared-optical-publication-1003-r4/publication/manifest.json',assets:'output/prepared-optical-publication-1003-r4/publication',admit:assertPreparedOpticalManifest},
].map(f=>({...f,publication:json(f.manifest)}));
for(const f of families){f.admit(f.publication,'M:51',f.publication.publicationHash);for(const a of Object.values(f.publication.levels) as any[])admit(f.assets+'/'+a.file,{bytes:a.bytes,sha256:a.sha256});}
save('inputs-before.json',[...inputs.values()]);

const cacheReadback:any[]=[];
for(const f of families){const r=author.rows.find((x:any)=>x.kind===f.kind);assert(r);assert.equal(r.publicationHash,f.publication.publicationHash);
 const s=r.snapshots;assert.deepEqual(s.map((x:any)=>x.label),['cold-offscreen','centered','offscreen','returned','offscreen','late-cancelled']);
 const pair=f.publication.levels.DETAIL.bytes+f.publication.levels.MEDIUM.bytes;
 assert.equal(s[0].transferCount,0);assert.equal(s[0].createdDiagnostics,0);assert.equal(s[0].cache.entries,0);
 for(const i of [1,3]){assert.equal(s[i].requested,true);assert.equal(s[i].renderedLevel,'DETAIL');assert.equal(s[i].cache.leased,2);assert.equal(s[i].cache.bytes,pair);assert.equal(s[i].transferCount,2);assert.deepEqual(s[i].ownedReadyIds,[s[i].image,s[i].coarser]);}
 assert.notEqual(s[1].image,s[3].image);assert.notEqual(s[1].coarser,s[3].coarser);
 for(const i of [2,4,5]){assert.equal(s[i].requested,false);assert.equal(s[i].image,null);assert.equal(s[i].coarser,null);assert.equal(s[i].cache.leased,0);assert.equal(s[i].cache.bytes,pair);assert.deepEqual(s[i].ownedReadyIds,[]);}
 assert.equal(r.lateAfter.decodedCallbacks,6);assert.deepEqual(r.lateAfter.ownedReadyIds,[]);assert.equal(r.lateAfter.cache.leased,0);
 const transfers=r.events.filter((x:any)=>x.op==='transfer');assert.equal(transfers.length,2);assert.deepEqual(transfers.map((x:any)=>x.sha256).sort(),[f.publication.levels.MEDIUM.sha256,f.publication.levels.DETAIL.sha256].sort());
 for(const transfer of transfers){const asset=Object.values(f.publication.levels).find((x:any)=>x.sha256===transfer.sha256) as any;assert.equal(transfer.url,asset.downloadUrl);}
 for(const k of ['entries','bytes','leased','pending','reserved','running','retired'])assert.equal(r.cleared[k],0);
 cacheReadback.push({kind:f.kind,hash:r.publicationHash,pairEncodedBytes:pair,coldTransfers:0,centerLeased:2,offscreenLeased:0,returnAdditionalTransfers:0,readyIdsBefore:[s[1].image,s[1].coarser],readyIdsReturned:[s[3].image,s[3].coarser],lateCallbacks:6,lateReady:0,cleared:r.cleared});
}
const withdrawn=json('output/target-optical-offscreen-regression-1003-r1/fixture-correction.json');assert.equal(withdrawn.status,'FAILED_WRONG_ORACLE');
const regression=json('output/target-optical-offscreen-regression-1003-r2/result.json');assert.equal(regression.beforeExitCode,1);assert.equal(regression.afterExitCode,0);
assert.match(read('output/target-optical-offscreen-regression-1003-r2/before.log').toString(),/cold fully-offscreen family.*[\s\S]*sdss:M:51:DETAIL/u);

// Independent concrete geometry controls use the admitted data and original owner registration.
const geometries:any[]=[];
for(const f of families){const pub=f.publication,inside=view(),outside=view(90);assert.equal(skyTargetOpticalIntersectsView(pub,inside as any),true);assert.equal(skyTargetOpticalIntersectsView(pub,outside as any),false);assert.equal(skyTargetOpticalIntersectsView(pub,view(180) as any),false);
 const partial=view(.095),observation=exactSkyObservationFrame(report as any,at);
 const perLevel=Object.fromEntries(['OVERVIEW','MEDIUM','DETAIL'].map(level=>{const a=pub.levels[level],reg=f.kind==='sdss-legacy'?registerSkySurvey(point,a.fieldDegrees,512,256.5):registerSkyTanOpticalField(pub,a,observation);assert(reg);return[level,artworkIntersectsView(reg,partial.view,390,844)];}));
 assert.equal(perLevel.OVERVIEW,true);assert.equal(perLevel.DETAIL,false);assert.equal(skyTargetOpticalIntersectsView(pub,partial as any),true);
 const unknowns=[{...outside,report:undefined},{...outside,at:'2026-09-30T13:50:34.000Z'},{...outside,width:0},{...outside,height:NaN},{...outside,view:{...outside.view,verticalFovDeg:0}},{...outside,view:{...outside.view,basis:{forward:[0,0,0],right:[1,0,0],up:[0,1,0]}}}];
 for(const x of unknowns)assert.equal(skyTargetOpticalIntersectsView(pub,x as any),true);
 const missing=copy(pub);delete missing.levels.OVERVIEW;assert.equal(skyTargetOpticalIntersectsView(missing,outside as any),true);
 const invalid=copy(pub);invalid.levels.MEDIUM.fieldDegrees=NaN;assert.equal(skyTargetOpticalIntersectsView(invalid,outside as any),true);
 geometries.push({kind:f.kind,actualNegativeAltitudeDeg:point[2],centered:true,fullyOffscreen:false,antipodal:false,partialOffsetDeg:.095,partialLevels:perLevel,familyRetained:true,unknownControls:unknowns.length+2});
}
const visibilitySource=read(FEATURE+'sky-target-optical-visibility.ts').toString();
assert.equal(visibilitySource.match(/for \(const level of \["OVERVIEW", "MEDIUM", "DETAIL"\] as const\)/g)?.length,1);
const visibilityMutation=visibilitySource.replace('["OVERVIEW", "MEDIUM", "DETAIL"] as const','["DETAIL"] as const');
// Use the actual view validation export, not a successful stub.
const registration=await import('../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts');
const mutant:any={};vm.runInNewContext(ts.transpileModule(visibilityMutation,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:mutant,require:(name:string)=>{
 if(name==='./sky-artwork-registration')return registration;if(name==='./sky-artwork-visibility')return{artworkIntersectsView};if(name==='./sky-observation-frame')return{exactSkyObservationFrame};if(name==='./sky-survey-registration')return{registerSkySurvey};if(name==='./sky-tan-optical-registration')return{registerSkyTanOpticalField};if(name==='./sky-stellar-scene')return{resolveSkyDeepSkyScene};throw Error(name);}});
assert.equal(mutant.skyTargetOpticalIntersectsView(families[2].publication,view(.095)),false);
controlRows.push({mechanism:'all-original-levels exclusion',normal:true,detailOnlyMutation:false,detected:true});

// Own deterministic React scheduler executes entire current common/native/wrapper modules.
// Lease producer is controlled; request/loader and weak lifetime are actual.
function world(pub:any,kind:string,commonOverride?:string){
 let cursor=0;const slots:any[]=[],effects=new Map<number,any>(),jobs:any[]=[],leases:any[]=[],events:any[]=[],queries:any[]=[];
 let current=true,data:any=kind==='sdss-legacy'?pub:{publication:pub,isCurrent:()=>current};
 const same=(a:any,b:any)=>a&&b&&a.length===b.length&&a.every((v:any,i:number)=>Object.is(v,b[i]));
 const react={useMemo(fn:any,deps:any[]){const i=cursor++,old=slots[i];if(!old||!same(old.deps,deps))slots[i]={deps,value:fn()};return slots[i].value;},useCallback(fn:any,deps:any[]){return react.useMemo(()=>fn,deps);},useRef(value:any){const i=cursor++;return(slots[i]??={current:value});},useState(initial:any){const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return[slots[i].value,(next:any)=>{slots[i].value=typeof next==='function'?next(slots[i].value):next;}];},useEffect(fn:any,deps:any[]){const i=cursor++,old=slots[i];if(!old||!same(old.deps,deps)){effects.set(i,{fn,deps});}}};
 const canvas:any={createImage(){const image:any={width:512,height:512,onload:null,onerror:null,id:jobs.length+1};Object.defineProperty(image,'src',{set(file){const callback=image.onload;image.file=file;jobs.push({image,callback});}});return image;}};
 const acquire=(asset:any)=>{const lease:any={filePath:'/controlled/'+asset.sha256,current:true,released:false,callbacks:new Set(),isCurrent(){return lease.current&&!lease.released;},onRetire(fn:any){lease.callbacks.add(fn);return()=>lease.callbacks.delete(fn);},release(){if(lease.released)return;lease.released=true;events.push({type:'release',sha:asset.sha256});}};leases.push(lease);events.push({type:'acquire',sha:asset.sha256});return{promise:Promise.resolve(lease),cancel(){events.push({type:'cancel',sha:asset.sha256});}};};
 const modules=new Map();
 const load=(name:string):any=>{if(modules.has(name))return modules.get(name);const exports:any={};modules.set(name,exports);const source=name==='use-sky-target-optical.ts'&&commonOverride?commonOverride:read(FEATURE+name).toString();
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(specifier:string)=>{
  if(['./use-sky-target-optical','./use-sky-artwork'].includes(specifier))return load(specifier.slice(2)+'.ts');
  const bound:any={react,'@/hooks/use-resource-query':{useResourceQuery(options:any){queries.push(options);return{data,isError:false,isFetching:!data,refetch:async()=>data};}},'@/services/sdss-optical-client':{getSdssOpticalManifest:async()=>pub,sdssOpticalImageUrl:(x:any)=>x},'@/services/prepared-optical-resource':{getPreparedOpticalResource:async()=>data},'@/services/prepared-optical-client':{preparedOpticalImageUrl:(x:any)=>x},'@/services/sdss-science-optical-resource':{getSdssScienceOpticalResource:async()=>data},'./sky-sdss-optical-selection':{sdssOpticalLevelForFov,skyTargetOpticalLevelForFov},'./sky-fixed-image-status':{skyFixedImageStatus},'./sky-target-optical-visibility':{skyTargetOpticalIntersectsView},'./sky-artwork-loader':{createSkyArtworkLoader},'./sky-artwork-request':{startSkyArtworkRequest},'../../services/sky-public-image-runtime':{acquirePublishedSkyImage:acquire},'../../services/sky-image-file-session':{skyImageFileSession:{nextRequestSuffix(){throw Error('unexpected session lane');}}},'@/services/api-client':{constellationAssetUrl(){throw Error('not a constellation consumer');}},'@tarojs/taro':{default:{getFileSystemManager(){throw Error('unexpected Taro session lane');}}}};
  assert(specifier in bound,specifier);return bound[specifier];}});return exports;};
 const wrapper=load(kind==='prepared-optical-v1'?'use-sky-prepared-optical.ts':'use-sky-sdss-optical.ts');
 const render=(footprint:any=view(),ref='M:51',hash=pub.publicationHash)=>{cursor=0;return kind==='prepared-optical-v1'?wrapper.useSkyPreparedOptical(ref,hash,.05,canvas,1,true,footprint):wrapper.useSkySdssOptical(ref,.05,canvas,1,true,kind==='sdss-legacy'?undefined:hash,footprint);};
 const commit=()=>{const pending=[...effects];effects.clear();for(const [i,e]of pending){slots[i]?.cleanup?.();slots[i]={deps:e.deps,cleanup:e.fn()};}};
 const deliver=(from=0,error=false)=>{for(const j of jobs.slice(from)){if(error)j.image.onerror?.();else j.callback?.();}};
 const dispose=()=>{for(const slot of slots)slot?.cleanup?.();};
 return{render,commit,deliver,dispose,jobs,leases,events,queries,get current(){return current;},set current(x){current=x;},set data(x){data=x;},liveLeases:()=>leases.filter(x=>!x.released).length};
}
const w=world(families[2].publication,'prepared-optical-v1');
assert.equal(w.render(view(90)).requested,false);w.commit();await settle();assert.equal(w.leases.length,0);
w.render(view());w.commit();await settle();assert.equal(w.jobs.length,2);w.deliver();const ready=w.render();assert(ready.image&&ready.coarser);const priorImage=ready.image;assert.equal(w.liveLeases(),2);
const offBeforeEffect=w.render(view(90));assert.equal(offBeforeEffect.image,null);assert.equal(offBeforeEffect.requested,false);assert.equal(w.liveLeases(),2,'render hides, cleanup runs at effect commit');w.commit();assert.equal(w.liveLeases(),0);assert.equal(skyNativeImageIsCurrent(priorImage),false);
w.render(view());w.commit();await settle();assert.equal(w.jobs.length,4);const lateJobs=w.jobs.slice(2);w.render(view(90));w.commit();assert.equal(w.liveLeases(),0);lateJobs.forEach(j=>j.callback?.());assert.equal(w.render(view(90)).image,null);
w.render(view());w.commit();await settle();assert.equal(w.jobs.length,6);w.deliver(4);assert(w.render().image);w.dispose();assert.equal(w.liveLeases(),0);
controlRows.push({mechanism:'actual complete common/native Hooks + actual request/loader',coldOffscreenAcquires:0,renderGapHidden:true,leasesUntilEffect:2,afterEffect:0,readyWeakLifetimeRetired:true,pendingLateCallbacksPublished:false,returnNewDecode:true,finalControlledLeases:0,scope:'Controlled React scheduler/query/acquisition lease and native dimensions/onload; no cache runtime/bitmap pixel decode/native/GPU.'});
const oldCommon=read('output/target-optical-offscreen-regression-1003-r1/use-sky-target-optical.ts.txt').toString();
const before=world(families[2].publication,'prepared-optical-v1',oldCommon);before.render(view(90));before.commit();await settle();assert.equal(before.leases.length,2);before.dispose();
controlRows.push({mechanism:'exact frozen pre-fix common with current actual native Hook',normalColdOffscreenAcquires:0,beforeColdOffscreenAcquires:2,detected:true,scope:'Not an entire historical application replay.'});

const identityWorld=world(families[2].publication,'prepared-optical-v1');identityWorld.render();identityWorld.current=false;identityWorld.commit();await settle();assert.equal(identityWorld.leases.length,0);assert.equal(identityWorld.render().image,null);identityWorld.dispose();
const kinds=world(families[2].publication,'science-optical-v2');kinds.render(view());kinds.commit();await settle();assert.equal(kinds.leases.length,0);assert.equal(kinds.queries.at(-1).queryKey[2],'science-optical-v2');kinds.dispose();
const mismatch=world(families[2].publication,'prepared-optical-v1');mismatch.render(view(),'M:31');mismatch.commit();await settle();assert.equal(mismatch.leases.length,0);mismatch.render(view(),'M:51','a'.repeat(64));mismatch.commit();await settle();assert.equal(mismatch.leases.length,0);mismatch.dispose();
controlRows.push({mechanism:'metadata retirement render/effect acquisition and exact ref/hash/kind',retiredAcquireCount:0,wrongKindAcquireCount:0,foreignRefAcquireCount:0,wrongHashAcquireCount:0});
const memo=world(families[2].publication,'prepared-optical-v1');memo.render(view(90));memo.commit();await settle();assert.equal(memo.leases.length,0);memo.render({...view(90),report:undefined});memo.commit();await settle();assert.equal(memo.leases.length,2,'unknown report changes memo and preserves demand');memo.dispose();
controlRows.push({mechanism:'memo identity refresh from certified outside to unknown report',offscreen:0,unknownReport:2});
const recovery=world(families[2].publication,'prepared-optical-v1');recovery.render();recovery.commit();await settle();assert.equal(recovery.jobs.length,2);
recovery.jobs[1].callback();recovery.jobs[0].image.onerror?.();const fallback=recovery.render();assert.equal(fallback.renderedLevel,'MEDIUM');assert.equal(fallback.image,recovery.jobs[1].image);assert.equal(fallback.failed,false);assert.equal(fallback.updateFailed,true);assert.equal(recovery.liveLeases(),1);
fallback.retry();await settle();assert.equal(recovery.jobs.length,3);recovery.jobs[2].callback();const recovered=recovery.render();assert.equal(recovered.renderedLevel,'DETAIL');assert.equal(recovered.coarser.image,recovery.jobs[1].image);assert.equal(recovered.updateFailed,false);
const partialFamily=recovery.render(view(.095));assert.equal(partialFamily.requested,true,'the family stays eligible where only the wider overview intersects');assert.equal(recovery.liveLeases(),2);recovery.dispose();assert.equal(recovery.liveLeases(),0);
controlRows.push({mechanism:'actual request/native Hook partial failure + explicit retry',fineOnerror:true,nearestMEDIUMPreserved:true,totalFailed:false,updateFailed:true,explicitRetryNewDecode:1,parentPreserved:true,partialFamilyKept:true,finalControlledLeases:0});

// Exact production page declaration execution, with accepted camera different from live intent.
const page=ts.createSourceFile('page.tsx',read(FEATURE+'spot-sky-page.tsx').toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),declarations=new Map<string,any>();
function visit(node:any){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name))declarations.set(node.name.text,node);ts.forEachChild(node,visit);}visit(page);
const names=['currentViewBasis','presentedFov','presentedCenter','targetOpticalView','sdssOptical'];names.forEach(n=>assert(declarations.has(n),n));
const pageCode=names.map(n=>'const '+declarations.get(n).getText(page)+';').join('\n');let captured:any[]=[];
const accepted={basis:view(90).view.basis,fov:.05,center:{x:193,y:421}},environment:any={presentedCamera:accepted,manualBasis:view().view.basis,sensorBasis:view().view.basis,verticalFovDeg:.2,geometryReport:report,row:{at},canvasSize:{width:390,height:844},skyViewportCenter:()=>{throw Error('accepted center should win');},selectedDeepSkyEntry:{objectRef:'M:51'},canvasNodeRef:{current:{}},canvasNodeRevision:3,pageVisible:true,deepSkyRegistrationReady:true,rawReportData:{},mode:'DAY',report:{data:{dataState:'FRESH'},isError:false},useSkySdssOptical:(...args:any[])=>{captured=args;return{};}};
vm.runInNewContext(ts.transpileModule(pageCode,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,environment);
assert.equal(captured[1],.2);assert.equal(captured[5],undefined);assert.equal(captured[6].report,report);assert.equal(captured[6].view.basis,accepted.basis);assert.equal(captured[6].view.center,accepted.center);assert.equal(captured[6].view.verticalFovDeg,.05);assert.equal(captured[6].at,at);assert.equal(skyTargetOpticalIntersectsView(families[0].publication,captured[6]),false);
const normalCall=declarations.get('sdssOptical').initializer;assert(ts.isCallExpression(normalCall));assert.equal(normalCall.arguments.length,7);assert.equal(normalCall.arguments[6].getText(page),'targetOpticalView');
controlRows.push({mechanism:'actual page AST declarations',acceptedBasisPriority:true,acceptedFov:.05,liveRefinementIntent:.2,noOpticalPin:true,normalLegacyOnly:true,offscreenGeometryFromAccepted:true});

const after=[...inputs.values()].map((x:any)=>bind(x.path));assert.deepEqual(after,[...inputs.values()]);save('inputs-after.json',after);
const result={status:'PASSED_BOUNDED_INDEPENDENT_REVIEW',time:new Date().toISOString(),node:process.version,typescript:ts.version,inputCount:inputs.size,beforeAfterExact:true,workspaceResolvedImports:graphSeen.size,externalResolvedEntries:[...external.values()],publications:families.map(f=>({kind:f.kind,path:f.manifest,hash:f.publication.publicationHash})),savedCacheReadback:cacheReadback,actualGeometry:geometries,controls:controlRows,withdrawnRegressionR1:withdrawn,meaningfulRegressionR2:{before:1,after:0},limits:['All family levels must be known outside; missing/invalid geometry remains eligible. No individual LOD/source-alpha pruning.','Saved real cache/request/loader encoded-byte facts are separate from the new controlled complete Hook scheduling checks.','No bitmap pixels, GPU, native memory, actual React/Taro lifecycle, page accepted output, target performance, resource total or quality certification.','No ordinary science/Prepared adoption, registry changes, new observation policy or new GPU savings.','Root concurrently owns Context/PLAN documents; this is scoped source/data identity at the stated review time.']};
save('result.json',result);console.log(JSON.stringify({status:result.status,result:bind(OUT+'/result.json'),inputs:inputs.size,controls:controlRows.length}));
}catch(error:any){save('failure.json',{error:String(error),stack:error.stack,controls:controlRows});console.error(error);process.exitCode=1;}
