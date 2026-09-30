import assert from "node:assert/strict";
import test from "node:test";
import { SKY_PLANET_ORDER } from "@starward/miniapp-contracts";
import { skyPlanetDiscsAt } from "./sky-planet-disc";
import { drawSkyScene } from "./sky-scene-render";
import { resolvedSkyBodyReferences } from "./sky-body-label-presentation";
import { paintedSkyPointVisible, pickPaintedSkyObjects, type SkyPickSnapshot } from "./sky-object-picking";
import type { SkyRenderSurface } from "./sky-render-surface";
import type { ResolvedSkyReport } from "./sky-stellar-scene";
import { createSkyViewBasis, projectSkyDirectionUnclipped, unprojectSkyPoint, type SkyViewBasis } from "./sky-view-projection";
import type {SkyLineSegment} from "./sky-render-surface";
import {saturnGlobeShadowsRingPoint} from "./sky-saturn-rings";

const at="2026-09-22T10:00:00.000Z", d=Math.SQRT1_2;
const basis:SkyViewBasis={right:[1,0,0],up:[0,-d,d],forward:[0,d,d]};
const planets=SKY_PLANET_ORDER.map((body,index)=>({body,azimuthDeg:0,altitudeDeg:index===1?45:-10,
  angularDiameterDeg:index===1?.02:.001,illuminatedFraction:index===1?.25:.99,
  visualMagnitude:index===1?-4:7,ringTiltDeg:body==="SATURN"?10:null,
  ringPoleEnu:body==="SATURN"?[0,0,1]:null}));
const row={at,sunAzimuthDeg:90,sunAltitudeDeg:0,planets};

test("unresolved planets share solar adaptation without returning as fallback target dots", () => {
  const small = planets.map(planet => ({ ...planet, altitudeDeg: planet.body === "JUPITER" ? 45 : -10,
    angularDiameterDeg: .001, visualMagnitude: -2 }));
  const report = { hourly: [{ ...row, planets: small }], skyScene: { state: "UNAVAILABLE", frames: [] },
    targetFrames: [{ at, targets: [{ targetId: "target:jupiter", type: "PLANET", azimuthDeg: 0,
      altitudeDeg: 45, displayName: "Jupiter" }] }] } as unknown as ResolvedSkyReport;
  const dots: number[][] = [];
  const surface = new Proxy({}, { get: (_target, key) => key === "disc"
    ? (x: number, y: number, radius: number) => { dots.push([x,y,radius]); }
    : () => true }) as SkyRenderSurface;
  const paint = (mode: "NIGHT" | "OBSERVATION", sunAltitudeDeg = 0) => {
    dots.length = 0;
    let snapshot: SkyPickSnapshot | null = null;
    drawSkyScene(surface, { ...report, hourly: [{ ...report.hourly[0]!, sunAltitudeDeg }] }, at,
      null,null,400,800,mode, value => { snapshot = value; },undefined,85,null,basis);
    return snapshot as SkyPickSnapshot | null;
  };
  const daylight = paint("NIGHT");
  assert.deepEqual(daylight?.objects.filter(object => object.reference === "PLANET:JUPITER"), [],
    "the faint unresolved planet cannot remain a natural daylight pick target");
  assert.equal(dots.length, 0, "an intentionally hidden point cannot be replaced by a generic target dot");
  assert.ok(paint("NIGHT",-24)?.objects.some(object => object.reference === "PLANET:JUPITER"));
  assert.equal(dots.length,1);
  assert.ok(paint("OBSERVATION")?.objects.some(object => object.reference === "PLANET:JUPITER"),
    "the explicit red finding chart retains its independent no-twilight semantics");
  assert.equal(dots.length,1);
});

test("partly risen resolved planets retain their drawn limb identity without selecting hidden or nearby empty rays", () => {
  const horizonBasis = createSkyViewBasis(0,90,0)!;
  const width = 400, height = 800, fov = .25;
  for (const body of SKY_PLANET_ORDER) {
    const frame = planets.map(planet => ({ ...planet,
      altitudeDeg: planet.body === body ? -.005 : -10,
      angularDiameterDeg: .02,
      ringTiltDeg: null, ringPoleEnu: null,
    }));
    const report = { hourly: [{ ...row, planets: frame }],
      skyScene: { state: "UNAVAILABLE", frames: [] }, targetFrames: [] } as unknown as ResolvedSkyReport;
    const disc = skyPlanetDiscsAt(report.hourly,at,horizonBasis,width,height,fov)![0]!;
    const visible = { x: disc.x, y: disc.y - disc.radiusPx * .75 };
    const nearbyEmpty = { x: disc.x, y: disc.y - disc.radiusPx * 1.25 };
    const paint = (success: boolean) => {
      const submitted: string[] = [];
      let snapshot: SkyPickSnapshot | null = null;
      const surface = new Proxy({}, { get: (_target,key) => key === "planet"
        ? (planet: { body: string }) => { submitted.push(planet.body); return success; }
        : () => undefined }) as SkyRenderSurface;
      drawSkyScene(surface,report,at,null,null,width,height,"NIGHT",value => { snapshot = value; },
        undefined,fov,null,horizonBasis);
      assert.deepEqual(submitted,[body], "the valid resolved limb must reach its production draw owner");
      assert.ok(snapshot);
      return snapshot as SkyPickSnapshot;
    };
    const snapshot = paint(true);
    const pick = (point: { x: number; y: number }) => pickPaintedSkyObjects(snapshot, {
      ...point, frameAt: at, catalogVersion: snapshot.catalogVersion, catalogHash: snapshot.catalogHash,
    }).map(object => object.reference);
    assert.equal(paintedSkyPointVisible(snapshot,visible.x,visible.y),true);
    assert.equal(paintedSkyPointVisible(snapshot,disc.x,disc.y),false);
    assert.deepEqual(pick(visible),[`PLANET:${body}`], "a successfully drawn limb cannot lose its identity as the centre sets");
    assert.deepEqual(pick({ x: disc.x, y: disc.y }),[], "the true horizon still rejects the hidden disc centre");
    assert.equal(paintedSkyPointVisible(snapshot,nearbyEmpty.x,nearbyEmpty.y),true);
    assert.ok(disc.radiusPx * .25 < 18, "the empty ray must lie within the existing centre-visible touch tolerance");
    assert.deepEqual(pick(nearbyEmpty),[], "a hidden centre cannot resurrect its body through nearby empty sky");
    assert.deepEqual(paint(false).objects,[], "a failed draw cannot publish a resolved pick shape");
  }
});

test("ice-giant scene routes each historical profile to its own globe and preserves untextured geometry",()=>{
  const uranus={id:"uranus"},neptune={id:"neptune"};
  for(const body of ["URANUS","NEPTUNE"] as const){
    const frame=planets.map(p=>({...p,altitudeDeg:p.body===body?45:-10,
      angularDiameterDeg:.02,bodyFrame:p.body===body?{poleEnu:[0,0,1],primeMeridianEnu:[1,0,0]}:null}));
    const report={hourly:[{...row,planets:frame}],skyScene:{state:"UNAVAILABLE",frames:[]},targetFrames:[]} as unknown as ResolvedSkyReport;
    const submitted:Array<{body:string;image:unknown}>=[];
    const surface=new Proxy({}, {get:(_target,key)=>key==="planet"
      ?(disc:{body:string},_view:unknown,_tint:unknown,_red:unknown,image:unknown)=>{
        submitted.push({body:disc.body,image});return true;}
      :key==="sun"||key==="moon"||key==="solarLight"?()=>true:()=>{}}) as SkyRenderSurface;
    const args=[surface,report,at,null,null,400,800,"NIGHT",undefined,undefined,.25,null,basis,
      ...Array(19).fill(undefined),uranus,neptune] as unknown as Parameters<typeof drawSkyScene>;
    drawSkyScene(...args);
    assert.deepEqual(submitted,[{body,image:body==="URANUS"?uranus:neptune}]);
    submitted.length=0;args[32]=null;args[33]=null;drawSkyScene(...args);
    assert.deepEqual(submitted,[{body,image:null}],"missing texture still draws the planet");
  }
});

test("a texture hook selects one body's exact painted geometry without accepting a partial ephemeris",()=>{
  const together={...row,planets:planets.map(p=>({...p,altitudeDeg:45,
    angularDiameterDeg:p.body==="SATURN"?.02:.01}))};
  const full=skyPlanetDiscsAt([together] as any,at,basis,400,800,.25)!;
  for(const body of ["MARS","MERCURY","JUPITER","SATURN"] as const)
    assert.deepEqual(skyPlanetDiscsAt([together] as any,at,basis,400,800,.25,undefined,body),
      full.filter(planet=>planet.body===body));
  const incomplete={...together,planets:together.planets.slice(0,6)};
  assert.equal(skyPlanetDiscsAt([incomplete] as any,at,basis,400,800,.25,undefined,"MARS"),null);
});

test("one exact planetary frame projects a changing physical phase without stale or malformed rows",()=>{
  const result=skyPlanetDiscsAt([row] as any,at,basis,400,800,3)!;
  assert.equal(result.length,1);
  assert.equal(result[0]!.body,"VENUS");
  assert.ok(result[0]!.radiusPx>1 && result[0]!.sunward[0]>.99);
  const wider=skyPlanetDiscsAt([row] as any,at,basis,400,800,45)!;
  assert.ok(wider[0]!.radiusPx<result[0]!.radiusPx/10);
  assert.equal(skyPlanetDiscsAt([row] as any,"2026-09-22T11:00:00.000Z",basis,400,800,3),null);
  assert.equal(skyPlanetDiscsAt([{...row,planets:planets.slice(0,6)}] as any,at,basis,400,800,3),null);
  assert.equal(skyPlanetDiscsAt([{...row,planets:planets.map((p,i)=>i===1?{...p,illuminatedFraction:2}:p)}] as any,
    at,basis,400,800,3),null);
});

test("Saturn without ring orientation remains a phase disc alongside other valid planets",()=>{
  const bodies=planets.map(p=>p.body==="SATURN"?{...p,altitudeDeg:45,
    angularDiameterDeg:.02,ringTiltDeg:null,ringPoleEnu:null}:
    p.body==="VENUS"?{...p,altitudeDeg:45}:p);
  const discs=skyPlanetDiscsAt([{...row,planets:bodies}] as any,at,basis,400,800,3)!;
  assert.deepEqual(discs.map(p=>p.body),["VENUS","SATURN"]);
  const saturn=discs[1]!;
  assert.ok(saturn.radiusPx>1 && Number.isFinite(saturn.sunward[0]));
  assert.deepEqual(saturn.rings,[]);
  assert.equal(saturn.oblate,null);
  assert.equal(saturn.surfaceOrientation,null);
});

test("ice giants use sourced 1-bar axes only with a valid exact body frame",()=>{
  for(const body of ["URANUS","NEPTUNE"] as const){
    const withFrame=planets.map(p=>p.body===body?{...p,altitudeDeg:45,angularDiameterDeg:.02,
      bodyFrame:{primeMeridianEnu:[0,1,0],poleEnu:[1,0,0]}}:p);
    const sideOn=skyPlanetDiscsAt([{...row,planets:withFrame}] as any,at,basis,400,800,.25)!
      .find(p=>p.body===body)!;
    assert.ok(sideOn.oblate&&sideOn.surfaceOrientation);
    assert.ok(sideOn.oblate.majorRadiusPx>sideOn.radiusPx);
    assert.ok(sideOn.oblate.minorRadiusPx<sideOn.oblate.majorRadiusPx);
    const expected=body==="URANUS"?24973/25559:24341/24764;
    assert.ok(Math.abs(sideOn.oblate.polarRatio-expected)<1e-12);
    const oldRow=withFrame.map(p=>p.body===body?{...p,bodyFrame:null}:p);
    const fallback=skyPlanetDiscsAt([{...row,planets:oldRow}] as any,at,basis,400,800,.25)!
      .find(p=>p.body===body)!;
    assert.equal(fallback.oblate,null);
    assert.equal(fallback.surfaceOrientation,null);
    assert.equal(fallback.x,sideOn.x);
    assert.equal(fallback.illuminatedFraction,sideOn.illuminatedFraction);
  }
});

test("resolved Mars shares the Moon's IAU body-axis projection and passes only its own texture",()=>{
  const mars=planets.map(p=>p.body==="MARS"?{...p,altitudeDeg:45,angularDiameterDeg:.02,
    bodyFrame:{primeMeridianEnu:[0,-d,-d],poleEnu:[0,-d,d]}}:p);
  const report={hourly:[{...row,planets:mars}],skyScene:{state:"UNAVAILABLE",frames:[]},
    targetFrames:[]} as unknown as ResolvedSkyReport;
  const disc=skyPlanetDiscsAt(report.hourly,at,basis,400,800,.25)!.find(p=>p.body==="MARS")!;
  assert.ok(disc.radiusPx>=4&&disc.surfaceOrientation);
  assert.ok(Math.abs(disc.surfaceOrientation.observerBody[0]-1)<1e-4);
  assert.ok(Math.abs(disc.surfaceOrientation.rightBody[1]-1)<1e-4);
  assert.ok(Math.abs(disc.surfaceOrientation.downBody[2]+1)<1e-4);
  const image={id:"mars"},submitted:object[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="planet"
    ? (_disc:unknown,_view:unknown,_tint:unknown,_red:unknown,texture:object|null)=>{submitted.push(texture??{});return true;}
    : key==="sun"||key==="moon"||key==="solarLight" ? ()=>true
    : ()=>{}}) as SkyRenderSurface;
  drawSkyScene(surface,report,at,null,null,400,800,"NIGHT",undefined,undefined,.25,null,basis,
    undefined,undefined,undefined,undefined,undefined,undefined,
    undefined,undefined,undefined,undefined,undefined,undefined,image);
  assert.ok(submitted.includes(image));
});

test("resolved Mercury uses its own body axis and published image, never Mars'",()=>{
  const mercury=planets.map(p=>p.body==="MERCURY"?{...p,altitudeDeg:45,angularDiameterDeg:.02,
    bodyFrame:{primeMeridianEnu:[0,-d,-d],poleEnu:[0,-d,d]}}:p);
  const report={hourly:[{...row,planets:mercury}],skyScene:{state:"UNAVAILABLE",frames:[]},
    targetFrames:[]} as unknown as ResolvedSkyReport;
  const disc=skyPlanetDiscsAt(report.hourly,at,basis,400,800,.25)!.find(p=>p.body==="MERCURY")!;
  assert.ok(disc.radiusPx>=4&&disc.surfaceOrientation);
  assert.ok(Math.abs(disc.surfaceOrientation.observerBody[0]-1)<1e-4);
  const image={id:"mercury"},submitted:object[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="planet"
    ? (_disc:unknown,_view:unknown,_tint:unknown,_red:unknown,texture:object|null)=>{submitted.push(texture??{});return true;}
    : key==="sun"||key==="moon"||key==="solarLight" ? ()=>true
    : ()=>{}}) as SkyRenderSurface;
  drawSkyScene(surface,report,at,null,null,400,800,"NIGHT",undefined,undefined,.25,null,basis,
    undefined,undefined,undefined,undefined,undefined,undefined,
    undefined,undefined,undefined,undefined,undefined,undefined,null,null,image);
  assert.ok(submitted.includes(image));
});

test("Saturn's observed pole and main-ring radial widths produce oriented bands only when resolvable",()=>{
  const saturn=planets.map(p=>p.body==="SATURN"?{...p,altitudeDeg:45,angularDiameterDeg:.02,
    ringPoleEnu:[0,0,1],ringTiltDeg:20}:p);
  const resolved=skyPlanetDiscsAt([{...row,planets:saturn}] as any,at,basis,400,800,1.5)!
    .find(p=>p.body==="SATURN")!;
  assert.deepEqual(resolved.rings.map(r=>r.band),["C","B","A"]);
  assert.ok(resolved.rings.every(r=>r.front.length>0&&r.back.length>0));
  assert.ok(resolved.rings[0]!.front.some(([x0,y0,x1,y1])=>{
    const x=(x0+x1)/2-resolved.x,y=(y0+y1)/2-resolved.y;
    return y<0&&Math.hypot(x,y)<resolved.oblate!.minorRadiusPx;
  }),"the observer-side ring arc must remain in front of the globe, not be culled as its far side");
  const extent=(ring:typeof resolved.rings[number])=>Math.max(...[...ring.front,...ring.back]
    .flatMap(([x1,y1,x2,y2])=>[Math.hypot(x1-resolved.x,y1-resolved.y),Math.hypot(x2-resolved.x,y2-resolved.y)]));
  assert.ok(extent(resolved.rings[2]!)>extent(resolved.rings[1]!)&&
    extent(resolved.rings[1]!)>extent(resolved.rings[0]!));
  assert.ok(resolved.rings[1]!.front.length>resolved.rings[0]!.front.length&&
    resolved.rings[1]!.front.length>resolved.rings[2]!.front.length,
    "the physically widest B band needs more radial screen samples than C or A");
  const edgeOn=skyPlanetDiscsAt([{...row,planets:saturn.map(p=>p.body==="SATURN"?
    {...p,ringPoleEnu:[1,0,0],ringTiltDeg:0}:p)}] as any,at,basis,400,800,1.5)!
    .find(p=>p.body==="SATURN")!;
  assert.equal(edgeOn.rings.length,0);
  const wide=skyPlanetDiscsAt([{...row,planets:saturn}] as any,at,basis,400,800,45)!
    .find(p=>p.body==="SATURN")!;
  assert.equal(wide.rings.length,0);
  assert.equal(skyPlanetDiscsAt([{...row,planets:saturn.map(p=>p.body==="SATURN"?
    {...p,ringPoleEnu:null}:p)}] as any,at,basis,400,800,1.5),null,
    "retired rows cannot attach an arbitrary ring orientation");
});

test("Saturn ring strokes stay below a few logical pixels at the phone's 0.05° limit",()=>{
  const saturn=planets.map(p=>p.body==="SATURN"?{...p,altitudeDeg:45,
    angularDiameterDeg:.005,ringPoleEnu:[0,0,1],ringTiltDeg:20}:p);
  const disc=skyPlanetDiscsAt([{...row,planets:saturn}] as any,at,basis,400,800,.05)!
    .find(p=>p.body==="SATURN")!;
  assert.ok(disc.radiusPx>30);
  const segments=disc.rings.flatMap(ring=>[...ring.back,...ring.front,
    ...ring.shadowBack,...ring.shadowFront]);
  const longest=Math.max(...segments.map(([x0,y0,x1,y1])=>Math.hypot(x1-x0,y1-y0)));
  assert.ok(longest<=3.5,`long ring chords become visible angular facets: ${longest}px`);
  assert.ok(segments.length<20000,"high zoom still needs a bounded per-frame geometry budget");
});

test("Sun geometry shades only the globe-facing ring sector and retains shadowed arcs as Saturn picks",()=>{
  const sun:[number,number,number]=[0,-.9,-Math.sqrt(1-.9**2)];
  assert.equal(saturnGlobeShadowsRingPoint([0,1.5,0],sun),true);
  assert.equal(saturnGlobeShadowsRingPoint([0,-1.5,0],sun),false);
  assert.equal(saturnGlobeShadowsRingPoint([0,2.3,0],sun),false);
  const saturn=planets.map(p=>p.body==="SATURN"?{...p,altitudeDeg:45,angularDiameterDeg:.02,
    ringPoleEnu:[0,0,1],ringTiltDeg:20,ringSunEnu:sun}:{...p,altitudeDeg:-10});
  const report={hourly:[{...row,planets:saturn}],skyScene:{state:"UNAVAILABLE",frames:[]},
    targetFrames:[]} as unknown as ResolvedSkyReport;
  const disc=skyPlanetDiscsAt(report.hourly,at,basis,400,800,.25)!.find(p=>p.body==="SATURN")!;
  assert.ok(disc.ringSunBody&&disc.surfaceOrientation);
  assert.ok(Math.abs(disc.ringSunBody[2]-sun[2])<1e-6,
    "the longitude-neutral renderer frame preserves the reported sub-solar latitude");
  assert.ok(disc.rings.some(r=>r.shadowBack.length+r.shadowFront.length>0));
  assert.ok(disc.rings.some(r=>r.back.length+r.front.length>0));
  const dark:SkyLineSegment[]=[];
  let snapshot:SkyPickSnapshot|null=null;
  const surface=new Proxy({}, {get:(_target,key)=>key==="planet"?()=>true:
    key==="segments"?(segments:readonly SkyLineSegment[],tint:string)=>{
      if(tint==="#4E473B")dark.push(...segments);
    }:key==="sun"||key==="moon"||key==="solarLight"?()=>true:()=>{}}) as SkyRenderSurface;
  drawSkyScene(surface,report,at,null,null,400,800,"NIGHT",value=>{snapshot=value;},
    undefined,.25,null,basis);
  const painted=snapshot as SkyPickSnapshot|null;
  assert.ok(dark.length>0&&painted);
  const segment=dark.find(([x0,y0,x1,y1])=>x0>=0&&x0<400&&x1>=0&&x1<400&&
    y0>=0&&y0<800&&y1>=0&&y1<800);
  assert.ok(segment);
  assert.ok(pickPaintedSkyObjects(painted,{
    x:(segment[0]+segment[2])/2,y:(segment[1]+segment[3])/2,
    frameAt:at,catalogVersion:painted.catalogVersion,catalogHash:painted.catalogHash,
  }).some(object=>object.reference==="PLANET:SATURN"));
  const old=skyPlanetDiscsAt([{...row,planets:saturn.map(p=>p.body==="SATURN"?{
    ...p,ringSunEnu:null}:p)}] as any,at,basis,400,800,.25)!.find(p=>p.body==="SATURN")!;
  assert.equal(old.ringSunBody,null);
  assert.ok(old.rings.every(r=>r.shadowBack.length+r.shadowFront.length===0));
});

test("Saturn's outer ring remains when the globe has left the viewport",()=>{
  const width=400,height=800,fov=.25,bodyRadius=36;
  const azimuth=Array.from({length:200},(_,index)=>.05+index*.001).find(az=>{
    const center=projectSkyDirectionUnclipped(az,45,basis,width,height,fov);
    return center&&center.x>width+bodyRadius&&center.x<width+bodyRadius*2.2;
  });
  assert.ok(azimuth!==undefined,"the trial view must put only an outer ring in the viewport");
  const center=projectSkyDirectionUnclipped(azimuth,45,basis,width,height,fov)!;
  const saturn=planets.map(p=>p.body==="SATURN"?{...p,azimuthDeg:azimuth,altitudeDeg:45,
    angularDiameterDeg:.02,ringPoleEnu:[0,0,1],ringTiltDeg:20}:{...p,altitudeDeg:-10});
  const disc=skyPlanetDiscsAt([{...row,planets:saturn}] as any,at,basis,width,height,fov)!
    .find(p=>p.body==="SATURN");
  assert.ok(disc,"the ring's projected radius, not the globe's, controls scene culling");
  assert.ok(disc.rings.some(ring=>[...ring.back,...ring.front].some(([x0,,x1])=>
    x0<width||x1<width)),"a ring arc reaches the viewport");
  assert.ok(center.x-disc.oblate!.majorRadiusPx>width,"the oblate globe itself is fully outside");
  const visible:SkyLineSegment[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="planet"?()=>true
    :key==="segments"?(segments:readonly SkyLineSegment[],tint:string)=>{
      if(tint==="#D8C7A5")visible.push(...segments);
    }:key==="solarLight"||key==="sun"||key==="moon"?()=>true:()=>{}}) as SkyRenderSurface;
  let snapshot:SkyPickSnapshot|null=null;
  const report={hourly:[{...row,planets:saturn}],skyScene:{state:"UNAVAILABLE",frames:[]},
    targetFrames:[]} as unknown as ResolvedSkyReport;
  drawSkyScene(surface,report,at,null,null,width,height,"NIGHT",value=>{snapshot=value;},
    undefined,fov,null,basis);
  const segment=visible.find(([x0,y0,x1,y1])=>x0<width&&x1<width&&
    y0>=0&&y0<height&&y1>=0&&y1<height);
  assert.ok(segment,"the scene submits the in-viewport outer ring");
  const painted=snapshot as SkyPickSnapshot|null;
  assert.ok(painted);
  assert.ok(pickPaintedSkyObjects(painted,{x:(segment[0]+segment[2])/2,y:(segment[1]+segment[3])/2,
    frameAt:at,catalogVersion:painted.catalogVersion,catalogHash:painted.catalogHash})
    .some(object=>object.reference==="PLANET:SATURN"),"the visible ring remains selectable");
});

test("Saturn's 1-bar equatorial and polar axes project an oriented oblate globe",()=>{
  const saturn=planets.map(p=>p.body==="SATURN"?{...p,altitudeDeg:45,angularDiameterDeg:.02,
    ringPoleEnu:[1,0,0],ringTiltDeg:0}:{...p,altitudeDeg:-10});
  const view=(pole:readonly [number,number,number])=>skyPlanetDiscsAt(
    [{...row,planets:saturn.map(p=>p.body==="SATURN"?{...p,ringPoleEnu:pole}:p)}] as any,
    at,basis,400,800,.25)!.find(p=>p.body==="SATURN")!;
  const edge=view([1,0,0]);
  assert.ok(edge.oblate);
  assert.ok(Math.abs(edge.oblate.majorRadiusPx/edge.radiusPx-60268/58232)<1e-6);
  assert.ok(Math.abs(edge.oblate.minorRadiusPx/edge.oblate.majorRadiusPx-54364/60268)<1e-6,
    "an edge-on pole exposes the actual polar flattening");
  assert.equal(edge.oblate.polarRatio,54364/60268);
  assert.ok(Math.abs(edge.oblate.minorDirection[0])>.99,
    "the short axis follows the projected pole rather than the canvas vertical");
  const face=view([0,d,d]);
  assert.ok(face.oblate);
  assert.ok(Math.abs(face.oblate.minorRadiusPx/face.oblate.majorRadiusPx-1)<1e-6,
    "a pole-on view exposes the equatorial circle");
});

test("Jupiter's reported pole projects the 1-bar oblate silhouette and orients a longitude-neutral profile",()=>{
  const jupiter=planets.map(p=>p.body==="JUPITER"?{...p,altitudeDeg:45,angularDiameterDeg:.02,
    bodyFrame:{primeMeridianEnu:[0,1,0],poleEnu:[1,0,0]}}:{...p,altitudeDeg:-10});
  const view=(pole:readonly [number,number,number],prime:readonly [number,number,number])=>
    skyPlanetDiscsAt([{...row,planets:jupiter.map(p=>p.body==="JUPITER"?{
      ...p,bodyFrame:{primeMeridianEnu:prime,poleEnu:pole}}:p)}] as any,
    at,basis,400,800,.25)!.find(p=>p.body==="JUPITER")!;
  const edge=view([1,0,0],[0,1,0]);
  assert.ok(edge.oblate);
  assert.ok(Math.abs(edge.oblate.majorRadiusPx/edge.radiusPx-71492/69911)<1e-6);
  assert.ok(Math.abs(edge.oblate.minorRadiusPx/edge.oblate.majorRadiusPx-66854/71492)<1e-6);
  assert.equal(edge.oblate.polarRatio,66854/71492);
  assert.ok(Math.abs(edge.oblate.minorDirection[0])>.99);
  assert.ok(edge.surfaceOrientation,"valid axis lets the licensed latitude profile follow the pole");
  const face=view([0,d,d],[1,0,0]);
  assert.ok(face.oblate);
  assert.ok(Math.abs(face.oblate.minorRadiusPx/face.oblate.majorRadiusPx-1)<1e-6);
  const report={hourly:[{...row,planets:jupiter}],skyScene:{state:"UNAVAILABLE",frames:[]},
    targetFrames:[]} as unknown as ResolvedSkyReport;
  let snapshot:SkyPickSnapshot|null=null;
  const surface=new Proxy({}, {get:(_target,key)=>key==="planet"?()=>true:()=>undefined}) as SkyRenderSurface;
  drawSkyScene(surface,report,at,null,null,400,800,"NIGHT",value=>{snapshot=value;},
    undefined,.25,null,basis);
  const painted=snapshot as SkyPickSnapshot|null;
  assert.ok(painted);
  const x=edge.x-edge.oblate.minorDirection[1]*edge.oblate.majorRadiusPx*.9;
  const y=edge.y+edge.oblate.minorDirection[0]*edge.oblate.majorRadiusPx*.9;
  assert.ok(Math.hypot(x-edge.x,y-edge.y)>18);
  assert.ok(pickPaintedSkyObjects(painted,{x,y,frameAt:at,
    catalogVersion:painted.catalogVersion,catalogHash:painted.catalogHash})
    .some(object=>object.reference==="PLANET:JUPITER"));
  const horizonBasis=createSkyViewBasis(0,90,0)!;
  const nearSet=jupiter.map(p=>p.body==="JUPITER"?{...p,altitudeDeg:-.0101}:p);
  assert.equal(skyPlanetDiscsAt([{...row,planets:nearSet}] as any,at,horizonBasis,400,800,.25)!
    .some(p=>p.body==="JUPITER"),true,
    "the 1-bar equatorial limb can remain above the horizon after the mean-radius sphere sets");
  assert.equal(skyPlanetDiscsAt([{...row,planets:nearSet.map(p=>p.body==="JUPITER"?
    {...p,bodyFrame:null}:p)}] as any,at,horizonBasis,400,800,.25)!
    .some(p=>p.body==="JUPITER"),false,
    "without a valid axis only the legacy spherical horizon bound is available");
  const image={id:"jupiter"},submitted:unknown[]=[];
  const textured=new Proxy({}, {get:(_target,key)=>key==="planet"
    ?(planet:{body:string},_view:unknown,_tint:unknown,_red:unknown,texture:unknown)=>{
      if(planet.body==="JUPITER")submitted.push(texture);return true;}
    :key==="sun"||key==="moon"||key==="solarLight"?()=>true:()=>{}}) as SkyRenderSurface;
  drawSkyScene(...[textured,report,at,null,null,400,800,"NIGHT",undefined,undefined,.25,null,basis,
    ...Array(15).fill(undefined),image] as unknown as Parameters<typeof drawSkyScene>);
  assert.deepEqual(submitted,[image],"the published band image reaches only Jupiter's planet draw");
});

test("Saturn's ring pole orients only its latitude profile while preserving globe and ring identity",()=>{
  const saturn=planets.map(p=>p.body==="SATURN"?{...p,altitudeDeg:45,angularDiameterDeg:.02,
    ringPoleEnu:[0,0,1],ringTiltDeg:20}:{...p,altitudeDeg:-10});
  const report={hourly:[{...row,planets:saturn}],skyScene:{state:"UNAVAILABLE",frames:[]},
    targetFrames:[]} as unknown as ResolvedSkyReport;
  const disc=skyPlanetDiscsAt(report.hourly,at,basis,400,800,.25)!.find(p=>p.body==="SATURN")!;
  assert.ok(disc.surfaceOrientation&&disc.oblate&&disc.rings.length===3);
  assert.ok(Math.abs(disc.surfaceOrientation.observerBody[2]+d)<1e-4,
    "profile latitude follows the reported north pole rather than canvas up");
  const image={id:"saturn"},submitted:unknown[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="planet"
    ?(planet:{body:string},_view:unknown,_tint:unknown,_red:unknown,texture:unknown)=>{
      if(planet.body==="SATURN")submitted.push(texture);return true;}
    :key==="sun"||key==="moon"||key==="solarLight"?()=>true:()=>{}}) as SkyRenderSurface;
  drawSkyScene(...[surface,report,at,null,null,400,800,"NIGHT",undefined,undefined,.25,null,basis,
    ...Array(16).fill(undefined),image] as unknown as Parameters<typeof drawSkyScene>);
  assert.deepEqual(submitted,[image]);
  const noPole=saturn.map(p=>p.body==="SATURN"?{...p,ringPoleEnu:null,ringTiltDeg:null}:p);
  const plain=skyPlanetDiscsAt([{...row,planets:noPole}] as any,at,basis,400,800,.25)!
    .find(p=>p.body==="SATURN")!;
  assert.equal(plain.surfaceOrientation,null);
  assert.equal(plain.oblate,null);
  assert.deepEqual(plain.rings,[]);
});

test("Saturn ring arcs require a successfully drawn globe and retain scene order",()=>{
  const saturn=planets.map(p=>p.body==="SATURN"?{...p,altitudeDeg:45,angularDiameterDeg:.02,
    ringPoleEnu:[0,0,1],ringTiltDeg:20}:{...p,altitudeDeg:-10});
  const report={hourly:[{...row,planets:saturn}],skyScene:{state:"UNAVAILABLE",frames:[]},
    targetFrames:[]} as unknown as ResolvedSkyReport;
  const run=(success:boolean)=>{
    const events:string[]=[];
    const surface=new Proxy({}, {get:(_target,key)=>key==="planet"
      ? ()=>{events.push("globe");return success;}
      : key==="segments" ? (_segments:unknown,tint:string)=>{if(tint==="#D8C7A5")events.push("ring");}
      : key==="sun"||key==="moon"||key==="solarLight" ? ()=>true
      : ()=>{}}) as SkyRenderSurface;
    drawSkyScene(surface,report,at,null,null,400,800,"NIGHT",()=>{},undefined,1.5,null,basis);
    return events;
  };
  const painted=run(true);
  assert.equal(painted[0],"globe");
  assert.deepEqual(painted.slice(1),["ring","ring","ring"]);
  assert.deepEqual(run(false),["globe"]);
});

test("a tap on the rendered Saturn globe rim or main ring selects Saturn",()=>{
  const saturn=planets.map(p=>p.body==="SATURN"?{...p,altitudeDeg:45,angularDiameterDeg:.02,
    ringPoleEnu:[0,0,1],ringTiltDeg:20}:{...p,altitudeDeg:-10});
  const report={hourly:[{...row,planets:saturn}],skyScene:{state:"UNAVAILABLE",frames:[]},
    targetFrames:[]} as unknown as ResolvedSkyReport;
  const disc=skyPlanetDiscsAt([{...row,planets:saturn}] as any,at,basis,400,800,.25)![0]!;
  assert.ok(disc.oblate&&disc.oblate.majorRadiusPx>20);
  const ringSegments:SkyLineSegment[]=[];
  const surface=new Proxy({}, {get:(_target,key)=>key==="planet"?()=>true
    : key==="segments"?(segments:readonly SkyLineSegment[],tint:string)=>{
      if(tint==="#D8C7A5")ringSegments.push(...segments);
    }:key==="solarLight"||key==="sun"||key==="moon"?()=>true:()=>{}}) as SkyRenderSurface;
  let snapshot:SkyPickSnapshot|null=null;
  drawSkyScene(surface,report,at,null,null,400,800,"NIGHT",value=>{snapshot=value;},
    undefined,.25,null,basis);
  assert.ok(snapshot);
  const pick=(x:number,y:number)=>pickPaintedSkyObjects(snapshot,{
    x,y,frameAt:at,catalogVersion:snapshot!.catalogVersion,catalogHash:snapshot!.catalogHash,
  }).map(object=>object.reference);
  const major=disc.oblate.majorRadiusPx;
  const minorAxis=disc.oblate.minorDirection;
  const globeX=disc.x-minorAxis[1]*major*.9;
  const globeY=disc.y+minorAxis[0]*major*.9;
  assert.ok(Math.hypot(globeX-disc.x,globeY-disc.y)>18);
  assert.ok(pick(globeX,globeY).includes("PLANET:SATURN"));
  const ring=ringSegments.find(([x0,y0,x1,y1])=>Math.hypot((x0+x1)/2-disc.x,(y0+y1)/2-disc.y)>major+20);
  assert.ok(ring);
  assert.ok(pick((ring[0]+ring[2])/2,(ring[1]+ring[3])/2).includes("PLANET:SATURN"));
});

test("partly set planetary globes and Saturn rings stop at the same true horizon",()=>{
  const horizonBasis=createSkyViewBasis(0,90,0)!;
  const fov=.25;
  const saturn=planets.map(p=>p.body==="SATURN"?{...p,altitudeDeg:-.003,
    angularDiameterDeg:.02,ringPoleEnu:[0,.5,Math.sqrt(.75)],ringTiltDeg:30}
    : {...p,altitudeDeg:-10});
  const discs=skyPlanetDiscsAt([{...row,planets:saturn}] as any,
    at,horizonBasis,400,800,fov)!;
  assert.deepEqual(discs.map(p=>p.body),["SATURN"]);
  const original=discs[0]!.rings.flatMap(r=>[...r.back,...r.front]);
  assert.ok(original.length>0);
  const altitude=(x:number,y:number)=>unprojectSkyPoint(x,y,horizonBasis,400,800,fov)![2];
  assert.ok(original.some(([x0,y0,x1,y1])=>altitude(x0,y0)<0||altitude(x1,y1)<0));
  const submitted:SkyLineSegment[]=[];
  let globe=0;
  let picked:string[]=[];
  let pickedSnapshot:SkyPickSnapshot|null=null;
  const surface=new Proxy({}, {get:(_target,key)=>key==="planet"
    ? (_disc:unknown,view:unknown)=>{assert.deepEqual(view,{basis:horizonBasis,verticalFovDeg:fov});globe++;return true;}
    : key==="segments" ? (segments:readonly SkyLineSegment[],tint:string)=>{
      if(tint==="#D8C7A5")submitted.push(...segments);
    } : key==="solarLight"||key==="sun"||key==="moon"?()=>true:()=>{}}) as SkyRenderSurface;
  const report={hourly:[{...row,planets:saturn}],skyScene:{state:"UNAVAILABLE",frames:[]},
    targetFrames:[]} as unknown as ResolvedSkyReport;
  drawSkyScene(surface,report,at,null,null,400,800,"NIGHT",snapshot=>{
    pickedSnapshot=snapshot;
    picked=snapshot?.objects.map(object=>object.reference)??[];
  },undefined,fov,null,horizonBasis);
  assert.equal(globe,1);
  assert.ok(picked.includes("PLANET:SATURN"),"visible rings remain selectable after the centre sets");
  assert.ok(submitted.length>0&&submitted.length<original.length);
  for(const [x0,y0,x1,y1] of submitted){
    assert.ok(altitude(x0,y0)>-1e-7);
    assert.ok(altitude(x1,y1)>-1e-7);
  }
  assert.ok(pickedSnapshot);
  const pick=(x:number,y:number)=>pickPaintedSkyObjects(pickedSnapshot,{
    x,y,frameAt:at,catalogVersion:pickedSnapshot!.catalogVersion,
    catalogHash:pickedSnapshot!.catalogHash,
  }).map(object=>object.reference);
  const visible=submitted.find(([x0,y0,x1,y1])=>altitude((x0+x1)/2,(y0+y1)/2)>0);
  assert.ok(visible);
  assert.ok(pick((visible[0]+visible[2])/2,(visible[1]+visible[3])/2).includes("PLANET:SATURN"));
  const hidden=original.find(([x0,y0,x1,y1])=>altitude((x0+x1)/2,(y0+y1)/2)<0);
  assert.ok(hidden);
  assert.deepEqual(pick((hidden[0]+hidden[2])/2,(hidden[1]+hidden[3])/2),[],
    "a clipped ring segment below the true horizon is not a pick target");
  const ringOnly=saturn.map(p=>p.body==="SATURN"?{...p,altitudeDeg:-.015,
    ringPoleEnu:[Math.sqrt(.99),.1,0],ringTiltDeg:6}:p);
  const ringOnlyDiscs=skyPlanetDiscsAt([{...row,planets:ringOnly}] as any,
    at,horizonBasis,400,800,fov)!;
  assert.equal(ringOnlyDiscs.length,1,"Saturn's outer ring survives its globe setting");
  assert.ok(ringOnlyDiscs[0]!.altitudeDeg < -ringOnlyDiscs[0]!.angularDiameterDeg/2);
  submitted.length=0;globe=0;
  drawSkyScene(surface,{...report,hourly:[{...row,planets:ringOnly}]} as unknown as ResolvedSkyReport,
    at,null,null,400,800,"NIGHT",undefined,undefined,fov,null,horizonBasis);
  assert.equal(globe,1);
  assert.ok(submitted.length>0,"the ring, not just an empty globe draw, must reach the surface");
  assert.ok(submitted.every(([x0,y0,x1,y1])=>altitude(x0,y0)>-1e-7&&altitude(x1,y1)>-1e-7));
  assert.deepEqual(skyPlanetDiscsAt([{...row,planets:ringOnly.map(p=>p.body==="SATURN"?
    {...p,altitudeDeg:-.03}:p)}] as any,at,horizonBasis,400,800,fov),[],
    "a wholly set globe and ring should leave no render candidate");
});

test("real planetary phase replaces the old Venus target marker, but missing geometry preserves it",()=>{
  const events:string[]=[];
  let picked: string[]=[];
  let shaderAvailable = true;
  const surface=new Proxy({}, {get:(_target,key)=>key==="planet"
    ? (disc:{illuminatedFraction:number})=>{events.push(`planet:${disc.illuminatedFraction}`);return shaderAvailable;}
    : key==="moon"||key==="solarLight" ? ()=>true
      : key==="disc" ? ()=>{events.push("disc");}
      : ()=>{events.push(String(key));}}) as SkyRenderSurface;
  const report=(hourly:unknown[])=>({hourly,skyScene:{state:"UNAVAILABLE",frames:[]},
    targetFrames:[{at,targets:[{targetId:"target:venus",type:"PLANET",azimuthDeg:0,altitudeDeg:45}]}]}) as unknown as ResolvedSkyReport;
  drawSkyScene(surface,report([row]),at,null,null,400,800,"NIGHT",snapshot=>{
    picked=snapshot?.objects.map(object=>object.reference)??[];
  },undefined,3,null,basis);
  assert.deepEqual(events.filter(event=>event==="disc"||event.startsWith("planet:")),["planet:0.25"]);
  assert.deepEqual(picked,["PLANET:VENUS"]);
  events.length=0;
  drawSkyScene(surface,report([{...row,planets:null}]),at,null,null,400,800,"NIGHT",snapshot=>{
    picked=snapshot?.objects.map(object=>object.reference)??[];
  },undefined,3,null,basis);
  assert.deepEqual(events.filter(event=>event==="disc"||event.startsWith("planet:")),["disc"]);
  assert.deepEqual(picked,[]);
  for (const [available, fov, expected] of [
    [true, .05, ["PLANET:VENUS"]], [false, .05, []], [true, .05, ["PLANET:VENUS"]], [true, 45, []],
  ] as const) {
    shaderAvailable = available;
    let labelReplacements: readonly string[] = [];
    drawSkyScene(surface,report([row]),at,null,null,400,800,"NIGHT",snapshot=>{
      labelReplacements=resolvedSkyBodyReferences(snapshot);
    },undefined,fov,null,basis);
    assert.deepEqual(labelReplacements, expected, `actual submissions control DOM labels: ${available}/${fov}`);
  }
});


test("resolved Saturn bands use one continuous surface; unavailable shader retains arcs and picking",()=>{
  const frame=planets.map(p=>({...p,altitudeDeg:p.body==="SATURN"?45:-10,angularDiameterDeg:.02}));
  const report={hourly:[{...row,planets:frame}],skyScene:{state:"UNAVAILABLE",frames:[]},targetFrames:[]} as unknown as ResolvedSkyReport;
  for(const available of [true,false]){
    let rings=0,arcs=0;let picked:SkyPickSnapshot|null=null;
    const surface=new Proxy({}, {get:(_target,key)=>key==="saturnRings"?()=>{rings++;return available;}
      :key==="planet"||key==="moon"||key==="sun"||key==="solarLight"?()=>true
      :key==="segments"?(_:unknown,tint:string)=>{if(tint==="#D8C7A5")arcs++;}:()=>{}}) as SkyRenderSurface;
    drawSkyScene(surface,report,at,null,null,400,800,"NIGHT",snapshot=>{picked=snapshot;},undefined,.05,null,basis);
    assert.equal(rings,1,"the native continuous ring surface must actually be consumed");
    assert.equal(arcs>0,!available,"successful filled rings must not be overdrawn by sampled strokes");
    assert.ok((picked as SkyPickSnapshot|null)?.objects.some(p=>p.reference==="PLANET:SATURN"&&p.hitSegments?.length));
  }
});
