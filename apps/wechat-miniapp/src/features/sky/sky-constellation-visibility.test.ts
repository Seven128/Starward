import test from "node:test";
import assert from "node:assert/strict";
import { constellationLineVisibility, constellationVisibility } from "./sky-constellation-visibility.ts";
import { artworkIntersectsView } from "./sky-artwork-visibility.ts";
import { registerSkyArtwork } from "./sky-artwork-registration.ts";
import { createSkyViewBasis,type SkyVector } from "./sky-view-projection.ts";

test("zoom visibility preserves an identification field, fades before the dome and respects off intent",()=>{
  for(const fov of [140,180,270])assert.equal(constellationVisibility(fov,true),0);
  for(const fov of [45,84.63316191100171,90])assert.equal(constellationVisibility(fov,true),1);
  assert.equal(constellationVisibility(25,true),1);
  assert.ok(constellationVisibility(115,true)>0&&constellationVisibility(115,true)<1);
  for(const fov of [1.5,25,32,45,84.63316191100171,115])assert.equal(constellationVisibility(fov,false),0);
  assert.ok(constellationVisibility(139.999,true)<1e-6);
});
test("constellation context fades out in a close stellar crop and returns on widening",()=>{
  for(const fov of [0.05,2.67,8.89])assert.equal(constellationVisibility(fov,true),0,
    "close stellar fields must not retain a full-opacity constellation illustration");
  const sequence=[10,12,15,18,21,25].map(fov=>constellationVisibility(fov,true));
  assert.equal(sequence[0],0);
  assert.equal(sequence.at(-1),1,"the existing identification view remains available");
  for(let i=1;i<sequence.length;i++)assert.ok(sequence[i]!>sequence[i-1]!,"continuous widening restores context");
  assert.deepEqual([25,21,18,15,12,10].map(fov=>constellationVisibility(fov,true)),[...sequence].reverse(),
    "zoom direction must not leave stale opacity or change the user's layer intent");
  assert.ok(Math.abs(constellationVisibility(10+1e-5,true)-constellationVisibility(10-1e-5,true))<1e-6);
  assert.ok(Math.abs(constellationVisibility(25+1e-5,true)-constellationVisibility(25-1e-5,true))<1e-6);
});
test("local line visibility shares overview and intent while artwork and names retire",()=>{
  for(const fov of [.05,2.67,8.89,15,25,45,84.63316191100171])
    assert.equal(constellationLineVisibility(fov,true),1);
  for(const fov of [25,45,90,115,139.999,140,180,270])
    assert.equal(constellationLineVisibility(fov,true),constellationVisibility(fov,true));
  for(const fov of [.05,8.89,25,115])assert.equal(constellationLineVisibility(fov,false),0);
  for(const fov of [NaN,Infinity,0,-1])assert.equal(constellationLineVisibility(fov,true),0);
});
test("entire image bounds remain eligible with offscreen anchors; the camera admits either side of the horizon",()=>{
  const unit=(v:SkyVector)=>v.map(n=>n/Math.hypot(...v)) as unknown as SkyVector;
  const registration=registerSkyArtwork([
    {uv:[0,0],direction:unit([-1,1,1])},{uv:[1,0],direction:unit([1,1,1])},{uv:[0,1],direction:unit([-1,1,.1])},
  ])!;
  assert.ok(artworkIntersectsView(registration,{basis:createSkyViewBasis(0,120,0)!,verticalFovDeg:5,center:{x:100,y:250}},400,800));
  assert.equal(artworkIntersectsView(registration,{basis:createSkyViewBasis(180,120,0)!,verticalFovDeg:5},400,800),false);
  const below=registerSkyArtwork([
    {uv:[0,0],direction:unit([-.1,1,-1])},{uv:[1,0],direction:unit([.1,1,-1])},{uv:[0,1],direction:unit([-.1,1,-1.2])},
  ])!;
  assert.equal(artworkIntersectsView(below,{basis:createSkyViewBasis(0,40,0)!,verticalFovDeg:20},400,800),true);
  assert.equal(artworkIntersectsView(below,{basis:createSkyViewBasis(180,40,0)!,verticalFovDeg:20},400,800),false);
});
