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

test("one immutable PNG hierarchy uses the grouped surface, reports partial failures and preserves source order",()=>{
  const publication={publicationHash:"a".repeat(64),sources:[{id:"png",format:"png"},{id:"jpeg",format:"jpeg"}]} as unknown as import("@starward/miniapp-contracts").OpticalHipsManifestData;
  const parent:SkyHipsCanvasTile={layer:"OPTICAL",publication,sourceId:"png",order:0,pixel:4,image:{}};
  const fine:SkyHipsCanvasTile={...parent,order:1,pixel:16,image:{}};
  const other:SkyHipsCanvasTile={...parent,sourceId:"jpeg",image:{}};
  const sequence:string[]=[],failures:SkyHipsCanvasTile[]=[];let completed:readonly SkyHipsCanvasTile[]=[],available=true;
  const surface=new Proxy({}, {get:(_target,key)=>key==="skyImageMeshLevels"?(levels:readonly {image:object;priority:number}[])=>{
    sequence.push("group");assert.deepEqual(levels.map(value=>value.image),[parent.image,fine.image]);
    assert.deepEqual(levels.map(value=>value.priority),[0,1]);return available?[true,false]:null;
  }:key==="skyImageMesh"?(image:object)=>{sequence.push(image===other.image?"other":image===parent.image?"parent":"fine");return true;}:
    key==="skyImageMeshContribution"?()=>"positive":()=>true}) as SkyRenderSurface;
  const draw=(tiles:readonly SkyHipsCanvasTile[])=>{sequence.length=failures.length=0;
    drawSkyScene(surface,darkReport,at,null,null,390,844,"NIGHT",(_s,c)=>{completed=c.opticalHips??[];},undefined,267.8,null,basis,
      undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,tiles,tile=>failures.push(tile));};
  draw([parent,fine,other]);assert.deepEqual(sequence,["group","other"]);assert.deepEqual(failures,[fine]);assert.deepEqual(completed,[parent,other]);
  available=false;draw([parent,fine,other]);assert.deepEqual(sequence,["group","parent","fine","other"]);
  assert.deepEqual(failures,[],"group policy refusal is not a failed image");assert.deepEqual(completed,[parent,fine,other]);
  available=true;draw([parent,other,fine]);assert.deepEqual(sequence,["parent","other","fine"],"an interleaved source cannot move across another source's composition");
});

test("a refused PNG source group is attempted once while all independent tiles remain drawable",()=>{
  const publication={publicationHash:"a".repeat(64),sources:[{id:"png",format:"png"}]} as unknown as import("@starward/miniapp-contracts").OpticalHipsManifestData;
  const parent:SkyHipsCanvasTile={layer:"OPTICAL",publication,sourceId:"png",order:0,pixel:4,image:{}};
  const tiles=[parent,{...parent,pixel:5,image:{}},{...parent,order:1,pixel:16,image:{}},{...parent,order:1,pixel:20,image:{}}];
  let attempts=0;const images:object[]=[],failures:SkyHipsCanvasTile[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="skyImageMeshLevels"?()=>{attempts++;return null;}:
    key==="skyImageMesh"?(image:object)=>{images.push(image);return true;}:()=>true}) as SkyRenderSurface;
  drawSkyScene(surface,darkReport,at,null,null,390,844,"NIGHT",undefined,undefined,267.8,null,basis,
    undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,tiles,tile=>failures.push(tile));
  assert.equal(attempts,1);assert.deepEqual(images,tiles.map(tile=>tile.image));assert.deepEqual(failures,[]);
});

test("widening fallback yields only to a successfully drawn opaque same-version parent",()=>{
  const publication={publicationHash:"a".repeat(64),sources:[{id:"ps1",format:"jpeg"}]} as unknown as import("@starward/miniapp-contracts").OpticalHipsManifestData;
  const parent:SkyHipsCanvasTile={layer:"OPTICAL",sourceId:"ps1",publication,order:0,pixel:4,image:{}};
  const fine:SkyHipsCanvasTile={...parent,order:1,pixel:16,image:{},retainedDetailFallback:true};
  let parentFailed=false;const calls:object[]=[];let completed:readonly SkyHipsCanvasTile[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="skyImageMesh"?(image:object)=>{
    calls.push(image);return !(parentFailed&&image===parent.image);
  }:key==="skyImageMeshContribution"?()=>"positive":()=>true}) as SkyRenderSurface;
  const draw=(tiles:readonly SkyHipsCanvasTile[])=>{calls.length=0;drawSkyScene(surface,darkReport,at,null,null,390,844,"NIGHT",
    (_s,c)=>{completed=c.opticalHips??[];},undefined,267.8,null,basis,
    undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,tiles);};
  draw([parent,fine]);assert.deepEqual(calls,[parent.image]);assert.deepEqual(completed,[parent]);
  parentFailed=true;draw([parent,fine]);assert.deepEqual(calls,[parent.image,fine.image]);assert.deepEqual(completed,[fine],
    "decoded parent with a failed GPU submission cannot withdraw ready detail");
  parentFailed=false;draw([parent,{...fine,retainedDetailFallback:false}]);assert.deepEqual(calls,[parent.image,fine.image],
    "requested detail retains the existing coarse-to-fine original-alpha composition");
  draw([{...parent,publication:{...publication,publicationHash:"b".repeat(64)}},fine]);assert.deepEqual(calls,[parent.image,fine.image]);
  draw([{...parent,publication:{...publication,sources:[{...publication.sources[0]!,format:"png"}]}},fine]);
  assert.deepEqual(calls,[parent.image,fine.image],"a potentially transparent parent cannot prove opaque replacement");
});

test("completed HiPS credit contains successful current submissions, never requested/failed/off-frame metadata",()=>{
  const publication={publicationHash:"a".repeat(64),sources:[{id:"ps1"}]} as unknown as import("@starward/miniapp-contracts").OpticalHipsManifestData;
  const good={layer:"OPTICAL" as const,sourceId:"ps1",order:0,pixel:4,image:{},publication},bad={...good,image:{}};
  let sources:readonly SkyHipsCanvasTile[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="skyImageMesh"?(image:object)=>image!==bad.image:
    key==="skyImageMeshContribution"?()=>"positive":()=>true}) as SkyRenderSurface;
  const draw=(mode:"NIGHT"|"OBSERVATION",when=at)=>drawSkyScene(surface,darkReport,when,null,null,390,844,mode,
    (_snapshot,completed)=>{sources=completed.opticalHips??[];},undefined,267.8,null,basis,
    undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,[good,bad]);
  draw("NIGHT");assert.deepEqual(sources,[good]);
  draw("OBSERVATION");assert.equal(sources.length,0);
  draw("NIGHT","2026-09-23T01:00:00.000Z");assert.equal(sources.length,0);
});

test("Scene publishes only completed source-group alpha qualification, with one group per publication/source",()=>{
  const publication={publicationHash:"a".repeat(64),sources:[{id:"ps1"},{id:"other"}]} as unknown as import("@starward/miniapp-contracts").OpticalHipsManifestData;
  const a={layer:"OPTICAL" as const,sourceId:"ps1",order:0,pixel:4,image:{},publication};
  const b={...a,pixel:5,image:{}},other={...a,sourceId:"other",image:{}};
  const groups:unknown[]=[];let finished=false,sources:readonly SkyHipsCanvasTile[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="skyImageMesh"?(_i:object,_t:unknown,_v:unknown,_o:unknown,g:unknown)=>(groups.push(g),true):
    key==="finish"?()=>{finished=true;}:key==="skyImageMeshContribution"?(g:unknown)=>{assert(finished);return g===groups[0]?"positive":"unknown";}:()=>true}) as SkyRenderSurface;
  drawSkyScene(surface,darkReport,at,null,null,390,844,"NIGHT",(_s,c)=>{sources=c.opticalHips??[];},undefined,267.8,null,basis,
    undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,[a,b,other]);
  assert.equal(groups.length,3);assert.strictEqual(groups[0],groups[1]);assert.notStrictEqual(groups[0],groups[2]);
  assert.deepEqual(sources,[a,b]);
  const noProbe=new Proxy({}, {get:(_target,key)=>key==="skyImageMeshContribution"?undefined:()=>true}) as SkyRenderSurface;
  drawSkyScene(noProbe,darkReport,at,null,null,390,844,"NIGHT",(_s,c)=>{sources=c.opticalHips??[];},undefined,267.8,null,basis,
    undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,[a]);
  assert.equal(sources.length,0,"a successful unmeasured submission cannot become visible provenance");
});

test("original optical alpha replaces parents through the actual fine mesh without a separate cutout",()=>{
  const parent={layer:"OPTICAL" as const,sourceId:"ps1",order:0,pixel:5,image:{name:"parent"}};
  const fine={layer:"OPTICAL" as const,sourceId:"ps1",order:1,pixel:20,image:{name:"fine"}};
  const foreign={...fine,sourceId:"other",pixel:21,image:{name:"foreign"}};
  const calls:Array<{image:object;opacity:number;extra:readonly unknown[]}>=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="skyImageMesh"
    ? (image:object,_triangles:unknown,_view:unknown,opacity:number,...extra:unknown[])=>(calls.push({image,opacity,extra}),true):()=>true}) as SkyRenderSurface;
  drawSkyScene(surface,darkReport,at,null,null,390,844,"NIGHT",undefined,undefined,267.8,null,basis,
    undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,[parent,fine,foreign]);
  const result=calls.find(r=>r.image===parent.image)!;assert(result);
  assert(calls.every(r=>r.opacity===1&&r.extra.length===0));
  assert(calls.findIndex(r=>r.image===fine.image)>calls.findIndex(r=>r.image===parent.image));
  calls.length=0;
  drawSkyScene(surface,darkReport,at,null,null,390,844,"NIGHT",undefined,undefined,267.8,null,basis,
    undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,[parent,foreign]);
  assert.equal(calls.find(r=>r.image===parent.image)!.opacity,1,"a failed/absent fine region preserves its original parent");
});

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
  const draw=(data:ResolvedSkyReport,when:string,mode:"NIGHT"|"OBSERVATION")=>{
    const args:Parameters<typeof drawSkyScene>=[surface,data,when,null,null,390,844,mode,undefined,undefined,267.8,null,basis,
      undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,
      tiles,undefined,undefined];
    args[35]={horizontal:true,equatorial:false};
    drawSkyScene(...args);
  };
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
  assert.deepEqual(sequence,[{image:infrared,opacity:.48},{image:optical,opacity:1}]);
});
