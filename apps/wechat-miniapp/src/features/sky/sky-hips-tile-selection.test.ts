import assert from "node:assert/strict";
import test from "node:test";
import { vec2PixNest } from "healpix-ts";
import { OBSERVATION_FRAME_FORMAT, type SkyObservationFrame } from "@starward/miniapp-contracts";
import { createSkyViewBasis, unprojectSkyPoint } from "./sky-view-projection";
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

test("complete M8 portrait detail uses available rendered cells within the original image budget",()=>{
  // Actual 2.4-degree M8 trial, expressed in the identity report frame.
  // Its order-6 circular cap has 18 cells, but only 10 can paint the viewport.
  const camera={
    right:[-.6137528319694121,-.33410370924930893,.7153196297567822],
    up:[.7893621935687345,-.24286703214856853,.5638465501000267],
    forward:[.014655668319202675,-.9107086889676632,-.41278916558567535],
  } as const;
  const view={basis:camera,verticalFovDeg:2.4},width=390,height=844;
  const selected=selectSkyHipsTiles({frame,view,width,height,maxOrder:8});
  assert.equal(selected.state,"SELECTED");
  if(selected.state!=="SELECTED")return;
  assert.equal(selected.order,6,"empty conservative cap neighbours must not force the complete target to order 5");
  assert.ok(selected.pixels.length<=12,"detail must keep the existing decoded-image limit");
  for(let y=0;y<=32;y++)for(let x=0;x<=16;x++){
    const direction=unprojectSkyPoint(x*width/16,y*height/32,camera,width,height,2.4)!;
    assert.ok(selected.pixels.includes(vec2PixNest(2**selected.order,[...direction])),
      `actual viewport direction ${x},${y} must retain its source cell`);
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
