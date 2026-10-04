// Task-only real publication bytes/cache/request/loader consumer. React/query,
// MapFS and native onload are controlled; no pixel decode or WEAPP acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {assertSdssOpticalManifest,assertSdssScienceOpticalManifest,assertPreparedOpticalManifest} from '../../../../packages/miniapp-contracts/src/index.ts';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {createSkyPublicImageCache} from '../../../../apps/wechat-miniapp/src/services/sky-public-image-cache.ts';
import {createSkyArtworkLoader} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts';
import {startSkyArtworkRequest} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts';
import {skyTargetOpticalIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-target-optical-visibility.ts';
import {sdssOpticalLevelForFov,skyTargetOpticalLevelForFov} from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection.ts';
import {skyFixedImageStatus} from '../../../../apps/wechat-miniapp/src/features/sky/sky-fixed-image-status.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const out=path.resolve(process.argv[2]);
assert.equal(path.dirname(out),path.join(root,'output'));
assert(path.basename(out).startsWith('target-optical-offscreen-cache-'));
fs.mkdirSync(out);
const sha=b=>createHash('sha256').update(b).digest('hex');
const bind=p=>{const b=fs.readFileSync(path.resolve(root,p));return{path:p,bytes:b.length,sha256:sha(b)};};
const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const ts=createRequire(path.join(root,'apps/wechat-miniapp/package.json'))('typescript');assert.equal(ts.version,'5.9.3');
const inputPaths=[path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/'),
 '.codex/work-items/cloud-sky-native-2026-09-22/tmp/current-native-report-2026-10-01.json',
 'output/playwright/cloud-sky-prepared-catalog-resource-1003-r2/generated-deep-sky-scene.json'];
const original=JSON.parse(fs.readFileSync(path.join(root,inputPaths[1]),'utf8'));
const generated=JSON.parse(fs.readFileSync(path.join(root,inputPaths[2]),'utf8'));
const base=projectAdoptedSkyCatalog(original).data,at=generated.input.at;
assert.equal(new Date(base.context.at).toISOString(),at);
const report={...base,skyScene:{...base.skyScene,deepSky:generated.scene}};
const catalog=report.skyScene.deepSky.catalog,index=catalog.entries.findIndex(x=>x.objectRef==='M:51');
const point=report.skyScene.deepSky.frames.find(x=>x.at===at).points.find(x=>x[0]===index);assert(point);
const view=offset=>({report,at,width:390,height:844,view:{basis:createSkyViewBasis(point[1]+offset,90+point[2],0),verticalFovDeg:.05}});
const commonPath='apps/wechat-miniapp/src/features/sky/use-sky-target-optical.ts';
const common=fs.readFileSync(path.join(root,commonPath),'utf8');inputPaths.push(commonPath);
const ast=ts.createSourceFile(commonPath,common,ts.ScriptTarget.Latest,true);
const declaration=ast.statements.find(x=>ts.isFunctionDeclaration(x)&&x.name?.text==='useSkyTargetOptical');assert(declaration);
const code=ts.transpileModule(declaration.getText(ast).replace(/^export\s+/u,'')+'\nuseSkyTargetOptical;',
 {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
fs.writeFileSync(path.join(out,'executed-common-function.js'),code,{flag:'wx'});
fs.writeFileSync(path.join(out,'executed-driver.mjs'),fs.readFileSync(fileURLToPath(import.meta.url)),{flag:'wx'});
const families=[
 {kind:'sdss-legacy',manifest:'output/playwright/cloud-sky-complete-resource-1003-r2/sdss-M-51-manifest.json',assets:'workers/miniapp-api/assets/deep-sky/sdss-m51',admit:assertSdssOpticalManifest},
 {kind:'science-optical-v2',manifest:'output/sdss-science-optical-writer-1002-r1/publication/manifest.json',assets:'output/sdss-science-optical-writer-1002-r1/publication',admit:assertSdssScienceOpticalManifest},
 {kind:'prepared-optical-v1',manifest:'output/prepared-optical-publication-1003-r4/publication/manifest.json',assets:'output/prepared-optical-publication-1003-r4/publication',admit:assertPreparedOpticalManifest},
];
for(const f of families){f.publication=JSON.parse(fs.readFileSync(path.join(root,f.manifest),'utf8'));f.admit(f.publication,'M:51',f.publication.publicationHash);inputPaths.push(f.manifest);
 f.bytes=new Map();for(const asset of Object.values(f.publication.levels)){const p=f.assets+'/'+asset.file,b=fs.readFileSync(path.join(root,p));assert.equal(b.length,asset.bytes);assert.equal(sha(b),asset.sha256);inputPaths.push(p);f.bytes.set(asset.downloadUrl,Uint8Array.from(b).buffer);}}
for(const p of ['sky-target-optical-visibility.ts','sky-artwork-loader.ts','sky-artwork-request.ts','sky-survey-registration.ts','sky-tan-optical-registration.ts',
 'sky-artwork-registration.ts','sky-artwork-visibility.ts','sky-artwork-raster-bounds.ts','sky-sdss-optical-selection.ts','sky-fixed-image-status.ts','sky-stellar-scene.ts','sky-observation-frame.ts'])inputPaths.push('apps/wechat-miniapp/src/features/sky/'+p);
inputPaths.push('apps/wechat-miniapp/src/services/sky-public-image-cache.ts','apps/wechat-miniapp/src/services/sky-image-bytes.ts',
 'apps/wechat-miniapp/node_modules/typescript/package.json');
const protectedRows=JSON.parse(fs.readFileSync(path.join(root,'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
inputPaths.push(...protectedRows.map(x=>x.path));const before=[...new Set(inputPaths)].map(bind);
for(const p of protectedRows)assert.equal(bind(p.path).sha256,p.sha256);save('inputs-before.json',before);
const rows=[]; let partial=null;
try{for(const f of families){
 const publication=f.publication,events=[],files=new Map(),images=[],pending=[];
 let transferCount=0,decodedCallbacks=0,holdDecode=false,owner,state={images:new Map(),retainedImages:new Map(),loading:false,failed:false};
 const fsOwner={async mkdir(){},async list(dir){return [...files.keys()].filter(p=>p.startsWith(dir+'/')).map(p=>p.slice(dir.length+1));},
  async size(p){assert(files.has(p));return files.get(p).byteLength;},async read(p,n){assert(files.has(p));return files.get(p).slice(0,n);},
  async write(p,b){files.set(p,b.slice(0));events.push({op:'write',path:p,bytes:b.byteLength});},async rename(a,b){assert(files.has(a));files.set(b,files.get(a));files.delete(a);events.push({op:'rename',from:a,to:b});},
  async remove(p){files.delete(p);events.push({op:'remove',path:p});}};
 const cache=createSkyPublicImageCache({fs:fsOwner,root:'/controlled/sky-public-images-v1',byteBudget:32*1024*1024,maxFileBytes:8*1024*1024,session:'offscreen',
  transfer(asset){transferCount++;events.push({op:'transfer',url:asset.url,sha256:asset.sha256});assert(f.bytes.has(asset.url));return{promise:Promise.resolve(f.bytes.get(asset.url).slice(0)),cancel(){events.push({op:'transfer-cancel',url:asset.url});}};}});
 await cache.ready();
 const canvas={createImage(){const image={width:512,height:512,onload:null,onerror:null,id:images.length+1};images.push(image);
  Object.defineProperty(image,'src',{set(value){image.path=value;const callback=image.onload;const deliver=()=>{decodedCallbacks++;callback?.();};if(holdDecode)pending.push(deliver);else queueMicrotask(deliver);}});return image;}};
 const native=(_canvas,_revision,hash,active,wanted,resolve,budget)=>{
  if(!active){owner?.dispose();owner=undefined;state={images:new Map(),retainedImages:new Map(),loading:false,failed:false};}
  if(active&&hash&&!owner)owner=createSkyArtworkLoader({byteBudget:budget,changed(value){state=value;},start(asset,ready,fail){const source=resolve(asset);
   return startSkyArtworkRequest({asset,canvas,url:source.url,acquire:()=>cache.acquire({...asset,format:source.format,url:source.url,environment:'a'.repeat(64)}),ready,fail});}});
  owner?.update(wanted);return{...state,failedImage:image=>owner?.failed(image),retryImages:()=>owner?.retry()??false};
 };
 const resource={publication,isCurrent:()=>true};
 const hook=vm.runInNewContext(code,{useMemo:read=>read(),sdssOpticalLevelForFov,skyTargetOpticalLevelForFov,skyFixedImageStatus,skyTargetOpticalIntersectsView,
  useResourceQuery:()=>({data:f.kind==='sdss-legacy'?publication:resource,isError:false,isFetching:false,refetch:async()=>resource}),
  sdssOpticalImageUrl:x=>x,preparedOpticalImageUrl:x=>x,useSkyNativeImages:native,
  getSdssOpticalManifest:async()=>publication,getSdssScienceOpticalResource:async()=>resource,getPreparedOpticalResource:async()=>resource});
 const read=offset=>hook(f.kind,'M:51',.05,canvas,1,true,f.kind==='sdss-legacy'?undefined:publication.publicationHash,view(offset));
 const snapshots=[]; partial={kind:f.kind,snapshots,events};
 const snap=label=>{const value=read(label==='offscreen'||label==='late-cancelled'?90:0),inspection=cache.inspect();snapshots.push({label,requested:value.requested,renderedLevel:value.renderedLevel,
  image:value.image?.id??null,coarser:value.coarser?.image.id??null,loading:value.loading,failed:value.failed,transferCount,createdDiagnostics:images.length,decodedCallbacks,
  ownedReadyIds:[...state.images.values()].map(x=>x.id),retainedReadyIds:[...state.retainedImages.values()].map(x=>x.id),cache:inspection});return value;};
 const wait=async predicate=>{for(let i=0;i<1000;i++){if(predicate())return;await new Promise(r=>setTimeout(r,1));}throw Error('controlled settlement bound '+f.kind);};
 assert.equal(skyTargetOpticalIntersectsView(publication,view(90)),false);assert.equal(skyTargetOpticalIntersectsView(publication,view(0)),true);
 const cold=read(90);assert.equal(cold.image,null);assert.equal(transferCount,0);assert.equal(images.length,0);
 snapshots.push({label:'cold-offscreen',requested:cold.requested,transferCount,createdDiagnostics:0,cache:cache.inspect()});
 read(0);await wait(()=>!read(0).loading&&Boolean(read(0).image));const first=snap('centered');assert.equal(first.renderedLevel,'DETAIL');assert.equal(transferCount,2);
 const off=snap('offscreen');assert.equal(off.image,null);assert.equal(cache.inspect().leased,0);
 read(0);await wait(()=>!read(0).loading&&Boolean(read(0).image));const returned=snap('returned');assert.notEqual(returned.image.id,first.image.id);assert.equal(transferCount,2,'real encoded files must survive native owner retirement');
 snap('offscreen');holdDecode=true;read(0);await wait(()=>pending.length===2);snap('late-cancelled');
 assert.equal(cache.inspect().leased,0);const publishedBefore=[...state.images.values()];pending.splice(0).forEach(callback=>callback());
 assert.deepEqual([...state.images.values()],publishedBefore);assert.equal(state.images.size,0);assert.equal(transferCount,2);
 rows.push({kind:f.kind,publicationHash:publication.publicationHash,snapshots,lateAfter:{createdDiagnostics:images.length,decodedCallbacks,ownedReadyIds:[...state.images.values()].map(x=>x.id),cache:cache.inspect()},events,
  scope:'Actual cache byte/dimension/hash checks, leases, request and loader ownership; native onload uses controlled dimensions and no bitmap pixels. Created-but-cancelled diagnostics are not asserted registered/retired via the compatibility draw API.'});
 owner?.dispose();await cache.clear();assert.equal(cache.inspect().leased,0);assert.equal(cache.inspect().bytes,0);rows.at(-1).cleared=cache.inspect();
 }
 const after=before.map(row=>bind(row.path));assert.deepEqual(after,before);save('inputs-after.json',after);
 save('result.json',{status:'PASSED_BOUNDED_CACHE_OWNER',node:process.version,typescript:ts.version,before,after,rows,
  sourceReport:{at,observer:generated.input.observer,point,source:'Frozen real report plus separately saved current local producer. Not a new BFF/HTTP/weather capture.'},
  scope:'Actual common Hook function and real compressed public cache/request/loader, three admitted publications and real JPEG/PNG bytes. Controlled useMemo/query, MapFS/transport and native onload; not actual React/useSkyNativeImages, outer same-origin acquisition runtime, HTTP, pixel decode, Canvas/GPU/page/native/whole-resource/quality/200DAU acceptance.'});
 console.log(JSON.stringify({out:path.relative(root,out),rows:rows.map(x=>({kind:x.kind,transfers:x.lateAfter.cache,diagnostics:x.lateAfter.createdDiagnostics})),inputs:before.length,status:'PASSED_BOUNDED_CACHE_OWNER'}));
}catch(error){save('failure.json',{error:String(error),stack:error.stack,rows,partial});throw error;}
