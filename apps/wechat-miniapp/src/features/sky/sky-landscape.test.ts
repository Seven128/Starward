import assert from "node:assert/strict";
import test from "node:test";
import { drawSkyScene } from "./sky-scene-render";
import type { SkyRenderSurface } from "./sky-render-surface";
import type { ResolvedSkyReport } from "./sky-stellar-scene";
import type { SkyViewBasis, SkyVector } from "./sky-view-projection";
import type { SkySolarLight } from "./sky-solar-light";
import { pickPaintedSkyObjects, type SkyPickSnapshot } from "./sky-object-picking";
import { createSkyViewBasis, skyHorizontalDirection } from "./sky-view-projection";
import { skyLandscapeOccludes, skyLandscapeCoversRayHull } from "./sky-landscape-geometry";

const at="2026-09-28T13:00:00.000Z";
const basis:SkyViewBasis={right:[1,0,0],up:[0,0,1],forward:[0,1,0]};
const report=(azimuth:number|null=270):ResolvedSkyReport=>({
  hourly:[{at,sunAzimuthDeg:azimuth,sunAltitudeDeg:-24}],
  skyScene:{state:"UNAVAILABLE",frames:[]},targetFrames:[],
} as unknown as ResolvedSkyReport);

function paint(mode:"NIGHT"|"OBSERVATION",data=report(),enabled=true,available=true) {
  const calls:{view:any;sun:SkySolarLight;red:boolean}[]=[];
  const availability:boolean[]=[];
  const order:string[]=[];
  let painted:SkyPickSnapshot|null=null;
  let failed=0,finished=0;
  const surface=new Proxy({}, {get:(_target,key)=>key==="landscape"
    ? (view:any,sun:SkySolarLight,red:boolean)=>{order.push("landscape");calls.push({view,sun,red});return available;}
    : key==="finish"?()=>{order.push("finish");finished++;}:()=>{order.push(String(key));return true;}}) as SkyRenderSurface;
  const args=Array(35).fill(undefined);
  args.splice(0,7,surface,data,at,null,null,390,844);
  args[7]=mode;args[10]=267.8;args[12]=basis;
  args[8]=(snapshot:SkyPickSnapshot|null)=>{painted=snapshot;};
  args[34]={enabled,availability:(available:boolean)=>{availability.push(available);if(!available)failed++;}};
  (drawSkyScene as (...values:any[])=>void)(...args);
  return {calls,failed,finished,availability,order,painted:painted as SkyPickSnapshot|null};
}

test("simulated ground follows the current exact sun and camera in ordinary and red modes",()=>{
  for(const mode of ["NIGHT","OBSERVATION"] as const){
    const result=paint(mode);
    assert.equal(result.calls.length,1);
    assert.equal(result.calls[0]!.view.basis,basis);
    assert.equal(result.calls[0]!.view.verticalFovDeg,267.8);
    assert.ok(result.calls[0]!.sun.direction[0]<-.9);
    assert.equal(result.calls[0]!.red,mode==="OBSERVATION");
    assert.deepEqual(result.availability,[true]);
    assert.equal(result.failed,0);assert.equal(result.finished,1);
  }
  assert.equal(paint("NIGHT",report(),false).calls.length,0);
  assert.deepEqual(paint("NIGHT",report(),false).availability,[]);
});

test("virtual geometry paints after celestial layers and publishes only an actually successful mask",()=>{
  const data={...report(),hourly:[{...report().hourly[0],sunAngularDiameterDeg:.53,
    moonAzimuthDeg:324.462322,moonAltitudeDeg:10,moonAngularDiameterDeg:.5,moonIllumination:.9}]} as ResolvedSkyReport;
  const result=paint("NIGHT",data);
  assert.ok(result.order.indexOf("moon")>=0,"exercise a celestial body before the foreground");
  assert.ok(result.order.indexOf("moon")<result.order.indexOf("landscape"));
  assert.deepEqual(result.order.slice(-2),["landscape","finish"]);
  assert.equal(result.painted?.view?.landscape?.kind,"procedural");
  assert.equal(paint("NIGHT",data,true,false).painted?.view?.landscape,null);
  assert.equal(paint("NIGHT",data,false).painted?.view?.landscape,null);
  assert.equal(paint("NIGHT",report(null)).painted?.view?.landscape,null);
});

test("the final virtual mask never opens a fully covered Moon, while an unobstructed repaint restores it",()=>{
  const data={...report(),hourly:[{...report().hourly[0],moonAzimuthDeg:324.462322,
    moonAltitudeDeg:10,moonAngularDiameterDeg:.5,moonIllumination:.9}]} as ResolvedSkyReport;
  for(const enabled of [true,false]) {
    const args=Array(35).fill(undefined);
    const surface=new Proxy({}, {get:()=>()=>true}) as SkyRenderSurface;
    let snapshot:SkyPickSnapshot|null=null;
    args.splice(0,7,surface,data,at,null,null,390,844);
    args[7]="NIGHT";args[8]=(value:SkyPickSnapshot|null)=>{snapshot=value;};
    args[10]=5;args[12]=createSkyViewBasis(324.462322,100,0)!;args[34]={enabled};
    (drawSkyScene as (...values:any[])=>void)(...args);
    const frame=snapshot as SkyPickSnapshot|null;assert.ok(frame);
    assert.ok(frame.objects.some(object=>object.reference==="SOLAR:MOON"));
    const choices=pickPaintedSkyObjects(frame,{x:195,y:422,frameAt:at,
      catalogVersion:frame.catalogVersion,catalogHash:frame.catalogHash});
    assert.equal(choices.some(object=>object.reference==="SOLAR:MOON"),!enabled);
  }
});

test("missing exact illumination and GPU failure retain independent scene completion",()=>{
  const missing=paint("NIGHT",report(null));
  assert.equal(missing.calls.length,0);assert.equal(missing.failed,1);assert.equal(missing.finished,1);
  assert.deepEqual(missing.availability,[false]);
  const failed=paint("NIGHT",report(),true,false);
  assert.equal(failed.calls.length,1);assert.equal(failed.failed,1);assert.equal(failed.finished,1);
  assert.deepEqual(failed.availability,[false]);
});

test("corners on different trees cannot certify that open sky between them is covered",()=>{
  const directions=[skyHorizontalDirection(324.462322,9)!,skyHorizontalDirection(324.462322,10)!,
    skyHorizontalDirection(41.19,9)!,skyHorizontalDirection(41.19,10)!];
  assert.ok(directions.every(skyLandscapeOccludes),"all corners really intersect some foreground solid");
  assert.equal(skyLandscapeOccludes(skyHorizontalDirection(0,10)!),false,"the intervening sky stays open");
  assert.equal(skyLandscapeCoversRayHull(directions),false,"coverage needs one convex solid, not a union of corner hits");
});

test("lobed canopy point hits cannot certify a hull across an open notch",()=>{
  // Authored northwest crown: two leaf tips frame a real gap in its outline.
  // This is one canopy, so the old rule for unions of convex solids is not
  // enough. A whole-image certificate must use its guaranteed convex core.
  const corners:SkyVector[]=[[-.6919662360157017,.6928910535374676,.2026936509661821],
    [-.6808971066540426,.700204825722863,.21469124850484347]];
  const gap:SkyVector=[-.6864577446368806,.6965767128795312,.20870229491309916];
  assert.ok(corners.every(skyLandscapeOccludes),"both endpoints are painted foliage");
  assert.equal(skyLandscapeOccludes(gap),false,"the interior notch is actual open sky");
  assert.equal(skyLandscapeCoversRayHull(corners),false,"point hits must not erase exposed image pixels and their source");
});
