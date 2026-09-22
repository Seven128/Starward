import test from "node:test";
import assert from "node:assert/strict";
import { constellationLineSegments, drawSkyConstellations } from "./sky-constellation-render.ts";
import { createSkyViewBasis, unprojectSkyPoint, type SkyVector } from "./sky-view-projection.ts";
import { registerSkyArtwork } from "./sky-artwork-registration.ts";
import type { ConstellationArtwork } from "@starward/miniapp-contracts";
import type { SkyRenderSurface } from "./sky-render-surface.ts";

const ray=(az:number,alt:number):SkyVector=>{
  const a=az*Math.PI/180,b=alt*Math.PI/180;return [Math.cos(b)*Math.sin(a),Math.cos(b)*Math.cos(a),Math.sin(b)];
};
test("a true curved constellation arc survives offscreen endpoints; clipping uses actual viewport and horizon",()=>{
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
  assert.ok(crossing.length>0);assert.ok(Math.abs(crossing[0]![1]-280)<1e-8,'starts exactly at world horizon');
  for(const s of crossing)for(const [x,y] of [[s[0],s[1]],[s[2],s[3]]]){
    assert.ok(unprojectSkyPoint(x!,y!,north.basis,360,640,25,north.center)![2]>=-1e-9);
  }
  assert.deepEqual(constellationLineSegments([[ray(-5,-10),ray(5,-10)],[ray(170,10),ray(190,10)]],north,360,640),[]);
});

test("zoom and intent gate both artwork and lines, decoded failure is reported once per attempt without throwing",()=>{
  const registration=registerSkyArtwork([
    {uv:[0,0],direction:ray(-5,25)},{uv:[1,0],direction:ray(5,25)},{uv:[0,1],direction:ray(-5,15)},
  ])!;
  let images=0,lines=0,failures=0,lastOpacity=0;
  const surface:SkyRenderSurface={begin(){},finish(){},disc(){},image(){return true;},
    artwork(){images++;return false;},segments(s,_,opacity){lines+=s.length;lastOpacity=opacity!;}};
  const layer={frame:{at:'instant',images:[{source:{id:'figure'} as ConstellationArtwork,registration}],lines:[[ray(-5,20),ray(5,20)] as const]},
    images:new Map([['figure',{}]]),enabled:true,failed(){failures++;}};
  const view={basis:createSkyViewBasis(0,110,0)!,verticalFovDeg:45};
  drawSkyConstellations(surface,layer,view,360,640,false);assert.equal(images+lines,0);
  drawSkyConstellations(surface,{...layer,enabled:false},{...view,verticalFovDeg:25},360,640,false);assert.equal(images+lines,0);
  drawSkyConstellations(surface,layer,{...view,verticalFovDeg:25},360,640,false);
  assert.equal(images,1);assert.equal(failures,1);assert.ok(lines>0);assert.equal(lastOpacity,.35);
  drawSkyConstellations(surface,{...layer,images:new Map()},{...view,verticalFovDeg:32.5},360,640,true);
  assert.equal(images,1);assert.equal(failures,1);assert.equal(lastOpacity,.175);
});
