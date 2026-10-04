import assert from "node:assert/strict";
import test from "node:test";
import {skySunDiscAt} from "./sky-sun-disc";
import {drawSkyScene} from "./sky-scene-render";
import type {SkyViewBasis} from "./sky-view-projection";
import {createSkyViewBasis} from "./sky-view-projection";
import type {SkyRenderSurface} from "./sky-render-surface";
import type {ResolvedSkyReport} from "./sky-stellar-scene";
import {pickPaintedSkyObjects,type SkyPickSnapshot} from "./sky-object-picking";

const at="2026-09-23T04:00:00.000Z";
const centeredBasis:SkyViewBasis={right:[0,-1,0],up:[-Math.SQRT1_2,0,Math.SQRT1_2],
  forward:[Math.SQRT1_2,0,Math.SQRT1_2]};
const row=(angularDiameterDeg:number|null,altitudeDeg=45)=>({at,sunAzimuthDeg:90,
  sunAltitudeDeg:altitudeDeg,sunAngularDiameterDeg:angularDiameterDeg});
const report=(hourly:unknown[]):ResolvedSkyReport =>
  ({hourly,skyScene:{state:"UNAVAILABLE",frames:[]},targetFrames:[]} as unknown as ResolvedSkyReport);

test("full-sphere browsing keeps an exact solar disc below the horizon without moving its coordinates",()=>{
  const belowBasis=createSkyViewBasis(90,60,0)!;
  const below=skySunDiscAt([row(.53,-30)] as any,at,belowBasis,390,844,3);
  assert.ok(below,"an entirely set Sun is still a candidate when the camera looks at its real direction");
  assert.ok(Math.abs(below.x-195)<1e-9&&Math.abs(below.y-422)<1e-9);
  const above=skySunDiscAt([row(.53,30)] as any,at,createSkyViewBasis(90,120,0)!,390,844,3)!;
  assert.ok(Math.abs(below.radiusPx-above.radiusPx)<1e-9,"camera scale does not depend on hemisphere");
  assert.equal(skySunDiscAt([row(.53,-30)] as any,at,createSkyViewBasis(270,120,0)!,390,844,3),null,
    "the projection antipode is still excluded");
  assert.equal(skySunDiscAt([row(.53,-30)] as any,at,centeredBasis,390,844,3),null,
    "a below-horizon body outside the actual viewport is still excluded");
  assert.equal(skySunDiscAt([row(.53,-91)] as any,at,belowBasis,390,844,3),null,
    "full-sphere browsing does not admit invalid ephemeris altitude");
});

test("the solar disc uses one exact report instant and the same angular camera scale",()=>{
  const normal=skySunDiscAt([row(.53)] as any,at,centeredBasis,390,844,45)!;
  const near=skySunDiscAt([row(.53)] as any,at,centeredBasis,390,844,1.5)!;
  const larger=skySunDiscAt([row(.54)] as any,at,centeredBasis,390,844,45)!;
  assert.ok(normal&&near&&larger);
  assert.ok(Math.abs(normal.x-195)<1e-9&&Math.abs(normal.y-422)<1e-9);
  assert.ok(near.radiusPx>normal.radiusPx*10);
  assert.ok(Math.abs(larger.radiusPx/normal.radiusPx-.54/.53)<1e-9);
  assert.equal(skySunDiscAt([row(.53)] as any,"2026-09-23T05:00:00.000Z",centeredBasis,390,844,45),null);
  assert.equal(skySunDiscAt([row(.53),row(.53)] as any,at,centeredBasis,390,844,45),null);
  assert.equal(skySunDiscAt([row(null)] as any,at,centeredBasis,390,844,45),null);
  assert.equal(skySunDiscAt([row(.53,-5)] as any,at,centeredBasis,390,844,45),null);
  assert.ok(skySunDiscAt([row(.53,-.1)] as any,at,createSkyViewBasis(90,90,0)!,390,844,45),
    "a photosphere spanning the mathematical horizon remains a full-sphere render candidate");
  assert.equal(skySunDiscAt([row(2)] as any,at,centeredBasis,390,844,45),null);
});

test("a solar disc crossing the mathematical horizon remains selectable without effective landscape occlusion",()=>{
  const basis=createSkyViewBasis(90,90,0)!;
  const data=report([row(.53,-.1)]);
  const disc=skySunDiscAt(data.hourly,at,basis,390,844,3)!;
  let snapshot:SkyPickSnapshot|null=null,submitted=0;
  const surface=new Proxy({}, {get:(_target,key)=>key==="sun"?()=>{submitted++;return true;}:()=>undefined}) as SkyRenderSurface;
  drawSkyScene(surface,data,at,null,null,390,844,"NIGHT",value=>{snapshot=value;},undefined,3,null,basis);
  assert.equal(submitted,1);
  const painted=snapshot as SkyPickSnapshot|null;
  assert.ok(painted);
  const pick=(radius:number)=>pickPaintedSkyObjects(painted,{
    x:disc.x,y:disc.y-disc.radiusPx*radius,frameAt:at,
    catalogVersion:painted.catalogVersion,catalogHash:painted.catalogHash,
  },0).map(object=>object.reference);
  assert.deepEqual(pick(.8),["SOLAR:SUN"]);
  assert.deepEqual(pick(0),["SOLAR:SUN"],"a negative-altitude centre remains part of the rendered photosphere");
  assert.ok(disc.radiusPx*.15<18);
  assert.deepEqual(pick(1.15),[],"a shape-only query outside the photosphere does not select empty sky");
});

test("the scene submits the real solar disc before Moon, in both palettes; failure leaves the scene",()=>{
  const events:string[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="sun"?(_disc:unknown,_view:unknown,red:boolean)=>{
    events.push(`sun:${red}`);return false;
  }:key==="moon"?()=>{events.push("moon");return true;}
    :key==="solarLight"?()=>true:()=>{events.push(String(key));return undefined;}}) as SkyRenderSurface;
  let failed=0,completed=0;
  const args=[undefined,()=>{completed++;},45,null,centeredBasis,undefined,undefined,undefined,undefined,undefined,undefined,undefined,()=>{failed++;}] as const;
  drawSkyScene(surface,report([{...row(.53),moonAzimuthDeg:90,moonAltitudeDeg:45,
    moonAngularDiameterDeg:.5,moonIllumination:.5}]),at,null,null,390,844,"NIGHT",...args);
  assert.equal(failed,1);assert.equal(completed,1);
  assert.ok(events.indexOf("sun:false")>=0&&events.indexOf("sun:false")<events.indexOf("moon"));
  assert.ok(events.indexOf("moon")<events.indexOf("finish"));
  events.length=0;
  drawSkyScene(surface,report([row(.53)]),at,null,null,390,844,"OBSERVATION",...args);
  assert.ok(events.includes("sun:true"));
  events.length=0;
  drawSkyScene(surface,report([row(null)]),at,null,null,390,844,"NIGHT",...args);
  assert.ok(!events.some(event=>event.startsWith("sun:")));
});
