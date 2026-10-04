import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';import ts from 'typescript';import {build} from 'esbuild';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),task='.codex/work-items/cloud-sky-native-2026-09-22',sky='apps/wechat-miniapp/src/features/sky/';
const relative=process.argv[2];assert.match(relative,/^output\/playwright\/cloud-sky-live-mixed-1003-r[1-9][0-9]*$/);
const out=path.join(ROOT,relative);await fs.mkdir(out);
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const bind=async(p:string)=>{const b=await fs.readFile(path.join(ROOT,p));return {path:p,bytes:b.length,sha256:hash(b)};};
const checkpoint=JSON.parse(await fs.readFile(path.join(ROOT,task+'/evidence/current-execution-state-2026-10-03-r46.json'),'utf8'));
for(const row of [...checkpoint.protected,...checkpoint.currentSources])assert.deepEqual(await bind(row.path),row);
const inputs=[await bind(task+'/scripts/build-shared-page-bundles-2026-10-03.mjs'),await bind(task+'/scripts/shared-page-bundle-generated-2026-10-03.mts')],metadata={},assets=[];
const preserved=checkpoint.protected.map(({path,sha256}:any)=>({path,sha256})),nodePreparationBindings=[],nodeVirtualInputs=[];
await fs.copyFile(fileURLToPath(import.meta.url),path.join(out,'executed-build.mts'));
const pagePath=sky+'spot-sky-page.tsx',pageSource=await fs.readFile(path.join(ROOT,pagePath),'utf8');
const pageBinding=await bind(pagePath);inputs.push(pageBinding); // Pin this run, not a historical source hash.
const ast=ts.createSourceFile(pagePath,pageSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=['starSunAltitudeDeg','stellarSupplement','optical','sdssOptical','wideField','moonTexture','marsTexture','mercuryTexture','jupiterBands','saturnBands',
 'uranusBands','neptuneBands','galacticImage','hipsTiles','constellationFrame','coordinateGridFrame','visibleFigures','artwork','landscapeImage'];
const declarations=new Map<string,ts.VariableStatement>();
const visit=(n:ts.Node)=>{if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)
 if(ts.isIdentifier(d.name)&&names.includes(d.name.text)){assert(!declarations.has(d.name.text));declarations.set(d.name.text,n);}ts.forEachChild(n,visit);};visit(ast);
assert.equal(declarations.size,names.length);
const pageStatements=names.map(name=>{
 const n=declarations.get(name)!,d=n.declarationList.declarations[0]!;
 const init=d.initializer!.getText(ast);
 return ['starSunAltitudeDeg','hipsTiles','constellationFrame','coordinateGridFrame','visibleFigures'].includes(name)?n.getText(ast):
  `const ${name}=globalThis.__controlled.tag(${JSON.stringify(name)},()=>(${init}));`;
}).join('\n');
const importHooks=names.filter(n=>!['starSunAltitudeDeg','hipsTiles','constellationFrame','coordinateGridFrame','visibleFigures','artwork'].includes(n)).map(n=>{
 const words:Record<string,string>={stellarSupplement:'stellar-supplement',optical:'optical-hips',sdssOptical:'sdss-optical',wideField:'wide-field-w3',moonTexture:'moon-texture',
 marsTexture:'mars-texture',mercuryTexture:'mercury-texture',jupiterBands:'jupiter-bands',saturnBands:'saturn-bands',
 uranusBands:'uranus-bands',neptuneBands:'neptune-bands',galacticImage:'galactic-image',landscapeImage:'landscape'};
 const f=words[n];const fn=n==='optical'?'useSkyOpticalHips':n==='wideField'?'useSkyWideFieldW3':n==='landscapeImage'?'useSkyLandscape':
  'useSky'+n[0]!.toUpperCase()+n.slice(1);
 return `import {${fn}} from './${sky}use-sky-${f}';`;
}).join('\n');
const getVariable=(name:string)=>{let found:ts.VariableStatement[]=[];const walk=(n:ts.Node)=>{if(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)===name))found.push(n);ts.forEachChild(n,walk);};walk(ast);assert.equal(found.length,1,name);return found[0]!.getText(ast);};
const effectWith=(needle:string)=>{let found:ts.CallExpression[]=[];const walk=(n:ts.Node)=>{if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes(needle))found.push(n);ts.forEachChild(n,walk);};walk(ast);assert.equal(found.length,1,needle);return found[0]!.getText(ast)+';';};
const selectedStatements=[
 '[deepSkyImageAsset, storeDeepSkyImageAsset]','[deepSkyImageDiscovery, setDeepSkyImageDiscovery]','deepSkyImageViewRef','deepSkyImageIntentRef','[canvasDeepSkyImage, storeCanvasDeepSkyImage]',
 'deepSkyImageFileRef','canvasDeepSkyImageRef','deepSkyRecoveryFileRef',
 'setDeepSkyImageAsset','setCanvasDeepSkyImage','retireDeepSkyDecode',
 '[deepSkyImageState, setDeepSkyImageState]','deepSkyImageFailureRef','[deepSkyImageRetry, setDeepSkyImageRetry]',
 'selectedDeepSkyEntry','deepSkyRegistrationReady','targetOpticalView','currentDeepSkyDiscovery','deepSkyImageInView','desiredDeepSkyImageLevel',
].map(getVariable).join('\n')+'\n'+pageSource.slice(pageSource.indexOf('  deepSkyImageViewRef.current = targetOpticalView;'),pageSource.indexOf('  deepSkyImageViewRef.current = targetOpticalView;')+'  deepSkyImageViewRef.current = targetOpticalView;'.length)+'\n'+pageSource.slice(pageSource.indexOf('  deepSkyImageIntentRef.current ='),pageSource.indexOf('  // Catalog refreshes preserve image ownership'))+'\n'+[
 effectWith('deepSkyImageFileRef.current?.release();'),effectWith('return startDeepSkyImageRequest({'),
 effectWith('const subscriptions = owned.map'),effectWith('const image = node.createImage()'),
].join('\n');
const creditStatements=['deepSkyImagePresented','presentedSdssOptical','sdssOpticalImagePresented','opticalImageCredit','sdssOpticalStatus','sdssOpticalCurrentImagePresented'].map(getVariable).join('\n');
let releaseCallbacks:ts.PropertyAssignment[]=[];const walkRelease=(n:ts.Node)=>{if(ts.isPropertyAssignment(n)&&n.name.getText(ast)==='releaseContext'&&n.initializer.getText(ast).includes('canvasGenerationRef.current++'))releaseCallbacks.push(n);ts.forEachChild(n,walkRelease);};walkRelease(ast);assert.equal(releaseCallbacks.length,1);
const releasePageCallback=releaseCallbacks[0]!.initializer.getText(ast);
await fs.writeFile(path.join(out,'actual-page-release-context.ts.txt'),releasePageCallback,{flag:'wx'});
let frameSdss:ts.PropertyAssignment[]=[];const walkSdss=(n:ts.Node)=>{if(ts.isPropertyAssignment(n)&&n.name.getText(ast)==='sdssOpticalImage'&&n.initializer.getText(ast).startsWith('canvasData &&'))frameSdss.push(n);ts.forEachChild(n,walkSdss);};walkSdss(ast);assert.equal(frameSdss.length,1);
const frameSdssExpression=frameSdss[0]!.initializer.getText(ast);
const creditText=(prefix:string)=>{let found:ts.JsxText[]=[];const walk=(n:ts.Node)=>{if(ts.isJsxText(n)&&n.getText(ast).trim().startsWith(prefix))found.push(n);ts.forEachChild(n,walk);};walk(ast);assert.equal(found.length,1);return found[0]!.getText(ast).trim();};
const sourceCreditLabels={selected:creditText('NASA/IPAC IRSA · AllWISE'),sdss:'ACTUAL skyOpticalSourceCredit / SkyOpticalImageCredit consumer'};
await fs.writeFile(path.join(out,'actual-selected-page-statements.ts.txt'),selectedStatements,{flag:'wx'});
await fs.writeFile(path.join(out,'actual-credit-and-frame-statements.ts.txt'),creditStatements+'\n'+frameSdssExpression,{flag:'wx'});
const property=(name:string)=>{let found:ts.PropertyAssignment[]=[];const walk=(n:ts.Node)=>{if(ts.isPropertyAssignment(n)&&n.name.getText(ast)===name&&n.parent.getText(ast).includes('pendingSkyPaintRef'))found.push(n);ts.forEachChild(n,walk);};walk(ast);assert.equal(found.length,1,name);return found[0]!.initializer.getText(ast);};
const actualPaint=property('paint'),actualPresented=property('presented'),actualSame=property('sameScene'),actualInvalidated=property('invalidated'),actualFailed=property('failed');
const actualDrawRequest=getVariable('draw'),actualRetry=getVariable('retryNativeImage')+'\n'+getVariable('retrySdssOptical');
const lifecycleEntry=`
import {createSkyCanvasLifecycle} from './${sky}sky-canvas-lifecycle';
import {drawSkyScene as actualDrawSkyScene} from './${sky}sky-scene-render';
import {skySdssOpticalFrame} from './${sky}sky-sdss-optical-frame';
import {liveSkyOpticalCompletion,sameSkyOpticalCompletion,sameSkyOpticalInput} from './${sky}sky-sdss-optical-completion';
import {copySkyDeepAuxiliaryDecisions,sameSkyDeepAuxiliaryDecisions} from './${sky}sky-deep-auxiliary-visibility';
import {resolvedSkyBodyReferences} from './${sky}sky-body-label-presentation';
import {resolveSkyCanvasView} from './${sky}sky-canvas-view';
import {NO_SKY_INSETS} from './${sky}sky-viewport';
import {dispatchSkyHipsImageFailure} from './${sky}sky-scene-render';
import {skySceneHasContent} from './${sky}sky-stellar-scene';
export function initializeActualPageLifecycle(){
 const w=globalThis.__controlled,canvasNodeRef=w.canvasNodeRef,canvasGenerationRef=w.canvasGenerationRef;
 const retireDeepSkyDecodeRef={current:()=>w.retireDeepSkyDecodeRef?.current()};
 const pendingSkyPaintRef={current:null},paintedSkyObjectsRef={current:null},canvasDrawRevisionRef={current:0};
 w.pendingSkyPaintRef=pendingSkyPaintRef;w.paintedSkyObjectsRef=paintedSkyObjectsRef;w.acceptedCount=0;w.publishCount=0;w.acceptanceTrace=[];
 const orientation={latestPresentation:{get current(){return w.orientationLive;}},presented:{current:null}},orientationController={snapshot:()=>w.orientationLive};
 const manualBasisRef=w.manualBasisRef,objectTracking=w.objectTracking,zoomRef={get current(){return w.paintInput.requestedFov;}},viewportInsetsRef={current:NO_SKY_INSETS},reducedMotionRef={current:false};
 const browsingCamera=w.browsingCamera,browsingTimerRef={current:null},browsingDrawRef={current:()=>w.actualCurrentDraw()};
 const Date={now:()=>w.cameraClock},EMPTY_SKY_IMAGES=new Map();
 const setPresentedSkyFrame=(update:any)=>{w.presentedSkyFrame=typeof update==='function'?update(w.presentedSkyFrame??null):update;if(typeof update==='function'){w.publishCount++;w.acceptanceTrace.push({kind:'actual-page-publish',publishCount:w.publishCount,stagedSnapshotId:w.identity(w.lastStageSnapshot),publishedSnapshotId:w.identity(w.paintedSkyObjectsRef.current),nativeGeneration:w.canvasGenerationRef.current});}};
 const setPresentedCamera=(update:any)=>{w.presentedCamera=typeof update==='function'?update(w.presentedCamera??null):update;};
 const setCanvasSize=(update:any)=>{w.acceptedSize=typeof update==='function'?update(w.acceptedSize??{width:390,height:844}):update;};
 const setCanvasError=(value:any)=>{w.canvasError=value;};
 const publishAcceptanceSkySceneInspection=(owner:any,facts:any)=>w.acceptanceTrace.push({kind:'inspection',owner,facts});
 const mark=(name:string,value:any)=>w.acceptanceTrace.push({kind:'availability',name,value});
 const setSolarLightUnavailable=(v:any)=>mark('solar',v),setMoonDiscUnavailable=(v:any)=>mark('moon',v),setPlanetDiscUnavailable=(v:any)=>mark('planet',v),setSunDiscUnavailable=(v:any)=>mark('sun',v),setLandscapeUnavailable=(v:any)=>mark('landscape',v),setGalacticBandUnavailable=(v:any)=>mark('galactic',v);
 const deepSkyImageFailureRef={current:null},setDeepSkyImageState=(value:any)=>mark('selected-state',value);
 const failure=(name:string)=>({get current(){return (image:any)=>w.lastPageResult[name].failedImage(image);}});
 const artworkFailureRef=failure('artwork'),wideFieldFailureRef=failure('wideField'),opticalFailureRef=failure('optical'),sdssOpticalFailureRef=failure('sdssOptical');
 const drawSkyScene=(...args:any[])=>{const staged=args[8],done=args[9];args[8]=(snapshot:any,sources:any)=>{w.lastStageSnapshot=snapshot;w.acceptanceTrace.push({kind:'staged',beforeAccepted:w.acceptedCount,frameAt:snapshot?.frameAt,previousFrameAt:w.presentedSkyFrame?.frameAt??null,preaid:snapshot?.deepSkyAuxiliaryDecisions??[]});return staged(snapshot,sources);};args[9]=()=>{w.acceptanceTrace.push({kind:'done',beforeAccepted:w.acceptedCount});return done();};return actualDrawSkyScene(...args);};
 const paint=${actualPaint},presented=${actualPresented},sameScene=${actualSame},invalidated=${actualInvalidated},failed=${actualFailed};
 const clockTasks=new Map(),clock={schedule(fn:any,delay:number){const id={};clockTasks.set(id,{fn,delay,due:w.cameraClock+delay});return id;},cancel(id:any){clockTasks.delete(id);}};
 const setTimeout=(fn:any,delay:number)=>clock.schedule(fn,delay),clearTimeout=(id:any)=>clock.cancel(id);
 w.hasBrowsingTimer=()=>browsingTimerRef.current!==null;
 w.runNextBrowsingTimer=()=>{const id=browsingTimerRef.current,task=clockTasks.get(id);if(!task||task.delay!==16)return false;clockTasks.delete(id);w.cameraClock=Math.max(w.cameraClock,task.due);task.fn();return true;};
 w.drainPaintClock=()=>{for(let n=0;n<20;n++){const entry=[...clockTasks].find(([id,t]:any)=>t.delay===0);if(!entry)return;clockTasks.delete(entry[0]);entry[1].fn();}throw Error('paint schedule bound');};
 w.lifecycle=createSkyCanvasLifecycle({measure(done:any){done({width:390,height:844});},createContext(){if(!w.canvasNodeRef.current)w.canvasNodeRef.current=w.makeCanvasNode();w.canvasRevision=w.canvasGenerationRef.current;if(w.rendererWasReleased)w.replaceRenderer();return w.renderer;},
  releaseContext:${releasePageCallback},paint,sameScene,presented(frame:any,size:any){w.acceptanceTrace.push({kind:'lifecycle-presented-notification',beforeAccepted:w.acceptedCount,frameAt:frame.frameAt});presented(frame,size);w.acceptedCount++;},invalidated,failed},clock);
 w.lifecycle.ready();
}
export function requestActualPageFrame(result:any,input:any,condition:any,request=true){
 const w=globalThis.__controlled;w.lastPageResult=result;w.paintInput=input;w.orientationLive={presentationRevision:1,alignment:{mode:'auto',view:condition.basis}};
 const useCallback=(fn:any)=>fn,canvasLifecycle=w.lifecycle,canvasNodeRevision=w.canvasRevision,canvasDrawRevisionRef={current:w.acceptedCount},skySceneInspectionOwnerRef={current:'controlled-resource-owner'},previousCanvasModeRef={current:'DAY'};
 const orientation={snapshot:{presentationRevision:1}},reportData=input.report,report={data:{dataState:'FRESH'},isError:false},row={at:input.at},devicePose={basis:condition.basis},sensorHeadingForScene=null,manualBasis=w.manualBasisRef.current,manualBasisRef=w.manualBasisRef,mode=input.mode??'DAY',verticalFovDeg=input.requestedFov;
 const sensorBasis=input.liveBasis,viewportInsets=NO_SKY_INSETS;
 const {canvasDeepSkyImage,sdssOptical,constellationFrame,artwork,hipsTiles,moonTexture,marsTexture,mercuryTexture,jupiterBands,saturnBands,neptuneBands,uranusBands,galacticImage,landscapeImage,stellarSupplement}=result;
 const constellationsEnabled=input.constellationsEnabled??true,landscapeEnabled=input.landscapeEnabled??true,coordinateGrids=input.coordinateGrids??{horizontal:false,equatorial:false},desiredDeepSkyImageLevel=result.desiredDeepSkyImageLevel,canvasFrameInfo={inspection:{spotId:input.report.context.spotId,frameAt:input.at,starCount:input.report.skyScene.catalog.entries.length}},publishAcceptanceSkySceneInspection=(owner:any,facts:any)=>w.acceptanceTrace.push({kind:'queued',owner,facts});
 ${actualDrawRequest}
 w.actualCurrentDraw=draw;if(request)draw();
}
export function retryActualPageSdss(result:any){const sdssOptical=result.sdssOptical,canvasLifecycle=globalThis.__controlled.lifecycle;${actualRetry} retrySdssOptical();}
`;
const entry=`import {useMemo,useState,useRef,useCallback,useEffect} from 'react';
import {deepSkyImageLevelForFov} from './${sky}sky-zoom';
import {startDeepSkyImageRequest} from './${sky}deep-sky-image-request';
import {registerSkyNativeImageLifetime} from './${sky}sky-artwork-loader';
import {beginDeepSkyImageDemand,getDeepSkyImageDiscovery,acquireDeepSkyImage} from './apps/wechat-miniapp/src/services/deep-sky-image-client';
import {skySolarLightAt} from './${sky}sky-solar-light';
import {skyViewportCenter} from './${sky}sky-viewport';
import {sdssOpticalPresentation} from './${sky}sky-sdss-optical-selection';
import {skyDeepSkyImageIntersectsView} from './${sky}sky-target-image-visibility';
import {skyOpticalSourceCredit} from './${sky}sky-optical-source-credit';
import {skyObjectPositionIsCurrent} from './${sky}sky-object-location';
import {createSkyViewBasis} from './${sky}sky-view-projection';
import {skyPresentedTimeCurrent} from './${sky}sky-observation-time';
${importHooks}
import {useSkyArtwork} from './${sky}use-sky-artwork';
import {resolveConstellationFrame} from './${sky}sky-constellation-scene';
import {constellationVisibility} from './${sky}sky-constellation-visibility';
import {artworkIntersectsView} from './${sky}sky-artwork-visibility';
import {exactSkyObservationFrame} from './${sky}sky-observation-frame';
export {createSkyGpuRenderer} from './${sky}sky-gpu-renderer';
export {drawSkyScene} from './${sky}sky-scene-render';
export {skyNativeImageIsCurrent,taskNativeImageMembership} from './${sky}sky-artwork-loader';
export {createSkyBrowsingCamera} from './${sky}sky-browsing-camera';
export {resolveSkyCanvasView} from './${sky}sky-canvas-view';
export {createSkyViewBasis,unprojectSkyPoint} from './${sky}sky-view-projection';
export {clampSkyFieldOfView,skyDomeFieldOfView} from './${sky}sky-zoom';
export {NO_SKY_INSETS} from './${sky}sky-viewport';
export {presentSkyTime} from './${sky}sky-time-presentation';
export {createSkyObjectTracking} from './${sky}sky-object-tracking';
export {skyLandscapeViewOpacity} from './${sky}sky-landscape-visibility';
export {initializeSkyPublicImageCache,clearSkyPublicImageCache} from './apps/wechat-miniapp/src/services/sky-public-image-runtime';
export function pageImages(input:any){
 const {wideFieldEnabled,canvasNodeRef,canvasSize,reducedMotion}=input;
 const presentedCamera=globalThis.__controlled.presentedCamera,manualBasis=globalThis.__controlled.manualBasisRef.current,sensorBasis=input.liveBasis,verticalFovDeg=input.requestedFov;
 ${getVariable('currentViewBasis')}
 ${getVariable('presentedFov')}
 ${getVariable('presentedCenter')}
 const pageVisible=input.pageVisible,rawReportData=input.report,reportData=input.report,geometryReport=input.report,
 report={data:{dataState:'FRESH'},isError:false},mode=input.mode??'DAY',canvasNodeRevision=input.canvasRevision,
 focusedDeepSkyReference=input.reference,canvasGenerationRef=input.canvasGenerationRef,
 constellationCatalog={data:{data:input.figures},isFetching:false},constellationsEnabled=input.constellationsEnabled??true,landscapeEnabled=input.landscapeEnabled??true,row={at:input.at};
 const recordAcceptanceDiagnostic=(...values:any[])=>globalThis.__controlled.diagnostics.push(values);
 ${getVariable('retireDeepSkyDecodeRef')}
 ${selectedStatements}
 retireDeepSkyDecodeRef.current=retireDeepSkyDecode;
 globalThis.__controlled.retireDeepSkyDecodeRef=retireDeepSkyDecodeRef;
 ${pageStatements}
 const canvasData=input.report;
 const frameSdssImage=${frameSdssExpression};
 return {qualification:{basis:currentViewBasis,fov:presentedFov,center:presentedCenter,usedAcceptedCamera:!!presentedCamera},stellarSupplement,optical,sdssOptical,wideField,moonTexture,marsTexture,mercuryTexture,jupiterBands,saturnBands,uranusBands,neptuneBands,
 galacticImage,hipsTiles,constellationFrame,coordinateGridFrame,visibleFigures,artwork,landscapeImage,
 deepSkyImageAsset,canvasDeepSkyImage,deepSkyImageState,desiredDeepSkyImageLevel,frameSdssImage,extractedSelectedEntry:selectedDeepSkyEntry,
 gates:{selectedReference:selectedDeepSkyEntry?.objectRef??null,deepSkyRegistrationReady,desiredDeepSkyImageLevel,selectedW3Active:Boolean(desiredDeepSkyImageLevel),sdssRequested:sdssOptical.requested,localOpticalFixtureEnabled:__MINIAPP_DEVELOPMENT_FIXTURE_MODE__,
 galaxyPageEnabled:!(wideFieldEnabled&&presentedFov>=60),wideFieldEnabled,pageVisible,mode}};
}
export function presentedImageFacts(result:any,presentedSkyFrame:any,input:any){
 const w=globalThis.__controlled,reportData=input.report,rawReportData=input.report,pageVisible=input.pageVisible,row={at:input.at},mode=input.mode??'DAY',timePlaying=false,timeIntent={runStartAt:null};
 const report={data:{dataState:'FRESH'},isError:false},manualBasis=w.manualBasisRef.current,devicePose={basis:input.liveBasis},orientation={presented:{current:input.liveBasis}};
 const canvasSize=input.canvasSize,canvasError=w.canvasError??null,sdssOptical=result.sdssOptical,canvasGenerationRef=w.canvasGenerationRef;
 ${getVariable('orientationData')}
 ${getVariable('presentedSceneCurrent')}
 ${getVariable('nativeCanvasMounted')}
 ${creditStatements}
 return {deepSkyImagePresented,sdssOpticalStatus,sdssOpticalCurrentImagePresented,
 labels:{selected:deepSkyImagePresented?${JSON.stringify(sourceCreditLabels.selected)}:null,
 sdss:opticalImageCredit},opticalImageCredit};
}
export function releasePageContext(context:any,refs:any){
 const {canvasNodeRef,canvasGenerationRef,retireDeepSkyDecodeRef}=refs;
 const releaseContext=${releasePageCallback};
 releaseContext(context);
}
export async function openActualOpticalSources(credit:any){
 const Taro=globalThis.__controlled.Taro,opticalSourcesOpeningRef=globalThis.__controlled.opticalSourcesOpeningRef;
 const notify=(message:any)=>globalThis.__controlled.notifications.push(message);
 ${getVariable('openOpticalSources')}
 return openOpticalSources(credit);
}
export function applyActualTrackedPosition(data:any,input:any){
 const w=globalThis.__controlled,objectTracking=w.objectTracking,pageVisible=input.pageVisible,contextSession={busy:false},timeSaving=false;
 const orientationController={snapshot:()=>w.orientationLive},reportData=input.report,row={at:input.at},skyTapRef={current:null},manualBasisRef=w.manualBasisRef;
 const positionCatalog=()=>input.report.skyScene.deepSky.catalog,setManualBasis=(basis:any)=>{w.manualBasisRef.current=basis;};
 ${getVariable('applyTrackedPosition')}
 applyTrackedPosition(data);return {tracking:objectTracking.snapshot(),basis:manualBasisRef.current};
}
${lifecycleEntry}`;
await fs.writeFile(path.join(out,'extracted-page-entry.ts.txt'),entry,{flag:'wx'});
const clientPath='apps/wechat-miniapp/src/services/api-client.ts',clientSource=await fs.readFile(path.join(ROOT,clientPath),'utf8');
const clientAst=ts.createSourceFile(clientPath,clientSource,ts.ScriptTarget.Latest,true);
const urlFunction=clientAst.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='constellationAssetUrl')!.getText(clientAst);
const saoAdapter=`import {createSaoCatalogClient} from './apps/wechat-miniapp/src/services/sao-catalog-client';
const bridge=(route:string,signal?:AbortSignal)=>new Promise((resolve,reject)=>{signal?.throwIfAborted();const w=globalThis.__controlled;const task=w.Taro.request({url:'https://approved.fixture.invalid'+route,success:(r:any)=>resolve(r.data),fail:reject});signal?.addEventListener('abort',()=>task.abort(),{once:true});});
const actualSaoClient=createSaoCatalogClient({index:signal=>bridge('/v2/sky/supplements/sao/v2',signal),tile:(hash,id,signal)=>bridge('/v2/sky/supplements/sao/v2/'+hash+'/tiles/'+id,signal),invalidateIndex(){globalThis.__controlled.saoClientEvents.push({invalid:'index'});},invalidateTile(hash,id){globalThis.__controlled.saoClientEvents.push({invalid:'tile',hash,id});}});
export const saoCatalogClient={async getIndex(...args:any[]){const r=await actualSaoClient.getIndex(...args);globalThis.__controlled.saoClientEvents.push({admitted:'index',publicationHash:r.data.publicationHash,indexTiles:r.data.index.tiles.length,frozen:Object.isFrozen(r.data)});return r;},async getTile(...args:any[]){const r=await actualSaoClient.getTile(...args);globalThis.__controlled.saoClientEvents.push({admitted:'tile',publicationHash:r.data.publicationHash,tileId:r.data.tile.tileId,tuples:r.data.tile.rows.length,frozen:Object.isFrozen(r.data)});return r;}};
`;
await fs.writeFile(path.join(out,'actual-sao-client-transport-adapter.ts.txt'),saoAdapter,{flag:'wx'});
const instrumented:any[]=[];
const bundle=await build({absWorkingDir:ROOT,stdin:{contents:entry,resolveDir:ROOT,sourcefile:'task-page-images.ts',loader:'ts'},bundle:true,write:false,metafile:true,
 platform:'browser',format:'iife',globalName:'fullHookProbe',target:'es2022',tsconfig:path.join(ROOT,'apps/wechat-miniapp/tsconfig.json'),
 define:{__MINIAPP_API_BASE__:JSON.stringify('https://approved.fixture.invalid'),__MINIAPP_DEVELOPMENT_FIXTURE_MODE__:'false',
 __MINIAPP_OPERATOR_PREVIEW_TOKEN__:'""',__MINIAPP_ACCEPTANCE_DIAGNOSTICS__:'false'},
 plugins:[{name:'controlled-target-adapters-and-read-only-diagnostics',setup(b){
  b.onResolve({filter:/^(react|@tarojs\/taro|@\/hooks\/use-resource-query|@\/services\/api-client)$/},a=>({path:a.path,namespace:'controlled'}));
  b.onLoad({filter:/.*/,namespace:'controlled'},a=>({contents:a.path==='react'?
   ['useRef','useState','useMemo','useCallback','useEffect'].map(n=>`export const ${n}=(...a)=>globalThis.__controlled.react.${n}(...a);`).join('\n'):
   a.path==='@tarojs/taro'?'export default globalThis.__controlled.Taro;':
   a.path==='@/hooks/use-resource-query'?'export const useResourceQuery=(o)=>globalThis.__controlled.query(o);':
   `import {MINIAPP_API_BASE_PATH} from '@starward/miniapp-contracts';${urlFunction}
export const saoCatalogClient=globalThis.liveApi.saoCatalogClient;`,loader:'ts',resolveDir:ROOT}));
  b.onLoad({filter:/[\\/]sky-public-image-runtime\.ts$/},async a=>{
   const original=await fs.readFile(a.path,'utf8'),ast=ts.createSourceFile(a.path,original,ts.ScriptTarget.Latest,true),names:string[]=[];
   for(const statement of ast.statements){if(!statement.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))continue;
    if(ts.isFunctionDeclaration(statement)&&statement.name)names.push(statement.name.text);
    if(ts.isVariableStatement(statement))for(const d of statement.declarationList.declarations){assert(ts.isIdentifier(d.name));names.push(d.name.text);}}
   const forwarding=names.map(n=>'export const '+n+'=(...args)=>globalThis.liveApi.'+n+'(...args);').join('\n');
   await fs.writeFile(path.join(out,'shared-runtime-forwarding.ts.txt'),forwarding,{flag:'wx'});
   await fs.writeFile(path.join(out,'shared-runtime-forwarding.json'),JSON.stringify({path:path.relative(ROOT,a.path).replaceAll('\\','/'),originalSha256:hash(original),forwardingSha256:hash(forwarding),exports:names,
    scope:'Page task forwards public runtime exports to the same full actual API module instance. No second owner/budget or production runtime policy substitution; both compile inputs pinned.'},null,2)+'\n',{flag:'wx'});
   return {contents:forwarding,loader:'ts'};
  });
  b.onLoad({filter:/[\\/]sky-stellar-tile-loader\.ts$/},async a=>{const original=await fs.readFile(a.path,'utf8');
 const changed=original.replace('export function createSkyStellarTileLoader(', 'function createActualSkyStellarTileLoader(').replace('    update(ids:readonly string[]){',`    __measure(){return {ownerId:globalThis.__controlled.identity(this),disposed,wanted:[...wanted],pending:[...pending].map(([id,c])=>({id,aborted:c.signal.aborted})),failed:[...failed],refresh:[...refresh],loaded:[...loaded].map(([id,tile])=>({id,tuples:tile.tile.rows.length,encodedSourceBytes:metadata.get(id)?.bytes??null,decodedPublicationJsonBytes:new TextEncoder().encode(JSON.stringify(tile)).byteLength,tupleNumericPayloadModel:tile.tile.rows.reduce((n,row)=>n+row.filter(v=>typeof v==='number').length*8,0),jsObjectBytes:null})),viewEncodedByteBudget:SKY_STELLAR_VIEW_BYTES,requestSlots:SKY_STELLAR_REQUESTS};},
    update(ids:readonly string[]){`)+`\nexport function createSkyStellarTileLoader(...args:Parameters<typeof createActualSkyStellarTileLoader>){const owner=createActualSkyStellarTileLoader(...args);globalThis.__controlled.stellarLoaders.push(owner);return owner;}\n`;assert.notEqual(changed,original);instrumented.push({path:path.relative(ROOT,a.path).replaceAll('\\','/'),originalSha256:hash(original),taskDiagnosticSha256:hash(changed)});await fs.writeFile(path.join(out,'diagnostic-stellar-loader.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};});
  b.onLoad({filter:/[\\/]sky-scene-render\.ts$/},async a=>{const original=await fs.readFile(a.path,'utf8');
   const changed=original.replace('  const currentSupplement=currentStellarSupplement(supplement,data.skyScene,frameAt);','  const currentSupplement=currentStellarSupplement(supplement,data.skyScene,frameAt);\n  const measureSupplement=globalThis.__controlled.saoSceneObservation={resolvedPoints:currentSupplement?.points.length??0,appearanceEligible:0,projectedRendered:0,paintedIdentity:0};')
    .replace('    const projection=project(azimuthDeg,altitudeDeg);if(!projection)continue;','    measureSupplement.appearanceEligible++;const projection=project(azimuthDeg,altitudeDeg);if(!projection)continue;measureSupplement.projectedRendered++;if(appearance.opacity>=.1)measureSupplement.paintedIdentity++;');
   assert.notEqual(changed,original);assert(changed.includes('measureSupplement.projectedRendered++'));instrumented.push({path:path.relative(ROOT,a.path).replaceAll('\\','/'),originalSha256:hash(original),taskDiagnosticSha256:hash(changed)});await fs.writeFile(path.join(out,'diagnostic-scene.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};});
  b.onLoad({filter:/[\\/]use-sky-stellar-supplement\.ts$/},async a=>{const original=await fs.readFile(a.path,'utf8');
 const changed=original.replace('  return {publication,frame:resolved.frame',`  globalThis.__controlled.stellarLoaderSnapshot=()=>loader.current?.__measure()??null;
  return {publication,frame:resolved.frame`);assert.notEqual(changed,original);instrumented.push({path:path.relative(ROOT,a.path).replaceAll('\\','/'),originalSha256:hash(original),taskDiagnosticSha256:hash(changed)});await fs.writeFile(path.join(out,'diagnostic-stellar-hook.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};});
  b.onLoad({filter:/[\\/]sky-public-image-cache\.ts$/},async a=>{
   const original=await fs.readFile(a.path,'utf8');const changed=original.replace('export function createSkyPublicImageCache(', 'function createActualSkyPublicImageCache(')+
    '\nexport function createSkyPublicImageCache(...a:Parameters<typeof createActualSkyPublicImageCache>){const owner=createActualSkyPublicImageCache(...a);globalThis.__controlled.caches.push(owner);return owner;}\n';
   assert.notEqual(changed,original);instrumented.push({path:path.relative(ROOT,a.path).replaceAll('\\','/'),originalSha256:hash(original),taskDiagnosticSha256:hash(changed)});
   await fs.writeFile(path.join(out,'diagnostic-cache.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};
  });
  b.onLoad({filter:/[\\/]sky-artwork-loader\.ts$/},async a=>{
   const original=await fs.readFile(a.path,'utf8');let changed=original.replace('update(next:readonly Asset[]){',`__measure(){return [...entries.values()].map(e=>({asset:e.asset,ids:[...e.ids],state:e.state,loaded:Boolean(e.loaded),file:Boolean(e.file),fileOwnerId:globalThis.__controlled.identity(e.file),fileReleaseId:globalThis.__controlled.identity(e.file?.release),fileLeaseCurrent:e.file?.isCurrent?.()??null,loadedOwnerId:globalThis.__controlled.identity(e.loaded),loadedReleaseId:globalThis.__controlled.identity(e.loaded?.release),loadedLeaseCurrent:e.loaded?.isCurrent?.()??null,image:e.loaded?.image??null,current:!!usable(e)}));},\n    update(next:readonly Asset[]){`);
   assert.notEqual(changed,original);instrumented.push({path:path.relative(ROOT,a.path).replaceAll('\\','/'),originalSha256:hash(original),taskDiagnosticSha256:hash(changed)});
   changed=changed.replace('  nativeImageLifetimes.set(image, lifetime);','  nativeImageLifetimes.set(image, lifetime); globalThis.__controlled.sampleResources?.("native-register");')
    .replace('return () => { lifetime.retired = true; delete lifetime.current; };','return () => { lifetime.retired = true; delete lifetime.current; globalThis.__controlled.sampleResources?.("native-retire"); };')
    + '\nexport function taskNativeImageMembership(image:object){const value=nativeImageLifetimes.get(image);return !value?"UNREGISTERED":value.retired?"RETIRED":value.current?.()?"CURRENT":"STALE";}\n';
   instrumented.at(-1).taskDiagnosticSha256=hash(changed);
   await fs.writeFile(path.join(out,'diagnostic-loader.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};
  });
  b.onLoad({filter:/[\\/]use-sky-artwork\.ts$/},async a=>{
   const original=await fs.readFile(a.path,'utf8');const needle='return {...value,failedImage:failed,retryImages,suspendUnusedDecoded};';
   const changed=original.replace(needle,`globalThis.__controlled.hook({active,hash,wanted,byteBudget,retainedFallbackIds,owner:loader.current,value});\n  ${needle}`);
   assert.notEqual(changed,original);instrumented.push({path:path.relative(ROOT,a.path).replaceAll('\\','/'),originalSha256:hash(original),taskDiagnosticSha256:hash(changed)});
   await fs.writeFile(path.join(out,'diagnostic-hook.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};
  });
 }}]});
const compiled=bundle.outputFiles[0]!.text;
await fs.writeFile(path.join(out,'runtime-metadata-and-offers.json'),JSON.stringify({metadata,assets:assets.map(({base64,...rest})=>rest)},null,2)+'\n',{flag:'wx'});
const sourceBindings:any[]=[],virtualInputs:any[]=[];
for(const inputKey of Object.keys(bundle.metafile!.inputs)){
 if(inputKey==='task-page-images.ts'||['controlled:react','controlled:@tarojs/taro','controlled:@/hooks/use-resource-query','controlled:@/services/api-client'].includes(inputKey)){
  virtualInputs.push({inputKey,reason:inputKey==='task-page-images.ts'?'frozen extracted entry':'explicit frozen target adapter'});continue;
 }
 const absolute=path.resolve(ROOT,inputKey),relativeInput=path.relative(ROOT,absolute).replaceAll('\\','/');
 assert.ok(relativeInput&&!relativeInput.startsWith('../')&&!path.isAbsolute(relativeInput),'metafile input must resolve inside approved root '+inputKey);
 sourceBindings.push({...await bind(relativeInput),metafileInput:inputKey,resolvedAbsolute:absolute});
}
for(const p of [pagePath,clientPath])if(!sourceBindings.some(r=>r.path===p))sourceBindings.push(await bind(p));
await fs.writeFile(path.join(out,'metafile.json'),JSON.stringify(bundle.metafile,null,2)+'\n',{flag:'wx'});
await fs.writeFile(path.join(out,'source-binding-before.json'),JSON.stringify({absWorkingDir:ROOT,sourceBindings,virtualInputs,nodePreparationBindings,nodeVirtualInputs,preserved,inputs},null,2)+'\n',{flag:'wx'});
for(let i=0;i<sourceBindings.length;i++){
 const p=path.join(out,'source-inputs',sourceBindings[i].path);await fs.mkdir(path.dirname(p),{recursive:true});await fs.copyFile(path.join(ROOT,sourceBindings[i].path),p);
}
for(const p of ['workers/miniapp-api/src/deep-sky-imagery.ts','workers/miniapp-api/src/sdss-optical-imagery.ts']){
 const target=path.join(out,'source-inputs',p);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(ROOT,p),target);
}
await fs.writeFile(path.join(out,'bundle.js'),compiled,{flag:'wx'});
await fs.writeFile(path.join(out,'inputs.json'),JSON.stringify({report:null,inputs,sourceBindings,instrumented},null,2)+'\n',{flag:'wx'});
inputs.push(await bind('.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-current-scene-browser-2026-10-03.ts'),await bind('.codex/work-items/cloud-sky-native-2026-09-22/scripts/build-current-scene-journey-2026-10-03.mjs'));

const clientEntry=`export * from './apps/wechat-miniapp/src/services/api-client';
export {attachSkyCatalog} from './apps/wechat-miniapp/src/features/sky/sky-stellar-scene';
export {exactSkyObservationFrame} from './apps/wechat-miniapp/src/features/sky/sky-observation-frame';
export * from './apps/wechat-miniapp/src/services/sky-public-image-runtime';
`;
const client=await build({absWorkingDir:ROOT,stdin:{contents:clientEntry,resolveDir:ROOT,sourcefile:'task-live-api.ts',loader:'ts'},bundle:true,write:false,metafile:true,
platform:'browser',format:'iife',globalName:'liveApi',target:'es2022',tsconfig:path.join(ROOT,'apps/wechat-miniapp/tsconfig.json'),
define:{__MINIAPP_API_BASE__:'"https://approved.fixture.invalid"',__MINIAPP_DEVELOPMENT_FIXTURE_MODE__:'false',__MINIAPP_OPERATOR_PREVIEW_TOKEN__:'""',__MINIAPP_ACCEPTANCE_DIAGNOSTICS__:'false',__MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__:'false'},
plugins:[{name:'only-explicit-native-transport',setup(b){b.onResolve({filter:/^@tarojs\/taro$/},()=>({path:'taro',namespace:'native'}));
b.onLoad({filter:/.*/,namespace:'native'},()=>({contents:'export default globalThis.__controlled.Taro;',loader:'ts'}));
b.onLoad({filter:/[\\/]sky-public-image-cache\.ts$/},async a=>{
 const original=await fs.readFile(a.path,'utf8');assert.equal(original.split('export function createSkyPublicImageCache(').length,2);
 const changed=original.replace('export function createSkyPublicImageCache(','function createActualSkyPublicImageCache(')+
  '\nexport function createSkyPublicImageCache(...args:Parameters<typeof createActualSkyPublicImageCache>){const owner=createActualSkyPublicImageCache(...args);globalThis.__controlled.caches.push(owner);(globalThis.__controlled.publicFileOwners??=[]).push(owner);return owner;}\n';
 await fs.writeFile(path.join(out,'api-file-cache.original.ts'),original,{flag:'wx'});await fs.writeFile(path.join(out,'api-file-cache.observed.ts'),changed,{flag:'wx'});
 return {contents:changed,loader:'ts'};
});}}]});
await fs.writeFile(path.join(out,'api-bundle.js'),client.outputFiles[0].text,{flag:'wx'});
await fs.writeFile(path.join(out,'api-metafile.json'),JSON.stringify(client.metafile,null,2)+'\n',{flag:'wx'});
const clientBindings=[];
for(const key of Object.keys(client.metafile.inputs)){if(key==='task-live-api.ts'||key==='native:taro')continue;
 const relative=path.relative(ROOT,path.resolve(ROOT,key)).replaceAll('\\','/');assert(!relative.startsWith('../'));clientBindings.push(await bind(relative));}
await fs.writeFile(path.join(out,'api-inputs.json'),JSON.stringify({entry:clientEntry,sourceBindings:clientBindings,virtual:['task-live-api.ts','native:taro'],scope:'Full current api-client/request-operation/response-cache/catalog/SAO contracts, actual modules; Taro transport/storage controlled.'},null,2)+'\n',{flag:'wx'});
const scaffoldSource='output/playwright/cloud-sky-live-mixed-1003-r10/runtime-executor.js.txt';
await fs.copyFile(path.join(ROOT,scaffoldSource),path.join(out,'runtime-executor.js.txt'));
await fs.writeFile(path.join(out,'native-scaffold-origin.json'),JSON.stringify({source:scaffoldSource,...await bind(scaffoldSource),
 scope:'Reuse successful controlled native UTF8/file callbacks. No preloaded data. Task TextDecoder models native UTF8; no production browser decoder requirement.'},null,2)+'\n');
console.log(JSON.stringify({output:relative,pageSourceBindings:sourceBindings.length,apiSourceBindings:clientBindings.length,sharedFileOwner:true}));
