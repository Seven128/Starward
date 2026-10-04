// Task-only current page callbacks/effects, real request/cache/encoded bytes.
// Scheduling, MapFS, metadata delivery and native dimensions/onload are controlled.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {assertDeepSkyImageDiscovery} from '../../../../packages/miniapp-contracts/src/index.ts';
import {projectAdoptedSkyCatalog} from '../../../../apps/wechat-miniapp/src/services/sky-report-catalog.ts';
import {createSkyPublicImageCache} from '../../../../apps/wechat-miniapp/src/services/sky-public-image-cache.ts';
import {startDeepSkyImageRequest} from '../../../../apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts';
import {registerSkyNativeImageLifetime, skyNativeImageIsCurrent} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts';
import {skyDeepSkyImageIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-target-image-visibility.ts';
import {deepSkyImageLevelForFov} from '../../../../apps/wechat-miniapp/src/features/sky/sky-zoom.ts';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const out=path.resolve(process.argv[2]);
assert.equal(path.dirname(out),path.join(root,'output')); assert(path.basename(out).startsWith('selected-w3-offscreen-cache-'));
fs.mkdirSync(out);
const sha=b=>createHash('sha256').update(b).digest('hex');
const bind=p=>{const b=fs.readFileSync(path.resolve(root,p));return{path:p,bytes:b.length,sha256:sha(b)};};
const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const ts=createRequire(path.join(root,'apps/wechat-miniapp/package.json'))('typescript');assert.equal(ts.version,'5.9.3');
const reportPath='.codex/work-items/cloud-sky-native-2026-09-22/tmp/current-native-report-2026-10-01.json';
const generatedPath='output/playwright/cloud-sky-prepared-catalog-resource-1003-r2/generated-deep-sky-scene.json';
const discoveryPath='output/playwright/cloud-sky-complete-resource-1003-r2/discovery-M-51.json';
const pagePath='apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx';
const original=JSON.parse(fs.readFileSync(path.join(root,reportPath),'utf8'));
const generated=JSON.parse(fs.readFileSync(path.join(root,generatedPath),'utf8'));
const base=projectAdoptedSkyCatalog(original).data, at=generated.input.at;
assert.equal(new Date(base.context.at).toISOString(),at);
const report={...base,skyScene:{...base.skyScene,deepSky:generated.scene}};
const publication=JSON.parse(fs.readFileSync(path.join(root,discoveryPath),'utf8'));
assertDeepSkyImageDiscovery(publication,'M:51');
const storedManifestPath='workers/miniapp-api/assets/deep-sky/manifest.json';
const stored=JSON.parse(fs.readFileSync(path.join(root,storedManifestPath),'utf8'));
assert.equal(sha(JSON.stringify(stored)),publication.publicationHash);
const storedEntry=stored.entries.find(x=>x.objectRef===publication.objectRef);assert(storedEntry);
const entry=report.skyScene.deepSky.catalog.entries.find(x=>x.objectRef===publication.objectRef);assert(entry);
const index=report.skyScene.deepSky.catalog.entries.indexOf(entry);
const point=report.skyScene.deepSky.frames.find(x=>x.at===at).points.find(x=>x[0]===index);assert(point);
const imageBytes=new Map(), pixelByHash=new Map();
const inputPaths=[path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/'),reportPath,generatedPath,discoveryPath,storedManifestPath,pagePath];
for(const level of ['OVERVIEW','MEDIUM','DETAIL']){
  const asset=publication.levels[level], p='workers/miniapp-api/assets/deep-sky/'+asset.file, b=fs.readFileSync(path.join(root,p));
  assert.equal(asset.sha256,storedEntry.levels[level].sha256);assert.equal(b.length,asset.bytes);assert.equal(sha(b),asset.sha256);
  imageBytes.set(asset.sha256,Uint8Array.from(b).buffer);pixelByHash.set(asset.sha256,asset.pixels);inputPaths.push(p);
}
for(const file of ['deep-sky-image-request.ts','sky-target-image-visibility.ts','sky-target-optical-visibility.ts','sky-survey-registration.ts',
  'sky-artwork-registration.ts','sky-artwork-visibility.ts','sky-artwork-raster-bounds.ts','sky-stellar-scene.ts','sky-zoom.ts',
  'sky-view-projection.ts','sky-viewport.ts','sky-artwork-loader.ts'])inputPaths.push('apps/wechat-miniapp/src/features/sky/'+file);
inputPaths.push('apps/wechat-miniapp/src/services/sky-report-catalog.ts','apps/wechat-miniapp/src/services/sky-public-image-cache.ts',
  'apps/wechat-miniapp/src/services/sky-image-bytes.ts','packages/miniapp-contracts/src/deep-sky-image-publication.ts',
  'packages/miniapp-contracts/src/sky-image-display-support.ts','apps/wechat-miniapp/node_modules/typescript/package.json',
  'tools/run-node.cjs');
const protectedRows=JSON.parse(fs.readFileSync(path.join(root,'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
inputPaths.push(...protectedRows.map(x=>x.path));const before=[...new Set(inputPaths)].map(bind);
for(const p of protectedRows)assert.equal(bind(p.path).sha256,p.sha256);save('inputs-before.json',before);
fs.writeFileSync(path.join(out,'executed-driver.mjs'),fs.readFileSync(fileURLToPath(import.meta.url)),{flag:'wx'});
const page=ts.createSourceFile(pagePath,fs.readFileSync(path.join(root,pagePath),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const vars=new Map(),callbacks=new Map(),effects=new Map();let intentAssignment,paintedInput;
const variableNames=['targetOpticalView','currentDeepSkyDiscovery','deepSkyImageInView','desiredDeepSkyImageLevel'];
const callbackNames=['setDeepSkyImageAsset','setCanvasDeepSkyImage'];
const effectMarkers=['return startDeepSkyImageRequest','const owned = [deepSkyImageAsset','const image = node.createImage()'];
function visit(node){
  if(ts.isVariableDeclaration(node)){
    const name=node.name.getText(page);if(variableNames.includes(name))vars.set(name,node.getText(page));
    if(callbackNames.includes(name)&&ts.isCallExpression(node.initializer))callbacks.set(name,node.initializer.arguments[0].getText(page));
  }
  if(ts.isExpressionStatement(node)&&node.getText(page).startsWith('deepSkyImageIntentRef.current ='))intentAssignment=node.getText(page);
  if(ts.isPropertyAssignment(node)&&node.name.getText(page)==='deepSkyImage'&&node.initializer.getText(page).includes('canvasDeepSkyImage'))paintedInput=node.initializer.getText(page);
  if(ts.isCallExpression(node)&&node.expression.getText(page)==='useEffect')for(const marker of effectMarkers)
    if(node.arguments[0].getText(page).includes(marker))effects.set(marker,`({run:${node.arguments[0].getText(page)},deps:${node.arguments[1].getText(page)}})`);
  ts.forEachChild(node,visit);
}visit(page);
assert.equal(vars.size,4);assert.equal(callbacks.size,2);assert.equal(effects.size,3);assert(intentAssignment&&paintedInput);
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const renderCode=compile('(()=>{'+variableNames.map(name=>'const '+vars.get(name)+';').join('\n')+intentAssignment+
  `deepSkyImageViewRef.current=targetOpticalView;return {desiredDeepSkyImageLevel,painted:${paintedInput}};})()`);
fs.writeFileSync(path.join(out,'executed-page-render.js'),renderCode,{flag:'wx'});
const files=new Map(),events=[],images=[],pendingNative=[],pendingDiscovery=[],snapshots=[];
let dirty=false,holdNative=false,holdDiscovery=false,metadataRequests=0;
const transfers=[];
const fileSystem={async mkdir(){},async list(p){return [...files.keys()].filter(x=>x.startsWith(p+'/')).map(x=>x.slice(p.length+1));},
  async size(p){const b=files.get(p);if(!b)throw Error('missing');return b.byteLength;},async read(p,n){return files.get(p).slice(0,n);},
  async write(p,b){files.set(p,b.slice(0));},async rename(a,b){files.set(b,files.get(a));files.delete(a);},async remove(p){files.delete(p);}};
const cache=createSkyPublicImageCache({fs:fileSystem,root:'/public',session:'selected_w3_task',byteBudget:32*1024*1024,maxFileBytes:8*1024*1024,
  transfer(asset){transfers.push({sha256:asset.sha256,bytes:asset.bytes,url:asset.url});events.push(['transfer',asset.sha256]);
    return{promise:Promise.resolve(imageBytes.get(asset.sha256).slice(0)),cancel(){events.push(['transport-cancel',asset.sha256]);}};}});
const env={pageVisible:true,selectedDeepSkyEntry:entry,deepSkyRegistrationReady:true,deepSkyImageDiscovery:null,
  geometryReport:report,row:{at},canvasSize:{width:390,height:844},currentViewBasis:createSkyViewBasis(point[1],90+point[2],0),
  presentedFov:.05,presentedCenter:{x:195,y:422},verticalFovDeg:.05,mode:'NIGHT',deepSkyImageRetry:0,deepSkyImageAsset:null,
  canvasDeepSkyImage:null,deepSkyImageState:'IDLE',deepSkyImageFileRef:{current:null},deepSkyRecoveryFileRef:{current:null},
  canvasDeepSkyImageRef:{current:null},deepSkyImageFailureRef:{current:null},deepSkyImageViewRef:{current:undefined},
  deepSkyImageIntentRef:{current:null},canvasNodeRevision:1,canvasGenerationRef:{current:1},
  useMemo:read=>read(),skyDeepSkyImageIntersectsView,deepSkyImageLevelForFov,startDeepSkyImageRequest,registerSkyNativeImageLifetime,
  recordAcceptanceDiagnostic(...args){events.push(['diagnostic',...args]);},
  beginDeepSkyImageDemand(){const epoch=cache.inspect().epoch;let active=true;
    return{isCurrent:()=>active&&epoch===cache.inspect().epoch,onRetire:()=>()=>{},release(){active=false;}};},
  getDeepSkyImageDiscovery(){metadataRequests++;events.push(['metadata',metadataRequests]);
    return holdDiscovery?new Promise(resolve=>pendingDiscovery.push(()=>resolve(structuredClone(publication)))):Promise.resolve(structuredClone(publication));},
  acquireDeepSkyImage(asset){return cache.acquire({...asset,environment:'a'.repeat(64),url:'https://approved.fixture.invalid'+asset.downloadUrl});},
  storeDeepSkyImageAsset(value){if(env.deepSkyImageAsset!==value)dirty=true;env.deepSkyImageAsset=value;},
  storeCanvasDeepSkyImage(value){if(env.canvasDeepSkyImage!==value)dirty=true;env.canvasDeepSkyImage=value;},
  setDeepSkyImageDiscovery(value){env.deepSkyImageDiscovery=value;dirty=true;},
  setDeepSkyImageState(value){if(env.deepSkyImageState!==value)dirty=true;env.deepSkyImageState=value;},
  retireDeepSkyDecode(){env.canvasDeepSkyImageRef.current=null;env.storeCanvasDeepSkyImage(null);},
};
const canvas={createImage(){const image={id:images.length+1,onload:null,onerror:null};images.push(image);
  Object.defineProperty(image,'src',{set(file){image.file=file;const assetHash=[...pixelByHash.keys()].find(hash=>file.includes(hash));assert(assetHash);
    image.width=image.height=pixelByHash.get(assetHash);events.push(['created-image',image.id,image.width]);
    const load=()=>image.onload?.();if(holdNative)pendingNative.push(load);else queueMicrotask(load);}});return image;}};
env.canvasNodeRef={current:canvas};const context=vm.createContext(env);
for(const [name,code]of callbacks){env[name]=vm.runInContext(compile('('+code+')'),context);fs.writeFileSync(path.join(out,name+'.js'),compile('('+code+')'),{flag:'wx'});}
const effectStates=[...effects].map(([marker,code])=>({marker,code:compile(code),deps:undefined,cleanup:undefined}));
for(const [i,state]of effectStates.entries())fs.writeFileSync(path.join(out,'effect-'+i+'.js'),state.code,{flag:'wx'});
function render(){const result=vm.runInContext(renderCode,context);env.desiredDeepSkyImageLevel=result.desiredDeepSkyImageLevel;return result;}
function flush(){for(let pass=0;pass<12;pass++){
  dirty=false;render();for(const state of effectStates){const next=vm.runInContext(state.code,context);
    if(!state.deps||next.deps.some((x,i)=>!Object.is(x,state.deps[i]))){state.cleanup?.();state.deps=[...next.deps];state.cleanup=next.run()||undefined;}}
  if(!dirty)return;
}throw Error('controlled effects did not settle');}
async function turn(){for(let i=0;i<20;i++){await new Promise(resolve=>setImmediate(resolve));flush();}}
function camera(offset,fov=env.verticalFovDeg){env.currentViewBasis=createSkyViewBasis(point[1]+offset,90+point[2],0);env.verticalFovDeg=env.presentedFov=fov;}
function snapshot(name){const rendered=render(), row={name,desired:env.desiredDeepSkyImageLevel,state:env.deepSkyImageState,
  requested:env.deepSkyImageFileRef.current?.level??null,recovery:env.deepSkyRecoveryFileRef.current?.level??null,
  readyImage:env.canvasDeepSkyImage?.image.id??null,paintInput:rendered.painted?.image.id??null,transfers:transfers.length,
  metadataRequests,createdImages:images.length,cache:cache.inspect()};snapshots.push(row);return row;}
try{
  holdDiscovery=true;flush();assert.equal(pendingDiscovery.length,1);
  camera(90);render();pendingDiscovery.shift()();await turn();
  const cold=snapshot('metadata-completed-after-view-moved-out');assert.equal(cold.transfers,0);assert.equal(cold.readyImage,null);assert.equal(cold.cache.leased,0);
  holdDiscovery=false;camera(0,8);flush();await turn();
  const coarse=snapshot('center-overview-ready');assert.equal(coarse.recovery,'OVERVIEW');assert.equal(coarse.cache.leased,1);assert.equal(coarse.transfers,1);
  const firstReady=env.canvasDeepSkyImage.image;assert.equal(skyNativeImageIsCurrent(firstReady),true);
  holdNative=true;camera(0,.05);flush();await turn();
  const refining=snapshot('detail-pending-with-original-coarse');assert.equal(refining.requested,'DETAIL');assert.equal(refining.recovery,'OVERVIEW');assert.equal(refining.cache.leased,2);
  const pendingFine=images.at(-1), savedLate=pendingFine.onload;pendingFine.onerror();flush();
  const failed=snapshot('detail-error-keeps-original-coarse');assert.equal(failed.state,'ERROR');assert.equal(failed.readyImage,coarse.readyImage);
  camera(90);const gap=render();assert.equal(gap.painted,null);savedLate();assert.equal(env.canvasDeepSkyImage.image,firstReady);
  flush();await turn();const excluded=snapshot('whole-family-offscreen-after-effect');
  assert.equal(excluded.cache.leased,0);assert.equal(excluded.requested,null);assert.equal(excluded.recovery,null);assert.equal(excluded.readyImage,null);
  assert.equal(skyNativeImageIsCurrent(firstReady),false);assert.equal(excluded.cache.bytes,publication.levels.OVERVIEW.bytes+publication.levels.DETAIL.bytes);
  const bytesAtReturn=excluded.cache.bytes;
  holdNative=false;camera(0,.05);flush();await turn();const returned=snapshot('center-return-reuses-detail-file');
  assert.equal(returned.state,'READY');assert.notEqual(returned.readyImage,coarse.readyImage);assert.equal(returned.cache.leased,1);
  assert.equal(returned.transfers,2);assert.equal(returned.cache.bytes,bytesAtReturn);
  const returnReady=env.canvasDeepSkyImage.image;
  camera(90);flush();await turn();assert.equal(skyNativeImageIsCurrent(returnReady),false);
  holdNative=true;camera(0,.05);flush();await turn();const cancelled=images.at(-1).onload;
  assert.equal(cache.inspect().leased,1);camera(90);render();cancelled();assert.equal(env.canvasDeepSkyImage,null);
  flush();await turn();for(const late of pendingNative)late();flush();
  const late=snapshot('cancelled-decode-late-callbacks-cannot-republish');assert.equal(late.readyImage,null);assert.equal(late.cache.leased,0);assert.equal(late.transfers,2);
  for(const effect of effectStates)effect.cleanup?.();env.setDeepSkyImageAsset(null);env.setCanvasDeepSkyImage(null);
  await cache.clear();const cleared=cache.inspect();assert.equal(cleared.entries,0);assert.equal(cleared.bytes,0);assert.equal(cleared.leased,0);
  const after=before.map(x=>bind(x.path));assert.deepEqual(after,before);save('inputs-after.json',after);
  const result={status:'PASSED_CONTROLLED_CURRENT_PAGE_CACHE_CONSUMER',time:new Date().toISOString(),node:process.version,typescript:ts.version,
    inputCount:before.length,beforeAfterExact:true,protected:protectedRows,publication:{path:discoveryPath,publicationHash:publication.publicationHash,
      levels:Object.fromEntries(Object.entries(publication.levels).map(([level,a])=>[level,{bytes:a.bytes,sha256:a.sha256,pixels:a.pixels,fieldDegrees:a.fieldDegrees}]))},
    geometry:{at,observer:generated.input.observer,point,negativeAltitudeDeg:point[2]},snapshots,transfers,events,
    controls:{coldAfterMetadataTransfers:0,coarseAndFineLeases:2,offscreenLeases:0,returnAdditionalTransfers:0,readyLifetimeRetired:true,
      renderGapHidden:true,queuedOnloadRejectedBeforeCleanup:true,lateCancelledReady:0,finalCleared:cleared},
    limits:['Actual extracted current page render declarations, file owner callbacks and request/retirement/decode effects; controlled scheduling, not entire React/Taro/page/route execution.',
      'Actual existing M51 admitted discovery and whole encoded bytes plus actual request/cache core. MapFS, metadata/transport delivery, demand epoch callback and native dimensions/onload controlled; no HTTP/outer runtime or bitmap pixels.',
      'Reuses frozen report/current-producer deep layer, not a new BFF/observation. Scope is selected W3 demand/file/native references; renderer already culls offscreen, no new GPU/native GC/whole-client resource/quality/capacity claim.',
      'Existing W3 fine-only initial/return selection, failed fine preserving existing coarse and hidden-node recovery semantics retained; no new sibling preload, ordinary source/aux budget policy or image processing.']};
  save('result.json',result);console.log(JSON.stringify({status:result.status,inputCount:result.inputCount,controls:result.controls,snapshots:result.snapshots.map(x=>({name:x.name,leases:x.cache.leased,bytes:x.cache.bytes,transfers:x.transfers,ready:x.readyImage}))}));
}catch(error){save('failure.json',{status:'FAILED',error:String(error.stack??error),snapshots,events,cache:cache.inspect(),before});throw error;}
