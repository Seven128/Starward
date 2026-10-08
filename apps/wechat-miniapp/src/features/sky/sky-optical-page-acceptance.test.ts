import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import {createSkyCanvasLifecycle, type CanvasClock} from "./sky-canvas-lifecycle";
import {resolvedSkyBodyReferences} from "./sky-body-label-presentation";
import {completeLegacySkyOptical,liveSkyOpticalCompletion,sameSkyOpticalCompletion,sameSkyOpticalInput} from "./sky-sdss-optical-completion";
import {createSkyViewBasis,sameSkyViewBasis} from "./sky-view-projection";
import {copySkyDeepAuxiliaryDecisions,sameSkyDeepAuxiliaryDecisions} from "./sky-deep-auxiliary-visibility";
import {sameSkyHipsCompletion} from "./sky-hips-source-credit";
import {skyNativeImageIsCurrent} from "./sky-artwork-loader";

// Actual page callbacks + actual Canvas lifecycle, controlled draw completion.
// This tests publication fences, not rendered pixels, native timing or driver races.
const text=readFileSync(process.env.CLOUD_SKY_OPTICAL_PAGE_SOURCE ?? new URL("./spot-sky-page.tsx",import.meta.url),"utf8");
const source=ts.createSourceFile("spot-sky-page.tsx",text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const expressions=new Map<string,ts.Expression>();
function find(node:ts.Node){
  if(ts.isPropertyAssignment(node)&&["paint","presented","invalidated","sameScene"].includes(node.name.getText(source)))
    expressions.set(node.name.getText(source),node.initializer);
  ts.forEachChild(node,find);
}
find(source);
const basis=createSkyViewBasis(20,110,0)!,nextBasis=createSkyViewBasis(55,125,0)!;

function harness(){
  let id=0,contextId=0;
  const tasks=new Map<number,{callback:()=>void;delay:number}>();
  const clock:CanvasClock={schedule(callback,delay){tasks.set(++id,{callback,delay});return id;},cancel(handle){tasks.delete(handle as number);}};
  const step=()=>{const pending=[...tasks].find(([,task])=>task.delay===0);assert(pending,"a real scheduled render must exist");tasks.delete(pending[0]);pending[1].callback();};
  const generation={current:1},pending={current:null as any},picking={current:null as any};
  const state={presented:null as any,camera:null as any,inspections:[] as any[],failure:null as unknown};
  const attempts:Array<{complete:()=>void;view:unknown;frameSources:unknown}>=[];
  let view=basis,defer=true,drawFault=false,copyFault=false,copies=0;
  const orientation={latestPresentation:{current:null},presented:{current:null as any}};
  const bindings:any={liveSkyOpticalCompletion,sameSkyOpticalCompletion,sameSkyOpticalInput,resolvedSkyBodyReferences,
    copySkyDeepAuxiliaryDecisions,sameSkyDeepAuxiliaryDecisions,sameSkyHipsCompletion,skyNativeImageIsCurrent,sameSkyViewBasis,
    canvasGenerationRef:generation,pendingSkyPaintRef:pending,paintedSkyObjectsRef:picking,orientation,
    canvasSurfaceRef:{current:{present(){if(copyFault)throw new Error("controlled_display_copy_failure");copies++;}}},
    orientationController:{snapshot:()=>({})},manualBasisRef:{current:null},zoomRef:{current:.05},viewportInsetsRef:{current:{}},reducedMotionRef:{current:false},
    resolveSkyCanvasView:()=>({verticalFovDeg:.05,progress:1,center:{x:195,y:422},localView:view,intent:"manual"}),
    browsingCamera:{update:()=>({view,animating:false})},
    setPresentedSkyFrame:(update:any)=>{state.presented=typeof update === "function" ? update(state.presented) : update;},
    setPresentedCamera:(update:any)=>{state.camera=typeof update === "function" ? update(state.camera) : update;},
    setCanvasSize:()=>{},setCanvasError:()=>{},canvasDrawRevisionRef:{current:0},
    publishAcceptanceSkySceneInspection:(_owner:unknown,inspection:unknown)=>state.inspections.push(inspection),
    EMPTY_SKY_IMAGES:new Map(),setArtworkContributionUnavailable:()=>{},setSolarLightUnavailable:()=>{},setMoonDiscUnavailable:()=>{},setPlanetDiscUnavailable:()=>{},setSunDiscUnavailable:()=>{},
    setGalacticBandUnavailable:()=>{},setLandscapeUnavailable:()=>{},
    drawSkyScene:(...args:any[])=>{
      const drawnView=args[12],image=args[30];
      const snapshot={catalogVersion:"v",catalogHash:"h",frameAt:args[2],width:args[5],height:args[6],
        view:{basis:drawnView,verticalFovDeg:args[10],center:args[13],landscape:null},
        objects:[{reference:"M:51",displayName:"M51",kind:"GALAXY",magnitude:8,x:195,y:422}]};
      const frameSources=text.includes("pendingSkyPaintRef")
        ? {sdssOptical:completeLegacySkyOptical(image,image?.image),deepSkyImage:args[11]?.image??null}
        : {sdssOpticalImage:image?.image??null,deepSkyImage:args[11]?.image??null};
      args[8](snapshot,frameSources);attempts.push({complete:args[9],view:drawnView,frameSources});
      if(drawFault)throw new Error("controlled_draw_completion_failure");
      if(!defer)args[9]();
    }};
  const context=vm.createContext(bindings);
  const read=(name:string)=>{const expression=expressions.get(name);assert(expression,name);return vm.runInContext(ts.transpileModule(`(${expression.getText(source)})`,{
    compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);};
  const accepted=read("presented"),invalidated=read("invalidated");
  const lifecycle=createSkyCanvasLifecycle<any,object>({measure:done=>done({width:390,height:844}),
    createContext:()=>({id:++contextId}),releaseContext:()=>{generation.current++;},paint:read("paint"),sameScene:read("sameScene"),
    presented:accepted,invalidated,failed:error=>{state.failure=error;}},clock);
  const data={},image={},optical={image,level:"DETAIL",fieldDegrees:.05,reference:"M:51",publicationHash:"legacy-M51"};
  const frame={nativeImageGeneration:1,orientationRevision:0,data,frameAt:"2026-10-02T12:00:00.000Z",mode:"NIGHT",sceneReady:true,
    owner:"formal",inspection:{spotId:"spot"},sdssOpticalImage:optical,deepSkyImage:null,coordinateGrids:{horizontal:false,equatorial:false}};
  lifecycle.ready();
  return {lifecycle,frame,state,attempts,pending,picking,generation,orientation,step,
    copies:()=>copies,failCopy:()=>{copyFault=true;},
    setView:(value:typeof basis)=>{view=value;},synchronous:()=>{defer=false;},failDraw:()=>{drawFault=true;}};
}

test("painted callbacks stage only; accepted done publishes actual view/source/picking together",()=>{
  const h=harness();h.lifecycle.request(h.frame);h.step();
  assert.equal(h.state.presented,null,"paint alone must not bypass lifecycle acceptance");
  assert.equal(h.picking.current,null);assert.equal(h.state.camera,null);assert.equal(h.orientation.presented.current,null);
  h.attempts[0]!.complete();
  assert.equal(h.state.failure,null,"accepted completion must not hide a callback dependency failure");
  // Callback-controlled mutation is intentionally opaque to static flow narrowing.
  const accepted=h.state as {presented:any;camera:any},picked=h.picking as {current:any};
  assert.equal(accepted.presented.frameAt,h.frame.frameAt);assert.strictEqual(accepted.camera.basis,basis);
  assert.equal(accepted.presented.nativeCanvasGeneration,1);assert.strictEqual(picked.current.view.basis,basis);
  assert.strictEqual(h.orientation.presented.current,basis);assert.equal(h.state.inspections.length,1);
  assert.equal(h.pending.current,null);
  assert.equal(h.copies(),1);
  const saved=h.state.presented;h.attempts[0]!.complete();assert.strictEqual(h.state.presented,saved);assert.equal(h.state.inspections.length,1);
});

test("hide, resize, remount, changed scene and hide-until-presented reject staged old completion",()=>{
  for(const action of ["hide","resize","remount","scene","hide-until"] as const){
    const h=harness();h.lifecycle.request(h.frame);h.step();
    if(action==="hide")h.lifecycle.hide();
    else if(action==="resize")h.lifecycle.resize();
    else if(action==="remount"){h.lifecycle.setMounted(false);h.lifecycle.setMounted(true);}
    else h.lifecycle.request({...h.frame,mode:"DAY"},action==="hide-until");
    h.attempts[0]!.complete();
    assert.equal(h.state.presented,null,action);assert.equal(h.picking.current,null,action);assert.equal(h.state.inspections.length,0,action);
    assert.equal(h.pending.current,null,action);
    assert.equal(h.copies(),0,"rejected completion must not copy stale pixels into the display");
  }
});

test("a native display-copy failure publishes no camera, source, pick or READY identity",()=>{
  const h=harness();h.synchronous();h.failCopy();h.lifecycle.request(h.frame);h.step();
  assert.match(String(h.state.failure),/controlled_display_copy_failure/u);
  assert.equal(h.copies(),0);assert.equal(h.state.presented,null);assert.equal(h.picking.current,null);
  assert.equal(h.state.camera,null);assert.equal(h.state.inspections.length,0);
});

test("same-scene newer pose can accept older actual view without relabeling or starving visibility",()=>{
  const h=harness();h.lifecycle.request(h.frame);h.step();h.setView(nextBasis);
  h.lifecycle.request({...h.frame,pose:{basis:nextBasis}});h.attempts[0]!.complete();
  assert.strictEqual(h.state.camera.basis,basis,"accepted earlier draw must not borrow the newest pose");
  assert.strictEqual(h.picking.current.view.basis,basis);assert.equal(h.state.inspections.length,1);
  h.step();assert.strictEqual(h.state.camera.basis,basis,"new draw still waits for its own completion");
  h.attempts[1]!.complete();assert.strictEqual(h.state.camera.basis,nextBasis);assert.equal(h.state.inspections.length,2);
});

test("synchronous completion works; failed draw invalidates staged result without source publication",()=>{
  const sync=harness();sync.synchronous();sync.lifecycle.request(sync.frame);sync.step();
  assert.equal(sync.state.presented.frameAt,sync.frame.frameAt);assert.equal(sync.pending.current,null);
  const failed=harness();failed.failDraw();failed.lifecycle.request(failed.frame);failed.step();
  assert.match(String(failed.state.failure),/controlled_draw_completion_failure/);
  assert.equal(failed.state.presented,null);assert.equal(failed.picking.current,null);assert.equal(failed.pending.current,null);
  failed.attempts[0]!.complete();assert.equal(failed.state.inspections.length,0);
});

test("old Canvas completion cannot publish or erase a newer attempt",()=>{
  const h=harness();h.lifecycle.request(h.frame);h.step();const old=h.attempts[0]!;
  h.lifecycle.resize();h.lifecycle.request({...h.frame,nativeImageGeneration:h.generation.current});h.step();
  const sentinel={newer:true};h.pending.current=sentinel;old.complete();assert.strictEqual(h.pending.current,sentinel);
  h.pending.current=null;h.attempts[1]!.complete();
  assert.equal(h.state.presented.nativeCanvasGeneration,h.generation.current);assert.equal(h.state.inspections.length,1);
  old.complete();assert.equal(h.state.inspections.length,1);assert.equal(h.pending.current,null);
});
