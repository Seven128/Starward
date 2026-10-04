import assert from "node:assert/strict";
import test from "node:test";
import { skyMoonDiscAt } from "./sky-moon-disc";
import { drawSkyScene } from "./sky-scene-render";
import type { SkyRenderSurface } from "./sky-render-surface";
import { createSkyViewBasis, unprojectSkyPoint, type SkyViewBasis } from "./sky-view-projection";
import type { ResolvedSkyReport } from "./sky-stellar-scene";
import { pickPaintedSkyObjects, type SkyPickSnapshot } from "./sky-object-picking";

const at = "2026-09-23T12:00:00.000Z";
const diagonal = Math.SQRT1_2;
const basis: SkyViewBasis = {right:[1,0,0],up:[0,-diagonal,diagonal],forward:[0,diagonal,diagonal]};
const row = (moonAzimuthDeg: number | null, sunAzimuthDeg = 90, moonAngularDiameterDeg = .5) =>
  ({at,moonAzimuthDeg,moonAltitudeDeg:45,moonAngularDiameterDeg,moonIllumination:.5,
    sunAzimuthDeg,sunAltitudeDeg:0});

test("full-sphere browsing retains a set Moon's measured phase, surface axes and projected scale",()=>{
  const belowBasis=createSkyViewBasis(0,60,0)!;
  const c=Math.sqrt(.75);
  const belowRow={...row(0),moonAltitudeDeg:-30,
    moonBodyFrame:{primeMeridianEnu:[0,-c,.5],poleEnu:[0,.5,c]}};
  const below=skyMoonDiscAt([belowRow] as any,at,belowBasis,400,800,3);
  assert.ok(below,"a set lunar globe remains available at its actual below-horizon direction");
  assert.ok(Math.abs(below.x-200)<1e-9&&Math.abs(below.y-400)<1e-9);
  assert.equal(below.illuminatedFraction,.5);
  assert.ok(below.sunward[0]>.99,"the terminator still follows the same report's Sun");
  assert.ok(below.surfaceOrientation,"a valid body frame remains usable below the horizon");
  assert.ok(Math.abs(below.surfaceOrientation.observerBody[0]-1)<1e-9);
  const above=skyMoonDiscAt([{...row(0),moonAltitudeDeg:30}] as any,
    at,createSkyViewBasis(0,120,0)!,400,800,3)!;
  assert.ok(Math.abs(below.radiusPx-above.radiusPx)<1e-9);
  assert.equal(skyMoonDiscAt([belowRow] as any,at,createSkyViewBasis(180,120,0)!,400,800,3),null,
    "the projection antipode remains excluded");
  assert.equal(skyMoonDiscAt([belowRow] as any,at,basis,400,800,3),null,
    "actual viewport clipping remains active");
  assert.equal(skyMoonDiscAt([{...belowRow,moonAltitudeDeg:-91}] as any,
    at,belowBasis,400,800,3),null,"invalid ephemeris coordinates still fail closed");
});

test("surface orientation maps the centre to zero longitude and screen axes to east/south",()=>{
  const d=Math.SQRT1_2;
  const oriented={...row(0),moonBodyFrame:{primeMeridianEnu:[0,-d,-d],poleEnu:[0,-d,d]}};
  const disc=skyMoonDiscAt([oriented] as any,at,basis,400,800,3)!;
  assert.ok(disc.surfaceOrientation);
  const near=(actual:readonly number[],expected:readonly number[])=>
    actual.forEach((value,i)=>assert.ok(Math.abs(value-expected[i]!)<1e-4,`${i}: ${value}`));
  near(disc.surfaceOrientation.observerBody,[1,0,0]);
  near(disc.surfaceOrientation.rightBody,[0,1,0]);
  near(disc.surfaceOrientation.downBody,[0,0,-1]);
  assert.equal(skyMoonDiscAt([row(0)] as any,at,basis,400,800,3)?.surfaceOrientation,null,
    "older reports keep the plain phase disc without inventing a lunar map orientation");
});

test("same-instant Moon phase points toward the actual Sun and scales with distance/zoom", () => {
  const east = skyMoonDiscAt([row(0)] as any,at,basis,400,800,3)!;
  const west = skyMoonDiscAt([row(0,270)] as any,at,basis,400,800,3)!;
  const larger = skyMoonDiscAt([row(0,90,.55)] as any,at,basis,400,800,3)!;
  const overview = skyMoonDiscAt([row(0)] as any,at,basis,400,800,90)!;
  assert.ok(east && west && larger && overview);
  assert.ok(east.sunward[0] > .99 && west.sunward[0] < -.99);
  assert.ok(Math.abs(larger.radiusPx/east.radiusPx-1.1) < 1e-9);
  assert.ok(east.radiusPx > overview.radiusPx*10);
  assert.equal(skyMoonDiscAt([row(0)] as any,"2026-09-23T13:00:00.000Z",basis,400,800,3),null);
  assert.equal(skyMoonDiscAt([row(null)] as any,at,basis,400,800,3),null);
  assert.equal(skyMoonDiscAt([{...row(0),moonAltitudeDeg:-1}] as any,at,basis,400,800,3),null);
});

test("a lunar disc crossing the mathematical horizon retains its whole painted shape without landscape occlusion",()=>{
  const horizonBasis=createSkyViewBasis(0,90,0)!;
  const partlySet=skyMoonDiscAt([{...row(0),moonAltitudeDeg:-.1}] as any,
    at,horizonBasis,400,800,3)!;
  assert.ok(partlySet);
  assert.ok(unprojectSkyPoint(partlySet.x,partlySet.y,horizonBasis,400,800,3)![2]<0);
  assert.ok(unprojectSkyPoint(partlySet.x,partlySet.y-partlySet.radiusPx*.8,
    horizonBasis,400,800,3)![2]>0);
  assert.ok(skyMoonDiscAt([{...row(0),moonAltitudeDeg:-.3}] as any,
    at,horizonBasis,400,800,3),"an entirely set but in-viewport lunar disc is still valid");
  const views:unknown[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="moon"
    ? (_disc:unknown,view:unknown)=>{views.push(view);return true;}
    : key==="solarLight"||key==="sun"?()=>true:()=>{}}) as SkyRenderSurface;
  const report={hourly:[{...row(0),moonAltitudeDeg:-.1}],
    skyScene:{state:"UNAVAILABLE",frames:[]},targetFrames:[]} as unknown as ResolvedSkyReport;
  let snapshot:SkyPickSnapshot|null=null;
  drawSkyScene(surface,report,at,null,null,400,800,"NIGHT",value=>{snapshot=value;},undefined,3,null,horizonBasis);
  assert.deepEqual(views,[{basis:horizonBasis,verticalFovDeg:3}]);
  const painted=snapshot as SkyPickSnapshot|null;
  assert.ok(painted);
  const pick=(radius:number)=>pickPaintedSkyObjects(painted,{
    x:partlySet.x,y:partlySet.y-partlySet.radiusPx*radius,frameAt:at,
    catalogVersion:painted.catalogVersion,catalogHash:painted.catalogHash,
  },0).map(object=>object.reference);
  assert.deepEqual(pick(.8),["SOLAR:MOON"],"the visible lunar limb still uses its successful draw identity");
  assert.deepEqual(pick(0),["SOLAR:MOON"],"the mathematical horizon does not hide the painted lunar centre");
  assert.ok(partlySet.radiusPx*.15<18);
  assert.deepEqual(pick(1.15),[],"shape-only picking still excludes nearby empty sky");
});

test("scene submits one lunar phase after stars, keeps red mode and does not invent missing geometry", () => {
  const events:string[]=[];
  const surface = new Proxy({}, {get:(_target,key)=>key==="moon"
    ? (disc:{illuminatedFraction:number}, _view:unknown, red:boolean)=>{events.push(`moon:${disc.illuminatedFraction}:${red}`);return true;}
    : key==="solarLight" ? ()=>true : ()=>{events.push(String(key));}}) as SkyRenderSurface;
  const report = (hourly:unknown[]) => ({hourly,skyScene:{state:"UNAVAILABLE",frames:[]},targetFrames:[]} as unknown as ResolvedSkyReport);
  drawSkyScene(surface,report([row(0)]),at,null,null,400,800,"NIGHT",undefined,undefined,3,null,basis);
  assert.ok(events.includes("moon:0.5:false"));
  assert.ok(events.indexOf("moon:0.5:false") < events.lastIndexOf("finish"));
  events.length=0;
  drawSkyScene(surface,report([row(0)]),at,null,null,400,800,"OBSERVATION",undefined,undefined,3,null,basis);
  assert.ok(events.includes("moon:0.5:true"));
  events.length=0;
  drawSkyScene(surface,report([row(null)]),at,null,null,400,800,"NIGHT",undefined,undefined,3,null,basis);
  assert.ok(!events.some(event=>event.startsWith("moon:")));
});
