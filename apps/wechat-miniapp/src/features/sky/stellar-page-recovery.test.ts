import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {skyImageRecoveryTestOwner} from './sky-image-recovery-test-support';
import { skySceneHasContent } from "./sky-stellar-scene";
import { createSkyBrowsingCamera } from "./sky-browsing-camera";
import { createSkyObservationTime, skyPresentedTimeCurrent } from "./sky-observation-time";
import { OBSERVATION_FRAME_FORMAT, SKY_PLANET_ORDER } from "@starward/miniapp-contracts";
import { drawSkyScene } from "./sky-scene-render";
import { skyLandscapeVisibleInView } from "./sky-landscape-mask";
import { createSkyViewBasis } from "./sky-view-projection";
import type { ResolvedSkyReport } from "./sky-stellar-scene";
import type { SkyRenderSurface } from "./sky-render-surface";
import type { SkyPickSnapshot } from "./sky-object-picking";
const source=ts.createSourceFile("sky.tsx",readFileSync(new URL("./spot-sky-page.tsx",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function expression(name:string){let text="";function visit(node:ts.Node){if(ts.isVariableDeclaration(node)&&node.name.getText(source)===name)text=node.initializer!.getText(source);ts.forEachChild(node,visit);}visit(source);assert.ok(text);return text;}
function run(text:string,scope:Record<string,unknown>){return vm.runInNewContext(ts.transpileModule("("+text+");",{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,scope);}

// One current page recovery boundary for all image consumers. The detailed
// Context/time/lifecycle guard is covered by sky-controls-recovery; these tests
// supply its live result and execute the actual shared recovery declarations.
function recoveryScope(bindings:Record<string,unknown>){
  assert.equal(typeof bindings.skyDisplayCurrent,"function");
  const scope=vm.createContext(bindings);
  return Object.assign(scope,run(`(()=>{const recoverSkyResource=${expression("recoverSkyResource")};
    return {recoverSkyResource};})()`,scope));
}
test("static cold and refresh failure use floating info, with retry owned by the actual page",()=>{
 let effect="";function visit(node:ts.Node){if(ts.isCallExpression(node)&&node.expression.getText(source)==="useEffect"&&node.arguments[0]?.getText(source).includes('dedupeKey: `stellar-catalog:'))effect=node.arguments[0].getText(source);ts.forEachChild(node,visit);}visit(source);assert.ok(effect);
 for(const retained of [false,true]){
 const notifications:any[]=[];
 run(effect,{pageVisible:true,stellarReference:{catalogVersion:"v2",catalogHash:"hash"},stellarCatalog:{isFetching:false,isError:!retained,refreshError:retained?Error("offline"):undefined,data:retained?{dataState:"FRESH"}:undefined},notify:(n:unknown)=>notifications.push(n)})();
 assert.equal(notifications.length,1);assert.equal(notifications[0].placement,"floating");assert.equal(notifications[0].tone,"info");
 }
 let reports=0,stars=0,current=true;
 const autoRestoreAttemptedRef={current:true};
 const reportRecoveryRef={current:{pageVisible:true,contextComplete:true,activeContext:{},
   refetch:()=>reports++,stellarReference:{},refetchStars:()=>stars++}};
 const useCallback=(callback:unknown)=>callback;
 const canRetryReport=run(expression("canRetryReport"),{useCallback,reportRecoveryRef,
   skyDisplayCurrent:()=>current,contextSession:{canRequest:()=>true}});
 const retryReport=run(expression("retryReport"),{useCallback,reportRecoveryRef,autoRestoreAttemptedRef,canRetryReport});
 const retry=run(expression("retrySkyData"),{useCallback,retryReport,reportRecoveryRef});
 retry();assert.equal(reports,1);assert.equal(stars,1);assert.equal(autoRestoreAttemptedRef.current,false);
 current=false;retry();assert.equal(reports,1);assert.equal(stars,1);
});
function startTouch(skySceneReady:boolean){
 const ref={current:null};
 const at="2026-09-19T13:00:00.000Z",observationTime=createSkyObservationTime();
 observationTime.bind("test-time",at,{startAt:at,endAt:at});
 const scope={zoomRef:{current:45},presentedFov:45,viewportInsets:{top:0,bottom:0},skyLandscapeVisibleInView,mode:"NIGHT",pickSkyCatalogName:()=>null,pickSkyControlName:()=>null,__MINIAPP_SKY_FEEDBACK_ID__:"",orientationController:{snapshot:()=>({alignment:{mode:"automatic"}})},skySceneReady,presentedSceneCurrent:true,
 skyTimeIntentCurrent:()=>true,skyPresentedTimeCurrent,observationTime,
 presentedSkyFrameRef:{current:{nativeCanvasGeneration:1,frameAt:at}},canvasGenerationRef:{current:1},
 paintedSkyObjectsRef:{current:null},navigationRequestRef:{current:null},
 selectedCatalogObjectRef:{current:null},selectedTargetIdRef:{current:null},orientationObjectListOpenRef:{current:false},datePickerOpenRef:{current:false},
 skyInteractionRevision:0,contextSession:{},activeContext:{},timeBinding:"test-time",committedAt:at,
 recordSkyFeedback:()=>{},
 browsingCamera:createSkyBrowsingCamera(),manualBasisRef:{current:null},
 objectTracking:{snapshot:()=>({target:null})},
 presentedCenter:{x:195,y:390},
 selectedCatalogObject:null,selectedTargetId:null,orientationObjectListOpen:false,datePickerOpen:false,timeSaving:false,
 skyTouchPoint:()=>({x:100,y:100}),skyTouchDistance:()=>null,skyTapRef:ref,verticalFovDeg:45,currentViewBasis:{},INITIAL_MANUAL_SKY_VIEW:{},canvasSize:{width:390},manualBasis:null,followRequested:false,compassLifecycle:{active:false},sensorBasis:null};
 run(expression("onSkyTouchStart"),scope)({touches:[{}]});
 return ref;
}
test("missing stars do not disable touch entry for independently valid targets",()=>{
 const at="2026-09-19T13:00:00.000Z";
 const skySceneReady=skySceneHasContent({skyScene:{state:"UNAVAILABLE",frames:[]},
   targetFrames:[{at,targets:[{}]}]} as any,at);
 assert.equal(skySceneReady,true);
 const ref=startTouch(skySceneReady);
 assert.ok(ref.current,"the actual page must allow the touch to enter its existing gesture lifecycle");
});

test("independent solar geometry remains drawable and touchable when both catalogs fail and legacy targets are empty",()=>{
 const at="2026-09-19T13:00:00.000Z";
 const basis=createSkyViewBasis(0,135,0)!;
 const report={hourly:[{at,sunAzimuthDeg:0,sunAltitudeDeg:45,sunAngularDiameterDeg:.53,
   moonAzimuthDeg:0,moonAltitudeDeg:45,moonAngularDiameterDeg:.5,moonIllumination:.5,
   planets:SKY_PLANET_ORDER.map(body=>({body,azimuthDeg:0,altitudeDeg:body==="VENUS"?45:-10,
     angularDiameterDeg:.02,illuminatedFraction:.5,visualMagnitude:-4,ringTiltDeg:null,ringPoleEnu:null}))}],
   skyScene:{state:"UNAVAILABLE",catalog:null,publication:null,frames:[],
     deepSky:{state:"UNAVAILABLE",catalog:null,frames:[]}},
   targetFrames:[{at,targets:[]}]} as unknown as ResolvedSkyReport;
 let snapshot:SkyPickSnapshot|null=null;
 const surface=new Proxy({}, {get:(_target,key)=>key==="sun"||key==="moon"||key==="planet"?()=>true:()=>undefined}) as SkyRenderSurface;
 drawSkyScene(surface,report,at,null,null,390,844,"NIGHT",value=>{snapshot=value;},undefined,3,null,basis);
 const painted=snapshot as SkyPickSnapshot|null;
 assert.ok(painted);
 assert.deepEqual(painted.objects.map(object=>object.reference),["SOLAR:SUN","SOLAR:MOON","PLANET:VENUS"],
   "the actual production painter must have independent content, not just a successful empty fixture");
 const ready=(data:ResolvedSkyReport)=>run(expression("skySceneReady"),{skySceneHasContent,
   orientationData:data,row:{at},constellationFrame:null});
 const drawReady=(data:ResolvedSkyReport)=>run(expression("sceneReady"),{skySceneHasContent,
   selectedManualBasis:basis,pose:null,canvasData:data,row:{at},
   constellationFrame:null});
 assert.equal(ready(report),true,"independent current geometry cannot depend on either external catalog or legacy suggestions");
 assert.equal(drawReady(report),true,"the actual draw request must agree with the gesture gate");
 assert.ok(startTouch(ready(report)).current);
 for(const targetFrames of [undefined,[],[{at:"2026-09-19T14:00:00.000Z",targets:[]}],
   [report.targetFrames[0]!,report.targetFrames[0]!]]){
   const independent={...report,targetFrames} as ResolvedSkyReport;
   assert.equal(ready(independent),true,"absent, stale or ambiguous suggestions cannot revoke exact independent astronomy");
   assert.equal(drawReady(independent),true);
   assert.ok(startTouch(ready(independent)).current);
 }
 for(const hourly of [[],[{...report.hourly[0]!,at:"2026-09-19T14:00:00.000Z"}],
   [report.hourly[0]!,report.hourly[0]!],[{...report.hourly[0]!,sunAltitudeDeg:null}]]){
   const invalid={...report,hourly};
   assert.equal(ready(invalid),false,"missing, stale, ambiguous or invalid geometry must not invent a usable solar frame");
   assert.equal(drawReady(invalid),false);
   assert.equal(startTouch(ready(invalid)).current,null);
 }
});

test("independent observation frames enable the existing view while invalid time or rotation keeps gestures unavailable",()=>{
 const at="2026-09-23T00:00:00.000Z";
 const frame={format:OBSERVATION_FRAME_FORMAT,at,observer:{latitude:22.54,longitude:113.95,elevationM:50},
   equatorialToEnu:[1,0,0,0,1,0,0,0,1] as const};
 const report={hourly:[{at}],observationFrames:[frame],targetFrames:[],
   skyScene:{state:"UNAVAILABLE",frames:[],deepSky:{state:"UNAVAILABLE",catalog:null,frames:[]}}} as unknown as ResolvedSkyReport;
 const ready=(data:ResolvedSkyReport)=>run(expression("skySceneReady"),{skySceneHasContent,orientationData:data,row:{at},constellationFrame:null});
 const drawReady=(data:ResolvedSkyReport)=>run(expression("sceneReady"),{skySceneHasContent,canvasData:data,row:{at},
   selectedManualBasis:createSkyViewBasis(0,135,0),pose:null,constellationFrame:null});
 assert.equal(ready(report),true);
 assert.equal(drawReady(report),true);
 assert.ok(startTouch(ready(report)).current);
 for(const observationFrames of [undefined,[],[{...frame,at:"2026-09-23T01:00:00.000Z"}],
   [frame,frame],[{...frame,equatorialToEnu:[-1,0,0,0,1,0,0,0,1]}]]){
   const invalid={...report,observationFrames} as ResolvedSkyReport;
   assert.equal(ready(invalid),false,"unavailable, stale, duplicate or mirrored independent frames cannot invent usable geometry");
   assert.equal(drawReady(invalid),false);
   assert.equal(startTouch(ready(invalid)).current,null);
 }
});

test("fulfilled stale constellation cache exposes the actual page retry without erasing retained art",()=>{
  const constellationCatalog={isError:false,refreshError:undefined,data:{dataState:"STALE_USABLE"},refetch:()=>{requests++;}};
  let requests=0,images=0,resets=0,gpuFailed=false,current=true;
  const artwork={failed:false,retryImages:()=>{images++;return gpuFailed;}};
  const canvasLifecycle={resize:()=>resets++};
  const recovery=skyImageRecoveryTestOwner();
  const scope=recoveryScope({constellationCatalog,artwork,canvasLifecycle,skyDisplayCurrent:()=>current,
    useSkyImageRecovery:recovery.useSkyImageRecovery,skyResourcesActive:true,constellationsEnabled:true,skyResourcesPaused:false});
  const retry=run(expression("retryConstellations"),scope);
  assert.equal(run(expression("constellationFailed"),{constellationsEnabled:true,artwork,constellationCatalog}),true);
  assert.equal(run(expression("constellationFailed"),{constellationsEnabled:false,artwork,constellationCatalog}),false);
  retry();
  assert.equal(requests,1);assert.equal(images,1);assert.equal(resets,0);
  constellationCatalog.data.dataState="FRESH";artwork.failed=true;
  retry();
  assert.equal(requests,2,"a missing old hash asset must refresh the immutable catalog too");
  assert.equal(resets,0,"download failure must keep independent ready artwork and other image owners");
  assert.equal(images,2,"explicit retry asks the shared loader to restart only failed image requests");
  gpuFailed=true;retry();
  assert.equal(requests,3);assert.equal(images,3);
  assert.equal(resets,1,"explicit retry releases the failed shader/native-image owner");
  current=false;assert.equal(retry(),false);assert.equal(requests,3);assert.equal(images,3);assert.equal(resets,1);
  current=true;
  run(expression('retryConstellations'),{...scope,skyResourcesPaused:true});
  assert.equal(retry(),false);assert.equal(requests,3);assert.equal(images,3);assert.equal(resets,1);
});

test("published native image hooks preserve the shared internal recovery result",()=>{
  for(const file of ["use-sky-target-optical.ts","use-sky-wide-field-w3.ts","use-sky-optical-hips.ts",
    "use-sky-galactic-image.ts","use-sky-body-image.ts","use-sky-landscape.ts"]){
    const hookSource=ts.createSourceFile(file,readFileSync(new URL(file,import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
    let initializer="";function visit(node:ts.Node){if(ts.isVariableDeclaration(node)&&node.name.getText(hookSource)==="retry")initializer=node.initializer!.getText(hookSource);ts.forEachChild(node,visit);}visit(hookSource);assert.ok(initializer,file);
    for(const gpuFailed of [false,true]){
      let retries=0,refetches=0,maskRetries=0;
      const retry=run(initializer,{useSkyImageRecovery:skyImageRecoveryTestOwner().useSkyImageRecovery,
        trialActive:true,wanted:true,wantedImage:true,wantedWide:true,discover:true,paused:false,
        ownerRef:{current:{retry(){maskRetries++;}}},images:{retryImages(){retries++;return gpuFailed;}},
        manifest:{refetch(){refetches++;}},indexes:{refetch(){refetches++;}}});
      assert.equal(retry(),gpuFailed,file+" must pass the actual loader's GPU recovery requirement to its consumer");
      assert.equal(retries,1);assert.equal(refetches,file==="use-sky-optical-hips.ts"?2:1);
      assert.equal(maskRetries,file==='use-sky-landscape.ts'?1:0);
    }
  }

});

