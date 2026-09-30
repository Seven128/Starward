import assert from "node:assert/strict";
import test from "node:test";
import { OBSERVATION_FRAME_FORMAT } from "@starward/miniapp-contracts";
import { dispatchSkyHipsImageFailure, drawSkyScene, type SkyHipsCanvasTile } from "./sky-scene-render";
import type { SkyRenderSurface } from "./sky-render-surface";
import type { SkyViewBasis } from "./sky-view-projection";
import type { ResolvedSkyReport } from "./sky-stellar-scene";

const at = "2026-09-23T00:00:00.000Z";
const basis: SkyViewBasis = { right:[1,0,0], up:[0,0,1], forward:[0,1,0] };
const report = { hourly:[{at}], observationFrames:[{
  format:OBSERVATION_FRAME_FORMAT,at,
  observer:{latitude:22.54,longitude:113.95,elevationM:50},
  equatorialToEnu:[1,0,0,0,1,0,0,0,1],
}], skyScene:{state:"UNAVAILABLE",frames:[{at,state:"UNAVAILABLE",geometry:null}]}, targetFrames:[] } as unknown as ResolvedSkyReport;
const darkReport={...report,hourly:[{at,sunAzimuthDeg:180,sunAltitudeDeg:-18}]} as unknown as ResolvedSkyReport;
const image={};
const tile:SkyHipsCanvasTile={layer:"OPTICAL",order:8,pixel:43345,image};

test("HiPS draw failures return to the owning layer even when optical uses order zero",()=>{
  const failed:Array<{layer:string;image:object}>=[];
  const infrared={kind:"infrared"},optical={kind:"optical"};
  const wideFieldFailed=(image:object)=>failed.push({layer:"WIDE_FIELD_W3",image});
  const opticalFailed=(image:object)=>failed.push({layer:"OPTICAL",image});
  const surface=new Proxy({}, {get:(_target,key)=>key==="skyImageMesh"?()=>false:()=>true}) as SkyRenderSurface;
  drawSkyScene(surface,darkReport,at,null,null,390,844,"NIGHT",undefined,undefined,267.8,null,basis,
    undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,
    [{layer:"OPTICAL",order:0,pixel:4,image:optical},
      {layer:"WIDE_FIELD_W3",order:0,pixel:4,image:infrared}],
    tile=>dispatchSkyHipsImageFailure(tile,wideFieldFailed,opticalFailed));
  assert.deepEqual(failed,[{layer:"WIDE_FIELD_W3",image:infrared},{layer:"OPTICAL",image:optical}]);
});

test("HiPS sample uses exact catalog-independent observation frame and survives image failure",()=>{
  const submissions:number[][]=[];
  let failures=0,completions=0;
  const surface=new Proxy({}, {get:(_target,key)=>key==="skyImageMesh"
    ? (source:object,triangles:readonly number[])=>{
      assert.equal(source,image);
      submissions.push([...triangles]);
      return false;
    } : ()=>undefined}) as SkyRenderSurface;
  const draw=(data:ResolvedSkyReport,frameAt:string,mode:"NIGHT"|"OBSERVATION")=>
    drawSkyScene(surface,data,frameAt,null,null,390,844,mode,undefined,()=>completions++,240,null,basis,
      undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,
      [tile],(failed:SkyHipsCanvasTile)=>{assert.equal(failed,tile);failures++;});
  draw(report,at,"NIGHT");
  assert.equal(submissions.length,1,"a real spherical tile must reach the native mesh boundary without a bright-star frame");
  assert.ok(submissions[0]!.length>0 && submissions[0]!.length%12===0);
  assert.equal(failures,1);
  assert.equal(completions,1,"an optional image failure leaves the scene usable");
  draw(report,at,"OBSERVATION");
  draw(report,"2026-09-23T01:00:00.000Z","NIGHT");
  draw({hourly:report.hourly,skyScene:report.skyScene,targetFrames:report.targetFrames} as unknown as ResolvedSkyReport,at,"NIGHT");
  assert.equal(submissions.length,1,"red mode, another time and missing geometry must not draw an old tile");
});

test("order-0 infrared background uses exact frame, precedes grid and disappears in red or stale time",()=>{
  const sequence:string[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="skyImageMesh"
    ? (_source:object,triangles:readonly number[])=>{
      assert.ok(triangles.length>0);
      sequence.push("infrared");return true;
    } : key==="segments"?()=>{sequence.push("grid");} : ()=>true}) as SkyRenderSurface;
  const tiles=Array.from({length:12},(_,pixel)=>({layer:"WIDE_FIELD_W3" as const,order:0,pixel,image:{pixel}}));
  const draw=(data:ResolvedSkyReport,when:string,mode:"NIGHT"|"OBSERVATION")=>
    drawSkyScene(surface,data,when,null,null,390,844,mode,undefined,undefined,267.8,null,basis,
      undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,
      tiles,undefined,undefined);
  draw(darkReport,at,"NIGHT");
  assert.ok(sequence.includes("infrared"));
  assert.ok(sequence.indexOf("infrared")<sequence.indexOf("grid"));
  const count=sequence.filter(item=>item==="infrared").length;
  draw(darkReport,at,"OBSERVATION");
  draw(darkReport,"2026-09-23T01:00:00.000Z","NIGHT");
  draw(report,at,"NIGHT");
  assert.equal(sequence.filter(item=>item==="infrared").length,count);
});

test("an order-zero optical image retains optical opacity above the historical infrared layer",()=>{
  const sequence:Array<{image:object;opacity:number}>=[];
  const infrared={kind:"infrared"},optical={kind:"optical"};
  const surface=new Proxy({}, {get:(_target,key)=>key==="skyImageMesh"
    ? (image:object,_triangles:readonly number[],_view:unknown,opacity:number)=>{
      sequence.push({image,opacity});return true;
    } : ()=>true}) as SkyRenderSurface;
  drawSkyScene(surface,darkReport,at,null,null,390,844,"NIGHT",undefined,undefined,267.8,null,basis,
    undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,
    [{layer:"WIDE_FIELD_W3",order:0,pixel:4,image:infrared},
      {layer:"OPTICAL",order:0,pixel:4,image:optical}],undefined,undefined);
  assert.deepEqual(sequence,[{image:infrared,opacity:.48},{image:optical,opacity:.8}]);
});
