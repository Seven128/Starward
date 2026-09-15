import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { dragSkyView, INITIAL_MANUAL_SKY_VIEW } from "./sky-manual-view.ts";
import { createSkyViewBasis } from "./sky-view-projection.ts";

// Execute the actual page handlers. Native rendering/pointing are separate checks.
const source = ts.createSourceFile("sky.tsx", readFileSync(new URL("./spot-sky-page.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names = new Set(["enterManualView","onSkyTouchStart","onSkyTouchMove","onSkyTouchEnd","onSkyTouchCancel"]);
const chunks: string[] = [];
const visit = (node: ts.Node) => {
  if (ts.isFunctionDeclaration(node) && ["skyTouchPoint","skyTouchDistance"].includes(node.name?.text ?? "")) chunks.push(node.getText(source));
  if (ts.isVariableDeclaration(node) && names.has(node.name.getText(source))) chunks.push(`const ${node.getText(source)};`);
  ts.forEachChild(node,visit);
}; visit(source);
const code = ts.transpileModule(chunks.join("\n")+"\ncancelSkyGestureRef.current=onSkyTouchCancel; globalThis.handlers={onSkyTouchStart,onSkyTouchMove,onSkyTouchEnd,onSkyTouchCancel};", { compilerOptions:{ target:ts.ScriptTarget.ES2022 } }).outputText;
const touch = (...points: [number,number][]) => ({ touches:points.map(([x,y])=>({ x,y })) });
function harness(kind: "manual"|"follow"|"permission"|"calibrating") {
  const original = createSkyViewBasis(5,110,20)!;
  const counts = { starts:0, stops:0, picks:0 };
  const state: any = {
    skyTapRef:{ current:null }, cancelSkyGestureRef:{ current:()=>{} }, compassResumeRef:{current:false},
    manualBasis:kind==="manual" ? original : null, manualBasisRef:{current:kind==="manual" ? original:null},
    sensorBasis:kind==="follow" ? original:null, currentViewBasis:kind==="permission" ? null:original,
    alignmentEditing:false,
    orientationController:{ snapshot:()=>({alignment:{mode:state.alignmentEditing ? "editing":"auto"}}), stopFollowing:()=>state.stopCompass() },
    followRequested:false, skySceneReady:true, selectedCatalogObject:null, selectedTargetId:null,
    compassLifecycle:{active:kind==="follow" || kind==="calibrating"},
    orientationObjectListOpen:false,datePickerOpen:false,timeSaving:false,
    canvasSize:{width:390,height:780},verticalFovDeg:45,
    INITIAL_MANUAL_SKY_VIEW, dragSkyView,
    setManualBasis:(basis:unknown)=>{state.manualBasis=basis;state.currentViewBasis=basis;},
    setFollowRequested:(value:boolean)=>state.followRequested=value,
    setVerticalFovDeg:(value:number)=>state.verticalFovDeg=value,
    stopCompass:()=>{counts.stops++;state.sensorBasis=null;state.compassLifecycle.active=false;},startCompass:()=>{counts.starts++;state.compassLifecycle.active=true;},
    pinchFieldOfView:(fov:number,start:number,current:number)=>fov*start/current,
    row:{at:"2026-09-15T12:00:00Z"},reportData:{},skyPickIdentity:()=>({catalogVersion:"actual",catalogHash:"hash"}),
    paintedSkyObjectsRef:{current:{}},pickPaintedSkyObjects:()=>{counts.picks++;return [];},
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
test("adding a second finger preserves the whole original transaction for cancellation",()=>{
  const {h,state,counts,original}=harness("manual");
  h.onSkyTouchStart(touch([195,390]));h.onSkyTouchMove(touch([250,330]));
  h.onSkyTouchStart(touch([250,330],[300,330]));h.onSkyTouchMove(touch([230,330],[330,330]));
  assert.equal(state.verticalFovDeg,22.5);
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

test("locked calibration synchronously rejects drag, pinch and selection before React presentation catches up",()=>{
  const {h,state,counts}=harness("follow");
  state.alignmentEditing=true;
  h.onSkyTouchStart(touch([195,390]));h.onSkyTouchMove(touch([260,330]));
  h.onSkyTouchStart(touch([195,390],[250,390]));h.onSkyTouchMove(touch([150,390],[300,390]));
  h.onSkyTouchEnd({touches:[],changedTouches:[{x:195,y:390}]});
  assert.equal(state.manualBasis,null);assert.equal(state.verticalFovDeg,45);
  assert.equal(counts.stops,0);assert.equal(counts.picks,0);
});
