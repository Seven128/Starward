// Migrate the frozen resource scaffold to current page consumers. Never edit or
// replay the historical five-state executor. Each replacement is bounded.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const target=path.join(here,'experience-current-scene-journey-2026-10-03.mts');
let s=fs.readFileSync(path.join(here,'experience-complete-resource-journey-2026-10-02.mts'),'utf8');
function replace(before,after){assert.equal(s.split(before).length,2,'unique migration anchor '+before.slice(0,90));s=s.replace(before,after);}
function section(before,end,after){const a=s.indexOf(before),b=s.indexOf(end,a+before.length);assert(a>=0&&b>a,'bounded migration section '+before);s=s.slice(0,a)+after+s.slice(b);}
replace('/** Task-only five legal shared-camera states: ten normal submissions plus cold and held/failure/retry observations. Actual page and Hook owners over controlled adapters and real cached bytes/software GPU. Single logical camera clock; wall time is not native FPS, 12Mbps or final acceptance. */',
 '/** Task-only current continuous page/Scene journey. Actual extracted current page effects/request/paint/credit, shared loaders, real publication bytes and software GL. Controlled React/Taro/MapFS/clock; native composition, GC/driver/RSS and device interaction remain unverified. */');
replace("import {completeGpuExecutor,completeJourneyExecutor,completeFinalExecutor} from './experience-complete-resource-browser-2026-10-02';",
 "import {currentGpuExecutor,currentJourneyExecutor,currentHideExecutor,currentShowExecutor,currentFinalExecutor} from './experience-current-scene-browser-2026-10-03';\nimport {buildDeepSkyScene} from '../../../../workers/miniapp-api/src/deep-sky-scene-provider';\nimport {celestialObjectPosition} from '../../../../workers/miniapp-api/src/celestial-object-position';\nimport {exactSkyObservationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-observation-frame';");
replace("let relative='output/playwright/cloud-sky-complete-resource-1003-r1';", "let relative='output/playwright/cloud-sky-current-scene-1003-r1';");
replace('relative=`output/playwright/cloud-sky-complete-resource-1003-r${n}`;', 'relative=`output/playwright/cloud-sky-current-scene-1003-r${n}`;');
replace("assert.equal((await bind(sky+'sky-gpu-textures.ts')).sha256,'a353bc12a9e84757b54e2a14d39087bb2736e814e4440f814089c8d3942b2db3');", "inputs.push(await bind(sky+'sky-gpu-textures.ts'));");
replace('const current=attachSkyCatalog(presentSkyTime(raw,at)!.report,stars);', `const attached=attachSkyCatalog(raw,stars);
const observer=exactSkyObservationFrame(attached,at)!.observer;
const generated=buildDeepSkyScene(attached.hourly.map(r=>r.at),{wgs84:{latitude:observer.latitude,longitude:observer.longitude,system:'WGS84'},altitudeM:observer.elevationM});
assert.equal(generated.state,'AVAILABLE');
assert.deepEqual(generated.catalog!.entries.map(e=>e.objectRef),attached.skyScene.deepSky!.catalog!.entries.map(e=>e.objectRef));
const current={...attached,skyScene:{...attached.skyScene,deepSky:generated}};
await fs.writeFile(path.join(out,'generated-deep-sky-scene.json'),JSON.stringify({producer:'current buildDeepSkyScene',observer,scene:generated,scope:'Current local producer on frozen report observer/times, not a new BFF/weather response.'},null,2)+'\\n',{flag:'wx'});
inputs.push(await bind(relative+'/generated-deep-sky-scene.json'));
const envelope={...projectAdoptedSkyCatalog(JSON.parse(reportBytes.toString())),data:current};
const positions:any={};for(const seconds of [0,1,60,900]){const instant=new Date(Date.parse(at)+seconds*1000).toISOString();
 const position=celestialObjectPosition('M:51',instant,envelope);assert(position.data.position,'current actual position '+instant);positions[seconds]=position;
 await fs.writeFile(path.join(out,'position-'+seconds+'.json'),JSON.stringify(position,null,2)+'\\n',{flag:'wx'});inputs.push(await bind(relative+'/position-'+seconds+'.json'));}
`);
replace('const preparedContextText=JSON.stringify({current,figures,at});','const preparedContextText=JSON.stringify({current,figures,at,positions});');
replace("assert.equal(hash(pageSource),'522d3ef3518ac9739a13ea019e7de68f8d21c14cd4629f1d9c74fd09ad3dbc88','reviewed current page remains frozen');", "const pageBinding=await bind(pagePath);inputs.push(pageBinding); // Pin this run, not a historical source hash.");
replace("'[deepSkyImageAsset, storeDeepSkyImageAsset]','[canvasDeepSkyImage, storeCanvasDeepSkyImage]',", "'[deepSkyImageAsset, storeDeepSkyImageAsset]','[deepSkyImageDiscovery, setDeepSkyImageDiscovery]','deepSkyImageViewRef','deepSkyImageIntentRef','[canvasDeepSkyImage, storeCanvasDeepSkyImage]',");
replace("'selectedDeepSkyEntry','deepSkyRegistrationReady','desiredDeepSkyImageLevel',", "'selectedDeepSkyEntry','deepSkyRegistrationReady','targetOpticalView','currentDeepSkyDiscovery','deepSkyImageInView','desiredDeepSkyImageLevel',");
replace("].map(getVariable).join('\\n')+'\\n'+[", "].map(getVariable).join('\\n')+'\\n'+pageSource.slice(pageSource.indexOf('  deepSkyImageViewRef.current = targetOpticalView;'),pageSource.indexOf('  deepSkyImageViewRef.current = targetOpticalView;')+'  deepSkyImageViewRef.current = targetOpticalView;'.length)+'\\n'+pageSource.slice(pageSource.indexOf('  deepSkyImageIntentRef.current ='),pageSource.indexOf('  // Catalog refreshes preserve image ownership'))+'\\n'+[");
replace("const creditStatements=['deepSkyImagePresented','presentedSdssOptical','sdssOpticalImagePresented','sdssOpticalStatus','sdssOpticalCurrentImagePresented'].map(getVariable).join('\\n');", "const creditStatements=['deepSkyImagePresented','presentedSdssOptical','sdssOpticalImagePresented','opticalImageCredit','sdssOpticalStatus','sdssOpticalCurrentImagePresented'].map(getVariable).join('\\n');");
replace("const sourceCreditLabels={selected:creditText('NASA/IPAC IRSA · AllWISE'),sdss:creditText('Sloan Digital Sky Survey · CC BY')};", "const sourceCreditLabels={selected:creditText('NASA/IPAC IRSA · AllWISE'),sdss:'ACTUAL skyOpticalSourceCredit / SkyOpticalImageCredit consumer'};");
replace(" const manualBasisRef={current:null},objectTracking={snapshot:()=>({target:null})}"," const manualBasisRef=w.manualBasisRef,objectTracking=w.objectTracking");
replace('createContext(){return w.renderer;}', 'createContext(){if(!w.canvasNodeRef.current)w.canvasNodeRef.current=w.makeCanvasNode();w.canvasRevision=w.canvasGenerationRef.current;if(w.rendererWasReleased)w.replaceRenderer();return w.renderer;}');
replace("sensorHeadingForScene=null,manualBasis=null,manualBasisRef={current:null},mode='DAY',verticalFovDeg=input.requestedFov;", "sensorHeadingForScene=null,manualBasis=w.manualBasisRef.current,manualBasisRef=w.manualBasisRef,mode=input.mode??'DAY',verticalFovDeg=input.requestedFov;");
replace("const constellationsEnabled=true,landscapeEnabled=true,coordinateGrids={horizontal:false,equatorial:false},canvasFrameInfo", "const constellationsEnabled=input.constellationsEnabled??true,landscapeEnabled=input.landscapeEnabled??true,coordinateGrids=input.coordinateGrids??{horizontal:false,equatorial:false},desiredDeepSkyImageLevel=result.desiredDeepSkyImageLevel,canvasFrameInfo");
replace(" const presentedCamera=globalThis.__controlled.presentedCamera,manualBasis=null,sensorBasis=input.liveBasis,verticalFovDeg=input.requestedFov;", " const presentedCamera=globalThis.__controlled.presentedCamera,manualBasis=globalThis.__controlled.manualBasisRef.current,sensorBasis=input.liveBasis,verticalFovDeg=input.requestedFov;");
replace("report={data:{dataState:'FRESH'},isError:false},mode='DAY',canvasNodeRevision=input.canvasRevision,", "report={data:{dataState:'FRESH'},isError:false},mode=input.mode??'DAY',canvasNodeRevision=input.canvasRevision,");
replace("constellationCatalog={data:{data:input.figures},isFetching:false},constellationsEnabled=true,landscapeEnabled=true,row={at:input.at};", "constellationCatalog={data:{data:input.figures},isFetching:false},constellationsEnabled=input.constellationsEnabled??true,landscapeEnabled=input.landscapeEnabled??true,row={at:input.at};");
replace(" deepSkyImageAsset,canvasDeepSkyImage,deepSkyImageState,frameSdssImage", " deepSkyImageAsset,canvasDeepSkyImage,deepSkyImageState,desiredDeepSkyImageLevel,frameSdssImage");
replace(" sdss:sdssOpticalStatus==='CREDIT'?${JSON.stringify(sourceCreditLabels.sdss)}:null}};", " sdss:opticalImageCredit},opticalImageCredit};");
replace("import {sdssOpticalPresentation} from './${sky}sky-sdss-optical-selection';", "import {sdssOpticalPresentation} from './${sky}sky-sdss-optical-selection';\nimport {skyDeepSkyImageIntersectsView} from './${sky}sky-target-image-visibility';\nimport {skyOpticalSourceCredit} from './${sky}sky-optical-source-credit';\nimport {skyObjectPositionIsCurrent} from './${sky}sky-object-location';\nimport {createSkyViewBasis} from './${sky}sky-view-projection';\nimport {skyPresentedTimeCurrent} from './${sky}sky-observation-time';");
replace("export {NO_SKY_INSETS} from './${sky}sky-viewport';", "export {NO_SKY_INSETS} from './${sky}sky-viewport';\nexport {presentSkyTime} from './${sky}sky-time-presentation';\nexport {createSkyObjectTracking} from './${sky}sky-object-tracking';");
replace('${lifecycleEntry}`;', `export async function openActualOpticalSources(credit:any){
 const Taro=globalThis.__controlled.Taro,opticalSourcesOpeningRef=globalThis.__controlled.opticalSourcesOpeningRef;
 const notify=(message:any)=>globalThis.__controlled.notifications.push(message);
 \${getVariable('openOpticalSources')}
 return openOpticalSources(credit);
}
export function applyActualTrackedPosition(data:any,input:any){
 const w=globalThis.__controlled,objectTracking=w.objectTracking,pageVisible=input.pageVisible,contextSession={busy:false},timeSaving=false;
 const orientationController={snapshot:()=>w.orientationLive},reportData=input.report,row={at:input.at},skyTapRef={current:null},manualBasisRef=w.manualBasisRef;
 const positionCatalog=()=>input.report.skyScene.deepSky.catalog,setManualBasis=(basis:any)=>{w.manualBasisRef.current=basis;};
 \${getVariable('applyTrackedPosition')}
 applyTrackedPosition(data);return {tracking:objectTracking.snapshot(),basis:manualBasisRef.current};
}
\${lifecycleEntry}\`;`);
// Decode ownership observation uses WeakMap membership, never the permissive
// compatibility drawing API for objects that have not been registered.
replace("const original=await fs.readFile(a.path,'utf8');const changed=original.replace('update(next:readonly Asset[]){',", "const original=await fs.readFile(a.path,'utf8');let changed=original.replace('update(next:readonly Asset[]){',");
replace("   await fs.writeFile(path.join(out,'diagnostic-loader.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};", `   changed=changed.replace('  nativeImageLifetimes.set(image, lifetime);','  nativeImageLifetimes.set(image, lifetime); globalThis.__controlled.sampleResources?.("native-register");')
    .replace('return () => { lifetime.retired = true; delete lifetime.current; };','return () => { lifetime.retired = true; delete lifetime.current; globalThis.__controlled.sampleResources?.("native-retire"); };')
    + '\\nexport function taskNativeImageMembership(image:object){const value=nativeImageLifetimes.get(image);return !value?"UNREGISTERED":value.retired?"RETIRED":value.current?.()?"CURRENT":"STALE";}\\n';
   instrumented.at(-1).taskDiagnosticSha256=hash(changed);
   await fs.writeFile(path.join(out,'diagnostic-loader.ts.txt'),changed,{flag:'wx'});return {contents:changed,loader:'ts'};`);
replace("export {skyNativeImageIsCurrent} from './${sky}sky-artwork-loader';", "export {skyNativeImageIsCurrent,taskNativeImageMembership} from './${sky}sky-artwork-loader';");
replace("getFileSystemManager:()=>filesystem,request(o:any){", "getFileSystemManager:()=>filesystem,async navigateTo(o:any){w.navigationEvents.push({kind:'navigateTo',url:o.url});},request(o:any){");
replace("diagnostics:[],heldTransfers:[],holdDetail:false,saoClientEvents:[],stellarLoaders:[],", "diagnostics:[],heldTransfers:[],holdDetail:false,saoClientEvents:[],stellarLoaders:[],navigationEvents:[],notifications:[],opticalSourcesOpeningRef:{current:false},manualBasisRef:{current:null},");
replace("   hook(info:any){hooks.set(currentTag,info);},", "   hook(info:any){hooks.set(currentTag,info);w.sampleResources?.('hook-publish');},");
replace("    image.addEventListener('load',()=>{record.status='decoded';record.width=image.naturalWidth;record.height=image.naturalHeight;decodedPending--;if(blob)URL.revokeObjectURL(blob);},{once:true});", "    w.sampleResources?.('decode-start');image.addEventListener('load',()=>{record.status='decoded';record.width=image.naturalWidth;record.height=image.naturalHeight;decodedPending--;if(blob)URL.revokeObjectURL(blob);w.sampleResources?.('decode-complete');},{once:true});");
replace("    image.addEventListener('error',()=>{record.status='error';decodedPending--;if(blob)URL.revokeObjectURL(blob);},{once:true});", "    image.addEventListener('error',()=>{record.status='error';decodedPending--;if(blob)URL.revokeObjectURL(blob);w.sampleResources?.('decode-error');},{once:true});");
replace("o.success({data:files.get(o.filePath)!.slice(o.position??0,(o.position??0)+o.length)})", "o.success({data:files.get(o.filePath)!.slice(o.position??0,(o.position??0)+o.length)})"); // Shape pin, observation below is independent.
replace("completeGpuExecutor.toString()", "currentGpuExecutor.toString()");
replace("await page.evaluate(completeGpuExecutor);", "await page.evaluate(currentGpuExecutor);");
section(' const conditions:any[]=preparation.proposedConditions.map', ' const stableExecutor=', ` const conditions:any[]=[
 {name:'cold-north45',pose:[0,135,0],fov:45,reference:null,cold:true},
 {name:'landscape-centre-fade',pose:[0,80,0],fov:85,reference:null},
 {name:'full-sphere',pose:[0,80,0],fov:'DOME',reference:null},
 {name:'selected-overview',target:'M:51',fov:8,reference:'M:51'},
 {name:'selected-detail-failure-retry',target:'M:51',fov:.05,reference:'M:51',refinement:true},
 {name:'selected-offscreen',target:'M:51',offsetAz:90,fov:.05,reference:'M:51'},
 {name:'selected-warm-return',target:'M:51',fov:.05,reference:'M:51'},
 {name:'wide-w3',pose:[0,135,0],fov:139,reference:null,wideFieldEnabled:true},
 {name:'wide-galaxy',pose:[0,135,0],fov:139,reference:null,wideFieldEnabled:false},
 {name:'layers-off',pose:[0,135,0],fov:45,reference:null,wideFieldEnabled:false,constellationsEnabled:false,landscapeEnabled:false},
 {name:'layers-restored',pose:[0,135,0],fov:45,reference:null,wideFieldEnabled:false},
 {name:'red-mode',pose:[0,135,0],fov:45,reference:null,mode:'OBSERVATION'},
 {name:'ordinary-mode-return',pose:[0,135,0],fov:45,reference:null},
 ...['MOON','MERCURY','VENUS','MARS','JUPITER','SATURN','URANUS','NEPTUNE'].map(body=>({name:'body-browse-'+body.toLowerCase(),body,fov:body==='MOON'?1:.01,reference:null})),
 {name:'tracking-start',target:'M:51',fov:.05,reference:'M:51',tracking:true,timeSeconds:0},
 {name:'tracking-one-second',target:'M:51',fov:.05,reference:'M:51',tracking:true,timeSeconds:1},
 {name:'tracking-one-minute',target:'M:51',fov:.05,reference:'M:51',tracking:true,timeSeconds:60},
 {name:'tracking-preview-fifteen-minutes',target:'M:51',fov:.05,reference:'M:51',tracking:true,timeSeconds:900},
 {name:'tracking-cancel-original-time',target:'M:51',fov:.05,reference:'M:51',tracking:true,timeSeconds:0},
 {name:'source-back',target:'M:51',fov:.05,reference:'M:51',tracking:true,timeSeconds:0,sourceRoundTrip:true},
 {name:'hide-return',pose:[0,135,0],fov:45,reference:null,hideRoundTrip:true}
 ];
 await fs.writeFile(path.join(out,'conditions.json'),JSON.stringify({at,conditions,viewport:{width:390,height:844},scope:'Bounded sequential page/Scene development path. Caller controlled gesture/time/navigation delivery; native touch/sensors/WXML not emulated.'},null,2)+'\\n',{flag:'wx'});
`);
replace('const stableExecutor=({current,figures,at}:any)=>{','const stableExecutor=({current,figures,at,positions}:any)=>{');
replace('w.stable={current,figures,at};', 'w.stable={current,figures,at,positions};w.objectTracking=api.createSkyObjectTracking();');
replace("if(afterRelease?w.canvasNodeRef.current!==null:w.canvasNodeRef.current!==w.stableRuntimeOwners.node)fail('canvas node');", "if(afterRelease&&w.canvasNodeRef.current!==null)fail('released canvas node');");
replace("if(w.renderer!==w.stableRuntimeOwners.renderer||w.gl!==w.stableRuntimeOwners.gl)fail('renderer/gl');", "if(w.gl!==w.stableRuntimeOwners.gl)fail('gl ledger');");
section(" await fs.writeFile(path.join(out,'executor-journey.js.txt'),completeJourneyExecutor.toString()", ' const handleLeaks=', ` await fs.writeFile(path.join(out,'executor-journey.js.txt'),currentJourneyExecutor.toString(),{flag:'wx'});
 for(const condition of conditions){
  if(condition.sourceRoundTrip||condition.hideRoundTrip){
   const hidden=await page.evaluate(currentHideExecutor,{source:!!condition.sourceRoundTrip});
   await fs.writeFile(path.join(out,condition.name+'-hidden.json'),JSON.stringify(hidden,null,2)+'\\n',{flag:'wx'});
   assert.equal(hidden.presented,null);
   assert.equal(hidden.current.length,0,'registered images current after hide');
   await page.evaluate(currentShowExecutor);
  }
  const r=await page.evaluate(currentJourneyExecutor,{condition});
  const captured=r.passes.map((p:any)=>{const {rgba,capture,...rest}=p;return {...rest,rgbaSha256:hash(Buffer.from(rgba,'base64')),pngSha256:hash(Buffer.from(capture.split(',')[1],'base64'))};});
  for(const p of r.passes){const name=condition.name+'-'+p.label;await fs.writeFile(path.join(out,name+'.rgba'),Buffer.from(p.rgba,'base64'),{flag:'wx'});await fs.writeFile(path.join(out,name+'.png'),Buffer.from(p.capture.split(',')[1],'base64'),{flag:'wx'});}
  const row={...r,passes:captured};rows.push(row);await fs.writeFile(path.join(out,condition.name+'.json'),JSON.stringify(row,null,2)+'\\n',{flag:'wx'});
  assert.equal(row.gates.localOpticalFixtureEnabled,false);assert.deepEqual(row.gpuFailures,[]);
  console.log(JSON.stringify({output:relative,name:condition.name,submits:row.passes.length,rgbaModel:row.ready.resources.ownerRgbaModel,leases:row.ready.resources.leases,at:row.ready.at}));
 }
 await fs.writeFile(path.join(out,'executor-final.js.txt'),currentFinalExecutor.toString(),{flag:'wx'});
 const final=await page.evaluate(currentFinalExecutor);await fs.writeFile(path.join(out,'actual-final-owner.json'),JSON.stringify(final,null,2)+'\\n',{flag:'wx'});
`);
replace('if(final.afterHide.nativeCurrent.some((i:any)=>i.current))', "if(final.afterHide.nativeCurrent.some((i:any)=>i.membership==='CURRENT'))");
section(' const comparisons=[];', ' for(const r of sourceBindings)', " const comparisons=final.comparisons??[];\n");
replace("  scope:'One sameCanvas five legal camera state lane", "  scope:'Current continuous page/Scene journey: actual current selected demand/render guard, layer policy, source-credit/navigation action, tracking acceptance/camera command, lifecycle/Scene/shared cache, task resource observer and real encoded bytes. Controlled React/Taro/MapFS/clock/navigation delivery. Native WXML/phone/physical memory/final quality and 200DAU remain unverified. Historical scaffold scope: One sameCanvas five legal camera state lane");
replace("const toolFiles=[process.execPath", "inputs.push(await bind('.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-current-scene-browser-2026-10-03.ts'),await bind('.codex/work-items/cloud-sky-native-2026-09-22/scripts/build-current-scene-journey-2026-10-03.mjs'));\nconst toolFiles=[process.execPath");
replace("export {projectAdoptedSkyCatalog,presentSkyTime,attachSkyCatalog,resolveSkyDeepSkyScene,DeepSkyImageryService,SdssOpticalImageryService,SaoPublicationService};`;", "import {buildDeepSkyScene} from './workers/miniapp-api/src/deep-sky-scene-provider';\nimport {celestialObjectPosition} from './workers/miniapp-api/src/celestial-object-position';\nimport {exactSkyObservationFrame} from './${sky}sky-observation-frame';\nexport {projectAdoptedSkyCatalog,presentSkyTime,attachSkyCatalog,resolveSkyDeepSkyScene,DeepSkyImageryService,SdssOpticalImageryService,SaoPublicationService,buildDeepSkyScene,celestialObjectPosition,exactSkyObservationFrame};`;");
replace(' const presentedSceneCurrent=input.pageVisible,nativeCanvasMounted=input.pageVisible,canvasSize=input.canvasSize,canvasError=null,sdssOptical=result.sdssOptical,canvasGenerationRef=globalThis.__controlled.canvasGenerationRef;',` const w=globalThis.__controlled,reportData=input.report,rawReportData=input.report,pageVisible=input.pageVisible,row={at:input.at},mode=input.mode??'DAY',timePlaying=false,timeIntent={runStartAt:null};
 const report={data:{dataState:'FRESH'},isError:false},manualBasis=w.manualBasisRef.current,devicePose={basis:input.liveBasis},orientation={presented:{current:input.liveBasis}};
 const canvasSize=input.canvasSize,canvasError=w.canvasError??null,sdssOptical=result.sdssOptical,canvasGenerationRef=w.canvasGenerationRef;
 \${getVariable('orientationData')}
 \${getVariable('presentedSceneCurrent')}
 \${getVariable('nativeCanvasMounted')}`);
if(process.argv.includes('--check')){assert.equal(fs.readFileSync(target,'utf8'),s,'generated runner matches current saved source');console.log('current runner migration verified');}
else {fs.writeFileSync(target,s,{flag:'wx'});console.log(path.basename(target));}
