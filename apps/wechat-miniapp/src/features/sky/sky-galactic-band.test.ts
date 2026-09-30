import assert from "node:assert/strict";
import test from "node:test";
import { OBSERVATION_FRAME_FORMAT } from "@starward/miniapp-contracts";
import { galacticEquirectUv,skyGalacticBandAt } from "./sky-galactic-band";
import { drawSkyScene } from "./sky-scene-render";
import type { SkyRenderSurface } from "./sky-render-surface";
import type { ResolvedSkyReport } from "./sky-stellar-scene";
import type { SkyViewBasis } from "./sky-view-projection";

const at = "2026-09-23T12:00:00.000Z";
const later = "2026-09-23T13:00:00.000Z";
const observer = {latitude:30,longitude:110,elevationM:100};
const identity = [1,0,0,0,1,0,0,0,1] as const;
const quarterTurn = [0,-1,0,1,0,0,0,0,1] as const;
const basis: SkyViewBasis = {right:[1,0,0],up:[0,0,1],forward:[0,1,0]};

function report(sunAltitudeDeg: number, transform: readonly number[] = identity) {
  return {hourly:[{at,sunAzimuthDeg:270,sunAltitudeDeg}],
    observationFrames:[{format:OBSERVATION_FRAME_FORMAT,at,observer,equatorialToEnu:transform}],
    skyScene:{state:"UNAVAILABLE",frames:[]},targetFrames:[]} as unknown as ResolvedSkyReport;
}

test("Galactic schematic rotates with the exact observer frame and fades outside night/wide view",()=>{
  const normal=skyGalacticBandAt(report(-24),at,240)!;
  const rotated=skyGalacticBandAt(report(-24,quarterTurn),at,240)!;
  assert.equal(normal.strength,1);
  assert.ok(Math.abs(normal.pole[0]+0.8676661490)<1e-9);
  assert.ok(Math.abs(rotated.pole[0]+normal.pole[1])<1e-9);
  assert.ok(Math.abs(rotated.pole[1]-normal.pole[0])<1e-9);
  assert.ok(Math.abs(normal.pole.reduce((sum,value,index)=>sum+value*normal.center[index]!,0))<1e-8,
    "Galactic center is on the coordinate plane, not on its pole");
  assert.equal(skyGalacticBandAt(report(-5),at,240),null);
  assert.equal(skyGalacticBandAt(report(-24),at,10),null);
  assert.equal(skyGalacticBandAt(report(-24),later,240),null);
  const {observationFrames: _discardedFrame, ...withoutFrame}=report(-24);
  assert.equal(skyGalacticBandAt(withoutFrame,at,240),null);
});

test("schematic sits behind independent stars and fails without clearing the scene",()=>{
  const events:string[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="galacticBand"
    ? ()=>{events.push("galacticBand");return false;}
    : key==="solarLight" ? ()=>{events.push("solarLight");return true;}
      : ()=>{events.push(String(key));return undefined;}}) as SkyRenderSurface;
  let failed=false;
  const failureArgs:Parameters<typeof drawSkyScene>=[surface,report(-24),at,null,null,400,800,"NIGHT",
    undefined,undefined,240,null,basis];
  failureArgs[23]=()=>{failed=true;};
  drawSkyScene(...failureArgs);
  assert.equal(failed,true);
  assert.deepEqual(events.slice(0,4),["begin","solarLight","galacticBand","segments"]);
  assert.equal(events.at(-1),"finish");
  events.length=0;
  drawSkyScene(surface,report(-24),at,null,null,400,800,"OBSERVATION",undefined,undefined,240,null,basis);
  assert.ok(!events.includes("galacticBand"));
  events.length=0;
  drawSkyScene(surface,report(-5),at,null,null,400,800,"NIGHT",undefined,undefined,240,null,basis);
  assert.ok(!events.includes("galacticBand"));
});

test("2MASS Galactic center, longitude and north map to the published panorama axes",()=>{
  const pole:[number,number,number]=[0,0,1];
  const center:[number,number,number]=[1,0,0];
  const near=(actual:readonly number[],expected:readonly number[])=>
    actual.forEach((value,index)=>assert.ok(Math.abs(value-expected[index]!)<1e-9));
  near(galacticEquirectUv(center,pole,center),[.5,.5]);
  near(galacticEquirectUv([0,1,0],pole,center),[.25,.5]);
  near(galacticEquirectUv([0,-1,0],pole,center),[.75,.5]);
  near(galacticEquirectUv(pole,pole,center),[.5,0]);
  near(galacticEquirectUv([0,0,-1],pole,center),[.5,1]);
  // Independent Galactic positions from SIMBAD. Both Cloud features are in
  // the published image's lower-right quadrant, not in a mirrored hemisphere.
  // https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=LMC
  // https://simbad.cds.unistra.fr/simbad/sim-id?Ident=Small+Magellanic+Cloud
  for(const [longitude,latitude,u,v] of [
    [280.4652,-32.8884,.72093,.6827133333333333],
    [302.8084,-44.3277,.6588655555555556,.746265],
  ]){
    const l=longitude!*Math.PI/180,b=latitude!*Math.PI/180;
    const ray:[number,number,number]=[Math.cos(b)*Math.cos(l),Math.cos(b)*Math.sin(l),Math.sin(b)];
    near(galacticEquirectUv(ray,pole,center),[u!,v!]);
  }
});

test("historical image is submitted only for exact dark wide frame, with schematic fallback",()=>{
  const received:unknown[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="galacticBand"
    ? (_view:unknown,_band:unknown,image:object|null)=>{received.push(image??"schematic");return true;}
    : ()=>undefined}) as SkyRenderSurface;
  const image={id:"2mass"};
  const args:Parameters<typeof drawSkyScene>=[surface,report(-24),at,null,null,400,800,"NIGHT",
    undefined,undefined,240,null,basis];
  args[26]=image;
  drawSkyScene(...args);
  assert.deepEqual(received,[image]);
  received.length=0;
  args[1]=report(-5);
  drawSkyScene(...args);
  assert.deepEqual(received,[]);
  args[1]=report(-24);args[7]="OBSERVATION";
  drawSkyScene(...args);
  assert.deepEqual(received,[]);
  args[7]="NIGHT";args[26]=null;
  drawSkyScene(...args);
  assert.deepEqual(received,["schematic"]);
  received.length=0;args[26]=image;
  args[21]=[{layer:"WIDE_FIELD_W3",order:0,pixel:0,image:{}}];
  drawSkyScene(...args);
  assert.deepEqual(received,["schematic"],"optional W3 replaces the 2MASS texture in the same frame");
});

test("optional W3 fades through the same exact-time twilight interval as the Galactic background",()=>{
  const opacities:number[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="skyImageMesh"
    ? (_image:object,_triangles:unknown,_view:unknown,opacity:number)=>{opacities.push(opacity);return true;}
    : ()=>undefined}) as SkyRenderSurface;
  const tiles=Array.from({length:12},(_,pixel)=>({layer:"WIDE_FIELD_W3" as const,
    order:0,pixel,image:{pixel}}));
  const args:Parameters<typeof drawSkyScene>=[surface,report(-12),at,null,null,400,800,"NIGHT",
    undefined,undefined,240,null,basis];
  args[21]=tiles;
  drawSkyScene(...args);
  assert.equal(opacities.length,0,"the layer must not pop in at the -12° boundary");
  args[1]=report(-15);
  drawSkyScene(...args);
  assert.ok(opacities.length>0);
  assert.ok(opacities.every(value=>Math.abs(value-.24)<1e-9));
  opacities.length=0;
  args[1]=report(-18);
  drawSkyScene(...args);
  assert.ok(opacities.length>0);
  assert.ok(opacities.every(value=>Math.abs(value-.48)<1e-9));
  opacities.length=0;
  args[7]="OBSERVATION";
  drawSkyScene(...args);
  assert.equal(opacities.length,0);
});
