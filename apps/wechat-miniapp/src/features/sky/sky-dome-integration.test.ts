import { resolvedSkyBodyReferences } from "./sky-body-label-presentation";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { skyMenuProps } from "./sky-menu-test-support";
import { createSkyDisclosureCommands } from "./sky-disclosure-commands";
import {createSkyBrowsingCamera} from "./sky-browsing-camera.ts";
import {resolveSkyCanvasView} from "./sky-canvas-view.ts";
import {liveSkyOpticalCompletion,sameSkyOpticalCompletion} from "./sky-sdss-optical-completion.ts";
import {copySkyDeepAuxiliaryDecisions,sameSkyDeepAuxiliaryDecisions} from "./sky-deep-auxiliary-visibility.ts";
import {clampSkyFieldOfView,remapSkyFieldOfView,skyDomeFieldOfView,skyDomeProgress} from "./sky-zoom.ts";
import {createSkyViewBasis,projectSkyDirection} from "./sky-view-projection.ts";
import {skyViewportCenter,NO_SKY_INSETS,skyInsetsFromControls} from "./sky-viewport.ts";
import {selectNotification} from "../../state/notification.ts";
import {skyPageCanvasTestFrame,skyPageCanvasTestBindings} from "./sky-optical-page-test-support";
import {createSkyOrientationController} from "./sky-orientation-controller";
import type {DeviceMotionEvent} from "./compass-lifecycle";
import {createSkyObservationTime} from "./sky-observation-time";
import {createSkyContextSession} from "./sky-context-session";
import {sameContextVersion} from "../../services/observation-context-version";
import type {ObservationContext} from "@starward/miniapp-contracts";

let pageSource=readFileSync(process.env.SKY_CALIBRATION_SOURCE??new URL('./spot-sky-page.tsx',import.meta.url),'utf8');
if(process.env.MUTATE_SKY_VIEWPORT_CENTER==='1')pageSource=pageSource.replace('frame.deepSkyImage, basis, center','frame.deepSkyImage, basis');
if(process.env.MUTATE_SKY_VIEWPORT_LIFECYCLE==='1')pageSource=pageSource
  .replace('if (!viewportActiveRef.current || !viewportMountedRef.current) return;', '')
  .replaceAll('!viewportActiveRef.current || !viewportMountedRef.current || revision !==', 'revision !==')
  .replace('useEffect(() => { measureBottomControls(); }, [measureBottomControls, skyInlineNotice, skyInlineNoticeResidual]);',
    'useEffect(() => {}, [measureBottomControls, skyInlineNotice, skyInlineNoticeResidual]);');
if(process.env.MUTATE_SKY_MANUAL_PRIORITY==='1')pageSource=pageSource.replace('live.alignment.mode === "editing" ? "locked" : manualBasisRef.current ? "manual" : live.alignment.mode === "needs-alignment" ? "locked" : "follow"',
  'live.alignment.mode === "editing" || live.alignment.mode === "needs-alignment" ? "locked" : manualBasisRef.current ? "manual" : "follow"');
const source=ts.createSourceFile('sky.tsx',pageSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let paint='',presented='',begin='',measure='';
function visit(node:ts.Node){
  if(ts.isCallExpression(node)&&node.expression.getText(source)==='createSkyCanvasLifecycle'){
    const options=node.arguments[0] as ts.ObjectLiteralExpression;
    const property=options.properties.find(p=>p.name?.getText(source)==='paint') as ts.PropertyAssignment;
    paint=property.initializer.getText(source);
    presented=(options.properties.find(p=>p.name?.getText(source)==='presented') as ts.PropertyAssignment).initializer.getText(source);
  }
  if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='beginSkyCalibration')begin=node.initializer!.getText(source);
  if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='measureBottomControls')measure=node.initializer!.getText(source);
  ts.forEachChild(node,visit);
}visit(source);
assert.ok(paint&&begin);

// Execute the page's accepted-completion port as well as its actual camera
// writer. The renderer remains controlled; this does not claim native pixels.
function acceptedPagePaint(bindings:Record<string,unknown>){
  const context=vm.createContext(skyPageCanvasTestBindings({canvasSurfaceRef:{current:{present(){}}},resolveSkyCanvasView,liveSkyOpticalCompletion,sameSkyOpticalCompletion,
    copySkyDeepAuxiliaryDecisions,sameSkyDeepAuxiliaryDecisions,
    pendingSkyPaintRef:{current:null},canvasDrawRevisionRef:{current:0},
    automaticContributionGroupsRef:{current:0},acceptSkyCalibrationRef:{current:()=>{}},
    setCanvasSize:()=>{},publishAcceptanceSkySceneInspection:()=>{},setCanvasError:()=>{},setArtworkContributionUnavailable:()=>{},...bindings}));
  const compile=(expression:string)=>vm.runInContext(ts.transpileModule('('+expression+')',
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
  const draw=compile(paint),accept=compile(presented);
  return (renderer:unknown,input:unknown,size:unknown)=>{
    const frame=skyPageCanvasTestFrame({mode:"NIGHT",...input as object});
    draw(renderer,frame,size,()=>accept(frame,size));
  };
}

test("actual page paint uses dome basis for drawing and last-painted calibration reference; locked stale frame uses observing scale",()=>{
  const raw=createSkyViewBasis(31,100,25)!;
  const actual:Array<{fov:number,basis:any}>=[];
  const orientation={latestPresentation:{current:{presentationRevision:0,alignment:{mode:'auto',view:raw}}},presented:{current:null as any}};
  const fov=skyDomeFieldOfView(390,844);
  const sandbox={orientation,orientationController:{snapshot:()=>orientation.latestPresentation.current},manualBasisRef:{current:null},
    paintedSkyObjectsRef:{current:null},SKY_VERTICAL_FOV_DEG:45,clampSkyFieldOfView,skyDomeProgress,
    browsingCamera:createSkyBrowsingCamera(),zoomRef:{current:fov},reducedMotionRef:{current:false},
    objectTracking:{snapshot:()=>({target:null})},
    setPresentedCamera(){},resolvedSkyBodyReferences, setPresentedSkyFrame:(change:any)=>change(null),browsingTimerRef:{current:null},
    viewportInsetsRef:{current:NO_SKY_INSETS},skyViewportCenter,
    canvasGenerationRef:{current:1},EMPTY_SKY_IMAGES:new Map(),
    drawSkyScene:(_ctx:any,_data:any,_at:any,_heading:any,_pose:any,_w:any,_h:any,_mode:any,painted:any,done:any,fov:number,_image:any,basis:any)=>{actual.push({fov,basis});painted({objects:[]},{sdssOptical:null,deepSkyImage:null});done();}};
  const fn=acceptedPagePaint(sandbox);
  const frame={orientationRevision:0,pose:{basis:raw},verticalFovDeg:fov,sceneReady:true};
  fn({},frame,{width:390,height:844});
  assert.ok(actual[0]!.basis.forward[2]>.999999999);
  assert.equal(orientation.presented.current,actual[0]!.basis);
  const frozen=orientation.presented.current;
  orientation.latestPresentation.current={presentationRevision:1,alignment:{mode:'editing',view:frozen}};
  fn({},frame,{width:390,height:844});
  assert.equal(actual[1]!.fov,45,"queued pre-calibration wide frame cannot undo observing scale");
  assert.equal(actual[1]!.basis,frozen,"freezes the direction the user actually saw");
  // Stopping a previously calibrated sensor leaves needs-alignment in its
  // owner; that must not override the user's explicit manual browsing intent.
  orientation.latestPresentation.current={presentationRevision:2,alignment:{mode:'needs-alignment',view:raw}};
  sandbox.manualBasisRef.current=raw as any;
  fn({},frame,{width:390,height:844});
  assert.ok(actual[2]!.basis.forward[2]>.999999999,"manual full dome still faces zenith after a calibrated sensor stops");
});

test("actual canvas writer shares a stable full-canvas horizon with labels while controls overlay it",()=>{
  const width=844,height=390,insets={top:105,bottom:180};
  const raw=createSkyViewBasis(70,90,20)!;
  let rendered:any=null;
  const actualCamera={basis:raw,fov:45,center:{x:0,y:0}};
  const sandbox={orientation:{latestPresentation:{current:{presentationRevision:0,alignment:{mode:'auto',view:raw}}},presented:{current:null}},
    orientationController:{},manualBasisRef:{current:null},paintedSkyObjectsRef:{current:null},SKY_VERTICAL_FOV_DEG:45,
    clampSkyFieldOfView,skyDomeProgress,skyViewportCenter,browsingCamera:createSkyBrowsingCamera(),
    objectTracking:{snapshot:()=>({target:null})},
    zoomRef:{current:skyDomeFieldOfView(width,height)},viewportInsetsRef:{current:insets},reducedMotionRef:{current:false},
    canvasGenerationRef:{current:1},EMPTY_SKY_IMAGES:new Map(),
    browsingTimerRef:{current:null},setPresentedCamera:(fn:any)=>Object.assign(actualCamera,fn(null)),
    resolvedSkyBodyReferences, setPresentedSkyFrame:(change:any)=>change(null),
    drawSkyScene:(_ctx:any,_data:any,_at:any,_heading:any,_pose:any,w:number,h:number,_mode:any,painted:any,done:any,fov:number,_image:any,basis:any,center:any)=>{
      rendered={w,h,fov,basis,center};painted({objects:[]},{sdssOptical:null,deepSkyImage:null});done();
    }};
  const fn=acceptedPagePaint(sandbox);
  fn({}, {orientationRevision:0,pose:{basis:raw},verticalFovDeg:45,sceneReady:true},{width,height});
  assert.deepEqual({...rendered.center},{x:width/2,y:height/2},"controls must not push the renderer's center");
  assert.equal(actualCamera.center,rendered.center,"labels receive the same center as actual painting");
  for(let az=0;az<360;az++){
    const p=projectSkyDirection(az,0,rendered.basis,width,height,rendered.fov,rendered.center)!;
    assert.ok(p&&p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height);
  }
});

test("actual native measurement includes menu, panels, native capsule and notifications, and rejects superseded results",()=>{
  const callbacks:Array<(results:any[])=>void>=[];const selected:string[]=[];const updates:any[]=[];
  const query:any={select:(selector:string)=>{selected.push(selector);return query;},boundingClientRect:()=>query,exec:(callback:any)=>callbacks.push(callback)};
  const sandbox={useCallback:(callback:any)=>callback,viewportMeasurementRevision:{current:0},viewportActiveRef:{current:true},viewportMountedRef:{current:true},CANVAS_ID:'spot-night-sky-scene',skyInsetsFromControls,
    navigationInsets:{capsuleBottom:65},Taro:{nextTick:(fn:any)=>fn(),createSelectorQuery:()=>query,getWindowInfo:()=>({windowHeight:830})},
    setViewportInsets:(fn:any)=>updates.push(fn(NO_SKY_INSETS))};
  const fn=vm.runInNewContext(ts.transpileModule('('+measure+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
  fn();fn();
  const rects=[{top:0,bottom:830,height:830},{top:70,bottom:114,height:44},{top:620,bottom:818,height:198},
    {top:125,bottom:205,height:80},{top:70,bottom:310,height:240},null];
  callbacks[0]!(rects);assert.equal(updates.length,0);
  callbacks[1]!(rects);assert.deepEqual(updates,[{top:318,bottom:218}]);
  assert.ok(selected.includes('.sky-navigation-actions')&&selected.includes('.sky-control-panel')&&selected.includes('#spot-night-sky-scene')&&selected.includes('.sky-quick-settings'));
  assert.ok(!selected.includes('#sky-bottom-controls')&&!selected.includes('.sky-orientation-back-layer'),"removed controls cannot remain the occlusion authority");
  fn();sandbox.viewportActiveRef.current=false;
  callbacks[2]!(rects);assert.equal(updates.length,1,"an in-flight callback after hide is rejected");
  fn();assert.equal(callbacks.length,3,"an effect after hide must not issue a new query");
  sandbox.viewportActiveRef.current=true;sandbox.viewportMountedRef.current=false;
  fn();assert.equal(callbacks.length,3,"unmounted page cannot measure");
  sandbox.viewportMountedRef.current=true;
  let pendingTick:(()=>void)|null=null;
  sandbox.Taro.nextTick=(fn:any)=>{pendingTick=fn;};
  fn();sandbox.viewportActiveRef.current=false;
  (pendingTick as unknown as ()=>void)();assert.equal(callbacks.length,3,"hide before native nextTick also rejects the query");
});

test("actual canvas resize preserves local zoom while menu occlusion settles input without reframing",()=>{
  let resizeEffect='',occlusionEffect='';
  const inspect=(node:ts.Node)=>{
    if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'){
      const body=node.arguments[0]?.getText(source)??'';
      if(body.includes('remapSkyFieldOfView'))resizeEffect=node.getText(source);
      const dependencies=node.arguments[1];
      if(dependencies && body.includes('settleSkyGestureForViewportRef.current()') && ts.isArrayLiteralExpression(dependencies) &&
        dependencies.elements.some(dependency=>dependency.getText(source)==='viewportInsets'))occlusionEffect=node.getText(source);
    }
    ts.forEachChild(node,inspect);
  };inspect(source);assert.ok(resizeEffect&&occlusionEffect);
  let fov=.05,settled=0,cancelled=0,zoomWrites=0;
  const bindings={
    __MINIAPP_SKY_FEEDBACK_ID__:"",
    useEffect:(fn:()=>void)=>fn(),canvasSize:{width:780,height:390},viewportInsets:{top:180,bottom:240},
    previousViewportRef:{current:{width:390,height:780}},settleSkyGestureForViewportRef:{current:()=>settled++},
    recordSkyFeedback:()=>{},
    cancelSkyGestureRef:{current:()=>{cancelled++;fov=.18;}},
    setVerticalFovDeg:(change:(value:number)=>number)=>{zoomWrites++;fov=change(fov);},
    remapSkyFieldOfView,clampSkyFieldOfView,
  };
  const execute=(effect:string)=>vm.runInNewContext(ts.transpileModule(effect,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,bindings);
  execute(resizeEffect);
  assert.equal(settled,1);
  assert.equal(cancelled,0,"layout movement is not a native touch cancellation");
  assert.equal(fov,.05);
  assert.equal(zoomWrites,1,"a physical canvas resize may update the projection scale");
  execute(occlusionEffect);
  assert.equal(settled,2,"a newly covered gesture is settled");
  assert.equal(zoomWrites,1,"opening a menu must not write the camera scale");
  assert.equal(fov,.05);
});

test("actual Sky subscriptions remeasure when its inline notice grows or disappears, without following unrelated notices",()=>{
  const declarations:string[]=[];let effect='';
  const inspect=(node:ts.Node)=>{
    if(ts.isVariableDeclaration(node)&&['skyInlineNotice','skyInlineNoticeResidual'].includes(node.name.getText(source)))declarations.push('const '+node.getText(source)+';');
    if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'&&node.arguments[1]?.getText(source).includes('skyInlineNotice'))effect=node.getText(source);
    ts.forEachChild(node,inspect);
  };inspect(source);assert.equal(declarations.length,2);assert.ok(effect);
  let queue:any[]=[],previous:unknown[]|undefined,measurements=0;
  const run=vm.runInNewContext(ts.transpileModule('(()=>{'+declarations.join('\n')+effect+';})',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
    useAppStore:(selector:any)=>selector({notifications:queue}),selectNotification,
    measureBottomControls:()=>measurements++,
    useEffect:(fn:()=>void,deps:unknown[])=>{if(!previous||deps.some((value,i)=>value!==previous![i]))fn();previous=deps;},
  });
  const first={id:'sky-notice',owner:'spot-night',placement:'inline',tone:'info',createdAt:1,title:'资料说明',body:'正文'};
  run();assert.equal(measurements,1);
  queue=[first];run();assert.equal(measurements,2,"appearance requests native measurement");
  queue=[{...first,body:'新增一段较长的正文，实际区域可能变高'}];run();assert.equal(measurements,3,"content replacement requests measurement");
  queue=[...queue,{...first,id:'other',owner:'map',createdAt:2}];run();assert.equal(measurements,3);
  queue=[];run();assert.equal(measurements,4,"dismissal must release the old top inset");
});

test("actual calibration action changes camera intent only after a current painted frame can freeze",async()=>{
  const h=await calibrationEntry(45);
  try{
    const gesture={dragged:true};h.sandbox.skyTapRef.current=gesture;
    const checkpoint=h.sandbox.browsingCamera.checkpoint();
    h.sandbox.presentedSceneCurrent=false;h.begin();
    assert.equal(h.controller.snapshot().alignment.mode,'auto');
    assert.strictEqual(h.sandbox.browsingCamera.checkpoint(),checkpoint);
    assert.strictEqual(h.sandbox.skyTapRef.current,gesture);
    h.sandbox.presentedSceneCurrent=true;
    const begin=h.controller.begin;h.controller.begin=()=>false;h.begin();
    assert.strictEqual(h.sandbox.browsingCamera.checkpoint(),checkpoint,'failed sensor begin preserves the camera');
    assert.strictEqual(h.sandbox.skyTapRef.current,gesture);
    h.controller.begin=begin;h.begin();
    assert.equal(h.controller.snapshot().alignment.mode,'editing');assert.equal(h.sandbox.skyTapRef.current,null);
  }finally{h.dispose();}
});

// Use the actual page entry and accepted paint with the real orientation and
// browsing owners. The renderer and platform are controlled: these checks do
// not establish native composition or physical sensor accuracy.
async function calibrationEntry(initialFov:number) {
  let now=1000, motion:((event:DeviceMotionEvent)=>void)|undefined;
  const orientation={presented:{current:null as ReturnType<typeof createSkyViewBasis>},
    latestPresentation:{current:null as ReturnType<ReturnType<typeof createSkyOrientationController>['snapshot']>|null}};
  const orientationController=createSkyOrientationController({platform:'android',presented:()=>orientation.presented.current,
    changed:value=>{orientation.latestPresentation.current=value;},clock:{now:()=>now,schedule:()=>0,cancel(){}},
    port:{onDeviceMotionChange:fn=>{motion=fn;},offDeviceMotionChange(){},async startDeviceMotionListening(){},async stopDeviceMotionListening(){},
      onCompassChange(){},offCompassChange(){},async startCompass(){},async stopCompass(){}}});
  await orientationController.start();motion!({alpha:31,beta:-100,gamma:25});
  const raw=orientationController.snapshot().pose!.basis;
  const at='2026-10-10T13:00:00.000Z', context={contextId:'ctx:calibration' as ObservationContext['contextId'],contextFingerprint:'current',contextRevision:1};
  const data={context}, camera=createSkyBrowsingCamera();
  const observationTime=createSkyObservationTime();
  observationTime.bind('ctx:calibration:1',at,{startAt:at,endAt:'2026-10-10T15:00:00.000Z'});
  const renders:Array<{fov:number;basis:any}>=[], preparing:boolean[]=[];
  let heldDone:(()=>void)|null=null;
  const request={current:null as any}, completion={current:(_frame:any,_view:any)=>{}};
  const activeContext={contextId:context.contextId,contextFingerprint:'current',revision:1,selectedAtUtc:at};
  let state={observationContext:activeContext,selectedSpotId:'spot:calibration',mapResetVersion:0,spotOpenRequestVersion:0};
  let mode='NIGHT';
  const contextSession=createSkyContextSession(context.contextId,()=>state);
  const presentedSkyFrameRef={current:null as any},editingSkyCalibrationRef={current:null as any};
  const sandbox:any={orientation,orientationController,browsingCamera:camera,observationTime,
    createSkyDisclosureCommands,catalogPickChoicesRef:{current:[]},skyTimeIntentRetirable:()=>true,
    cancelSkyTimePreview:()=>observationTime.cancel(),returnToSkyEntry(){},
    pendingSkyCalibrationRef:request,acceptSkyCalibrationRef:completion,
    viewportActiveRef:{current:true},viewportMountedRef:{current:true},pageVisible:true,contextComplete:true,contextSession,activeContext,
    editingSkyCalibrationRef,presentedSkyFrameRef,timeBinding:'ctx:calibration:1',committedAt:at,
    sameContextVersion,useAppStore:{getState:()=>({...state,mode})},
    timeSaving:false,isPreviewing:false,skySceneReady:true,presentedSceneCurrent:true,manualBasisRef:{current:null},
    rawReportData:data,row:{at},mode:'NIGHT',canvasError:null,canvasGenerationRef:{current:1},
    selectedCatalogObject:null,selectedTargetId:null,orientationObjectListOpen:false,datePickerOpen:false,skyControlPanel:'calibration',
    selectedCatalogObjectRef:{current:null},selectedTargetIdRef:{current:null},orientationObjectListOpenRef:{current:false},
    datePickerOpenRef:{current:false},
    skyControlPanelRef:{current:'calibration'},
    skyTimeIntentCurrent:()=>orientationController.snapshot().alignment.mode!=="editing",
    calibrationPreparing:false,presentedFov:initialFov,paintedSkyObjectsRef:{current:null},skyTapRef:{current:null},
    SKY_VERTICAL_FOV_DEG:45,zoomRef:{current:initialFov},viewportInsetsRef:{current:NO_SKY_INSETS},reducedMotionRef:{current:true},
    stopObjectTracking(){},stopBrowsingAnimation(){camera.suspend();},
    setCalibrationPreparing:(value:boolean)=>{sandbox.calibrationPreparing=value;preparing.push(value);},
    setVerticalFovDeg:(value:number)=>{sandbox.zoomRef.current=value;},
    setPresentedCamera:(change:any)=>{const value=change(null);sandbox.presentedFov=value.fov;},
    useCallback:(fn:unknown)=>fn,objectTracking:{snapshot:()=>({target:null})},
    EMPTY_SKY_IMAGES:new Map(),browsingTimerRef:{current:null},resolvedSkyBodyReferences,
    setPresentedSkyFrame:(change:any)=>{presentedSkyFrameRef.current=typeof change==='function'?change(presentedSkyFrameRef.current):change;return presentedSkyFrameRef.current;},skyViewportCenter,
    closeSkyObjectDisclosure(){},pauseSkyTime(){observationTime.pause();},setPreviewIndex(){observationTime.cancel();},
    setOrientationObjectListOpen:(value:any)=>{sandbox.orientationObjectListOpen=typeof value==='function'?value(sandbox.orientationObjectListOpen):value;},
    setDatePickerOpen:(value:boolean)=>{sandbox.datePickerOpen=value;},
    setSkyControlPanel:(value:any)=>{sandbox.skyControlPanel=typeof value==='function'?value(sandbox.skyControlPanelRef.current):value;sandbox.skyControlPanelRef.current=sandbox.skyControlPanel;},
    drawSkyScene:(_renderer:any,_data:any,_at:any,_heading:any,_pose:any,_w:number,_h:number,_mode:any,
      painted:any,done:any,fov:number,_image:any,basis:any,center:any)=>{
        renders.push({fov,basis});painted({objects:[],view:{basis,verticalFovDeg:fov,center}},{sdssOptical:null,deepSkyImage:null});
        if(sandbox.deferPaint)heldDone=done;else done();
      }};
  const scope=vm.createContext(sandbox), declarations:string[]=[];
  const names=['skyInteractionRevision','skyPageVisibleCurrent','skyInteractionCurrent','skyTimeIntentCurrent','skyDisplayCurrent',
    'cancelSkyCalibration','captureSkyCalibrationScope','skyCalibrationStartCurrent','skyCalibrationIntentCurrent','finishSkyCalibration',
    'freezeSkyCalibration','beginSkyCalibration','skyCalibrationRequestCurrent','acceptSkyCalibration','skyDisclosures'];
  function collect(node:ts.Node){
    if(ts.isVariableDeclaration(node)&&names.includes(node.name.getText(source)))declarations.push(`const ${node.getText(source)};`);
    ts.forEachChild(node,collect);
  }collect(source);
  // These are scope-owner commands, not claims that retired panel buttons
  // still exist. The current SkyBrowseControl callbacks have a separate test.
  const buttons:Record<string,string>={
    '取消':'() => finishSkyCalibration("cancel")',
    '确定':'() => finishSkyCalibration("commit")',
    '收起':'() => skyDisclosures.close("calibration")',
  };
  let cleanup='()=>{}';
  const findCleanup=(node:ts.Node)=>{if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'&&
    node.arguments[0]?.getText(source).includes('const scope = editingSkyCalibrationRef.current'))cleanup=node.arguments[0].getText(source);ts.forEachChild(node,findCleanup);};findCleanup(source);
  const commandCode=ts.transpileModule(declarations.join('\n')+'\n({begin:beginSkyCalibration,cancel:cancelSkyCalibration,accept:acceptSkyCalibration,intent:skyTimeIntentCurrent,disclosures:skyDisclosures,cleanup:('+cleanup+'),'+
    Object.entries(buttons).map(([label,expression])=>`${JSON.stringify(label)}:(${expression})`).join(',')+'});',
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const commands=()=>vm.runInNewContext(commandCode,{...sandbox,orientation:{...orientation,snapshot:orientationController.snapshot()}});
  completion.current=commands().accept;
  const paint=acceptedPagePaint(sandbox);
  const frame=()=>({data,frameAt:at,mode:'NIGHT',orientationRevision:orientationController.snapshot().presentationRevision,
    nativeImageGeneration:1,pose:orientationController.snapshot().pose,sceneReady:true});
  const draw=()=>{completion.current=commands().accept;paint({},frame(),{width:390,height:844});};
  draw();
  return {begin:()=>commands().begin(),commands,draw,frame,renders,preparing,request,sandbox,raw,controller:orientationController,
    dock(kind:'time'|'list'){
      const current=commands();Object.assign(scope,{cancelSkyCalibration:current.cancel,skyTimeIntentCurrent:current.intent});
      scope.skyDisclosures=current.disclosures;
      const callback=skyMenuProps(source).dock(kind);
      vm.runInContext(ts.transpileModule(`(${callback.getText(source)})();`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,scope);
    },
    acceptHeld(){assert.ok(heldDone);heldDone();heldDone=null;},
    move(alpha:number,beta=-100,gamma=25){now++;motion!({alpha,beta,gamma});},
    expire(){now+=501;},replaceContext(){state={...state,observationContext:{...activeContext,revision:2,contextFingerprint:'replaced'}};},
    changeMode(){mode='DAY';},session:contextSession,
    failCanvas(error=new Error('controlled_canvas_error')){
      let callback:ts.ObjectLiteralExpression|undefined;
      const find=(node:ts.Node)=>{if(ts.isCallExpression(node)&&node.expression.getText(source)==='createSkyCanvasLifecycle'&&node.arguments[0]&&ts.isObjectLiteralExpression(node.arguments[0]))callback=node.arguments[0];ts.forEachChild(node,find);};find(source);
      assert.ok(callback);const failed=callback.properties.find(node=>ts.isPropertyAssignment(node)&&node.name.getText(source)==='failed') as ts.PropertyAssignment;
      assert.ok(failed);const action=commands();
      vm.runInNewContext(ts.transpileModule('('+failed.initializer.getText(source)+');',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
        {...sandbox,cancelSkyCalibration:action.cancel,skyCanvasFailureCode:()=> 'CANVAS_ERROR',setCanvasError:()=>{}})(error,undefined);
    },dispose(){orientationController.dispose();}};
}

for(const [label,fov] of [['overview',skyDomeFieldOfView(390,844)],['magnified',.25]] as const)
  test(`${label} calibration waits for an accepted normal view before freezing the full rotation`,async()=>{
    const h=await calibrationEntry(fov);
    try{
      const initial=h.renders.at(-1)!;
      if(label==='overview')assert.ok(initial.basis.forward[2]>.999999999);
      h.begin();
      assert.notEqual(h.controller.snapshot().alignment.mode,'editing','changing requested scale is not an accepted normal frame');
      assert.equal(h.sandbox.zoomRef.current,45);
      h.move(56,-115,37);h.draw();
      const painted=h.renders.at(-1)!;
      assert.equal(painted.fov,45);
      assert.deepEqual(painted.basis,h.controller.snapshot().pose!.basis,'freeze must use the actual normal frame including pitch and roll');
      assert.equal(h.controller.snapshot().alignment.mode,'editing');
      if(label==='overview')assert.ok(painted.basis.forward[2]<.99,'the overview zenith must not become the calibration target');
      h.move(91,-70,-18);
      assert.equal(h.controller.commit(),true);
      for(const axis of ['right','up','forward'] as const)for(const i of [0,1,2] as const)
        assert.ok(Math.abs(h.controller.snapshot().pose!.basis[axis][i]!-painted.basis[axis][i])<1e-12,
          'complete rotation multiplication must retain the accepted target to double precision');
      assert.equal(h.request.current,null);
    }finally{h.dispose();}
  });

test('a normal local frame can freeze immediately without a redundant paint',async()=>{
  const h=await calibrationEntry(45);
  try{const count=h.renders.length;h.begin();assert.equal(h.controller.snapshot().alignment.mode,'editing');assert.equal(h.renders.length,count);}
  finally{h.dispose();}
});

test('rendered normal geometry is not a calibration target until the page accepts completion',async()=>{
  const h=await calibrationEntry(skyDomeFieldOfView(390,844));
  try{
    h.begin();h.sandbox.deferPaint=true;h.draw();
    assert.equal(h.renders.at(-1)!.fov,45);
    assert.notEqual(h.controller.snapshot().alignment.mode,'editing');assert.ok(h.request.current);
    h.acceptHeld();assert.equal(h.controller.snapshot().alignment.mode,'editing');assert.equal(h.request.current,null);
  }finally{h.dispose();}
});

test('opening calibration can accept the normal frame before the dock render commits',async()=>{
  const h=await calibrationEntry(skyDomeFieldOfView(390,844));
  try{h.sandbox.skyControlPanel=null;h.begin();h.draw();assert.equal(h.controller.snapshot().alignment.mode,'editing');}
  finally{h.dispose();}
});

for(const kind of ['time','list'] as const)test(`${kind} dock retires pending calibration before another normal paint`,async()=>{
  const h=await calibrationEntry(skyDomeFieldOfView(390,844));
  try{h.begin();assert.ok(h.request.current);h.dock(kind);assert.equal(h.request.current,null);h.draw();assert.notEqual(h.controller.snapshot().alignment.mode,'editing');}
  finally{h.dispose();}
});

test('pending calibration cleanup is installed before every page loading/error return',()=>{
  const page=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='SpotSkyPage') as ts.FunctionDeclaration;
  const statements=page.body!.statements;
  const cleanup=statements.findIndex(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&
    node.expression.expression.getText(source)==='useEffect'&&node.expression.arguments[0]?.getText(source).includes('skyCalibrationRequestCurrent'));
  assert.ok(cleanup>=0);
  for(const [index,node] of statements.entries()){
    if(!ts.isIfStatement(node))continue;
    let returns=false;
    const visit=(child:ts.Node)=>{if(ts.isReturnStatement(child))returns=true;else if(!ts.isFunctionLike(child))ts.forEachChild(child,visit);};
    visit(node);
    if(returns)assert.ok(cleanup<index,'a loading/error transition must keep the same React hooks');
  }
});

for(const change of ['hidden','context','time','manual','sensor','canvas','disclosure','gesture','zoom','intent'] as const)
  test(`pending normal-scale calibration cannot confirm after ${change} changes`,async()=>{
    const h=await calibrationEntry(skyDomeFieldOfView(390,844));
    try{
      h.begin();assert.notEqual(h.controller.snapshot().alignment.mode,'editing');
      if(change==='hidden'){h.sandbox.pageVisible=false;h.sandbox.viewportActiveRef.current=false;}
      else if(change==='context')h.replaceContext();
      else if(change==='time')h.sandbox.row={at:'2026-10-10T13:30:00.000Z'};
      else if(change==='manual')h.sandbox.manualBasisRef.current=h.raw;
      else if(change==='sensor')h.expire();
      else if(change==='canvas')h.sandbox.canvasGenerationRef.current++;
      else if(change==='gesture')h.sandbox.skyTapRef.current={dragged:false};
      else if(change==='zoom')h.sandbox.zoomRef.current=90;
      else if(change==='intent')h.sandbox.observationTime.preview('2026-10-10T13:30:00.000Z');
      else h.sandbox.selectedCatalogObjectRef.current=h.sandbox.selectedCatalogObject={reference:'HR:7001'};
      h.draw();
      assert.notEqual(h.controller.snapshot().alignment.mode,'editing');
      assert.equal(h.request.current,null,'obsolete request must retire, rather than freeze on a later return');
    }finally{h.dispose();}
  });

for(const boundary of ['hide-return','unmount','binding','preview','playing','calendar','mode','canvas'] as const)
  test(`queued calibration start rejects live ${boundary} before React commits`,async()=>{
    const h=await calibrationEntry(45);
    try{
      const start=h.commands().begin,checkpoint=h.sandbox.browsingCamera.checkpoint();
      if(boundary==='hide-return'){h.session.hide();h.session.show();}
      else if(boundary==='unmount')h.sandbox.viewportMountedRef.current=false;
      else if(boundary==='binding')h.sandbox.observationTime.bind('ctx:replacement:2','2026-10-10T13:00:00.000Z',null);
      else if(boundary==='preview')h.sandbox.observationTime.preview('2026-10-10T13:30:00.000Z');
      else if(boundary==='playing')h.sandbox.observationTime.play(1000);
      else if(boundary==='calendar')h.sandbox.datePickerOpenRef.current=true;
      else if(boundary==='mode')h.changeMode();
      else h.failCanvas();
      start();assert.notEqual(h.controller.snapshot().alignment.mode,'editing');assert.equal(h.request.current,null);
      assert.strictEqual(h.sandbox.browsingCamera.checkpoint(),checkpoint,'rejected command cannot change the camera');
    }finally{h.dispose();}
  });

for(const action of ['取消','确定'] as const)test(`queued calibration ${action} cannot finish a replacement edit in the same sensor session`,async()=>{
  const h=await calibrationEntry(45);
  try{
    h.begin();assert.equal(h.controller.snapshot().alignment.mode,'editing');
    const old=h.commands()[action];h.controller.cancel();h.draw();h.begin();
    const current=h.controller.snapshot();assert.equal(current.alignment.mode,'editing');
    old();assert.equal(h.controller.snapshot().alignment.mode,'editing');
    assert.equal(h.controller.snapshot().presentationRevision,current.presentationRevision);
    assert.equal(h.sandbox.skyControlPanelRef.current,'calibration');
    h.commands()[action]();assert.notEqual(h.controller.snapshot().alignment.mode,'editing');
    assert.equal(h.sandbox.skyControlPanelRef.current,'menu','current owner command must finish its own edit');
  }finally{h.dispose();}
});

test('actual calibration confirmation uses raw motion after its render and preserves the frozen full rotation',async()=>{
  const h=await calibrationEntry(45);
  try{
    h.begin();const frozen=h.controller.snapshot().alignment.view,confirm=h.commands()['确定'];
    h.move(88,-112,42);confirm();assert.equal(h.controller.snapshot().alignment.mode,'aligned');
    for(const axis of ['right','up','forward'] as const)for(let i=0;i<3;i++)
      assert.ok(Math.abs(h.controller.snapshot().alignment.view![axis][i]!-frozen![axis][i]!)<1e-12);
    assert.equal(h.sandbox.skyControlPanelRef.current,'menu');
  }finally{h.dispose();}
});

test('current failed confirmation preserves editing and can still be cancelled without fresh motion',async()=>{
  const h=await calibrationEntry(45);
  try{
    h.begin();const commands=h.commands();h.expire();commands['确定']();
    assert.equal(h.controller.snapshot().alignment.mode,'editing');assert.equal(h.sandbox.skyControlPanelRef.current,'calibration');
    commands['取消']();assert.notEqual(h.controller.snapshot().alignment.mode,'editing');assert.equal(h.sandbox.skyControlPanelRef.current,'menu');
  }finally{h.dispose();}
});

test('actual Canvas failure retires frozen calibration so the public recovery gate can become available',async()=>{
  const h=await calibrationEntry(45);
  try{
    h.begin();assert.equal(h.controller.snapshot().alignment.mode,'editing');h.failCanvas();
    assert.notEqual(h.controller.snapshot().alignment.mode,'editing');assert.equal(h.sandbox.editingSkyCalibrationRef.current,null);
    assert.equal(h.sandbox.presentedSkyFrameRef.current,null);
  }finally{h.dispose();}
});

test('a retained calibration disclosure close cannot close the current time panel',async()=>{
  const h=await calibrationEntry(45);
  try{
    const close=h.commands()['收起'];h.sandbox.setSkyControlPanel('time');close();
    assert.equal(h.sandbox.skyControlPanelRef.current,'time');
  }finally{h.dispose();}
});

for(const boundary of ['Context','binding','preview','mode','Canvas','hide-return'] as const)
  test(`frozen calibration cannot confirm after live ${boundary}; its effect retires only the obsolete scope`,async()=>{
    const h=await calibrationEntry(45);
    try{
      h.begin();const commands=h.commands(),revision=h.controller.snapshot().presentationRevision;
      if(boundary==='Context')h.replaceContext();
      else if(boundary==='binding')h.sandbox.observationTime.bind('ctx:replacement:2','2026-10-10T13:00:00.000Z',null);
      else if(boundary==='preview')h.sandbox.observationTime.preview('2026-10-10T13:30:00.000Z');
      else if(boundary==='mode')h.changeMode();
      else if(boundary==='Canvas')h.sandbox.canvasGenerationRef.current++;
      else{h.session.hide();h.session.show();}
      commands['确定']();assert.equal(h.controller.snapshot().presentationRevision,revision,'obsolete confirm cannot install a correction');
      assert.equal(h.sandbox.skyControlPanelRef.current,'calibration');
      commands.cleanup();assert.notEqual(h.controller.snapshot().alignment.mode,'editing');
      assert.equal(h.sandbox.editingSkyCalibrationRef.current,null);
    }finally{h.dispose();}
  });

test('an old editing cleanup preserves a valid replacement scope and current confirmation works',async()=>{
  const h=await calibrationEntry(45);
  try{
    h.begin();const cleanup=h.commands().cleanup;h.commands()['取消']();h.sandbox.setSkyControlPanel('calibration');h.draw();h.begin();
    const current=h.controller.snapshot(),scope=h.sandbox.editingSkyCalibrationRef.current;
    cleanup();assert.equal(h.controller.snapshot().presentationRevision,current.presentationRevision);
    assert.equal(h.controller.snapshot().alignment.mode,'editing');assert.strictEqual(h.sandbox.editingSkyCalibrationRef.current,scope);
    h.commands()['确定']();assert.equal(h.controller.snapshot().alignment.mode,'aligned');
  }finally{h.dispose();}
});

test('a preceding orientation frame cannot finish the pending normal-scale calibration',async()=>{
  const h=await calibrationEntry(skyDomeFieldOfView(390,844));
  try{
    h.begin();const request=h.request.current;
    h.commands().accept({...h.frame(),orientationRevision:h.controller.snapshot().presentationRevision-1},{basis:h.raw,fov:45});
    assert.notEqual(h.controller.snapshot().alignment.mode,'editing');assert.strictEqual(h.request.current,request);
    h.draw();assert.equal(h.controller.snapshot().alignment.mode,'editing');assert.equal(h.request.current,null);
  }finally{h.dispose();}
});

test('the in-flight Context lock blocks confirmation without losing the current cancel action',async()=>{
  for(const action of ['cancel','finish'] as const){
    const h=await calibrationEntry(45);
    try{
      h.begin();const commands=h.commands(),ticket=h.session.begin(h.sandbox.activeContext)!;assert.ok(ticket);
      commands['确定']();assert.equal(h.controller.snapshot().alignment.mode,'editing');
      if(action==='cancel')commands['取消']();else{assert.ok(h.session.finish(ticket));commands['确定']();}
      assert.equal(h.controller.snapshot().alignment.mode,action==='cancel'?'auto':'aligned');
      assert.equal(h.sandbox.skyControlPanelRef.current,'menu');
    }finally{h.dispose();}
  }
});

test('the pending normal-scale paint reads committed public time even when the render still says previewing',async()=>{
  const h=await calibrationEntry(skyDomeFieldOfView(390,844));
  try{
    h.sandbox.isPreviewing=true;h.begin();assert.ok(h.request.current,'live time and actual accepted frame admit preparation');
    h.draw();assert.equal(h.controller.snapshot().alignment.mode,'editing','captured preview flags cannot retract the current preparation');
    assert.equal(h.request.current,null);
  }finally{h.dispose();}
});
