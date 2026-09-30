import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { dragSkyView, INITIAL_MANUAL_SKY_VIEW } from "./sky-manual-view.ts";
import { createSkyViewBasis } from "./sky-view-projection.ts";
import { createSkyBrowsingCamera } from "./sky-browsing-camera.ts";
import { pinchFieldOfView, skyDomeFieldOfView, skyDomeProgress } from "./sky-zoom.ts";
import {NO_SKY_INSETS} from "./sky-viewport.ts";
import { currentStellarSupplement } from "./sky-stellar-supplement-scene.ts";
import { skyPickSnapshotIsCurrent } from "./sky-object-picking.ts";
import { createSkyObjectSelection } from "./sky-object-selection.ts";

// Execute the actual page handlers. Native rendering/pointing are separate checks.
let pageSource = readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8").replaceAll("\r\n", "\n");
if (process.env.MUTATE_SKY_BROWSING_RESTORE === "1") pageSource = pageSource.replace("gesture.startedManual ? gesture.originalManualBasis", "gesture.startedManual ? gesture.startBasis");
if (process.env.MUTATE_SKY_PICK_SUPPLEMENT === "1") pageSource = pageSource.replace(
  "skyPickIdentity(reportData,currentStellarSupplement(stellarSupplement.frame,reportData?.skyScene,row?.at))",
  "skyPickIdentity(reportData,stellarSupplement.frame)",
);
if (process.env.MUTATE_SKY_EMPTY_SELECTION === "1") {
  const clearBranch = "} else {\n      setSelectionState(objectSelection.clear());\n      stopObjectTracking();";
  assert(pageSource.includes(clearBranch), "bounded mutation must reach the production blank-tap branch");
  pageSource = pageSource.replace(clearBranch, "} else {\n      stopObjectTracking();");
}
const source = ts.createSourceFile("sky.tsx", pageSource, ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names = new Set(["enterManualView","onSkyTouchStart","onSkyTouchMove","onSkyTouchEnd","onSkyTouchCancel","settleSkyGestureForViewport","selectCatalogObject","closeSkyObjectDisclosure","goBack"]);
const chunks: string[] = [];
const visit = (node: ts.Node) => {
  if (ts.isFunctionDeclaration(node) && ["skyTouchPoint","skyTouchDistance"].includes(node.name?.text ?? "")) chunks.push(node.getText(source));
  if (ts.isVariableDeclaration(node) && names.has(node.name.getText(source))) chunks.push(`const ${node.getText(source)};`);
  ts.forEachChild(node,visit);
}; visit(source);
const code = ts.transpileModule(chunks.join("\n")+"\ncancelSkyGestureRef.current=onSkyTouchCancel; globalThis.handlers={onSkyTouchStart,onSkyTouchMove,onSkyTouchEnd,onSkyTouchCancel,settleSkyGestureForViewport,selectCatalogObject,closeSkyObjectDisclosure,goBack};", { compilerOptions:{ target:ts.ScriptTarget.ES2022 } }).outputText;
const touch = (...points: [number,number][]) => ({ touches:points.map(([x,y])=>({ x,y })) });
function harness(kind: "manual"|"follow"|"permission"|"calibrating") {
  const original = createSkyViewBasis(5,110,20)!;
  const counts = { starts:0, stops:0, picks:0 };
  const browsingCamera = createSkyBrowsingCamera();
  browsingCamera.update({localView:original,intent:kind === "manual" ? "manual":"follow",progress:0,at:0});
  const state: any = {
    __MINIAPP_SKY_FEEDBACK_ID__: "",
    skyTapRef:{ current:null }, cancelSkyGestureRef:{ current:()=>{} }, compassResumeRef:{current:false},
    recordSkyFeedback:()=>{},
    manualBasis:kind==="manual" ? original : null, manualBasisRef:{current:kind==="manual" ? original:null},
    sensorBasis:kind==="follow" ? original:null, currentViewBasis:kind==="permission" ? null:original,
    alignmentEditing:false,
    orientationController:{ snapshot:()=>({alignment:{mode:state.alignmentEditing ? "editing":"auto"}}), stopFollowing:()=>state.stopCompass() },
    followRequested:false, skySceneReady:true, presentedSceneCurrent:true,
    selectedCatalogObject:null, selectedTargetId:null,
    compassLifecycle:{active:kind==="follow" || kind==="calibrating"},
    orientationObjectListOpen:false,datePickerOpen:false,timeSaving:false,
    canvasSize:{width:390,height:780},verticalFovDeg:45,
    INITIAL_MANUAL_SKY_VIEW, dragSkyView, browsingCamera, skyDomeProgress, zoomRef:{current:45},
    objectTracking:{snapshot:()=>({target:null,position:null}),restore:(checkpoint:unknown)=>checkpoint},
    setTrackingState:()=>{},applyTrackedPosition:()=>{},stopObjectTracking:()=>{},
    stopBrowsingAnimation:()=>browsingCamera.suspend(),
    viewportInsets:NO_SKY_INSETS,presentedCenter:{x:195,y:390},
    setManualBasis:(basis:unknown)=>{state.manualBasis=basis;state.currentViewBasis=basis;},
    setFollowRequested:(value:boolean)=>state.followRequested=value,
    setVerticalFovDeg:(value:number)=>{state.verticalFovDeg=value;state.zoomRef.current=value;},
    stopCompass:()=>{counts.stops++;state.sensorBasis=null;state.compassLifecycle.active=false;},startCompass:()=>{counts.starts++;state.compassLifecycle.active=true;},
    pinchFieldOfView,
    row:{at:"2026-09-15T12:00:00Z"},reportData:{context:{spotId:"spot:test"}},routeContext:{spotId:"spot:test"},stellarSupplement:{frame:null},skyPickIdentity:()=>({catalogVersion:"actual",catalogHash:"hash"}),
    currentStellarSupplement,
    objectSelection:createSkyObjectSelection(), selectionState:null,
    setSelectionState:(value:unknown)=>{state.selectionState=value;},
    setSelectedCatalogObject:(value:unknown)=>{state.selectedCatalogObject=value;},
    setSelectedTargetId:(value:unknown)=>{state.selectedTargetId=value;},
    catalogPickChoices:[],setCatalogPickChoices:(value:unknown)=>{state.catalogPickChoices=value;},
    setDatePickerOpen:(value:boolean)=>{state.datePickerOpen=value;},returnToSkyEntry:()=>{},
    skyPickSnapshotIsCurrent,
    paintedSkyObjectsRef:{current:{frameAt:"2026-09-15T12:00:00Z",catalogVersion:"actual",catalogHash:"hash",objects:[]}},pickPaintedSkyObjects:()=>{counts.picks++;return [];},
    isUnambiguousTapGesture:(g:any)=>g.travelPx<=6 && g.maximumTouches===1,
  };
  const context=vm.createContext(state);vm.runInContext(code,context);
  return { state, counts, original, h:state.handlers };
}
test("follow drag cancellation restores its view and reacquires fresh follow instead of silently staying manual",()=>{
  const {h,state,counts,original}=harness("follow");
  h.onSkyTouchStart(touch([195,390]));h.onSkyTouchMove(touch([250,330]));
  assert.notDeepEqual(state.manualBasis,original);assert.equal(counts.stops,1);
  h.onSkyTouchCancel();
  assert.equal(state.manualBasis,original);assert.equal(state.followRequested,true);assert.equal(counts.starts,1);
  assert.equal(state.sensorBasis,null,"a restart request cannot invent a fresh pose");
});

test("a stale SAO publication cannot change the pick identity of a painted planet",()=>{
  const {h,state}=harness("manual");
  const frameAt="2026-09-15T12:00:00Z";
  const geometry={at:frameAt};
  state.reportData={context:{spotId:"spot:test"},skyScene:{frames:[{at:frameAt,geometry}]}};
  state.stellarSupplement.frame={geometry:{at:frameAt},catalogVersion:"stale-sao"};
  state.skyPickIdentity=(_report:unknown,supplement:{catalogVersion:string}|null)=>({catalogVersion:supplement?`base+${supplement.catalogVersion}`:"base",catalogHash:"hash"});
  state.paintedSkyObjectsRef.current={catalogVersion:"base",catalogHash:"hash",frameAt,
    objects:[{reference:"PLANET:VENUS",displayName:"金星",kind:"PLANET",magnitude:-4.7,x:195,y:390}]};
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

test("a viewport change ends an active pinch without rolling back its visible scale or selecting an object",()=>{
  const {h,state,counts}=harness("manual");
  let trackedApplies=0;
  state.objectTracking.snapshot=()=>({position:{reference:"PLANET:SATURN"}});
  state.applyTrackedPosition=()=>{trackedApplies++;};
  state.verticalFovDeg=.18;state.zoomRef.current=.18;
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
  const {h,state,original}=harness("manual");
  const fov=(45+skyDomeFieldOfView(390,780))/2;
  state.verticalFovDeg=fov;state.zoomRef.current=fov;
  const wide=state.browsingCamera.update({localView:original,intent:"manual",progress:.5,at:16}).view;
  state.currentViewBasis=wide;
  h.onSkyTouchStart(touch([95,390],[295,390]));
  h.onSkyTouchMove(touch([194.95,390],[195.05,390]));
  h.onSkyTouchCancel();
  assert.equal(state.manualBasisRef.current,original);
  for(const at of [32,48]){
    const actual=state.browsingCamera.update({localView:state.manualBasisRef.current,intent:"manual",progress:0,at});
    assert.equal(actual.view,original,"return frame and subsequent local frame must agree");
  }
});
