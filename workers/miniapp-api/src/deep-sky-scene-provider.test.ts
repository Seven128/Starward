import assert from "node:assert/strict";
import test from "node:test";
import { buildDeepSkyScene, deepSkySceneCacheKey } from "./deep-sky-scene-provider.ts";

test("exact image planes retain all 51 identities across the horizon without millidegree rounding",()=>{
  const scene=buildDeepSkyScene(["2026-09-20T13:00:00Z","2026-09-21T01:00:00Z"],{
    wgs84:{latitude:22.6,longitude:114.5,system:"WGS84"},altitudeM:30,
  });
  assert.equal(scene.state,"AVAILABLE");assert.equal(scene.catalog?.imageRegistration,"ICRS_TAN_NORTH_0_1_V1");
  assert.match(deepSkySceneCacheKey(),/@1\.0\.1\+/);
  for(const frame of scene.frames){
    assert.equal(frame.points?.length,51);
    assert.ok(frame.points?.some(p=>p[2]<0));assert.ok(frame.points?.some(p=>p[2]>0));
    assert.ok(frame.points?.some(p=>Math.abs(p[1]*1000-Math.round(p[1]*1000))>.01));
  }
});
