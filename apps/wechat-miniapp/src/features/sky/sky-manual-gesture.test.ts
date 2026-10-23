import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createSkyDisclosureCommands } from "./sky-disclosure-commands";
import { dragSkyView, INITIAL_MANUAL_SKY_VIEW } from "./sky-manual-view.ts";
import { createSkyViewBasis } from "./sky-view-projection.ts";
import { skyLandscapeVisibleInView } from "./sky-landscape-mask";
import { createSkyBrowsingCamera } from "./sky-browsing-camera.ts";
import { pinchFieldOfView, skyDomeFieldOfView, skyDomeProgress } from "./sky-zoom.ts";
import {NO_SKY_INSETS} from "./sky-viewport.ts";
import { currentStellarSupplement } from "./sky-stellar-supplement-scene.ts";
import { skyPickSnapshotIsCurrent } from "./sky-object-picking.ts";
import { createSkyObjectSelection } from "./sky-object-selection.ts";
import { createSkyObjectTracking } from "./sky-object-tracking.ts";
import { createSkyContextSession } from "./sky-context-session.ts";
import { createSkyObservationTime, skyPresentedTimeCurrent } from "./sky-observation-time.ts";
import { sameContextVersion, type ContextVersion } from "../../services/observation-context-version";
import {pickSkyCatalogName,createSkyNameLayouts,pickSkyControlName} from "./sky-name-layout";
import {exactSkyTimeFrame} from "./sky-time-frame";
import { skyPageAcceptedTestFrame } from "./sky-optical-page-test-support";
import type { SkySceneTestInputs } from "./sky-scene-test-support";

// Execute the actual page handlers. Native rendering/pointing are separate checks.
let pageSource = readFileSync(process.env.SKY_GESTURE_SOURCE ?? new URL("./spot-sky-page.tsx", import.meta.url), "utf8").replaceAll("\r\n", "\n");
if (process.env.MUTATE_SKY_BROWSING_RESTORE === "1") pageSource = pageSource.replace("gesture.startedManual ? gesture.originalManualBasis", "gesture.startedManual ? gesture.startBasis");
if (process.env.MUTATE_SKY_PICK_SUPPLEMENT === "1") {
  const binding = "skyPickIdentity(paintedData,currentStellarSupplement(presentedSkyFrame?.stellarSupplement,paintedData?.skyScene,paintedAt))";
  assert(pageSource.includes(binding), "bounded mutation must reach the actual painted-frame identity");
  pageSource = pageSource.replace(binding, "skyPickIdentity(paintedData,presentedSkyFrame?.stellarSupplement)");
}
if (process.env.MUTATE_SKY_EMPTY_SELECTION === "1") {
  const clearBranch = "} else {\n      setSelectionState(objectSelection.clear());\n      stopObjectTracking();";
  assert(pageSource.includes(clearBranch), "bounded mutation must reach the production blank-tap branch");
  pageSource = pageSource.replace(clearBranch, "} else {\n      stopObjectTracking();");
}
const source = ts.createSourceFile("sky.tsx", pageSource, ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names = new Set(["skyInteractionRevision","skyPageVisibleCurrent","skyInteractionCurrent","skyTimeIntentCurrent",
  "skyGestureCallbackOwns","takeSkyGesture","skyGestureRetirable","skyGestureCurrent","enterManualView","onSkyTouchStart","onSkyTouchMove","onSkyTouchEnd","onSkyTouchCancel","settleSkyGestureForViewport","selectCatalogObject","selectSkyTarget","closeSkyObjectDisclosure","goBack","skyDisclosures"]);
const chunks: string[] = [];
let overlayEffect:ts.Expression|undefined;
const visit = (node: ts.Node) => {
  if (ts.isFunctionDeclaration(node) && ["skyTouchPoint","skyTouchDistance"].includes(node.name?.text ?? "")) chunks.push(node.getText(source));
  if (ts.isVariableDeclaration(node) && names.has(node.name.getText(source))) chunks.push(`const ${node.getText(source)};`);
  if(ts.isCallExpression(node)&&node.expression.getText(source)==="useEffect"&&
    node.arguments[1]?.getText(source).includes("orientationObjectListOpen")&&
    node.arguments[1]?.getText(source).includes("skyControlPanel")&&
    /(?:cancelSkyGestureRef|settleSkyGestureForViewportRef)\.current\(\)/.test(node.arguments[0]!.getText(source)))
    overlayEffect=node.arguments[0];
  ts.forEachChild(node,visit);
}; visit(source);
const code = ts.transpileModule(chunks.join("\n")+"\ncancelSkyGestureRef.current=onSkyTouchCancel; settleSkyGestureForViewportRef.current=settleSkyGestureForViewport; globalThis.handlers={enterManualView,onSkyTouchStart,onSkyTouchMove,onSkyTouchEnd,onSkyTouchCancel,settleSkyGestureForViewport,selectCatalogObject,closeSkyObjectDisclosure,goBack};", { compilerOptions:{ target:ts.ScriptTarget.ES2022 } }).outputText;
const touch = (...points: [number,number][]) => ({ touches:points.map(([x,y])=>({ x,y })) });
function harness(kind: "manual"|"follow"|"permission"|"calibrating") {
  const original = createSkyViewBasis(5,110,20)!;
  const counts = { starts:0, stops:0, picks:0, fovStateWrites:0, manualStateWrites:0 };
  const requestedFovs: number[] = [];
  const requestedBases: unknown[] = [];
  const browsingCamera = createSkyBrowsingCamera();
  browsingCamera.update({localView:original,intent:kind === "manual" ? "manual":"follow",progress:0,at:0});
  const at="2026-09-15T12:00:00.000Z", binding="ctx:gesture:1:fp:1";
  const activeContext={contextId:"ctx:gesture" as ContextVersion["contextId"],revision:1,contextFingerprint:"fp:1",
    selectedAtUtc:at,timezone:"Asia/Shanghai",localDate:"2026-09-15"};
  let store={observationContext:activeContext,selectedSpotId:"spot:test",mapResetVersion:0,spotOpenRequestVersion:0};
  const session=createSkyContextSession(activeContext.contextId,()=>store),time=createSkyObservationTime(),tracking=createSkyObjectTracking();
  time.bind(binding,at,{startAt:at,endAt:"2026-09-15T13:00:00.000Z"});
  const state: any = {
    mode:"NIGHT",pickSkyCatalogName,catalogNames:[],
    __MINIAPP_SKY_FEEDBACK_ID__: "",
    cancelSkyCalibration() {}, createSkyDisclosureCommands,
    skyControlPanelRef:{current:null},setSkyControlPanel() {},setOrientationObjectListOpen() {},
    skyTimeIntentRetirable:()=>true,cancelSkyTimePreview:()=>time.cancel(),pauseSkyTime:()=>time.pause(),beginSkyCalibration() {},
    skyTapRef:{ current:null }, navigationRequestRef:{current:null}, cancelSkyGestureRef:{ current:()=>{} }, compassResumeRef:{current:false},
    settleSkyGestureForViewportRef:{current:()=>{}},
    recordSkyFeedback:()=>{},
    manualBasis:kind==="manual" ? original : null, manualBasisRef:{current:kind==="manual" ? original:null},
    sensorBasis:kind==="follow" ? original:null, currentViewBasis:kind==="permission" ? null:original,
    alignmentEditing:false,
    orientationController:{ snapshot:()=>({alignment:{mode:state.alignmentEditing ? "editing":"auto"}}), stopFollowing:()=>state.stopCompass() },
    contextSession:session,observationTime:time,timeBinding:binding,committedAt:at,activeContext,contextComplete:true,
    pageVisible:true,viewportActiveRef:{current:true},viewportMountedRef:{current:true},canvasGenerationRef:{current:1},
    skyPresentedTimeCurrent,sameContextVersion,
    datePickerOpenRef:{current:false},selectedCatalogObjectRef:{current:null},selectedTargetIdRef:{current:null},
    catalogPickChoicesRef:{current:[]},orientationObjectListOpenRef:{current:false},
    followRequested:false, skySceneReady:true, presentedSceneCurrent:true,
    selectedCatalogObject:null, selectedTargetId:null,
    compassLifecycle:{active:kind==="follow" || kind==="calibrating"},
    orientationObjectListOpen:false,datePickerOpen:false,timeSaving:false,
    canvasSize:{width:390,height:780},verticalFovDeg:45,presentedFov:45,skyLandscapeVisibleInView,
    INITIAL_MANUAL_SKY_VIEW, dragSkyView, browsingCamera, skyDomeProgress, zoomRef:{current:45},
    objectTracking:tracking,
    setTrackingState:()=>{},applyTrackedPosition:()=>{},stopObjectTracking:()=>tracking.stop(),
    stopBrowsingAnimation:()=>{state.navigationRequestRef.current=null;browsingCamera.suspend();},
    viewportInsets:NO_SKY_INSETS,presentedCenter:{x:195,y:390},
    setManualBasis:(basis:unknown)=>{counts.manualStateWrites++;state.manualBasis=basis;state.currentViewBasis=basis;},
    setFollowRequested:(value:boolean)=>state.followRequested=value,
    setVerticalFovDeg:(value:number)=>{counts.fovStateWrites++;state.verticalFovDeg=value;state.zoomRef.current=value;},
    // Explicit native acceptance boundary: a completed frame publishes its
    // scale. It does not simulate React cost or physical frame timing.
    browsingDrawRef:{current:()=>{requestedFovs.push(state.zoomRef.current);requestedBases.push(state.manualBasisRef.current);
      state.verticalFovDeg=state.zoomRef.current;state.currentViewBasis=state.manualBasisRef.current??state.currentViewBasis;
      acceptFrame();}},
    stopCompass:()=>{counts.stops++;state.sensorBasis=null;state.compassLifecycle.active=false;},startCompass:()=>{counts.starts++;state.compassLifecycle.active=true;},
    pinchFieldOfView,
    row:{at},reportData:{context:{contextId:activeContext.contextId,contextRevision:activeContext.revision,
      contextFingerprint:activeContext.contextFingerprint,spotId:"spot:test"}},
    routeContext:{spotId:"spot:test"},stellarSupplement:{frame:null},skyPickIdentity:()=>({catalogVersion:"actual",catalogHash:"hash"}),
    get paintedData() { return state.presentedSkyFrameRef.current?.data; },
    get paintedRow() { return state.row; },
    get paintedAt() { return state.presentedSkyFrameRef.current?.frameAt; },
    get presentedSkyFrame() { return state.presentedSkyFrameRef.current; },
    presentedSkyFrameRef:{current:null},
    currentStellarSupplement,pickSkyControlName,exactSkyTimeFrame,
    objectSelection:createSkyObjectSelection(), selectionState:null,
    setSelectionState:(value:unknown)=>{state.selectionState=value;},
    setSelectedCatalogObject:(value:unknown)=>{state.selectedCatalogObject=value;state.selectedCatalogObjectRef.current=value;},
    setSelectedTargetId:(value:unknown)=>{state.selectedTargetId=value;state.selectedTargetIdRef.current=value;},
    catalogPickChoices:[],setCatalogPickChoices:(value:unknown)=>{state.catalogPickChoices=value;state.catalogPickChoicesRef.current=value;},
    setDatePickerOpen:(value:boolean)=>{state.datePickerOpen=value;state.datePickerOpenRef.current=value;},returnToSkyEntry:()=>{},
    skyPickSnapshotIsCurrent,
    paintedSkyObjectsRef:{current:{frameAt:at,catalogVersion:"actual",catalogHash:"hash",objects:[]}},pickPaintedSkyObjects:()=>{counts.picks++;return [];},
    isUnambiguousTapGesture:(g:any)=>g.travelPx<=6 && g.maximumTouches===1,
  };
  function acceptFrame(inputs: SkySceneTestInputs = {}) {
    const view = { heading:null,pose:null,manualBasis:state.currentViewBasis,mode:state.mode,
      verticalFovDeg:state.zoomRef.current,center:state.presentedCenter,...inputs.view };
    const accepted = skyPageAcceptedTestFrame({
      observation:{data:state.reportData,frameAt:state.row.at,stellarSupplement:state.stellarSupplement.frame,...inputs.observation},
      view,
      canvas:{generation:state.canvasGenerationRef.current,width:state.canvasSize.width,height:state.canvasSize.height,...inputs.canvas},
    },{catalogNames:state.catalogNames,controlNames:state.controlNames},state.paintedSkyObjectsRef.current);
    state.presentedSkyFrameRef.current=accepted.frame;
    state.paintedSkyObjectsRef.current=accepted.picked;
  }
  acceptFrame();
  const context=vm.createContext(state);vm.runInContext(code,context);
  return { state, counts, requestedFovs, requestedBases, original, h:state.handlers,session,time,tracking,acceptFrame,
    overlayChanged:()=>{assert.ok(overlayEffect);vm.runInContext(ts.transpileModule(`(${overlayEffect.getText(source)})()`,
      {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);},
    replaceContext:()=>{store={...store,observationContext:{...activeContext,revision:2,contextFingerprint:"fp:2"}};},
    rerender:(overrides:Record<string,unknown>={})=>{const rendered={...state,...overrides};vm.runInNewContext(code,rendered);return rendered.handlers;} };
}

type GesturePage = ReturnType<typeof harness>;
test("a real gesture takes over the last copied navigation camera and never resumes the old flight", () => {
  const page = harness("manual"), state = page.state, camera = state.browsingCamera as ReturnType<typeof createSkyBrowsingCamera>;
  camera.navigate(page.original, createSkyViewBasis(160, 95, 0)!, 45, 4, 390, 780, 0);
  const copied = camera.update({ localView: page.original, intent: "manual", progress: 0, at: 32 });
  camera.accept(copied);
  assert.ok(copied.verticalFovDeg !== null, "the navigation copy supplies its actual scale");
  state.zoomRef.current = copied.verticalFovDeg;
  page.acceptFrame({view:{manualBasis:copied.view,verticalFovDeg:copied.verticalFovDeg}});
  state.navigationRequestRef.current = { pending: false };
  page.h.onSkyTouchStart(touch([195, 390]));
  assert.equal(camera.snapshot().navigation, false); assert.equal(state.navigationRequestRef.current, null);
  assert.deepEqual(state.skyTapRef.current.startBasis, copied.view, "a stale React camera is not the grab point");
  assert.equal(state.skyTapRef.current.startBasis,state.presentedSkyFrameRef.current.identity.view.manualBasis);
  assert.equal(state.skyTapRef.current.initialFov, copied.verticalFovDeg);
  page.h.onSkyTouchCancel();
  assert.equal(camera.snapshot().navigation, false);
});
test("a pick from another copied view cannot start a gesture at the same time and Canvas generation", () => {
  const page = harness("manual"), oldPick = page.state.paintedSkyObjectsRef.current;
  page.acceptFrame({view:{manualBasis:createSkyViewBasis(90,35,0)!}});
  assert.equal(oldPick.frameAt,page.state.presentedSkyFrameRef.current.frameAt);
  assert.equal(oldPick.identity.canvas.generation,page.state.canvasGenerationRef.current);
  page.state.paintedSkyObjectsRef.current=oldPick;
  page.h.onSkyTouchStart(touch([195,390]));
  assert.equal(page.state.skyTapRef.current,null);
  assert.equal(page.counts.picks,0);assert.equal(page.counts.stops,0);
});

test("catalog name taps use the latest copied whole-word bounds rather than the star point or old native box",()=>{
  const page=harness("manual"),owner=createSkyNameLayouts(),job=owner.prepare({context:{},mode:"NIGHT"},0,390,780,
    NO_SKY_INSETS,true);
  const name=job.catalog({reference:"HR:8162",displayName:"Alderamin",kind:"STAR",magnitude:2.45,
    x:140,y:390,auxiliaryOpacity:.5},{width:80,left:0,right:80,ascent:9,descent:9})!;
  page.state.catalogNames=job.names;
  page.acceptFrame();
  const x=name.bounds.left+name.bounds.width-2,y=name.caption.y;
  assert(Math.hypot(x-name.x,y-name.y)>46,"the clicked end of the above name is outside the point-picking tolerance");
  page.h.onSkyTouchStart(touch([x,y]));
  page.h.onSkyTouchEnd({touches:[],changedTouches:[{x,y}]});
  assert.equal(page.state.selectedCatalogObject?.reference,name.reference);assert.equal(page.counts.picks,0);
  const moved=harness("manual"),later=owner.prepare({context:{},mode:"NIGHT"},16,390,780,NO_SKY_INSETS,true);
  later.catalog({...name,x:290,y:500},{width:80,left:0,right:80,ascent:9,descent:9});
  moved.state.catalogNames=later.names;
  moved.acceptFrame();
  moved.h.onSkyTouchStart(touch([x,y]));moved.h.onSkyTouchEnd({touches:[],changedTouches:[{x,y}]});
  assert.equal(moved.state.selectedCatalogObject,null,"an old label position cannot open an identity that moved elsewhere");
  assert.equal(moved.counts.picks,1);
});
test("a drag begun on a catalog name continues browsing and cannot release as a name tap",()=>{
  const page=harness("manual"),owner=createSkyNameLayouts(),job=owner.prepare({context:{},mode:"NIGHT"},0,390,780,NO_SKY_INSETS,true);
  const name=job.catalog({reference:"HR:8162",displayName:"Alderamin",kind:"STAR",magnitude:2.45,
    x:140,y:390,auxiliaryOpacity:.5},{width:80,left:0,right:80,ascent:9,descent:9})!;
  page.state.catalogNames=job.names;page.acceptFrame();const x=name.bounds.left+25,y=name.caption.y;
  page.h.onSkyTouchStart(touch([x,y]));assert.equal(page.state.skyTapRef.current.nameReference,name.reference);
  page.h.onSkyTouchMove(touch([x+25,y]));
  assert(page.state.skyTapRef.current.dragged);
  page.h.onSkyTouchEnd({touches:[],changedTouches:[{x:x+25,y}]});
  assert.equal(page.state.selectedCatalogObject,null);assert.equal(page.counts.picks,0);
});

test('guide name taps retain target identity without a bright catalog, while current bounds and drags fence stale actions',()=>{
  const setup=()=>{
    const page=harness('manual'),owner=createSkyNameLayouts(),target={targetId:'target:milky-way',type:'MILKY_WAY',
      displayName:'银河中心方向',direction:'西南'} as any;
    const job=owner.prepare({context:{},mode:'NIGHT'},0,390,780,NO_SKY_INSETS,true);
    const label=job.target(target,{x:140,y:390,altitude:35},1,{width:84,left:0,right:84,ascent:11,descent:11},
      {width:60,left:0,right:60,ascent:9,descent:9})!;
    page.state.reportData.targetFrames=[{at:page.state.row.at,targets:[target]}];page.state.controlNames=job.controls;
    page.state.skyPickIdentity=()=>({catalogVersion:'',catalogHash:''});
    page.acceptFrame();
    return {page,label,target,x:label.bounds!.left+label.bounds!.width-10,y:390};
  };
  const current=setup(),{page,x,y}=current;page.h.onSkyTouchStart(touch([x,y]));
  assert.equal(page.state.skyTapRef.current.controlNameKey,current.label.key);
  page.h.onSkyTouchEnd({touches:[],changedTouches:[{x,y}]});
  assert.equal(page.state.selectedTargetId,current.target.targetId);assert.equal(page.state.selectedCatalogObject,null);
  assert.equal(page.counts.picks,0,'direction action cannot depend on bright catalog picking');
  const moved=setup();moved.page.h.onSkyTouchStart(touch([moved.x,moved.y]));moved.page.state.controlNames=[];
  moved.page.h.onSkyTouchEnd({touches:[],changedTouches:[{x:moved.x,y:moved.y}]});
  assert.equal(moved.page.state.selectedTargetId,null,'an old native box cannot open a withdrawn guide');
  const drag=setup();drag.page.h.onSkyTouchStart(touch([drag.x,drag.y]));
  drag.page.h.onSkyTouchMove(touch([drag.x+25,drag.y]));
  drag.page.h.onSkyTouchEnd({touches:[],changedTouches:[{x:drag.x+25,y:drag.y}]});
  assert.equal(drag.page.state.selectedTargetId,null);assert.equal(drag.page.counts.picks,0);
});
type GestureBoundary = "hide" | "hide-return" | "unmount" | "Context" | "binding" | "commit-lock" | "generation" | "new-time";
function retireGesture(page: GesturePage, boundary: GestureBoundary) {
  if (boundary === "hide" || boundary === "hide-return") page.session.hide();
  if (boundary === "hide-return") page.session.show();
  if (boundary === "unmount") page.state.viewportMountedRef.current = false;
  if (boundary === "Context") page.replaceContext();
  if (boundary === "binding") page.time.bind("ctx:replacement", "2026-09-15T12:00:00.000Z", null);
  if (boundary === "commit-lock") assert.ok(page.session.begin(page.state.activeContext));
  if (boundary === "generation") page.state.canvasGenerationRef.current++;
  if (boundary === "new-time") page.time.preview("2026-09-15T13:00:00.000Z");
}

for (const boundary of ["hide", "hide-return", "unmount", "Context", "binding", "commit-lock", "generation", "new-time"] as const) {
  for (const phase of ["start", "move", "end"] as const) {
    test(`${boundary}: a queued gesture ${phase} preserves the current camera, tracking and selection`, () => {
      const page = harness("manual"), { state, h } = page;
      const object = { reference: "HR:7001", displayName: "Vega", kind: "STAR" as const };
      state.setSelectionState(state.objectSelection.select(object, "spot:test")); page.tracking.start(object, "spot:test");
      if (phase !== "start") { h.onSkyTouchStart(touch([195, 390])); assert.ok(state.skyTapRef.current); }
      retireGesture(page, boundary);
      const before = { camera: state.browsingCamera.checkpoint(), tracking: page.tracking.snapshot(),
        selection: state.objectSelection.snapshot(), manual: state.manualBasis, fov: state.verticalFovDeg, counts: { ...page.counts } };
      if (phase === "start") h.onSkyTouchStart(touch([195, 390]));
      if (phase === "move") h.onSkyTouchMove(touch([250, 330]));
      if (phase === "end") h.onSkyTouchEnd({ touches: [], changedTouches: [{ x: 195, y: 390 }] });
      if (phase === "start") assert.equal(state.skyTapRef.current, null);
      assert.deepEqual(state.browsingCamera.checkpoint(), before.camera);
      assert.strictEqual(page.tracking.snapshot(), before.tracking); assert.strictEqual(state.objectSelection.snapshot(), before.selection);
      assert.strictEqual(state.manualBasis, before.manual); assert.equal(state.verticalFovDeg, before.fov); assert.deepEqual(page.counts, before.counts);
    });
  }
}

for (const boundary of ["Context", "binding", "generation", "new-time", "hide-return", "unmount"] as const) {
  test(`${boundary}: late gesture cancellation cannot restore its old checkpoint into a replacement view`, () => {
    const page = harness("manual"), { state, h } = page;
    h.onSkyTouchStart(touch([195, 390])); h.onSkyTouchMove(touch([250, 330]));
    const replacement = createSkyViewBasis(90, 30, 15)!;
    state.browsingCamera.pan(replacement, 0); state.manualBasisRef.current = replacement; state.setManualBasis(replacement);
    retireGesture(page, boundary);
    const before = state.browsingCamera.checkpoint(), counts = { ...page.counts };
    h.onSkyTouchCancel();
    assert.deepEqual(state.browsingCamera.checkpoint(), before); assert.strictEqual(state.manualBasisRef.current, replacement);
    assert.deepEqual(page.counts, counts);
  });
}

test("a first-hide cancellation restores the valid gesture checkpoint, while old return callbacks leave a new gesture intact", () => {
  const page = harness("manual"), { state, h, original } = page;
  h.onSkyTouchStart(touch([195, 390])); h.onSkyTouchMove(touch([250, 330]));
  page.session.hide(); h.onSkyTouchCancel(); assert.strictEqual(state.manualBasisRef.current, original);
  assert.equal(state.skyTapRef.current, null); page.session.show();
  const returned = page.rerender(); returned.onSkyTouchStart(touch([195, 390]));
  const current = state.skyTapRef.current; assert.ok(current);
  const camera = state.browsingCamera.checkpoint(), counts = { ...page.counts };
  h.onSkyTouchMove(touch([250, 330])); h.onSkyTouchEnd({ touches: [], changedTouches: [{ x: 195, y: 390 }] });
  h.onSkyTouchCancel(); h.settleSkyGestureForViewport(); h.enterManualView(); h.onSkyTouchStart(touch([250, 330]));
  assert.strictEqual(state.skyTapRef.current, current); assert.deepEqual(state.browsingCamera.checkpoint(), camera);
  assert.deepEqual(page.counts, counts);
});

for (const disclosure of ["datePickerOpenRef", "selectedCatalogObjectRef", "selectedTargetIdRef"] as const) {
  test(`the current ${disclosure} blocks a gesture before its React flag changes`, () => {
    const { h, state, counts } = harness("manual"); state[disclosure].current = true;
    h.onSkyTouchStart(touch([195, 390])); assert.equal(state.skyTapRef.current, null); assert.equal(counts.stops, 0);
  });
}

test("a current manual drag remains usable during 1x playback with a bounded earlier painted frame", () => {
  const page = harness("manual"), { h, state } = page; page.time.play(0); page.time.tick(1000);
  h.onSkyTouchStart(touch([195, 390])); assert.ok(state.skyTapRef.current);
  page.time.tick(2000); h.onSkyTouchMove(touch([250, 330]));
  assert.notDeepEqual(state.manualBasis, page.original); assert.equal(page.time.snapshot().mode, "PLAYING");
  h.onSkyTouchEnd({ touches: [], changedTouches: [{ x: 250, y: 330 }] }); assert.equal(state.skyTapRef.current, null);
});

test("the same Context ID with a new version isolates old cancellation and settles its obsolete gesture without rollback", () => {
  const page=harness("manual"),{h,state}=page;
  h.onSkyTouchStart(touch([195,390]));h.onSkyTouchMove(touch([250,330]));
  const view=state.manualBasisRef.current,camera=state.browsingCamera.checkpoint();
  page.replaceContext();const binding="ctx:gesture:2:fp:2";
  page.time.bind(binding,state.committedAt,{startAt:state.committedAt,endAt:"2026-09-15T13:00:00.000Z"});
  state.reportData={...state.reportData,context:{...state.reportData.context,contextRevision:2,contextFingerprint:"fp:2"}};
  page.acceptFrame();
  const current=page.rerender({activeContext:{...state.activeContext,revision:2,contextFingerprint:"fp:2"},timeBinding:binding});
  current.onSkyTouchCancel();assert.equal(state.skyTapRef.current,null);
  assert.strictEqual(state.manualBasisRef.current,view);assert.deepEqual(state.browsingCamera.checkpoint(),camera);
  current.onSkyTouchStart(touch([195,390]));const gesture=state.skyTapRef.current;assert.ok(gesture);
  current.onSkyTouchMove(touch([250,330]));const moved=state.browsingCamera.checkpoint();
  h.onSkyTouchCancel();h.settleSkyGestureForViewport();
  assert.strictEqual(state.skyTapRef.current,gesture);assert.deepEqual(state.browsingCamera.checkpoint(),moved);
});
test("follow drag cancellation restores its view and reacquires fresh follow instead of silently staying manual",()=>{
  const {h,state,counts,original}=harness("follow");
  const copiedBasis=state.presentedSkyFrameRef.current.identity.view.manualBasis;
  h.onSkyTouchStart(touch([195,390]));h.onSkyTouchMove(touch([250,330]));
  assert.notDeepEqual(state.manualBasis,original);assert.equal(counts.stops,1);
  h.onSkyTouchCancel();
  assert.deepEqual(state.manualBasis,original);assert.strictEqual(state.manualBasis,copiedBasis);
  assert.equal(state.followRequested,true);assert.equal(counts.starts,1);
  assert.equal(state.sensorBasis,null,"a restart request cannot invent a fresh pose");
});

test("a stale SAO publication cannot change the pick identity of a painted planet",()=>{
  const {h,state,acceptFrame}=harness("manual");
  const frameAt="2026-09-15T12:00:00.000Z";
  const geometry={at:frameAt};
  state.reportData={context:state.reportData.context,skyScene:{frames:[{at:frameAt,geometry}]}};
  state.stellarSupplement.frame={geometry:{at:frameAt},catalogVersion:"stale-sao"};
  state.skyPickIdentity=(_report:unknown,supplement:{catalogVersion:string}|null)=>({catalogVersion:supplement?`base+${supplement.catalogVersion}`:"base",catalogHash:"hash"});
  state.paintedSkyObjectsRef.current={catalogVersion:"base",catalogHash:"hash",frameAt,
    objects:[{reference:"PLANET:VENUS",displayName:"金星",kind:"PLANET",magnitude:-4.7,x:195,y:390}]};
  acceptFrame();
  state.pickPaintedSkyObjects=(snapshot:any,input:any)=>snapshot.catalogVersion===input.catalogVersion?snapshot.objects:[];
  state.setCatalogPickChoices=()=>{};
  state.setSelectedTargetId=()=>{};
  state.setSelectedCatalogObject=(value:unknown)=>{state.selectedCatalogObject=value;};
  h.onSkyTouchStart(touch([195,390]));
  h.onSkyTouchEnd({touches:[],changedTouches:[{x:195,y:390}]});
  assert.equal(state.selectedCatalogObject?.reference,"PLANET:VENUS");
});
test("adding a second finger preserves the whole original transaction for cancellation",()=>{
  const {h,state,counts,original}=harness("manual");
  h.onSkyTouchStart(touch([195,390]));h.onSkyTouchMove(touch([250,330]));
  h.onSkyTouchStart(touch([250,330],[300,330]));h.onSkyTouchMove(touch([230,330],[330,330]));
  assert.ok(Math.abs(state.verticalFovDeg-22.71896639495375)<1e-9);
  h.onSkyTouchCancel();assert.equal(state.manualBasis,original);assert.equal(state.verticalFovDeg,45);
  assert.equal(counts.starts,0);assert.equal(counts.picks,0);
});
test("cancelling a manual gesture before permission never starts a sensor",()=>{
  const {h,state,counts}=harness("permission");
  h.onSkyTouchStart(touch([195,390]));h.onSkyTouchMove(touch([250,330]));h.onSkyTouchCancel();
  assert.equal(state.manualBasis,null);assert.equal(counts.starts,0);
});
test("cancelling a drag while an authorized follow request is still calibrating resumes that request",()=>{
  const {h,state,counts}=harness("calibrating");
  h.onSkyTouchStart(touch([195,390]));h.onSkyTouchMove(touch([250,330]));h.onSkyTouchCancel();
  assert.equal(state.followRequested,true);assert.equal(counts.starts,1);assert.equal(state.sensorBasis,null);
});
test("edge gestures and drag/pinch endings never trigger celestial selection; a plain tap does",()=>{
  const {h,counts}=harness("manual");
  h.onSkyTouchStart(touch([5,390]));h.onSkyTouchMove(touch([90,390]));h.onSkyTouchEnd({touches:[],changedTouches:[{x:90,y:390}]});
  assert.equal(counts.stops,0);assert.equal(counts.picks,0);
  h.onSkyTouchStart(touch([195,390]));h.onSkyTouchMove(touch([250,330]));h.onSkyTouchEnd({touches:[],changedTouches:[{x:250,y:330}]});
  assert.equal(counts.picks,0);
  h.onSkyTouchStart(touch([195,390]));h.onSkyTouchEnd({touches:[],changedTouches:[{x:195,y:390}]});
  assert.equal(counts.picks,1);
});

test("natural selection survives disclosure Back and zoom; verified blank clears it and stale blank does not",()=>{
  const {h,state}=harness("manual");
  const star={reference:"HR:7557",displayName:"Altair",kind:"STAR"};
  state.pickPaintedSkyObjects=()=>[star];
  const tap=()=>{h.onSkyTouchStart(touch([195,390]));h.onSkyTouchEnd({touches:[],changedTouches:[{x:195,y:390}]});};
  tap();assert.equal(state.selectedCatalogObject.reference,star.reference);
  const selection=state.selectionState;
  h.goBack();assert.equal(state.selectedCatalogObject,null);assert.equal(state.selectionState,selection);
  h.onSkyTouchStart(touch([150,390],[250,390]));h.onSkyTouchMove(touch([100,390],[300,390]));
  h.onSkyTouchEnd({touches:[],changedTouches:[{x:100,y:390},{x:300,y:390}]});
  assert.equal(state.selectionState,selection,"pinch does not deselect");
  state.pickPaintedSkyObjects=()=>[];
  state.paintedSkyObjectsRef.current.catalogHash="stale";tap();assert.equal(state.selectionState,selection);
  state.paintedSkyObjectsRef.current.catalogHash="hash";tap();assert.equal(state.selectionState.object,null);
});

test("locked calibration synchronously rejects drag, pinch and selection before React presentation catches up",()=>{
  const {h,state,counts}=harness("follow");
  state.alignmentEditing=true;
  h.onSkyTouchStart(touch([195,390]));h.onSkyTouchMove(touch([260,330]));
  h.onSkyTouchStart(touch([195,390],[250,390]));h.onSkyTouchMove(touch([150,390],[300,390]));
  h.onSkyTouchEnd({touches:[],changedTouches:[{x:195,y:390}]});
  assert.equal(state.manualBasis,null);assert.equal(state.verticalFovDeg,45);
  assert.equal(counts.stops,0);assert.equal(counts.picks,0);
});

test("a manual pinch reaches zenith, and cancellation restores its original scale and direction",()=>{
  const {h,state,original,counts}=harness("manual");
  h.onSkyTouchStart(touch([95,390],[295,390]));
  h.onSkyTouchMove(touch([194.95,390],[195.05,390]));
  assert.equal(state.verticalFovDeg,skyDomeFieldOfView(390,780));
  const painted=state.browsingCamera.update({localView:state.manualBasis,intent:"manual",progress:1,at:16});
  assert.ok(painted.view.forward[2]>.999999999);
  assert.equal(state.manualBasis,original,"zoom does not overwrite the manual input with a rendered camera basis");
  h.onSkyTouchCancel();
  assert.equal(state.verticalFovDeg,45);assert.equal(state.manualBasis,original);
  assert.equal(counts.starts,0,"manual overview never requests a sensor");
});

test("drag forwards the latest direction before page presentation and settles its manual state on release",()=>{
  const {h,state,counts,requestedBases}=harness("manual");
  h.onSkyTouchStart(touch([195,390]));
  h.onSkyTouchMove(touch([210,390]));
  const firstTransitionWrites=counts.manualStateWrites;
  h.onSkyTouchMove(touch([230,400]));
  h.onSkyTouchMove(touch([260,405]));
  assert.equal(counts.manualStateWrites,firstTransitionWrites,"raw drag burst must not rerender the whole page before native submission");
  assert.equal(requestedBases.length,3,"each intent reaches the existing coalescing writer");
  assert.strictEqual(requestedBases.at(-1),state.manualBasisRef.current);
  h.onSkyTouchEnd({touches:[],changedTouches:[{x:260,y:405}]});
  assert.strictEqual(state.manualBasis,state.manualBasisRef.current,"release commits the latest manual direction");
  assert.equal(counts.picks,0);
});

test("pinch forwards live scale to the native writer before page presentation, and cancellation restores the checkpoint",()=>{
  const { h, state, counts, requestedFovs } = harness("manual");
  h.onSkyTouchStart(touch([95,390],[295,390]));
  h.onSkyTouchMove(touch([145,390],[245,390]));
  h.onSkyTouchMove(touch([175,390],[215,390]));
  assert.equal(counts.fovStateWrites, 0, "raw touch bursts must not write the whole-page presentation on every move");
  assert.equal(requestedFovs.length, 2);
  assert.equal(requestedFovs.at(-1), state.zoomRef.current);
  assert(state.verticalFovDeg > 45, "the accepted frame still exposes the changed scale");
  h.onSkyTouchCancel();
  assert.equal(counts.fovStateWrites, 1);
  assert.equal(state.zoomRef.current, 45);
});

test("a viewport change ends an active pinch without rolling back its visible scale or selecting an object",()=>{
  const {h,state,counts,acceptFrame}=harness("manual");
  let trackedApplies=0;
  state.objectTracking.snapshot=()=>({position:{reference:"PLANET:SATURN"}});
  state.applyTrackedPosition=()=>{trackedApplies++;};
  state.verticalFovDeg=.18;state.zoomRef.current=.18;
  acceptFrame();
  h.onSkyTouchStart(touch([95,390],[295,390]));
  h.onSkyTouchMove(touch([35,390],[355,390]));
  const zoomed=state.verticalFovDeg;
  assert.ok(zoomed<.18);
  h.settleSkyGestureForViewport();
  assert.equal(state.verticalFovDeg,zoomed);
  assert.equal(state.skyTapRef.current,null);
  assert.equal(trackedApplies,1,"the latest tracked result is released when the gesture settles");
  h.onSkyTouchEnd({touches:[],changedTouches:[{x:195,y:390}]});
  assert.equal(counts.picks,0);
  h.onSkyTouchCancel();
  assert.equal(state.verticalFovDeg,zoomed,"a later native cancel cannot undo the committed zoom");
  const drag=harness("manual");
  drag.h.onSkyTouchStart(touch([195,390]));
  drag.h.onSkyTouchMove(touch([210,390]));
  drag.h.onSkyTouchMove(touch([260,405]));
  const latest=drag.state.manualBasisRef.current;
  drag.h.settleSkyGestureForViewport();
  assert.strictEqual(drag.state.manualBasis,latest,"viewport settlement keeps the final directly drawn manual input");
  drag.h.onSkyTouchCancel();
  assert.strictEqual(drag.state.manualBasisRef.current,latest);
});

for (const presentationCaughtUp of [false, true]) test(`an exposed Canvas drag remains usable with the exploration menu ref before/after React (${presentationCaughtUp})`,()=>{
  const {h,state,counts,requestedBases}=harness("manual");
  state.orientationObjectListOpen=presentationCaughtUp;
  state.orientationObjectListOpenRef.current=true;
  h.onSkyTouchStart(touch([195,120]));
  assert.ok(state.skyTapRef.current,"a touch delivered to the exposed Canvas starts a gesture");
  h.onSkyTouchMove(touch([225,120]));
  assert.equal(requestedBases.length,1);
  h.onSkyTouchEnd({touches:[],changedTouches:[{x:225,y:120}]});
  assert.equal(state.orientationObjectListOpenRef.current,true,"sky browsing retains the overlay");
  assert.equal(state.orientationObjectListOpen,presentationCaughtUp,"Canvas input does not rewrite menu presentation");
  assert.equal(counts.picks,0,"the drag never opens an object");
});

test("opening an overlay settles the actually displayed pinch without restoring its earlier camera",()=>{
  for(const overlay of ["time","list"]){
    const page=harness("manual"),{h,state,counts}=page;
    h.onSkyTouchStart(touch([95,390],[295,390]));
    h.onSkyTouchMove(touch([35,390],[355,390]));
    const displayedFov=state.verticalFovDeg,displayedBasis=state.manualBasisRef.current;
    assert.notEqual(displayedFov,45);
    state.skyControlPanel=overlay==="time"?"time":null;
    state.skyControlPanelRef.current=state.skyControlPanel;
    state.orientationObjectListOpen=overlay==="list";
    state.orientationObjectListOpenRef.current=state.orientationObjectListOpen;
    page.overlayChanged();
    assert.equal(state.verticalFovDeg,displayedFov);
    assert.strictEqual(state.manualBasisRef.current,displayedBasis);
    assert.equal(state.skyTapRef.current,null);
    h.onSkyTouchCancel();
    assert.equal(state.verticalFovDeg,displayedFov,"a later native cancel cannot undo the settled view");
    assert.equal(counts.picks,0);
  }
});

test("phone-following pinch widens the browsing camera without replacing or stopping the sensor",()=>{
  const {h,state,original,counts}=harness("follow");
  h.onSkyTouchStart(touch([95,390],[295,390]));
  h.onSkyTouchMove(touch([194.95,390],[195.05,390]));
  assert.equal(state.verticalFovDeg,skyDomeFieldOfView(390,780));
  assert.equal(state.manualBasis,null);assert.equal(state.sensorBasis,original);
  assert.equal(counts.stops,0);
  h.onSkyTouchEnd({touches:[],changedTouches:[{x:195,y:390}]});assert.equal(counts.picks,0);
});

test("cancelling a second manual pinch retains the local input, not the already widened displayed view",()=>{
  const {h,state,original,acceptFrame}=harness("manual");
  const fov=(45+skyDomeFieldOfView(390,780))/2;
  state.verticalFovDeg=fov;state.zoomRef.current=fov;
  const wide=state.browsingCamera.update({localView:original,intent:"manual",progress:.5,at:16}).view;
  state.currentViewBasis=wide;
  acceptFrame();
  h.onSkyTouchStart(touch([95,390],[295,390]));
  h.onSkyTouchMove(touch([194.95,390],[195.05,390]));
  h.onSkyTouchCancel();
  assert.equal(state.manualBasisRef.current,original);
  for(const at of [32,48]){
    const actual=state.browsingCamera.update({localView:state.manualBasisRef.current,intent:"manual",progress:0,at});
    assert.equal(actual.view,original,"return frame and subsequent local frame must agree");
  }
});
