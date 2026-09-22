import assert from "node:assert/strict";
import test from "node:test";
import { captureSkyDomeTarget, createSkyBrowsingCamera } from "./sky-browsing-camera";
import { createSkyViewBasis, validBasis, type SkyViewBasis } from "./sky-view-projection";
const view = (a: number, b = 90, c = 0) => createSkyViewBasis(a, b, c)!;
const delta = (a: SkyViewBasis, b: SkyViewBasis) => Math.max(...(["right", "up", "forward"] as const)
  .map(axis => Math.hypot(...a[axis].map((n, i) => n - b[axis][i]!))));
function harness(start = view(20)) {
  const camera = createSkyBrowsingCamera(); let now = 0;
  const frame = (progress: number, localView: SkyViewBasis | null = start, intent: "follow" | "manual" | "locked" = "follow", dt = 16) => {
    now += dt; return camera.update({ progress, localView, intent, at: now });
  };
  frame(0);
  return { camera, frame, start };
}

test("captures entry orientation once, retains zenith and ignores subsequent phone rotation across separate pinches", () => {
  const {frame,start}=harness(view(73,110,25));
  frame(.3); const full=frame(1).view!;
  assert.deepEqual(full,captureSkyDomeTarget(start)); assert.ok(validBasis(full));
  for(const current of [view(140),view(245,0,90),view(310,-170,-80)]) {
    assert.equal(frame(1,current).view,full,"full dome does not recapture the moving phone");
  }
  const half=frame(.4,view(10)).view!;
  frame(.8,view(200));
  assert.ok(delta(frame(.4,view(310)).view!,half)<1e-12,"repeated pinches share the same path");
});

test("independent review near-nadir counterexample no longer produces a 180-degree flip", () => {
  const a=harness(view(0,.01,0)); const b=harness(view(0,0,.01));
  assert.ok(delta(a.frame(1).view!,b.frame(1).view!)<.001);
  const frozen=a.frame(1).view!;
  for(let angle=0;angle<=360;angle+=3){
    const r=angle*Math.PI/180;
    assert.equal(a.frame(1,view(0,.01*Math.cos(r),.01*Math.sin(r))).view,frozen);
  }
});

test("each fixed interpolation path is continuous through near-nadir and rolled entry orientations", () => {
  for(const start of [view(0,0,0),view(0,.01,0),view(0,0,.01),view(180,90,90),view(270,-30,-80)]) {
    const {frame}=harness(start); let previous=start;
    for(let i=1;i<=1000;i++){
      const actual=frame(i/1000,view(i%360)).view!;
      assert.ok(validBasis(actual)); assert.ok(delta(actual,previous)<.01); previous=actual;
    }
    assert.deepEqual(previous.forward,[0,0,1]);
  }
});

test("returning from overview starts at the displayed view and ends at the latest aligned pose, not entry pose", () => {
  const {frame,start}=harness(); const overview=frame(1).view!;
  assert.equal(frame(0,view(80)).view,overview,"first return frame must not jump");
  let previous=overview;
  for(let i=1;i<=15;i++) {
    const current=view(80+i); const result=frame(0,current);
    assert.ok(delta(result.view!,previous)<.35); previous=result.view!;
    if(i===15){assert.equal(result.phase,"local");assert.equal(result.view,current);}
  }
  assert.ok(delta(previous,start)>.3);
});

test("return reversal captures the actual intermediate view and cancels the old return", () => {
  const {frame}=harness(); frame(1);frame(0,view(120));
  const midway=frame(0,view(125)).view!;
  const reversed=frame(.0001,view(200));
  assert.equal(reversed.phase,"overview");assert.ok(delta(reversed.view!,midway)<.0001);
  assert.deepEqual(frame(1,view(250)).view,captureSkyDomeTarget(midway));
});

test("manual zoom round trip remains manual and does not adopt incoming phone directions", () => {
  const {frame,start}=harness();frame(.5,view(140),"manual");frame(1,view(240),"manual");
  const result=frame(0,view(300),"manual");
  assert.equal(result.phase,"local");assert.equal(result.view,start);assert.equal(result.animating,false);
});

test("explicit drag cancels recovery, full-dome dragging still keeps zenith, and cancellation restores captured state", () => {
  const {camera,frame}=harness(); const original=frame(1).view!;
  const checkpoint=camera.checkpoint();
  const dragged=camera.pan(view(120,70,30),1);
  assert.deepEqual(dragged.view!.forward,[0,0,1]);assert.ok(validBasis(dragged.view));
  assert.ok(delta(dragged.view!,original)>.1);
  camera.restore(checkpoint);assert.equal(frame(1,view(330)).view,original);
  frame(0);camera.pan(view(90),0);assert.equal(camera.snapshot().phase,"local");
});

test("missing pose and background gaps cannot finish recovery; calibration cancels the browsing transition", () => {
  const {camera,frame}=harness();frame(1);frame(0,view(100));
  const before=frame(0,view(100)).view!;
  camera.suspend();assert.equal(frame(0,view(140),"follow",3000).view,before);
  assert.equal(frame(0,null).view,before);
  const frozen=camera.freeze(before).view;
  for(let i=0;i<30;i++)assert.equal(frame(0,frozen,"locked").view,frozen);
  assert.equal(camera.snapshot().animating,false);
});

test("camera inputs do not mutate the sensor pose and invalid inputs do not fabricate a direction", () => {
  const camera=createSkyBrowsingCamera();
  assert.equal(camera.update({localView:null,intent:"follow",progress:1,at:0}).view,null);
  const source=view(210,12,30), copy=structuredClone(source);
  camera.update({localView:source,intent:"follow",progress:0,at:1});
  camera.update({localView:source,intent:"follow",progress:1,at:2});
  assert.deepEqual(source,copy);
});
