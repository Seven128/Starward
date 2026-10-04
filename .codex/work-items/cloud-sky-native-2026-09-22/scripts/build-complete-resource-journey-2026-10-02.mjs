import fs from 'node:fs';
import assert from 'node:assert/strict';
const base='.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-continuous-camera-resource-journey-2026-10-02.mts';
const target='.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-complete-resource-journey-2026-10-02.mts';
assert(!fs.existsSync(target));let s=fs.readFileSync(base,'utf8');
const replace=(old,next)=>{assert(s.includes(old),'missing exact base '+old.slice(0,80));s=s.replace(old,next);};
const section=(begin,end,next)=>{const a=s.indexOf(begin),b=s.indexOf(end,a);assert(a>=0&&b>a,begin);s=s.slice(0,a)+next+s.slice(b);};
replace("import {clampSkyFieldOfView}","import {SaoPublicationService} from '../../../../workers/miniapp-api/src/sao-publication';\nimport {completeGpuExecutor,completeJourneyExecutor,completeFinalExecutor} from './experience-complete-resource-browser-2026-10-02';\nimport {clampSkyFieldOfView}");
s=s.replaceAll('cloud-sky-continuous-camera-resource-1002-r','cloud-sky-complete-resource-1003-r');
replace("import {SdssOpticalImageryService} from './workers/miniapp-api/src/sdss-optical-imagery';", "import {SdssOpticalImageryService} from './workers/miniapp-api/src/sdss-optical-imagery';\nimport {SaoPublicationService} from './workers/miniapp-api/src/sao-publication';");
replace('resolveSkyDeepSkyScene,DeepSkyImageryService,SdssOpticalImageryService};','resolveSkyDeepSkyScene,DeepSkyImageryService,SdssOpticalImageryService,SaoPublicationService};');
replace("const pagePath=sky+'spot-sky-page.tsx'",`// Actual revised SAO publication producer, validated original index/tile files.
const preparationPath='output/complete-resource-scope-preparation-1002-r2/result.json';
const preparation=JSON.parse(await fs.readFile(path.join(ROOT,preparationPath),'utf8'));
inputs.push(await bind(preparationPath));
const saoProducer=new SaoPublicationService(new URL('../../../../workers/miniapp-api/assets/sao-v2/',import.meta.url));
const saoIndex=await saoProducer.get(),saoRoute='/v2/sky/supplements/sao/v2';
const addSao=async(route:string,body:any,name:string)=>{const text=JSON.stringify(body)+'\\n',p=relative+'/'+name;
 await fs.writeFile(path.join(ROOT,p),text,{flag:'wx'});metadata[route]={body,bytes:Buffer.byteLength(text),sha256:hash(text)};inputs.push({...await bind(p),route,transport:'ACTUAL_OFFLINE_SAO_PRODUCER_ENVELOPE'});};
await addSao(saoRoute,saoIndex,'sao-index-envelope.json');
const tileIds=[...new Set(preparation.proposedConditions.flatMap((r:any)=>r.sao.candidateTileIds))] as string[];
assert.equal(tileIds.length,29);
for(const id of tileIds){const tile=await saoProducer.tile(saoIndex.data.publicationHash,id);
 await addSao(saoRoute+'/'+saoIndex.data.publicationHash+'/tiles/'+id,tile,'sao-tile-'+id+'.json');
 const reference=saoIndex.data.index.tiles.find(t=>t.id===id)!;inputs.push(await bind('workers/miniapp-api/assets/sao-v2/'+reference.file));}
for(const p of ['workers/miniapp-api/assets/sao-v2/publication.json','workers/miniapp-api/assets/sao-v2/index.json',
 '${target}','.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-complete-resource-browser-2026-10-02.ts',
 '.codex/work-items/cloud-sky-native-2026-09-22/scripts/build-complete-resource-journey-2026-10-02.mjs',
 'apps/wechat-miniapp/tsconfig.json','apps/wechat-miniapp/package.json','tools/run-node.cjs',
 'node_modules/esbuild/package.json','node_modules/tsx/package.json','node_modules/typescript/package.json'])inputs.push(await bind(p));
const pagePath=sky+'spot-sky-page.tsx'`);
replace("'0a6c31e6ffe9a91c6aa5cc51959e27d70e9e754108d966ad27bfde0b50c1f24a'","'522d3ef3518ac9739a13ea019e7de68f8d21c14cd4629f1d9c74fd09ad3dbc88'");
replace("const names=['optical'","const names=['starSunAltitudeDeg','stellarSupplement','optical'");
s=s.replaceAll("['hipsTiles','constellationFrame','coordinateGridFrame','visibleFigures']","['starSunAltitudeDeg','hipsTiles','constellationFrame','coordinateGridFrame','visibleFigures']");
replace("['hipsTiles','constellationFrame','coordinateGridFrame','visibleFigures','artwork']","['starSunAltitudeDeg','hipsTiles','constellationFrame','coordinateGridFrame','visibleFigures','artwork']");
replace("const words:Record<string,string>={optical:","const words:Record<string,string>={stellarSupplement:'stellar-supplement',optical:");
replace("const creditStatements=['deepSkyImagePresented','sdssOpticalStatus','sdssOpticalCurrentImagePresented']", "const creditStatements=['deepSkyImagePresented','presentedSdssOptical','sdssOpticalImagePresented','sdssOpticalStatus','sdssOpticalCurrentImagePresented']");
replace('const entry=`import {useMemo',`const property=(name:string)=>{let found:ts.PropertyAssignment[]=[];const walk=(n:ts.Node)=>{if(ts.isPropertyAssignment(n)&&n.name.getText(ast)===name&&n.parent.getText(ast).includes('pendingSkyPaintRef'))found.push(n);ts.forEachChild(n,walk);};walk(ast);assert.equal(found.length,1,name);return found[0]!.initializer.getText(ast);};
const actualPaint=property('paint'),actualPresented=property('presented'),actualSame=property('sameScene'),actualInvalidated=property('invalidated'),actualFailed=property('failed');
const actualDrawRequest=getVariable('draw'),actualRetry=getVariable('retryNativeImage')+'\\n'+getVariable('retrySdssOptical');
const lifecycleEntry=\`
import {createSkyCanvasLifecycle} from './\${sky}sky-canvas-lifecycle';
import {drawSkyScene as actualDrawSkyScene} from './\${sky}sky-scene-render';
import {skySdssOpticalFrame} from './\${sky}sky-sdss-optical-frame';
import {liveSkyOpticalCompletion,sameSkyOpticalCompletion,sameSkyOpticalInput} from './\${sky}sky-sdss-optical-completion';
import {copySkyDeepAuxiliaryDecisions,sameSkyDeepAuxiliaryDecisions} from './\${sky}sky-deep-auxiliary-visibility';
import {resolvedSkyBodyReferences} from './\${sky}sky-body-label-presentation';
import {resolveSkyCanvasView} from './\${sky}sky-canvas-view';
import {NO_SKY_INSETS} from './\${sky}sky-viewport';
import {dispatchSkyHipsImageFailure} from './\${sky}sky-scene-render';
import {skySceneHasContent} from './\${sky}sky-stellar-scene';
export function initializeActualPageLifecycle(){
 const w=globalThis.__controlled,canvasNodeRef=w.canvasNodeRef,canvasGenerationRef=w.canvasGenerationRef;
 const retireDeepSkyDecodeRef={current:()=>w.retireDeepSkyDecodeRef?.current()};
 const pendingSkyPaintRef={current:null},paintedSkyObjectsRef={current:null},canvasDrawRevisionRef={current:0};
 w.pendingSkyPaintRef=pendingSkyPaintRef;w.paintedSkyObjectsRef=paintedSkyObjectsRef;w.acceptedCount=0;w.acceptanceTrace=[];
 const orientation={latestPresentation:{get current(){return w.orientationLive;}},presented:{current:null}},orientationController={snapshot:()=>w.orientationLive};
 const manualBasisRef={current:null},objectTracking={snapshot:()=>({target:null})},zoomRef={get current(){return w.paintInput.presentedFov;}},viewportInsetsRef={current:NO_SKY_INSETS},reducedMotionRef={current:false};
 const browsingCamera=w.browsingCamera,browsingTimerRef={current:null},browsingDrawRef={current:()=>{throw Error('unexpected browsing timer');}};
 const Date={now:()=>w.cameraClock},EMPTY_SKY_IMAGES=new Map();
 const setPresentedSkyFrame=(update:any)=>{w.presentedSkyFrame=typeof update==='function'?update(w.presentedSkyFrame??null):update;};
 const setPresentedCamera=(update:any)=>{w.presentedCamera=typeof update==='function'?update(w.presentedCamera??null):update;};
 const setCanvasSize=(update:any)=>{w.acceptedSize=typeof update==='function'?update(w.acceptedSize??{width:390,height:844}):update;};
 const setCanvasError=(value:any)=>{w.canvasError=value;};
 const publishAcceptanceSkySceneInspection=(owner:any,facts:any)=>w.acceptanceTrace.push({kind:'inspection',owner,facts});
 const mark=(name:string,value:any)=>w.acceptanceTrace.push({kind:'availability',name,value});
 const setSolarLightUnavailable=(v:any)=>mark('solar',v),setMoonDiscUnavailable=(v:any)=>mark('moon',v),setPlanetDiscUnavailable=(v:any)=>mark('planet',v),setSunDiscUnavailable=(v:any)=>mark('sun',v),setLandscapeUnavailable=(v:any)=>mark('landscape',v),setGalacticBandUnavailable=(v:any)=>mark('galactic',v);
 const deepSkyImageFailureRef={current:null},setDeepSkyImageState=(value:any)=>mark('selected-state',value);
 const failure=(name:string)=>({get current(){return (image:any)=>w.lastPageResult[name].failedImage(image);}});
 const artworkFailureRef=failure('artwork'),wideFieldFailureRef=failure('wideField'),opticalFailureRef=failure('optical'),sdssOpticalFailureRef=failure('sdssOptical');
 const drawSkyScene=(...args:any[])=>{const staged=args[8],done=args[9];args[8]=(snapshot:any,sources:any)=>{w.acceptanceTrace.push({kind:'staged',beforeAccepted:w.acceptedCount,frameAt:snapshot?.frameAt,previousFrameAt:w.presentedSkyFrame?.frameAt??null,preaid:snapshot?.deepSkyAuxiliaryDecisions??[]});return staged(snapshot,sources);};args[9]=()=>{w.acceptanceTrace.push({kind:'done',beforeAccepted:w.acceptedCount});return done();};return actualDrawSkyScene(...args);};
 const paint=\${actualPaint},presented=\${actualPresented},sameScene=\${actualSame},invalidated=\${actualInvalidated},failed=\${actualFailed};
 const clockTasks=new Map(),clock={schedule(fn:any,delay:number){const id={};clockTasks.set(id,{fn,delay});return id;},cancel(id:any){clockTasks.delete(id);}};
 w.drainPaintClock=()=>{for(let n=0;n<20;n++){const entry=[...clockTasks].find(([id,t]:any)=>t.delay===0);if(!entry)return;clockTasks.delete(entry[0]);entry[1].fn();}throw Error('paint schedule bound');};
 w.lifecycle=createSkyCanvasLifecycle({measure(done:any){done({width:390,height:844});},createContext(){return w.renderer;},
  releaseContext:\${releasePageCallback},paint,sameScene,presented(frame:any,size:any){w.acceptanceTrace.push({kind:'accepted',beforeAccepted:w.acceptedCount,frameAt:frame.frameAt});presented(frame,size);w.acceptedCount++;},invalidated,failed},clock);
 w.lifecycle.ready();
}
export function requestActualPageFrame(result:any,input:any,condition:any){
 const w=globalThis.__controlled;w.lastPageResult=result;w.paintInput=input;w.orientationLive={presentationRevision:1,alignment:{mode:'auto',view:condition.basis}};
 const useCallback=(fn:any)=>fn,canvasLifecycle=w.lifecycle,canvasNodeRevision=w.canvasRevision,canvasDrawRevisionRef={current:w.acceptedCount},skySceneInspectionOwnerRef={current:'controlled-resource-owner'},previousCanvasModeRef={current:'DAY'};
 const orientation={snapshot:{presentationRevision:1}},reportData=input.report,report={data:{dataState:'FRESH'},isError:false},row={at:input.at},devicePose={basis:condition.basis},sensorHeadingForScene=null,manualBasis=null,manualBasisRef={current:null},mode='DAY',verticalFovDeg=input.presentedFov;
 const {canvasDeepSkyImage,sdssOptical,constellationFrame,artwork,hipsTiles,moonTexture,marsTexture,mercuryTexture,jupiterBands,saturnBands,neptuneBands,uranusBands,galacticImage,landscapeImage,stellarSupplement}=result;
 const constellationsEnabled=true,landscapeEnabled=true,coordinateGrids={horizontal:false,equatorial:false},canvasFrameInfo={inspection:{spotId:input.report.context.spotId,frameAt:input.at,starCount:input.report.skyScene.catalog.entries.length}},publishAcceptanceSkySceneInspection=(owner:any,facts:any)=>w.acceptanceTrace.push({kind:'queued',owner,facts});
 \${actualDrawRequest}
 draw();
}
export function retryActualPageSdss(result:any){const sdssOptical=result.sdssOptical,canvasLifecycle=globalThis.__controlled.lifecycle;\${actualRetry} retrySdssOptical();}
\`;
const entry=\`import {useMemo`);
replace("import {sdssOpticalPresentation}","import {skySolarLightAt} from './${sky}sky-solar-light';\nimport {sdssOpticalPresentation}");
replace('return {optical,sdssOptical,wideField','return {stellarSupplement,optical,sdssOptical,wideField');
replace('canvasError=null,sdssOptical=result.sdssOptical;','canvasError=null,sdssOptical=result.sdssOptical,canvasGenerationRef=globalThis.__controlled.canvasGenerationRef;');
replace('releaseContext(context);\n}`;','releaseContext(context);\n}\n${lifecycleEntry}`;');
replace("const instrumented:any[]=[];",`const saoAdapter=\`import {createSaoCatalogClient} from './apps/wechat-miniapp/src/services/sao-catalog-client';
const bridge=(route:string,signal?:AbortSignal)=>new Promise((resolve,reject)=>{signal?.throwIfAborted();const w=globalThis.__controlled;const task=w.Taro.request({url:'https://approved.fixture.invalid'+route,success:(r:any)=>resolve(r.data),fail:reject});signal?.addEventListener('abort',()=>task.abort(),{once:true});});
export const saoCatalogClient=createSaoCatalogClient({index:signal=>bridge('/v2/sky/supplements/sao/v2',signal),tile:(hash,id,signal)=>bridge('/v2/sky/supplements/sao/v2/'+hash+'/tiles/'+id,signal),invalidateIndex(){globalThis.__controlled.saoClientEvents.push({invalid:'index'});},invalidateTile(hash,id){globalThis.__controlled.saoClientEvents.push({invalid:'tile',hash,id});}});
\`;
await fs.writeFile(path.join(out,'actual-sao-client-transport-adapter.ts.txt'),saoAdapter,{flag:'wx'});
const instrumented:any[]=[];`);
replace("`import {MINIAPP_API_BASE_PATH} from '@starward/miniapp-contracts';${urlFunction}`","`import {MINIAPP_API_BASE_PATH} from '@starward/miniapp-contracts';${urlFunction}\n${saoAdapter}`");
// Add readonly stellar loader/Hook taps; both call their real owners unchanged.
replace("  b.onLoad({filter:/[\\\\/]sky-public-image-cache\\.ts$/}",`  b.onLoad({filter:/[\\\\/]sky-stellar-tile-loader\\.ts$/},async a=>{const original=await fs.readFile(a.path,'utf8');
 const changed=original.replace('    update(ids:readonly string[]){',\`    __measure(){return {disposed,wanted:[...wanted],pending:[...pending.keys()],failed:[...failed],refresh:[...refresh],loaded:[...loaded].map(([id,tile])=>({id,rows:tile.tile.rows.length,bytes:metadata.get(id)?.bytes??null})),viewBudget:SKY_STELLAR_VIEW_BYTES,requestSlots:SKY_STELLAR_REQUESTS};},
    update(ids:readonly string[]){\`);assert.notEqual(changed,original);instrumented.push({path:path.relative(ROOT,a.path).replaceAll('\\\\','/'),originalSha256:hash(original),taskDiagnosticSha256:hash(changed)});await fs.writeFile(path.join(out,'diagnostic-stellar-loader.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};});
  b.onLoad({filter:/[\\\\/]use-sky-stellar-supplement\\.ts$/},async a=>{const original=await fs.readFile(a.path,'utf8');
 const changed=original.replace('  return {publication,frame:resolved.frame',\`  globalThis.__controlled.stellarLoaderSnapshot=()=>loader.current?.__measure()??null;
  return {publication,frame:resolved.frame\`);assert.notEqual(changed,original);instrumented.push({path:path.relative(ROOT,a.path).replaceAll('\\\\','/'),originalSha256:hash(original),taskDiagnosticSha256:hash(changed)});await fs.writeFile(path.join(out,'diagnostic-stellar-hook.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};});
  b.onLoad({filter:/[\\\\/]sky-public-image-cache\\.ts$/}`);
replace('callback(complete);return {abort()',`if(asset?.id==='sdss:M:51:DETAIL'&&w.holdDetail){w.holdDetail=false;(r as any).held=true;
     w.heldTransfers.push({fail(){if(done)return;done=true;nativeRunning--;r.completed=true;(r as any).failed=true;o.fail({errMsg:'controlled single detail transfer failure'});}});
   }else callback(complete);return {abort()`);
replace('canvasNode,queries,makeCanvasNode,diagnostics:[],','canvasNode,queries,makeCanvasNode,diagnostics:[],heldTransfers:[],holdDetail:false,saoClientEvents:[],');
replace('counters(){return {decodedPending','queryRetention(){return [...queryCache].map(([key,r])=>({key,pending:r.pending,hasData:!!r.data,jsonBytes:r.data?new TextEncoder().encode(JSON.stringify(r.data)).byteLength:0}));},\n   counters(){return {decodedPending');
replace('refetch:async()=>row?.data','refetch:async()=>{if(!o.enabled)return row?.data;row.pending=true;dirty=true;try{row.data=await o.queryFn();row.error=false;return row.data;}catch(error){row.error=true;throw error;}finally{row.pending=false;dirty=true;}}');
section(' const gpuExecutor=()=>{',' const conditions:any[]=[',` await fs.writeFile(path.join(out,'executor-gpu.js.txt'),completeGpuExecutor.toString(),{flag:'wx'});
 await page.evaluate(completeGpuExecutor);
`);
section(' const conditions:any[]=['," for(const c of conditions)",` const conditions:any[]=preparation.proposedConditions.map((c:any,index:number)=>({name:c.name,pose:[c.pose.az,90+c.pose.alt,0],fov:c.fov,reference:c.selected,cold:index===0,refinement:index===3}));
`);
replace(' await page.evaluate(stableExecutor,JSON.parse(preparedContextText));',' await page.evaluate(stableExecutor,JSON.parse(preparedContextText));\n await page.evaluate(()=>globalThis.fullHookProbe.initializeActualPageLifecycle());');
section(' const journeyExecutor=async',' for(const condition of conditions)',` await fs.writeFile(path.join(out,'executor-journey.js.txt'),completeJourneyExecutor.toString(),{flag:'wx'});
`);
section(' for(const condition of conditions)'," for(const r of sourceBindings)",` for(const condition of conditions){
  const r=await page.evaluate(completeJourneyExecutor,{condition});
  const captured=r.passes.map((p:any)=>{const {rgba,capture,...rest}=p;return {...rest,rgbaSha256:hash(Buffer.from(rgba,'base64')),pngSha256:hash(Buffer.from(capture.split(',')[1],'base64'))};});
  for(let i=0;i<r.passes.length;i++){const p=r.passes[i],name=condition.name+'-'+p.label;
   await fs.writeFile(path.join(out,name+'.rgba'),Buffer.from(p.rgba,'base64'),{flag:'wx'});await fs.writeFile(path.join(out,name+'.png'),Buffer.from(p.capture.split(',')[1],'base64'),{flag:'wx'});}
  const row={...r,passes:captured};rows.push(row);await fs.writeFile(path.join(out,condition.name+'.json'),JSON.stringify(row,null,2)+'\\n',{flag:'wx'});
  assert.equal(row.ready.hooks.length,13);assert.equal(row.gates.localOpticalFixtureEnabled,false);
  assert.equal(row.ready.sao.failed,false);assert.equal(row.ready.sao.loading,false);assert(row.ready.sao.publicationHash);
  console.log(JSON.stringify({output:relative,name:condition.name,submits:row.passes.length,saoPoints:row.ready.sao.points,decoded:row.ready.decodedSourceRgbaModel,texture:row.passes.at(-1).gpu.live.texture,buffer:row.passes.at(-1).gpu.live.buffer}));
 }
 await fs.writeFile(path.join(out,'executor-final.js.txt'),completeFinalExecutor.toString(),{flag:'wx'});
 const final=await page.evaluate(completeFinalExecutor);await fs.writeFile(path.join(out,'actual-final-owner.json'),JSON.stringify(final,null,2)+'\\n',{flag:'wx'});
 const handleLeaks=final.afterClear.gpu.handles.filter((h:any)=>h.alive);
 const retirementFailures=[];
 if(handleLeaks.length)retirementFailures.push({kind:'gl-handle-leak',handles:handleLeaks});
 if(final.afterHide.nativeCurrent.some((i:any)=>i.current))retirementFailures.push({kind:'native-owner-current-after-hide'});
 if(final.afterHide.presented!==null)retirementFailures.push({kind:'presented-after-hide'});
 for(const cache of final.afterClear.cache)for(const name of ['leased','running','pending','reserved','encodedBytes'])if(cache[name])retirementFailures.push({kind:'cache-after-clear',name,value:cache[name]});
 for(const name of ['decodedPending','nativeRunning'])if(final.afterClear.counters[name])retirementFailures.push({kind:'pending-after-clear',name});
 await fs.writeFile(path.join(out,'retirement-observations.json'),JSON.stringify({retirementFailures,scope:'observations retained before assertions; shader/program driver storage remains unknown'},null,2)+'\\n',{flag:'wx'});
 const comparisons=[];
 const initial=await fs.readFile(path.join(out,rows[0].condition.name+'-normal-warm.rgba'));
 const returned=await fs.readFile(path.join(out,rows[4].condition.name+'-normal-warm.rgba'));
 let changedBytes=0,changedPixels=0,max=0;for(let i=0;i<returned.length;i+=4){let changed=false;for(let c=0;c<4;c++){const d=Math.abs(returned[i+c]-initial[i+c]);if(d){changed=true;changedBytes++;max=Math.max(max,d);}}if(changed)changedPixels++;}
 comparisons.push({changedBytes,changedPixels,maxChannelDifference:max,scope:'observed warm original/return difference; not forced bitexactness or performance acceptance'});
`);
section(" await fs.writeFile(path.join(out,'result.json')",'}catch(e)',` await fs.writeFile(path.join(out,'result.json'),JSON.stringify({status:retirementFailures.length||errors.length?'MEASURED_WITH_FAILURES':'MEASURED_SOFTWARE_COMPLETE_RESOURCE_LANE',
  retirementFailures,returnComparisons:comparisons,report:await bind(reportPath),sourceBindings,nodePreparationBindings,instrumented,compiledSha256:hash(compiled),virtualInputs,sourceCreditLabels,inputs,rows,final,errors,
  scope:'One sameCanvas five legal camera state lane, real page qualification/14 relevant Hooks incl actual SAO client/loader+bytes, actual page request/paint and lifecycle staged/accepted callbacks. Controlled React/Taro/transport and measurement/context/clock adapters; actual api-operation/response-cache/Tanstack timing not executed for SAO. Normal science and LOCAL remain disabled; no new probe/budget. All full PNG and bottom-up RGBA saved per cold/normal/held/fail/retry submit. GL methods call original this/args/result; texture and buffer allocation models, attachments and handles separate. Diagnostic strong images/offer bytes and browser metadata retention separate; driver/RSS/native/GC unknown. Not 12Mbps/client FPS/200DAU/quality/native/final acceptance.'},null,2)+'\\n',{flag:'wx'});
 console.log(JSON.stringify({output:relative,result:await bind(relative+'/result.json'),rows:rows.length,retirementFailures}));
 assert.deepEqual(retirementFailures,[],'actual owner retirement failure; raw artifacts retained');assert.deepEqual(errors,[]);
`);
fs.writeFileSync(target,s,{flag:'wx'});console.log(target);
