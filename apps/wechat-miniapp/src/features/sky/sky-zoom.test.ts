import assert from "node:assert/strict";
import test from "node:test";
import { clampSkyFieldOfView, deepSkyImageLevelForFov, pinchFieldOfView, skyDomeFieldOfView, skyDomeProgress, SKY_MIN_VERTICAL_FOV_DEG } from "./sky-zoom.ts";
import { projectSkyAngularDisc } from "./sky-phase-disc.ts";
import { projectSkyDirection, createSkyViewBasis } from "./sky-view-projection.ts";
import { SATURN_EQUATORIAL_RADIUS_KM, SATURN_REFERENCE_RADIUS_KM } from "./sky-saturn-rings.ts";

test("pinch doubles projected separation and can reach the full dome without a perspective singularity", () => {
  const next=pinchFieldOfView(45,100,200,390,780);
  const basis=createSkyViewBasis(0,90,0)!;
  const a=projectSkyDirection(2,0,basis,390,780,45)!;
  const b=projectSkyDirection(2,0,basis,390,780,next)!;
  assert.ok(Math.abs((b.x-195)/(a.x-195)-2)<1e-9);
  assert.ok(pinchFieldOfView(3,100,300,390,780)<1.5);
  assert.equal(pinchFieldOfView(0.18,100,500,390,780),SKY_MIN_VERTICAL_FOV_DEG);
  assert.ok(pinchFieldOfView(SKY_MIN_VERTICAL_FOV_DEG,200,20,390,780)>SKY_MIN_VERTICAL_FOV_DEG*9,
    "a user can zoom back out from the optical-scale floor");
  assert.equal(pinchFieldOfView(45,100,0.1,390,780),skyDomeFieldOfView(390,780));
  assert.ok(skyDomeFieldOfView(390,780)>180);
  assert.equal(clampSkyFieldOfView(Number.NaN,390,780),45);
  assert.equal(pinchFieldOfView(next,200,100,390,780),45);
});

test("a reverse pinch reaches the local boundary despite floating point roundoff", () => {
  const wider = pinchFieldOfView(45, 270, 50, 390.4, 844);
  const returned = pinchFieldOfView(wider, 50, 270, 390.4, 844);
  assert.equal(returned, 45, "a mathematical round trip must not strand the camera in overview");
  assert.equal(skyDomeProgress(45 + 1e-12, 390.4, 844), 0);
  assert.ok(skyDomeProgress(45.001, 390.4, 844) > 0, "meaningful widening is preserved");
});

test("progressive survey levels are deterministic", () => {
  assert.equal(deepSkyImageLevelForFov(16), null);
  assert.equal(deepSkyImageLevelForFov(10), "OVERVIEW");
  assert.equal(deepSkyImageLevelForFov(5), "MEDIUM");
  assert.equal(deepSkyImageLevelForFov(2), "DETAIL");
});

test("the selectable local zoom can resolve the published Mars globe without lowering texture quality",()=>{
  // Largest above-horizon Mars diameter in the frozen 2026-09-16..10-08
  // Shenzhen report probe, in arcseconds; this is not a claim about all dates.
  const angularDiameterDeg=5.788404/3600;
  const camera=createSkyViewBasis(0,95,0)!;
  const atFloor=projectSkyAngularDisc({azimuthDeg:0,altitudeDeg:5,angularDiameterDeg},
    camera,390,780,clampSkyFieldOfView(0.15,390,780));
  assert.ok(atFloor&&atFloor.radiusPx>=4,
    "a visible Mars in the selectable window must reach the existing texture threshold at max zoom");
  const before=projectSkyAngularDisc({azimuthDeg:0,altitudeDeg:5,angularDiameterDeg},
    camera,390,780,.25)!;
  assert.ok(before.radiusPx<4,"the 0.25-degree trial cannot request the same map");
});

test("a visible Mercury in the selectable twilight window reaches the fixed-map threshold",()=>{
  // Current Shenzhen 2026-10-08 18:00 local exact-frame diameter is 6.293484″.
  const angularDiameterDeg=6.293484/3600;
  const camera=createSkyViewBasis(0,105,0)!;
  const disc=projectSkyAngularDisc({azimuthDeg:0,altitudeDeg:15,
    angularDiameterDeg},camera,390,780,clampSkyFieldOfView(.15,390,780));
  assert.ok(disc&&disc.radiusPx>=4);
});

test("maximum local zoom makes the observed Saturn globe large enough to inspect", () => {
  // The phone preview at 0.18° left the globe too small to separate cloud bands
  // from basic shading. This is the same report diameter and logical canvas
  // height as that observation, rather than a universal Saturn size claim.
  const camera = createSkyViewBasis(0, 90, 0)!;
  const disc = projectSkyAngularDisc({
    azimuthDeg: 0, altitudeDeg: 0, angularDiameterDeg: 0.00527544,
  }, camera, 390, 762, clampSkyFieldOfView(0, 390, 762));
  assert.ok(disc, "the centered globe remains on the canvas");
  const equatorialRadiusPx = disc.radiusPx * SATURN_EQUATORIAL_RADIUS_KM / SATURN_REFERENCE_RADIUS_KM;
  assert.ok(equatorialRadiusPx >= 40,
    `the phone's maximum zoom should show an inspectable Saturn globe, got ${equatorialRadiusPx.toFixed(1)} px`);
});
