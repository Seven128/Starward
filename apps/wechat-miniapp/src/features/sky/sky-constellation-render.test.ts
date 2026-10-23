import { skySceneTestFrame } from "./sky-scene-test-support";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { constellationLineSegments, drawSkyConstellations } from "./sky-constellation-render.ts";
import { createSkyViewBasis, projectSkyDirection, unprojectSkyPoint, type SkyVector } from "./sky-view-projection.ts";
import { registerSkyArtwork, skyArtworkViewParameters } from "./sky-artwork-registration.ts";
import { skyArtworkViewBounds } from "./sky-artwork-visibility.ts";
import { clipSkyLineToViewport } from "./sky-line-clip.ts";
import type { ConstellationArtwork } from "@starward/miniapp-contracts";
import type { SkyRenderSurface } from "./sky-render-surface.ts";
import { drawSkyScene } from "./sky-scene-render";
import type { ResolvedSkyReport } from "./sky-stellar-scene";

const ray=(az:number,alt:number):SkyVector=>{
  const a=az*Math.PI/180,b=alt*Math.PI/180;return [Math.cos(b)*Math.sin(a),Math.cos(b)*Math.cos(a),Math.sin(b)];
};
test("portrait identification field renders the figure and real lines rather than an empty enabled layer",()=>{
  // Reference: Altair-centred 390.4 x 844 portrait, minimum FOV 40.6 degrees
  // (84.633 degrees vertically). This is an identification field, not a dome.
  const registration=registerSkyArtwork([
    {uv:[0,0],direction:ray(-15,65)},{uv:[1,0],direction:ray(15,65)},
    {uv:[0,1],direction:ray(-15,45)},
  ])!;
  let images=0,lines=0;
  const image={}, orphan={}, declared:object[]=[];
  const surface={begin(_w:number,_h:number,_background:string,ready:readonly object[]=[]){declared.push(...ready);},finish(){},
    artwork(source:object){assert(declared.includes(source),"the real Scene declares later artwork before layer allocation");images++;return true;},
    segments(s:readonly unknown[]){lines+=s.length;}} as unknown as SkyRenderSurface;
  const layer={frame:{at:'instant',images:[{source:{id:'figure'} as ConstellationArtwork,registration}],
    lines:[[ray(-15,55),ray(15,55)] as const],labels:[]},images:new Map([['figure',image],['orphan',orphan]]),enabled:true,failed(){assert.fail('valid image rejected');}};
  const report={skyScene:{state:"UNAVAILABLE",frames:[]},targetFrames:[],hourly:[]} as unknown as ResolvedSkyReport;
  drawSkyScene(surface, skySceneTestFrame({ observation: { data: report, frameAt: 'instant', constellations:layer.frame }, view: { heading: null, pose: null, mode: 'NIGHT', verticalFovDeg: 84.63316191100171, manualBasis: createSkyViewBasis(0,145,0)! }, canvas: { width: 390.4, height: 844 }, layers: { constellations: {images:layer.images,enabled:layer.enabled} }, imagery: { infrared: null } }),
    {failed:failure=>{if(failure.kind==='constellation')layer.failed();}});
  assert.deepEqual(declared,[image],"only this frame's selected ready figure is declared, not the whole loader map");
  assert.equal(images,1,'enabled illustration must reach the production drawing owner');
  assert.ok(lines>0,'the same valid field must contain actual constellation geometry');
});
test("offscreen constellation arcs avoid fine clipping while a crossing with offscreen endpoints remains",()=>{
  // Observe the real owner's clipping dependency rather than asserting a flaky
  // millisecond budget or accepting an empty result as a working renderer.
  const source=ts.createSourceFile("sky-constellation-render.ts",
    readFileSync(new URL("sky-constellation-render.ts",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
  // Keep the production module's local dependencies together; this fixture
  // substitutes only the clipping port whose real calls are the assertion.
  const declarations=source.statements.filter(statement=>!ts.isImportDeclaration(statement))
    .map(statement=>statement.getText(source).replace(/^export /,"")).join("\n");
  let clips=0;
  const context=vm.createContext({skyArtworkViewParameters,skyArtworkViewBounds,
    clipSkyLineToViewport(...args:Parameters<typeof clipSkyLineToViewport>){clips++;return clipSkyLineToViewport(...args);}});
  vm.runInContext(ts.transpileModule(declarations,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
  const run=context.constellationLineSegments as typeof constellationLineSegments;
  const view={basis:createSkyViewBasis(0,120,0)!,verticalFovDeg:.05,center:{x:170,y:240}};
  assert.deepEqual(Array.from(run([[ray(35,30),ray(45,30)]],view,360,640)),[]);
  assert.equal(clips,0,"an entirely offscreen arc must retire before fine subdivision/clipping");
  const a=unprojectSkyPoint(-180,240,view.basis,360,640,.05,view.center)!;
  const b=unprojectSkyPoint(540,240,view.basis,360,640,.05,view.center)!;
  const visible=run([[a,b]],view,360,640);
  assert.ok(visible.length>0&&clips>0,"culling cannot erase a real crossing");
  assert.equal(JSON.stringify(visible),JSON.stringify(constellationLineSegments([[a,b]],view,360,640)));
});
test("exact-time immutable arcs keep real geometry through repeated views and replacement; mutable inputs stay live",()=>{
  const pair=(a:SkyVector,b:SkyVector)=>Object.freeze([Object.freeze(a),Object.freeze(b)] as const);
  const original=Object.freeze([pair(ray(-20,20),ray(20,20)),pair(ray(15,-10),ray(15,50))]);
  const updated=Object.freeze([pair(ray(-18,22),ray(22,22)),pair(ray(17,-8),ray(17,52))]);
  const views=[{basis:createSkyViewBasis(0,110,0)!,verticalFovDeg:95.6},
    {basis:createSkyViewBasis(5,105,30)!,verticalFovDeg:25,center:{x:170,y:240}},
    {basis:createSkyViewBasis(180,110,-32)!,verticalFovDeg:45}];
  const fresh=(lines:typeof original)=>lines.map(([a,b])=>[[...a],[...b]] as const);
  let visible=0;
  for(let pass=0;pass<2;pass++)for(const lines of [original,updated])for(const view of views){
    const actual=constellationLineSegments(lines,view,360,640);
    assert.deepEqual(actual,constellationLineSegments(fresh(lines),view,360,640));
    visible+=actual.length;
  }
  assert(visible>0,"cached and fresh equality cannot be certified by empty output");
  const view=views[0]!,a=[...original[0]![0]] as [number,number,number],b=[...original[0]![1]] as [number,number,number];
  const shallow=Object.freeze([[a,b] as const]);
  const before=constellationLineSegments(shallow,view,360,640);
  a.splice(0,3,...ray(-10,30));b.splice(0,3,...ray(25,30));
  const after=constellationLineSegments(shallow,view,360,640);
  assert.notDeepEqual(after,before,"freezing only the outer list cannot grant immutable geometry credit");
  assert.deepEqual(after,constellationLineSegments([[a,b]],view,360,640));
});
test("a true curved constellation arc survives offscreen endpoints and crosses the geometric horizon continuously",()=>{
  const view={basis:createSkyViewBasis(0,110,0)!,verticalFovDeg:25,center:{x:170,y:240}};
  const segments=constellationLineSegments([[ray(-20,20),ray(20,20)]],view,360,640);
  assert.ok(segments.length>2);
  assert.ok(Math.abs(segments[0]![0])<1e-8);assert.ok(Math.abs(segments.at(-1)![2]-360)<1e-8);
  assert.ok(segments.some(s=>s[1]<230),'minor great circle rises above the equal-altitude endpoints');
  for(const s of segments)for(const [x,y] of [[s[0],s[1]],[s[2],s[3]]]){
    assert.ok(x!>=-1e-8 && x!<=360+1e-8 && y!>=-1e-8 && y!<=640+1e-8);
  }
  const north={basis:createSkyViewBasis(0,90,0)!,verticalFovDeg:25,center:{x:180,y:280}};
  const crossing=constellationLineSegments([[ray(0,-10),ray(0,10)]],north,360,640);
  const start=projectSkyDirection(0,-10,north.basis,360,640,25,north.center)!;
  assert.ok(crossing.length>0);assert.ok(Math.abs(crossing[0]![1]-start.y)<1e-8,
    'the real below-horizon endpoint remains in the browsing view');
  let below=false,above=false;
  for(const s of crossing)for(const [x,y] of [[s[0],s[1]],[s[2],s[3]]]){
    const up=unprojectSkyPoint(x!,y!,north.basis,360,640,25,north.center)![2];
    below ||= up < -1e-9;above ||= up > 1e-9;
  }
  assert.ok(below&&above,'one real arc includes both sides without replacing its identity/geometry');
  assert.ok(constellationLineSegments([[ray(-5,-10),ray(5,-10)]],north,360,640).length>0);
  assert.deepEqual(constellationLineSegments([[ray(170,10),ray(190,10)]],north,360,640),[]);
});

test("overview and intent gate the constellation; local artwork fades while real lines remain and image failure stays independent",()=>{
  const registration=registerSkyArtwork([
    {uv:[0,0],direction:ray(-5,25)},{uv:[1,0],direction:ray(5,25)},{uv:[0,1],direction:ray(-5,15)},
  ])!;
  let images=0,lines=0,failures=0,lastOpacity=0;
  const surface:SkyRenderSurface={begin(){},finish(){},disc(){},image(){return true;},skyImageMesh(){return true;},solarLight(){return true;},landscape(){return true;},galacticBand(){return true;},sun(){return true;},moon(){return true;},planet(){return true;}, saturnRings(){return false;},
    artwork(){images++;return false;},segments(s,_,opacity){lines+=s.length;lastOpacity=opacity!;}};
  const layer={frame:{at:'instant',images:[{source:{id:'figure'} as ConstellationArtwork,registration}],lines:[[ray(-5,20),ray(5,20)] as const],labels:[]},
    images:new Map([['figure',{}]]),enabled:true,failed(){failures++;}};
  const view={basis:createSkyViewBasis(0,110,0)!,verticalFovDeg:180};
  drawSkyConstellations(surface,layer,view,360,640,false);assert.equal(images,1);assert.ok(lines>0);
  const overview={images,lines};
  drawSkyConstellations(surface,{...layer,enabled:false},{...view,verticalFovDeg:25},360,640,false);assert.deepEqual({images,lines},overview);
  drawSkyConstellations(surface,layer,{...view,verticalFovDeg:25},360,640,false);
  assert.equal(images,2);assert.equal(failures,2);assert.ok(lines>overview.lines);assert.equal(lastOpacity,.35);
  drawSkyConstellations(surface,{...layer,images:new Map()},{...view,verticalFovDeg:115},360,640,true);
  assert.equal(images,2);assert.equal(failures,2);assert.equal(lastOpacity,.35);
  const beforeLocal={images,lines,failures};
  drawSkyConstellations(surface,layer,{...view,verticalFovDeg:8.89},360,640,false);
  assert.equal(images,beforeLocal.images,"a local stellar crop must not submit its retired illustration");
  assert.equal(failures,beforeLocal.failures,"retired artwork must not generate an upload failure or retry");
  assert.ok(lines>beforeLocal.lines,"the local reference retains real constellation arcs for identification");
  assert.equal(lastOpacity,.35,"local magnification does not retire the remaining lines");
  drawSkyConstellations(surface,layer,{...view,verticalFovDeg:25},360,640,false);
  assert.equal(images,beforeLocal.images+1,"widening restores the actual illustration consumer");
  assert.ok(lines>beforeLocal.lines,"widening restores actual line geometry, not an empty pass");
});

test("all-sky arcs retain visible rear-hemisphere geometry without bridging across the projection pole",()=>{
  const view={basis:createSkyViewBasis(0,90,0)!,verticalFovDeg:264.4};
  const rear=constellationLineSegments([[ray(175,55),ray(185,55)]],view,390,844);
  assert(rear.length>0,'a full-sky viewport includes real geometry beyond the forward hemisphere');
  const acrossPole=constellationLineSegments([[ray(180,50),ray(180,-50)]],view,390,844);
  assert(acrossPole.length>1,'both visible ends of the minor spherical arc remain');
  for(const [x1,y1,x2,y2] of acrossPole){
    assert([x1,y1,x2,y2].every(Number.isFinite));
    assert((y1<200&&y2<200)||(y1>640&&y2>640),'no false line joins opposite screen edges through the middle');
  }
  assert.deepEqual(constellationLineSegments([[ray(170,0),ray(190,0)]],view,390,844),[],
    'a minor arc wholly in the invisible antipodal cap stays absent');
});
