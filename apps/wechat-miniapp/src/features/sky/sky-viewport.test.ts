import assert from "node:assert/strict";
import test from "node:test";
import { skyInsetsFromControls, skyVisibleViewport, skyProjectionViewport, skyViewportCenter } from "./sky-viewport";
import { skyDomeFieldOfView, skyDomeProgress, remapSkyFieldOfView, pinchFieldOfView } from "./sky-zoom";
import { createSkyViewBasis, projectSkyDirection, unprojectSkyPoint } from "./sky-view-projection";
import { captureSkyDomeTarget } from "./sky-browsing-camera";
import { dragSkyView } from "./sky-manual-view";

test("horizon fits the stable canvas across supported aspect ratios",()=>{
  for(const [width,height] of [[390,844],[600,600],[844,390],[320,720],[768,1024]]){
    const w=width!,h=height!;
    const fov=skyDomeFieldOfView(w,h), center=skyViewportCenter(w,h);
    const basis=captureSkyDomeTarget(createSkyViewBasis(137,90,35)!);
    const radius=skyProjectionViewport(w,h)!.shortSide*.46;
    for(let az=0;az<360;az++){
      const p=projectSkyDirection(az,0,basis,w,h,fov,center)!;
      assert.ok(p&&p.x>=0&&p.x<=w&&p.y>=0&&p.y<=h,"horizon must fit the canvas independently of overlay height");
      assert.ok(Math.abs(Math.hypot(p.x-center.x,p.y-center.y)-radius)<1e-7);
    }
    const zenith=projectSkyDirection(0,90,basis,w,h,fov,center)!;
    assert.ok(Math.abs(zenith.y-h/2)<1e-7);
  }
});

test("overlay occlusion changes do not change projection bounds",()=>{
  const closed={top:92,bottom:168},opened={top:92,bottom:500};
  assert.notDeepEqual(skyVisibleViewport(390,844,closed),skyVisibleViewport(390,844,opened),"input and label clearance still changes");
  assert.deepEqual(skyProjectionViewport(390,844),{width:390,height:844,center:{x:195,y:422},shortSide:390});
  assert.deepEqual(skyViewportCenter(390,844),{x:195,y:422});
});

test("native screen rectangles are converted to canvas-local insets without DPR multiplication",()=>{
  const canvas={top:30,bottom:830,height:800};
  const top=[{top:65,bottom:109,height:44},{top:120,bottom:200,height:80},{top:500,bottom:500,height:0}];
  const bottom={top:620,bottom:830,height:210};
  assert.deepEqual(skyInsetsFromControls(canvas,top,bottom),{top:178,bottom:218});
  assert.equal(skyVisibleViewport(800,300,{top:100,bottom:250}),null,"overlapping controls leave no sky input region");
  assert.ok(skyProjectionViewport(800,300),"covering all input does not destroy independent sky projection");
});

test("actual canvas resizing preserves dome progress and does not reset local magnification",()=>{
  const previous={width:390,height:844};
  const next={width:844,height:390};
  for(const progress of [.1,.5,1]){
    const old=45+progress*(skyDomeFieldOfView(previous.width,previous.height)-45);
    const resized=remapSkyFieldOfView(old,previous,next);
    assert.ok(Math.abs(skyDomeProgress(resized,next.width,next.height)-progress)<1e-12);
  }
  assert.equal(remapSkyFieldOfView(6,previous,next),6);
  assert.equal(pinchFieldOfView(45,200,.1,next.width,next.height),skyDomeFieldOfView(next.width,next.height));
});

test("dragging uses the same stable projection center as the painted ray",()=>{
  const w=600,h=600;
  const fov=skyDomeFieldOfView(w,h)*.8, center=skyViewportCenter(w,h);
  const basis=captureSkyDomeTarget(createSkyViewBasis(55,90,20)!);
  const start={x:310,y:190},end={x:365,y:265};
  const ray=unprojectSkyPoint(start.x,start.y,basis,w,h,fov,center)!;
  const azimuth=Math.atan2(ray[0],ray[1])*180/Math.PI, altitude=Math.asin(ray[2])*180/Math.PI;
  const dragged=dragSkyView(basis,start,end,w,h,fov,center);
  const p=projectSkyDirection(azimuth,altitude,dragged,w,h,fov,center)!;
  assert.ok(Math.hypot(p.x-end.x,p.y-end.y)<1e-7,"originally grabbed direction must land at the finger");
});
