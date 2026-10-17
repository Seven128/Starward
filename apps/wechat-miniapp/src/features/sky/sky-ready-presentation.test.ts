import test from "node:test";
import assert from "node:assert/strict";
import { createSkyReadyImages } from "./sky-ready-presentation";
import { drawSkyConstellations } from "./sky-constellation-render";
import { createSkyViewBasis } from "./sky-view-projection";
import { registerSkyArtwork } from "./sky-artwork-registration";
import type { SkyConstellationLayer } from "./sky-constellation-render";
import type { SkyRenderSurface } from "./sky-render-surface";

test("late ready images start at zero after successful presentation and follow the current half-opacity target", () => {
  const images = createSkyReadyImages(), image = {}, opacities: number[] = [];
  const paint = (opacity: number) => { opacities.push(opacity); return true; };
  const empty = images.prepare(0); assert.equal(empty.animating, false); empty.commit();
  const late = images.prepare(10000);
  assert.equal(late.draw(image,.5,()=>true,paint),"PREPARED");
  assert.deepEqual(opacities,[]); assert.equal(late.animating,true);
  // A slow upload/present must not consume the envelope before its first copy.
  assert.equal(late.commit(10100),true);
  const half = images.prepare(10180);
  assert.equal(half.draw(image,.5,()=>assert.fail("already drawable"),paint),"PAINTED");
  assert.equal(opacities.at(-1),.25); half.commit();
  const retarget = images.prepare(10260);
  retarget.draw(image,.2,()=>true,paint);retarget.commit();
  assert.equal(opacities.at(-1),.2);assert.equal(retarget.animating,false);
  const hidden = images.prepare(10300);
  assert.equal(hidden.draw(image,0,()=>assert.fail("hidden preparation"),()=>assert.fail("hidden draw")),"HIDDEN");
  hidden.commit();
  assert.equal(images.prepare(10400).draw(image,.5,()=>true,paint),"PREPARED","renewed eligibility starts a fresh reveal");
});

test("failed preparation, rejected copies, replacement identities and retired frames cannot advance reveal", () => {
  const images=createSkyReadyImages(),image={},other={},painted:number[]=[];
  const paint=(opacity:number)=>{painted.push(opacity);return true;};
  const failed=images.prepare(0);assert.equal(failed.draw(image,.5,()=>false,paint),"FAILED");failed.commit();
  const rejected=images.prepare(100);assert.equal(rejected.draw(image,.5,()=>true,paint),"PREPARED");
  const retry=images.prepare(500);assert.equal(retry.draw(image,.5,()=>true,paint),"PREPARED");retry.commit();
  assert.equal(rejected.commit(),false,"an obsolete attempt cannot replace the accepted state");
  const replacement=images.prepare(580);assert.equal(replacement.draw(other,.5,()=>true,paint),"PREPARED");replacement.commit();
  assert.deepEqual(painted,[],"no failed or zero-alpha preparation grants displayed pixels");
  const stale=images.prepare(660);stale.draw(other,.5,()=>true,paint);images.reset();assert.equal(stale.commit(),false);
  assert.equal(images.prepare(1000).draw(other,.5,()=>true,paint),"PREPARED","Canvas retirement drops old clocks");
});

test("paused readiness does not leave an animation loop and reduced motion presents the permitted target", () => {
  const images=createSkyReadyImages(),image={},values:number[]=[],paint=(opacity:number)=>{values.push(opacity);return true;};
  const first=images.prepare(0);first.draw(image,.5,()=>true,paint);first.commit();
  const half=images.prepare(80);half.draw(image,.5,()=>true,paint);half.commit();
  const paused=images.prepare(1000,false,true);paused.draw(image,.5,()=>true,paint);paused.commit(1100);
  assert.equal(values.at(-1),.25);assert.equal(paused.animating,false);
  const resumed=images.prepare(2000);resumed.draw(image,.5,()=>true,paint);resumed.commit(2100);
  assert.equal(values.at(-1),.25);
  const final=images.prepare(2180);final.draw(image,.5,()=>true,paint);final.commit();assert.equal(values.at(-1),.5);assert.equal(final.animating,false);
  images.reset();const reduced=images.prepare(3000,true);assert.equal(reduced.draw(image,.5,()=>assert.fail("not needed"),paint),"PAINTED");
  assert.equal(values.at(-1),.5);assert.equal(reduced.animating,false);
});

test("the real constellation consumer prepares without pixels, then reveals toward its still-half-faded scale", () => {
  const ray=(az:number,alt:number):readonly [number,number,number]=>{const a=az*Math.PI/180,b=alt*Math.PI/180;return[Math.cos(b)*Math.sin(a),Math.cos(b)*Math.cos(a),Math.sin(b)];};
  const registration=registerSkyArtwork([{uv:[0,0],direction:ray(-5,25)},{uv:[1,0],direction:ray(5,25)},{uv:[0,1],direction:ray(-5,15)}])!;
  const image={},images=createSkyReadyImages(),values:number[]=[];let prepares=0,failures=0,segments=0;
  const surface={prepareArtwork(){prepares++;return true;},artwork(_image:object,_registration:unknown,_view:unknown,opacity:number){values.push(opacity);return true;},segments(lines:unknown[]){segments+=lines.length;}} as unknown as SkyRenderSurface;
  const layer:SkyConstellationLayer={frame:{at:"instant",images:[{source:{id:"figure"} as never,registration}],lines:[[ray(-5,20),ray(5,20)]],labels:[]},images:new Map([["figure",image]]),enabled:true,failed(){failures++;}};
  const view={basis:createSkyViewBasis(0,110,0)!,verticalFovDeg:17.5};
  const first=images.prepare(0);drawSkyConstellations(surface,layer,view,360,640,false,undefined,first);first.commit();
  assert.equal(prepares,1);assert.deepEqual(values,[]);assert.equal(failures,0);assert.ok(segments>0,"independent real lines remain visible");
  const half=images.prepare(80);drawSkyConstellations(surface,layer,view,360,640,false,undefined,half);half.commit();
  assert.equal(values.at(-1),.05,"the full decorative .2 multiplied by scale .5 and readiness .5");
  const done=images.prepare(160);drawSkyConstellations(surface,layer,view,360,640,false,undefined,done);done.commit();
  assert.equal(values.at(-1),.1);assert.equal(done.animating,false);assert.equal(failures,0);
});
