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
import * as bodyImages from "./sky-body-image-completion";
import { skyPageCanvasTestBindings, skyPageCanvasTestFrame, skyPageCanvasLifecyclePort } from "./sky-optical-page-test-support";
import type { SkySceneFrameInput, SkyScenePorts } from "./sky-scene-frame";

// Actual page callbacks + actual Canvas lifecycle, controlled draw completion.
// This tests publication fences, not rendered pixels, native timing or driver races.
const text=readFileSync(process.env.CLOUD_SKY_OPTICAL_PAGE_SOURCE ?? new URL("./spot-sky-page.tsx",import.meta.url),"utf8");
const source=ts.createSourceFile("spot-sky-page.tsx",text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const expressions=new Map<string,ts.Expression>();
for (const name of ["paint", "presented", "invalidated", "sameScene"] as const)
  expressions.set(name, skyPageCanvasLifecyclePort(source, name));
const basis=createSkyViewBasis(20,110,0)!,nextBasis=createSkyViewBasis(55,125,0)!;

function harness(){
  let id=0,contextId=0;
  const tasks=new Map<number,{callback:()=>void;delay:number}>();
  const clock:CanvasClock={schedule(callback,delay){tasks.set(++id,{callback,delay});return id;},cancel(handle){tasks.delete(handle as number);}};
  const step=(delay=0)=>{const pending=[...tasks].find(([,task])=>task.delay===delay);assert(pending,"a real scheduled render must exist");tasks.delete(pending[0]);pending[1].callback();};
  const generation={current:1},pending={current:null as any},picking={current:null as any};
  const state={presented:null as any,camera:null as any,inspections:[] as any[],failure:null as unknown};
  const attempts:Array<{complete:()=>void;view:unknown;frameSources:unknown}>=[];
  let view=basis,defer=true,drawFault=false,copyFault=false,copies=0,animating=false;
  let named=false,foreignResult=false,foreignSnapshot=false;
  const renewals:boolean[]=[];
  const orientation={latestPresentation:{current:null},presented:{current:null as any}};
  const bindings:any=skyPageCanvasTestBindings({...bodyImages,liveSkyOpticalCompletion,sameSkyOpticalCompletion,sameSkyOpticalInput,resolvedSkyBodyReferences,
    copySkyDeepAuxiliaryDecisions,sameSkyDeepAuxiliaryDecisions,sameSkyHipsCompletion,skyNativeImageIsCurrent,sameSkyViewBasis,
    canvasGenerationRef:generation,pendingSkyPaintRef:pending,paintedSkyObjectsRef:picking,orientation,
    automaticContributionGroupsRef:{current:0},preparedRegionFailureRef:{current:()=>{}},
    canvasSurfaceRef:{current:{present(){if(copyFault)throw new Error("controlled_display_copy_failure");copies++;}}},
    orientationController:{snapshot:()=>({alignment:{mode:'auto'}})},manualBasisRef:{current:null},zoomRef:{current:.05},viewportInsetsRef:{current:{}},reducedMotionRef:{current:false},
    resolveSkyCanvasView:()=>({verticalFovDeg:.05,progress:1,center:{x:195,y:422},localView:view,intent:"manual",occlusionInsets:{top:0,bottom:0}}),
    browsingCamera:{update:()=>({view,animating})},
    setPresentedSkyFrame:(update:any)=>{state.presented=typeof update === "function" ? update(state.presented) : update;},
    setPresentedCamera:(update:any)=>{state.camera=typeof update === "function" ? update(state.camera) : update;},
    setCanvasSize:()=>{},setCanvasError:()=>{},canvasDrawRevisionRef:{current:0},
    publishAcceptanceSkySceneInspection:(_owner:unknown,inspection:unknown)=>state.inspections.push(inspection),
    EMPTY_SKY_IMAGES:new Map(),setArtworkContributionUnavailable:()=>{},setSolarLightUnavailable:()=>{},setMoonDiscUnavailable:()=>{},setPlanetDiscUnavailable:()=>{},setSunDiscUnavailable:()=>{},
    setGalacticBandUnavailable:()=>{},setLandscapeUnavailable:()=>{},
    drawSkyScene:(_surface:unknown,input:SkySceneFrameInput,ports:SkyScenePorts)=>{
      const {identity}=input,drawnView=identity.view.manualBasis,image=input.imagery?.targetOptical?.image;
      const snapshot={identity,catalogVersion:"v",catalogHash:"h",frameAt:identity.observation.frameAt,width:identity.canvas.width,height:identity.canvas.height,
        view:{basis:drawnView,verticalFovDeg:identity.view.verticalFovDeg,center:identity.view.center,landscape:null},
        ...(named?{namedStars:[{reference:'HR:1',displayName:'已接受星名',kind:'STAR' as const,magnitude:1,x:100,y:200,opacity:1}]}:{}),
        objects:[{reference:"M:51",displayName:"M51",kind:"GALAXY",magnitude:8,x:195,y:422}]};
      const frameSources=text.includes("pendingSkyPaintRef")
        ? {sdssOptical:completeLegacySkyOptical(image,image?.image),deepSkyImage:input.imagery?.infrared?.image??null}
        : {sdssOpticalImage:image?.image??null,deepSkyImage:input.imagery?.infrared?.image??null};
      const otherIdentity={...identity,canvas:{...identity.canvas,generation:identity.canvas.generation+1}};
      ports.painted?.({identity:foreignResult?otherIdentity:identity,
        snapshot:{...snapshot,identity:foreignSnapshot?otherIdentity:identity} as Parameters<NonNullable<SkyScenePorts['painted']>>[0]['snapshot'],
        sources:frameSources as Parameters<NonNullable<SkyScenePorts['painted']>>[0]['sources']});
      const complete=()=>ports.completed?.(identity);attempts.push({complete,view:drawnView,frameSources});
      if(drawFault)throw new Error("controlled_draw_completion_failure");
      if(!defer)complete();
    }});
  const context=vm.createContext(bindings);
  const read=(name:string)=>{const expression=expressions.get(name);assert(expression,name);return vm.runInContext(ts.transpileModule(`(${expression.getText(source)})`,{
    compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);};
  const accepted=read("presented"),invalidated=read("invalidated");
  const lifecycle=createSkyCanvasLifecycle<any,object>({measure:done=>done({width:390,height:844}),
    createContext:()=>({id:++contextId}),releaseContext:()=>{generation.current++;},paint:read("paint"),sameScene:read("sameScene"),
    presented:accepted,invalidated,failed:error=>{state.failure=error;}},clock);
  const data={},image={},optical={image,level:"DETAIL",fieldDegrees:.05,reference:"M:51",publicationHash:"legacy-M51"};
  const frame=skyPageCanvasTestFrame({nativeImageGeneration:1,orientationRevision:0,data,frameAt:"2026-10-02T12:00:00.000Z",mode:"NIGHT",sceneReady:true,
    owner:"formal",inspection:{spotId:"spot"},sdssOpticalImage:optical,preparedRegionImages:[],deepSkyImage:null,coordinateGrids:{horizontal:false,equatorial:false}});
  bindings.browsingDrawRef.current=(continuation=false)=>{renewals.push(continuation);lifecycle.request(frame,false,continuation);};
  lifecycle.ready();
  return {lifecycle,frame,state,attempts,pending,picking,generation,orientation,step,
    copies:()=>copies,failCopy:()=>{copyFault=true;},animate:(value:boolean)=>{animating=value;},renewals,tasks,
    names:()=>{named=true;bindings.reducedMotionRef.current=true;},foreign:(part:'result'|'snapshot')=>{foreignResult=part==='result';foreignSnapshot=part==='snapshot';},
    setView:(value:typeof basis)=>{view=value;},synchronous:()=>{defer=false;},failDraw:()=>{drawFault=true;}};
}

test("the actual page renews a finite non-navigation camera only after its copy, then stops",()=>{
  const h=harness();h.animate(true);h.lifecycle.request(h.frame);h.step();
  assert.deepEqual(h.renewals,[],"preparation alone cannot renew an unaccepted animation");
  h.attempts[0]!.complete();assert.deepEqual(h.renewals,[true]);
  assert.equal(h.copies(),1);assert.equal([...h.tasks.values()].filter(task=>task.delay===16).length,1);
  h.animate(false);h.step(16);h.attempts[1]!.complete();
  assert.equal(h.copies(),2);assert.deepEqual(h.renewals,[true]);assert.equal(h.tasks.size,0);
  h.lifecycle.dispose();
});

test("painted callbacks stage only; accepted done publishes actual view/source/picking together",()=>{
  const h=harness();h.lifecycle.request(h.frame);h.step();
  assert.equal(h.state.presented,null,"paint alone must not bypass lifecycle acceptance");
  assert.equal(h.picking.current,null);assert.equal(h.state.camera,null);assert.equal(h.orientation.presented.current,null);
  h.attempts[0]!.complete();
  assert.equal(h.state.failure,null,"accepted completion must not hide a callback dependency failure");
  // Callback-controlled mutation is intentionally opaque to static flow narrowing.
  const accepted=h.state as {presented:any;camera:any},picked=h.picking as {current:any};
  assert.equal(accepted.presented.frameAt,h.frame.frameAt);assert.deepEqual(accepted.camera.basis,basis);
  assert.equal(accepted.presented.nativeCanvasGeneration,1);assert.deepEqual(picked.current.view.basis,basis);
  assert.strictEqual(picked.current.identity,accepted.presented.identity);
  assert.strictEqual(picked.current.view.basis,accepted.presented.identity.view.manualBasis);
  assert.strictEqual(accepted.camera.basis,accepted.presented.identity.view.manualBasis);
  assert.strictEqual(h.orientation.presented.current,accepted.camera.basis);assert.equal(h.state.inspections.length,1);
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
  assert.deepEqual(h.state.camera.basis,basis,"accepted earlier draw must not borrow the newest pose");
  assert.deepEqual(h.picking.current.view.basis,basis);assert.equal(h.state.inspections.length,1);
  h.step();assert.deepEqual(h.state.camera.basis,basis,"new draw still waits for its own completion");
  h.attempts[1]!.complete();assert.deepEqual(h.state.camera.basis,nextBasis);assert.equal(h.state.inspections.length,2);
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

test("an accepted view, pick, name and source stay bound to A while candidate B is rejected or retired",()=>{
  for(const action of ['superseded','foreign-result','foreign-snapshot','hide','retire'] as const){
    const h=harness();h.names();h.lifecycle.request(h.frame);h.step();assert.equal(h.state.failure,null);h.attempts[0]!.complete();
    const accepted=h.state.presented,pick=h.picking.current,camera=h.state.camera;
    assert(accepted&&pick&&accepted.catalogNames.length>0,action);
    assert.equal(accepted.catalogNames[0].displayName,'已接受星名');
    assert.equal(accepted.sdssOptical.field.image,h.frame.sdssOpticalImage.image);
    assert.equal(pick.identity,accepted.identity);
    const before=JSON.stringify({view:accepted.identity.view,objects:pick.objects,names:accepted.catalogNames,
      source:accepted.sdssOptical.field,frameAt:accepted.frameAt});
    if(action==='foreign-result')h.foreign('result');
    if(action==='foreign-snapshot')h.foreign('snapshot');
    h.setView(nextBasis);
    const candidate={...h.frame,data:{},frameAt:'2026-10-02T12:01:00.000Z',sdssOpticalImage:{...h.frame.sdssOpticalImage,image:{candidate:true}}};
    h.lifecycle.request(candidate);h.step();
    assert.equal(h.state.presented,accepted,'preparing B cannot relabel accepted A');
    assert.equal(h.picking.current,pick);assert.equal(h.state.camera,camera);
    if(action==='superseded')h.lifecycle.request({...candidate,frameAt:'2026-10-02T12:02:00.000Z'});
    else if(action==='hide')h.lifecycle.hide();
    else if(action==='retire')h.lifecycle.dispose();
    h.attempts[1]!.complete();h.attempts[1]!.complete();
    assert.equal(JSON.stringify({view:accepted.identity.view,objects:pick.objects,names:accepted.catalogNames,
      source:accepted.sdssOptical.field,frameAt:accepted.frameAt}),before,action);
    assert.equal(accepted.identity.observation.data,h.frame.data);
    assert.equal(accepted.identity.canvas.generation,1);
    assert.equal(accepted.sdssOptical.field.image,h.frame.sdssOpticalImage.image);
    if(action==='superseded'||action==='foreign-result'||action==='foreign-snapshot'){
      assert.equal(h.state.presented,accepted,action);assert.equal(h.picking.current,pick,action);
      assert.equal(h.state.inspections.length,1,'late/foreign completion grants no READY identity');
    }
    h.lifecycle.dispose();
  }
});
