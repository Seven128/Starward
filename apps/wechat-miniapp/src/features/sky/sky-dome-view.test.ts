import assert from "node:assert/strict";
import test from "node:test";
import { createSkyBrowsingCamera } from "./sky-browsing-camera.ts";
import { skyDomeFieldOfView, skyDomeProgress } from "./sky-zoom.ts";
import { createSkyViewBasis, projectSkyDirection, unprojectSkyPoint, type SkyViewBasis } from "./sky-view-projection.ts";

function overviewView(basis:SkyViewBasis,fov:number,width:number,height:number){
  const camera=createSkyBrowsingCamera();
  camera.update({localView:basis,intent:"follow",progress:0,at:0});
  return camera.update({localView:basis,intent:"follow",progress:skyDomeProgress(fov,width,height),at:16}).view!;
}

test("full dome faces zenith and every horizon azimuth fits an inset circle on portrait, square and landscape",()=>{
  for(const [width,height] of [[320,720],[430,932],[768,1024],[800,400],[600,600]]){
    const fov=skyDomeFieldOfView(width!,height!);
    for(const raw of [createSkyViewBasis(37,90,30)!,createSkyViewBasis(280,0,0)!]){
      const original=structuredClone(raw);
      const view=overviewView(raw,fov,width!,height!);
      assert.ok(Math.abs(view.forward[2]-1)<1e-9);
      assert.deepEqual(raw,original,"automatic overview never writes sensor pose");
      assert.deepEqual(overviewView(view,fov,width!,height!),view,"an already zenith-facing camera retains its circle orientation");
      for(let az=0;az<360;az+=5){
        const p=projectSkyDirection(az,0,view,width!,height!,fov);
        assert.ok(p,"every horizon direction must be on-screen");
        assert.ok(Math.abs(Math.hypot(p.x-width!/2,p.y-height!/2)-Math.min(width!,height!)*.46)<1e-7);
      }
      const center=projectSkyDirection(0,90,view,width!,height!,fov)!;
      assert.ok(Math.abs(center.x-width!/2)<1e-7&&Math.abs(center.y-height!/2)<1e-7);
      assert.equal(overviewView(raw,45,width!,height!),raw,"normal phone view uses actual pose");
    }
  }
});

test("widening is continuous and monotonically approaches zenith without changing handedness",()=>{
  const basis=createSkyViewBasis(127,75,35)!;
  const maximum=skyDomeFieldOfView(390,844);let previous=basis;
  for(let fov=45;fov<=maximum;fov+=.1){
    const view=overviewView(basis,fov,390,844);
    assert.ok(view.forward[2]>=previous.forward[2]-1e-10);
    assert.ok(Math.hypot(...view.forward.map((n,i)=>n-previous.forward[i]!))<.006);
    const result=projectSkyDirection(0,90,view,390,844,fov);
    if(result)assert.ok(unprojectSkyPoint(result.x,result.y,view,390,844,fov)![2]>.999999999);
    previous=view;
  }
});

test("inverse camera covers the rear hemisphere of a wide window, retaining actual directions",()=>{
  const view:SkyViewBasis={right:[1,0,0],up:[0,0,1],forward:[0,1,0]};
  for(const az of [0,30,90,120]){
    const p=projectSkyDirection(az,10,view,900,600,240)!;
    assert.ok(p);
    const ray=unprojectSkyPoint(p.x,p.y,view,900,600,240)!;
    assert.ok(Math.abs(ray[2]-Math.sin(Math.PI/18))<1e-9);
    assert.ok(Math.abs(Math.atan2(ray[0],ray[1])*180/Math.PI-az)<1e-8);
  }
});
