import assert from "node:assert/strict";
import test from "node:test";
import { clampSkyFieldOfView, deepSkyImageLevelForFov, pinchFieldOfView, skyDomeFieldOfView } from "./sky-zoom.ts";
import { projectSkyDirection, createSkyViewBasis } from "./sky-view-projection.ts";

test("pinch doubles projected separation and can reach the full dome without a perspective singularity", () => {
  const next=pinchFieldOfView(45,100,200,390,780);
  const basis=createSkyViewBasis(0,90,0)!;
  const a=projectSkyDirection(2,0,basis,390,780,45)!;
  const b=projectSkyDirection(2,0,basis,390,780,next)!;
  assert.ok(Math.abs((b.x-195)/(a.x-195)-2)<1e-9);
  assert.equal(pinchFieldOfView(3,100,300,390,780),1.5);
  assert.equal(pinchFieldOfView(45,100,0.1,390,780),skyDomeFieldOfView(390,780));
  assert.ok(skyDomeFieldOfView(390,780)>180);
  assert.equal(clampSkyFieldOfView(Number.NaN,390,780),45);
  assert.equal(pinchFieldOfView(next,200,100,390,780),45);
});

test("progressive survey levels are deterministic", () => {
  assert.equal(deepSkyImageLevelForFov(16), null);
  assert.equal(deepSkyImageLevelForFov(10), "OVERVIEW");
  assert.equal(deepSkyImageLevelForFov(5), "MEDIUM");
  assert.equal(deepSkyImageLevelForFov(2), "DETAIL");
});
