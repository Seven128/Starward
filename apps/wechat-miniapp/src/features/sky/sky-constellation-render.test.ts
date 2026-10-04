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
  const surface={artwork(){images++;return true;},segments(s:readonly unknown[]){lines+=s.length;}} as unknown as SkyRenderSurface;
  const layer={frame:{at:'instant',images:[{source:{id:'figure'} as ConstellationArtwork,registration}],
    lines:[[ray(-15,55),ray(15,55)] as const],labels:[]},images:new Map([['figure',{}]]),enabled:true,failed(){assert.fail('valid image rejected');}};
  drawSkyConstellations(surface,layer,{basis:createSkyViewBasis(0,145,0)!,verticalFovDeg:84.63316191100171},390.4,844,false);
  assert.equal(images,1,'enabled illustration must reach the production drawing owner');
  assert.ok(lines>0,'the same valid field must contain actual constellation geometry');
});
test("offscreen constellation arcs avoid fine clipping while a crossing with offscreen endpoints remains",()=>{
  // Observe the real owner's clipping dependency rather than asserting a flaky
  // millisecond budget or accepting an empty result as a working renderer.
  const source=ts.createSourceFile("sky-constellation-render.ts",
    readFileSync(new URL("sky-constellation-render.ts",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
  const declarations=source.statements.filter(statement=>{
    if(ts.isFunctionDeclaration(statement))return ["hemisphere","constellationLineSegments"].includes(statement.name?.text??"");
    return ts.isVariableStatement(statement)&&statement.declarationList.declarations.some(declaration=>
      ["dot","normalized"].includes(declaration.name.getText(source)));
  }).map(statement=>statement.getText(source).replace(/^export /,"")).join("\n");
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
  drawSkyConstellations(surface,layer,view,360,640,false);assert.equal(images+lines,0);
  drawSkyConstellations(surface,{...layer,enabled:false},{...view,verticalFovDeg:25},360,640,false);assert.equal(images+lines,0);
  drawSkyConstellations(surface,layer,{...view,verticalFovDeg:25},360,640,false);
  assert.equal(images,1);assert.equal(failures,1);assert.ok(lines>0);assert.equal(lastOpacity,.35);
  drawSkyConstellations(surface,{...layer,images:new Map()},{...view,verticalFovDeg:115},360,640,true);
  assert.equal(images,1);assert.equal(failures,1);assert.equal(lastOpacity,.175);
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
