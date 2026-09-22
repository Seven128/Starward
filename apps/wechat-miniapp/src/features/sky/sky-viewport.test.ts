import assert from "node:assert/strict";
import test from "node:test";
import { skyInsetsFromControls, skyVisibleViewport, skyViewportCenter } from "./sky-viewport";
import { skyDomeFieldOfView, skyDomeProgress, remapSkyFieldOfView, pinchFieldOfView } from "./sky-zoom";
import { createSkyViewBasis, projectSkyDirection, unprojectSkyPoint } from "./sky-view-projection";
import { captureSkyDomeTarget } from "./sky-browsing-camera";
import { dragSkyView } from "./sky-manual-view";

test("horizon fits the actual unobscured region on tall, square, landscape and large-text layouts",()=>{
  for(const [width,height,top,bottom] of [[390,844,100,205],[600,600,100,220],[844,390,95,190],[320,720,116,270],[768,1024,136,290]]){
    const insets={top:top!,bottom:bottom!},w=width!,h=height!;
    const fov=skyDomeFieldOfView(w,h,insets), center=skyViewportCenter(w,h,1,insets);
    const basis=captureSkyDomeTarget(createSkyViewBasis(137,90,35)!);
    const radius=skyVisibleViewport(w,h,insets)!.shortSide*.46;
    for(let az=0;az<360;az++){
      const p=projectSkyDirection(az,0,basis,w,h,fov,center)!;
      assert.ok(p&&p.x>=0&&p.x<=w&&p.y>=top!&&p.y<=h-bottom!,"horizon must not be behind either controls region");
      assert.ok(Math.abs(Math.hypot(p.x-center.x,p.y-center.y)-radius)<1e-7);
    }
    const zenith=projectSkyDirection(0,90,basis,w,h,fov,center)!;
    assert.ok(Math.abs(zenith.y-(top!+(h-top!-bottom!)/2))<1e-7);
  }
});

test("normal view retains full-screen center and wider view shifts continuously",()=>{
  const insets={top:92,bottom:280};
  assert.deepEqual(skyViewportCenter(390,844,0,insets),{x:195,y:422});
  let previous=422;
  for(let i=1;i<=1000;i++){
    const next=skyViewportCenter(390,844,i/1000,insets).y;
    assert.ok(Math.abs(next-previous)<.15);assert.ok(next<=previous);previous=next;
  }
});

test("native screen rectangles are converted to canvas-local insets without DPR multiplication",()=>{
  const canvas={top:30,bottom:830,height:800};
  const top=[{top:65,bottom:109,height:44},{top:120,bottom:200,height:80},{top:500,bottom:500,height:0}];
  const bottom={top:620,bottom:830,height:210};
  assert.deepEqual(skyInsetsFromControls(canvas,top,bottom),{top:178,bottom:218});
  assert.equal(skyVisibleViewport(800,300,{top:100,bottom:250}),null,"overlapping controls have no valid overview viewport");
});

test("resizing or expanding controls preserves dome progress and does not reset local magnification",()=>{
  const previous={width:390,height:844,insets:{top:92,bottom:205}};
  const next={width:844,height:390,insets:{top:92,bottom:190}};
  for(const progress of [.1,.5,1]){
    const old=45+progress*(skyDomeFieldOfView(previous.width,previous.height,previous.insets)-45);
    const resized=remapSkyFieldOfView(old,previous,next);
    assert.ok(Math.abs(skyDomeProgress(resized,next.width,next.height,next.insets)-progress)<1e-12);
  }
  assert.equal(remapSkyFieldOfView(6,previous,next),6);
  assert.equal(pinchFieldOfView(45,200,.1,next.width,next.height,next.insets),skyDomeFieldOfView(next.width,next.height,next.insets));
});

test("dragging uses the same shifted projection center as the painted ray",()=>{
  const w=600,h=600,insets={top:100,bottom:240};
  const fov=skyDomeFieldOfView(w,h,insets)*.8, center=skyViewportCenter(w,h,skyDomeProgress(fov,w,h,insets),insets);
  const basis=captureSkyDomeTarget(createSkyViewBasis(55,90,20)!);
  const start={x:310,y:190},end={x:365,y:265};
  const ray=unprojectSkyPoint(start.x,start.y,basis,w,h,fov,center)!;
  const azimuth=Math.atan2(ray[0],ray[1])*180/Math.PI, altitude=Math.asin(ray[2])*180/Math.PI;
  const dragged=dragSkyView(basis,start,end,w,h,fov,center);
  const p=projectSkyDirection(azimuth,altitude,dragged,w,h,fov,center)!;
  assert.ok(Math.hypot(p.x-end.x,p.y-end.y)<1e-7,"originally grabbed direction must land at the finger");
});
