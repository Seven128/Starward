import test from "node:test";
import assert from "node:assert/strict";
import { constellationVisibility,artworkIntersectsView } from "./sky-constellation-visibility.ts";
import { registerSkyArtwork } from "./sky-artwork-registration.ts";
import { createSkyViewBasis,type SkyVector } from "./sky-view-projection.ts";

test("zoom visibility is continuous, hidden at default/dome and respects off intent",()=>{
  for(const fov of [45,90,180,270])assert.equal(constellationVisibility(fov,true),0);
  assert.equal(constellationVisibility(25,true),1);
  assert.ok(constellationVisibility(32,true)>0&&constellationVisibility(32,true)<1);
  for(const fov of [1.5,25,32,45])assert.equal(constellationVisibility(fov,false),0);
  assert.ok(constellationVisibility(39.999,true)<1e-6);
});
test("entire image bounds remain eligible with offscreen anchors; opposite sky and below horizon are culled",()=>{
  const unit=(v:SkyVector)=>v.map(n=>n/Math.hypot(...v)) as unknown as SkyVector;
  const registration=registerSkyArtwork([
    {uv:[0,0],direction:unit([-1,1,1])},{uv:[1,0],direction:unit([1,1,1])},{uv:[0,1],direction:unit([-1,1,.1])},
  ])!;
  assert.ok(artworkIntersectsView(registration,{basis:createSkyViewBasis(0,120,0)!,verticalFovDeg:5,center:{x:100,y:250}},400,800));
  assert.equal(artworkIntersectsView(registration,{basis:createSkyViewBasis(180,120,0)!,verticalFovDeg:5},400,800),false);
  const below=registerSkyArtwork([
    {uv:[0,0],direction:unit([-.1,1,-1])},{uv:[1,0],direction:unit([.1,1,-1])},{uv:[0,1],direction:unit([-.1,1,-1.2])},
  ])!;
  assert.equal(artworkIntersectsView(below,{basis:createSkyViewBasis(0,40,0)!,verticalFovDeg:20},400,800),false);
});
