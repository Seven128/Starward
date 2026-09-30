import assert from "node:assert/strict";
import test from "node:test";
import { vec2PixNest } from "healpix-ts";
import { OBSERVATION_FRAME_FORMAT, type SkyObservationFrame } from "@starward/miniapp-contracts";
import { createSkyViewBasis } from "./sky-view-projection";
import { selectSkyHipsTiles } from "./sky-hips-tile-selection";

const frame:SkyObservationFrame={format:OBSERVATION_FRAME_FORMAT,at:"2026-09-23T00:00:00.000Z",
  observer:{latitude:22.54,longitude:113.95,elevationM:50},
  equatorialToEnu:[1,0,0,0,1,0,0,0,1]};
const basis=createSkyViewBasis(0,100,0)!;

test("bounded inclusive HiPS selection retains the actual camera center across zoom",()=>{
  for(const fov of [45,10,2,.25]){
    const selected=selectSkyHipsTiles({frame,view:{basis,verticalFovDeg:fov},width:427,height:920,maxOrder:11});
    assert.equal(selected.state,"SELECTED",`FOV ${fov}`);
    if(selected.state!=="SELECTED")continue;
    assert.ok(selected.order>=1&&selected.order<=11);
    assert.ok(selected.pixels.length>0&&selected.pixels.length<=12);
    assert.ok(selected.pixels.includes(vec2PixNest(2**selected.order,[...basis.forward])));
  }
});

test("too-wide sky and invalid observer rotation never cause an unbounded tile query",()=>{
  assert.equal(selectSkyHipsTiles({frame,view:{basis,verticalFovDeg:188},width:427,height:920,maxOrder:11}).state,"ZOOM_IN");
  const base=selectSkyHipsTiles({frame,view:{basis,verticalFovDeg:267.8},width:427,height:920,maxOrder:0,minOrder:0});
  assert.deepEqual(base,{state:"SELECTED",order:0,pixels:[0,1,2,3,4,5,6,7,8,9,10,11]},
    "the explicit order-0 publication bounds a complete sky to twelve tiles");
  assert.equal(selectSkyHipsTiles({frame:{...frame,equatorialToEnu:[-1,0,0,0,1,0,0,0,1]},
    view:{basis,verticalFovDeg:2},width:427,height:920,maxOrder:11}).state,"INVALID_VIEW");
});
