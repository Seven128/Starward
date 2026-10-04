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
import { createSkyPanoramaMask, skyLandscapePaintedPanorama } from "./sky-landscape-mask";
import { selectSkyLandscapePanorama } from "./sky-landscape-resources";
import type { SkyLandscapeManifestData, SkyLandscapeResource } from "@starward/miniapp-contracts";

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
    args[10]=45;args[12]=createSkyViewBasis(324.462322,110,0)!;args[34]={enabled};
    (drawSkyScene as (...values:any[])=>void)(...args);
    const frame=snapshot as SkyPickSnapshot|null;assert.ok(frame);
    assert.ok(frame.objects.some(object=>object.reference==="SOLAR:MOON"));
    const moon=frame.objects.find(object=>object.reference==="SOLAR:MOON")!;
    const choices=pickPaintedSkyObjects(frame,{x:moon.x,y:moon.y,frameAt:at,
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

test("completed transparent source with no bitmap cannot substitute a procedural tree and hide the Moon",()=>{
  const mask=createSkyPanoramaMask({projection:{seamAzimuthDeg:0}} as SkyLandscapeManifestData,
    {image:{width:8,height:8}} as SkyLandscapeResource,new Uint8Array(64));
  const data={...report(),hourly:[{...report().hourly[0],moonAzimuthDeg:324.462322,
    moonAltitudeDeg:10,moonAngularDiameterDeg:.5,moonIllumination:.9}]} as ResolvedSkyReport;
  let snapshot:SkyPickSnapshot|null=null,landscapeCalls=0;const availability:boolean[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="landscape"?()=>{landscapeCalls++;return true;}:()=>true}) as SkyRenderSurface;
  const args=Array(35).fill(undefined);args.splice(0,7,surface,data,at,null,null,390,844);
  args[7]="NIGHT";args[8]=(value:SkyPickSnapshot|null)=>{snapshot=value;};
  args[10]=45;args[12]=createSkyViewBasis(324.462322,110,0)!;
  args[34]={enabled:true,mask,availability:(value:boolean)=>availability.push(value)};
  (drawSkyScene as (...values:any[])=>void)(...args);
  const frame=snapshot as SkyPickSnapshot|null;assert.ok(frame);
  assert.equal(landscapeCalls,0);assert.deepEqual(availability,[true]);
  const actualMask=frame.view?.landscape;assert.ok(actualMask?.kind==="panorama");
  assert.equal(actualMask.alpha,mask.alpha);assert.equal(actualMask.publication,mask.publication);
  assert.equal(actualMask.opacity,0,"certified zero contribution is not an opaque successful photo pass");
  assert.equal(skyLandscapePaintedPanorama(actualMask),null,"a skipped zero-alpha source cannot claim displayed photo provenance");
  const moon=frame.objects.find(object=>object.reference==="SOLAR:MOON")!;assert(moon);
  assert(pickPaintedSkyObjects(frame,{x:moon.x,y:moon.y,frameAt:at,catalogVersion:frame.catalogVersion,catalogHash:frame.catalogHash})
    .some(object=>object.reference==="SOLAR:MOON"),"published zero alpha keeps the real independent Moon selectable");
});

test("a completed empty detail mask cannot retire a still-painted overview or grant its hidden Moon picking",()=>{
  const publication={projection:{seamAzimuthDeg:0}} as SkyLandscapeManifestData;
  const resource={image:{width:8,height:8}} as SkyLandscapeResource;
  const detail=createSkyPanoramaMask(publication,resource,new Uint8Array(64));
  const overview=createSkyPanoramaMask(publication,resource,new Uint8Array(64).fill(255));
  const image={width:8,height:8};
  const data={...report(),hourly:[{...report().hourly[0],moonAzimuthDeg:324.462322,
    moonAltitudeDeg:10,moonAngularDiameterDeg:.5,moonIllumination:.9}]} as ResolvedSkyReport;
  let snapshot:SkyPickSnapshot|null=null;const submitted:unknown[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="landscape"?(_view:unknown,_sun:unknown,_red:unknown,panorama:unknown)=>{
    submitted.push(panorama);return true;
  }:()=>true}) as SkyRenderSurface;
  const args=Array(35).fill(undefined);args.splice(0,7,surface,data,at,null,null,390,844);
  args[7]="NIGHT";args[8]=(value:SkyPickSnapshot|null)=>{snapshot=value;};
  args[10]=45;args[12]=createSkyViewBasis(324.462322,110,0)!;
  args[34]={enabled:true,mask:detail,panorama:{image,mask:overview}};
  (drawSkyScene as (...values:any[])=>void)(...args);
  const frame=snapshot as SkyPickSnapshot|null;assert.ok(frame);
  assert.deepEqual(submitted,[{image,mask:overview}],"the available fallback retains its own alpha identity");
  assert.equal(frame.view?.landscape,overview);
  const moon=frame.objects.find(object=>object.reference==="SOLAR:MOON")!;assert(moon);
  assert(!pickPaintedSkyObjects(frame,{x:moon.x,y:moon.y,frameAt:at,catalogVersion:frame.catalogVersion,catalogHash:frame.catalogHash})
    .some(object=>object.reference==="SOLAR:MOON"),"an independent empty fine mask cannot erase actual coarse foreground coverage");
});

test("corners on different trees cannot certify that open sky between them is covered",()=>{
  const directions=[skyHorizontalDirection(324.462322,9)!,skyHorizontalDirection(324.462322,10)!,
    skyHorizontalDirection(41.19,9)!,skyHorizontalDirection(41.19,10)!];
  assert.ok(directions.every(skyLandscapeOccludes),"all corners really intersect some foreground solid");
  assert.equal(skyLandscapeOccludes(skyHorizontalDirection(0,10)!),false,"the intervening sky stays open");
  assert.equal(skyLandscapeCoversRayHull(directions),false,"coverage needs one convex solid, not a union of corner hits");
});

test("detail-first downgrade waits for its real coarse photo instead of flashing unrelated trees",()=>{
  const publication={projection:{seamAzimuthDeg:0}} as SkyLandscapeManifestData;
  const resource={id:"overview",image:{width:8,height:8}} as SkyLandscapeResource;
  const coarse=createSkyPanoramaMask(publication,resource,new Uint8Array(64).fill(255));
  const detail=createSkyPanoramaMask(publication,{...resource,id:"detail"},new Uint8Array(64).fill(255));
  const panorama=selectSkyLandscapePanorama(resource,new Map([["overview",coarse],["detail",detail]]),
    new Map(),new Map([["landscape:detail",{width:8,height:8}]]));
  assert.equal(panorama,null,"a coarse request cannot spend its budget on the retained fine bitmap");
  let landscapeCalls=0,snapshot:SkyPickSnapshot|null=null;
  const availability:Array<boolean|null>=[];
  const surface=new Proxy({}, {get:(_target,key)=>()=>{if(key==="landscape")landscapeCalls++;return true;}}) as SkyRenderSurface;
  const args=Array(35).fill(undefined);args.splice(0,7,surface,report(),at,null,null,390,844);
  args[7]="NIGHT";args[8]=(value:SkyPickSnapshot|null)=>{snapshot=value;};
  args[12]=createSkyViewBasis(0,110,0)!;
  args[34]={enabled:true,mask:coarse,panorama,pending:true,availability:(value:boolean|null)=>availability.push(value)};
  (drawSkyScene as (...values:any[])=>void)(...args);
  assert.equal(landscapeCalls,0,"a published photo pending pixels cannot substitute unrelated procedural terrain");
  assert.equal((snapshot as SkyPickSnapshot|null)?.view?.landscape,null);
  assert.equal(availability.length,1);
  assert.equal(availability[0],null,"pending is separate from successful material and unavailable failure");
  args[34]={enabled:true,mask:coarse,panorama,pending:false,failed:true,
    availability:(value:boolean|null)=>availability.push(value)};
  (drawSkyScene as (...values:any[])=>void)(...args);
  assert.equal(landscapeCalls,1,"an explicit image failure keeps the adopted procedural recovery");
  assert.equal((snapshot as SkyPickSnapshot|null)?.view?.landscape?.kind,"procedural");
  assert.equal(availability.at(-1),true,"only a real successful fallback pass is available");
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

test("a successfully painted recovery model survives retry and fades with the real returning photo",()=>{
  const mask=createSkyPanoramaMask({projection:{seamAzimuthDeg:0}} as SkyLandscapeManifestData,
    {id:"overview",image:{width:8,height:8}} as SkyLandscapeResource,new Uint8Array(64).fill(255));
  const image={width:8,height:8};
  let snapshot:SkyPickSnapshot|null=null;
  const calls:Array<{photo:boolean;opacity:number}>=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="landscape"
    ? (_view:unknown,_sun:unknown,_red:unknown,photo:unknown,opacity:number)=>{calls.push({photo:Boolean(photo),opacity});return true;}
    : ()=>true}) as SkyRenderSurface;
  const args=Array(35).fill(undefined);args.splice(0,7,surface,report(),at,null,null,390,844);
  args[7]="NIGHT";args[8]=(value:SkyPickSnapshot|null)=>{snapshot=value;};
  args[12]=createSkyViewBasis(0,110,0)!;
  args[34]={enabled:true,mask,pending:true,previous:{kind:"procedural"}};
  (drawSkyScene as (...values:any[])=>void)(...args);
  assert.deepEqual(calls,[{photo:false,opacity:1}],"retry keeps the actual existing model instead of clearing the foreground");
  assert.equal((snapshot as SkyPickSnapshot|null)?.view?.landscape?.kind,"procedural");
  calls.length=0;
  args[34]={enabled:true,mask,panorama:{image,mask},readiness:.5,previous:{kind:"procedural"}};
  (drawSkyScene as (...values:any[])=>void)(...args);
  assert.deepEqual(calls,[{photo:false,opacity:.5},{photo:true,opacity:.5}],"both actually painted materials participate in recovery");
  assert.equal((snapshot as SkyPickSnapshot|null)?.view?.landscape?.kind,"transition");
  calls.length=0;
  args[34]={enabled:true,mask,panorama:{image,mask},readiness:1,previous:(snapshot as SkyPickSnapshot|null)?.view?.landscape};
  (drawSkyScene as (...values:any[])=>void)(...args);
  assert.deepEqual(calls,[{photo:true,opacity:1}],"the successful photo retires the model when the transition settles");
  assert.equal((snapshot as SkyPickSnapshot|null)?.view?.landscape?.kind,"panorama");
});

test("a failed photo restores only the missing alpha over a successful partial model",()=>{
  const mask=createSkyPanoramaMask({projection:{seamAzimuthDeg:0}} as SkyLandscapeManifestData,
    {id:"overview",image:{width:8,height:8}} as SkyLandscapeResource,new Uint8Array(64).fill(255));
  let snapshot:SkyPickSnapshot|null=null,alpha=0;
  const surface=new Proxy({}, {get:(_target,key)=>key==="landscape"
    ? (_view:unknown,_sun:unknown,_red:unknown,photo:unknown,opacity:number)=>{
      if(photo)return false;alpha=opacity+(1-opacity)*alpha;return true;
    } : ()=>true}) as SkyRenderSurface;
  const args=Array(35).fill(undefined);args.splice(0,7,surface,report(),at,null,null,390,844);
  args[7]="NIGHT";args[8]=(value:SkyPickSnapshot|null)=>{snapshot=value;};
  args[12]=createSkyViewBasis(0,90,0)!;
  args[34]={enabled:true,mask,panorama:{image:{width:8,height:8},mask},readiness:.5,previous:{kind:"procedural",opacity:.5}};
  (drawSkyScene as (...values:any[])=>void)(...args);
  assert.equal(alpha,.5,"recovery cannot compound the already submitted partial material into .625");
  assert.equal((snapshot as SkyPickSnapshot|null)?.view?.landscape?.opacity,alpha,
    "committed occlusion must agree with the actual successful source-over passes");
  let modelCalls=0;
  const partialOnly=new Proxy({}, {get:(_target,key)=>key==="landscape"
    ? (_view:unknown,_sun:unknown,_red:unknown,photo:unknown)=>!photo && ++modelCalls===1 : ()=>true}) as SkyRenderSurface;
  args[0]=partialOnly;
  (drawSkyScene as (...values:any[])=>void)(...args);
  assert.equal((snapshot as SkyPickSnapshot|null)?.view?.landscape?.opacity,.25,
    "failed restoration cannot erase or upgrade the independent already painted partial model");
});
