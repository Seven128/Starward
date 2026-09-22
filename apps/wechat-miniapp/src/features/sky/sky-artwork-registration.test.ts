import assert from "node:assert/strict";
import test from "node:test";
import { registerSkyArtwork, skyArtworkUvAtDirection, skyArtworkViewParameters, type SkyArtworkAnchor } from "./sky-artwork-registration.ts";
import { createSkyViewBasis, projectSkyDirectionUnclipped, unprojectSkyPoint, type SkyVector } from "./sky-view-projection.ts";

const unit = (v: SkyVector): SkyVector => v.map(n=>n/Math.hypot(...v)) as unknown as SkyVector;
const anchors: SkyArtworkAnchor[] = [
  {uv:[.1,.2],direction:unit([-.2,.7,.6])},
  {uv:[.9,.3],direction:unit([.3,.6,.7])},
  {uv:[.4,.85],direction:unit([.1,.85,.3])},
];
const close = (a: readonly number[], b: readonly number[]) => a.forEach((v,i)=>assert.ok(Math.abs(v-b[i]!)<1e-8,`${a} != ${b}`));

test("art preserves all three source anchors under roll, offset center and different FOVs",()=>{
  const registration = registerSkyArtwork(anchors)!;
  assert.ok(registration);
  for (const roll of [-70,0,65]) for (const fov of [2,45,150,220]) {
    const basis=createSkyViewBasis(35,125,roll)!;
    for (const a of anchors) {
      const az=Math.atan2(a.direction[0],a.direction[1])*180/Math.PI;
      const alt=Math.asin(a.direction[2])*180/Math.PI;
      const center={x:155,y:255};
      const p=projectSkyDirectionUnclipped(az,alt,basis,390,840,fov,center)!;
      const ray=unprojectSkyPoint(p.x,p.y,basis,390,840,fov,center)!;
      close(skyArtworkUvAtDirection(registration,ray)!,a.uv);
    }
  }
});

test("plane interior, extrapolated corners and reversed rays do not become screen billboards",()=>{
  const r=registerSkyArtwork(anchors)!;
  // A point on the affine image plane has the same weights in UV coordinates.
  for (const weights of [[.2,.3,.5],[-.3,1.1,.2]]) {
    const world=unit([0,1,2].map(i=>weights.reduce((s,w,k)=>s+w*anchors[k]!.direction[i]!,0)) as unknown as SkyVector);
    close(skyArtworkUvAtDirection(r,world)!,[0,1].map(i=>weights.reduce((s,w,k)=>s+w*anchors[k]!.uv[i]!,0)));
    assert.equal(skyArtworkUvAtDirection(r,world.map(v=>-v) as unknown as SkyVector),null);
  }
});

test("invalid or degenerate anchors are unavailable without invented registration",()=>{
  assert.equal(registerSkyArtwork(anchors.slice(0,2)),null);
  assert.equal(registerSkyArtwork([anchors[0]!,anchors[0]!,anchors[2]!]),null);
  assert.equal(registerSkyArtwork(anchors.map(a=>({...a,uv:[.2,.2]}))),null);
  assert.equal(registerSkyArtwork(anchors.map(a=>({...a,direction:[1,1,1]}))),null);
  assert.equal(registerSkyArtwork(anchors.map(a=>({...a,uv:[NaN,.2]}))),null);
});

test("art camera uses actual logical size and offset, not research constants",()=>{
  const basis=createSkyViewBasis(0,90,0)!;
  const p=skyArtworkViewParameters({basis,verticalFovDeg:45,center:{x:137,y:351}},414,896)!;
  close([p.scale,p.center.x,p.center.y],[896/(2*Math.tan(Math.PI/16)),137,351]);
  assert.equal(skyArtworkViewParameters({basis,verticalFovDeg:360},414,896),null);
  assert.equal(skyArtworkViewParameters({basis,verticalFovDeg:45,center:{x:NaN,y:351}},414,896),null);
});
