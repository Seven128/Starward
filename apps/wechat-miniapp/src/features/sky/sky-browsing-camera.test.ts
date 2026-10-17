import assert from "node:assert/strict";
import test from "node:test";
import { captureSkyDomeTarget, createSkyBrowsingCamera } from "./sky-browsing-camera";
import { createSkyViewBasis, validBasis, type SkyViewBasis } from "./sky-view-projection";
const view = (a: number, b = 90, c = 0) => createSkyViewBasis(a, b, c)!;
const delta = (a: SkyViewBasis, b: SkyViewBasis) => Math.max(...(["right", "up", "forward"] as const)
  .map(axis => Math.hypot(...a[axis].map((n, i) => n - b[axis][i]!))));

test("object navigation commits only the accepted joint camera and finishes at the target", () => {
  const camera = createSkyBrowsingCamera(), from = view(20), target = view(170);
  assert.ok(camera.navigate(from, target, 95, 4, 390, 844, 0));
  const frame = (at: number) => camera.update({ localView: from, intent: "manual", progress: 0, at });
  const rejected = frame(16), current = frame(32);
  assert.equal(camera.snapshot().view, from, "sampling is not an actual displayed frame");
  assert.equal(camera.accept(rejected), false, "a superseded paint cannot advance the camera");
  assert.equal(camera.accept(current), true);
  assert.equal(camera.snapshot().view, current.view);
  assert.equal(camera.snapshot().verticalFovDeg, current.verticalFovDeg);
  let last = current;
  for (let at = 48; at <= 2000 && camera.snapshot().navigation; at += 16) {
    last = frame(at); assert.ok(camera.accept(last));
  }
  assert.equal(camera.snapshot().navigation, false); assert.equal(last.verticalFovDeg, 4);
  assert.ok(Math.hypot(...last.view!.forward.map((n, i) => n - target.forward[i]!)) < 1e-10);
});

test("retargeting, gestures, locks and retirement cannot revive a superseded navigation", () => {
  for (const action of ["retarget", "suspend", "pan", "freeze", "restore", "lock"] as const) {
    const camera = createSkyBrowsingCamera(), start = view(20);
    const checkpoint = camera.checkpoint();
    camera.navigate(start, view(170), .05, 45, 390, 844, 0);
    const accepted = camera.update({ localView: start, intent: "manual", progress: 0, at: 32 });
    camera.accept(accepted);
    const obsolete = camera.update({ localView: start, intent: "manual", progress: 0, at: 48 });
    if (action === "retarget") {
      camera.navigate(accepted.view!, view(300), accepted.verticalFovDeg!, 4, 390, 844, 48);
      const first = camera.update({ localView: start, intent: "manual", progress: 0, at: 48 });
      assert.equal(first.view, accepted.view); assert.equal(first.verticalFovDeg, accepted.verticalFovDeg);
    } else if (action === "suspend") camera.suspend();
    else if (action === "pan") camera.pan(accepted.view!, 0);
    else if (action === "freeze") camera.freeze(accepted.view);
    else if (action === "restore") camera.restore(checkpoint);
    else camera.update({ localView: start, intent: "locked", progress: 0, at: 48 });
    assert.equal(camera.accept(obsolete), false, action);
    if (action !== "retarget") assert.equal(camera.snapshot().navigation, false, action);
  }
});

test("navigation ignores background and reversed clock gaps and retains the existing reduced-motion result", () => {
  const camera = createSkyBrowsingCamera(), from = view(20), target = view(170);
  camera.navigate(from, target, 45, 4, 390, 844, 100);
  for (const at of [90, 3000]) {
    const frame = camera.update({ localView: from, intent: "manual", progress: 0, at });
    assert.equal(frame.view, from); camera.accept(frame);
  }
  const final = camera.update({ localView: from, intent: "manual", progress: 0, at: 3016, reducedMotion: true });
  assert.equal(final.animating, false); assert.equal(final.verticalFovDeg, 4);
  camera.accept(final); assert.equal(camera.snapshot().navigation, false);
  assert.ok(Math.hypot(...final.view!.forward.map((n, i) => n - target.forward[i]!)) < 1e-10);
});
function harness(start = view(20)) {
  const camera = createSkyBrowsingCamera(); let now = 0;
  const frame = (progress: number, localView: SkyViewBasis | null = start, intent: "follow" | "track" | "manual" | "locked" = "follow", dt = 16) => {
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

test("object tracking holds overview entry heading and returns to the newest time-dependent target", () => {
  const { camera, frame, start } = harness(view(73, 120));
  const overview = frame(1, start, "track").view!;
  for (const target of [view(80, 110), view(100, 80), view(130, 70)])
    assert.equal(frame(1, target, "track").view, overview);
  assert.equal(frame(0, view(130, 70), "track").view, overview);
  for (let i = 1; i <= 15; i++) frame(0, view(130 + i, 70), "track");
  assert.equal(camera.snapshot().phase, "local");
  assert.ok(delta(camera.snapshot().view!, view(145, 70)) < 1e-12);
  assert.ok(delta(camera.snapshot().view!, start) > .3);
  const dragged = view(210, 60);
  camera.pan(dragged, 0);
  assert.equal(frame(0, dragged, "manual").view, dragged, "ending tracking keeps explicit manual direction");
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

test("explicit full-dome drag reaches the lower sphere, zoom preserves it, and cancellation restores captured entry", () => {
  const {camera,frame}=harness(); const original=frame(1).view!;
  const checkpoint=camera.checkpoint();
  const requested=view(120,45,30);
  const dragged=camera.pan(requested,1);
  assert.ok(delta(dragged.view!,requested)<1e-12);assert.ok(validBasis(dragged.view));
  assert.ok(delta(frame(1,view(330),"manual").view!,requested)<1e-12);
  assert.ok(delta(frame(.5,view(330),"manual").view!,requested)<1e-12);
  assert.ok(delta(frame(0,view(330),"manual").view!,requested)<1e-12);
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
