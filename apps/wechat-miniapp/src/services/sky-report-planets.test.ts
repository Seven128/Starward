import assert from "node:assert/strict";
import test from "node:test";
import {SKY_PLANET_ORDER} from "@starward/miniapp-contracts";
import {projectSkyPlanetGeometry} from "./sky-report-planets";

test("corrupt optional textured-body axes lose appearance detail without losing seven positions",()=>{
  const planets=SKY_PLANET_ORDER.map(body=>({body,azimuthDeg:15,altitudeDeg:25,
    angularDiameterDeg:.01,illuminatedFraction:.8,visualMagnitude:1,
    ringTiltDeg:body==="SATURN"?5:null,ringPoleEnu:body==="SATURN"?[0,0,1]:null,
    ...(body==="MARS"||body==="MERCURY"||body==="JUPITER"||body==="URANUS"||body==="NEPTUNE"
      ?{bodyFrame:{primeMeridianEnu:[0,0,0],poleEnu:[0,0,1]}}:{})}));
  const envelope={dataState:"FRESH",warnings:[],data:{hourly:[{at:"2026-09-22T13:00:00Z",planets}],
    offlineReady:true,precachedHours:1}} as any;
  const projected=projectSkyPlanetGeometry(envelope);
  assert.equal(projected.dataState,"PARTIAL");
  assert.equal(projected.data.hourly[0]!.planets?.length,7);
  assert.equal(projected.data.hourly[0]!.planets?.[2]!.bodyFrame,null);
  assert.equal(projected.data.hourly[0]!.planets?.[0]!.bodyFrame,null);
  assert.equal(projected.data.hourly[0]!.planets?.[3]!.bodyFrame,null);
  assert.equal(projected.data.hourly[0]!.planets?.[5]!.bodyFrame,null);
  assert.equal(projected.data.hourly[0]!.planets?.[6]!.bodyFrame,null);
  assert.equal(projected.data.hourly[0]!.planets?.[2]!.azimuthDeg,15);
  assert.equal(projected.data.offlineReady,false);
});

test("a valid position with unavailable Saturn rings stays usable but never reports a complete frame",()=>{
  const planets=SKY_PLANET_ORDER.map(body=>({body,azimuthDeg:15,altitudeDeg:25,
    angularDiameterDeg:.01,illuminatedFraction:.8,visualMagnitude:1,
    ringTiltDeg:null,ringPoleEnu:null}));
  const envelope={dataState:"FRESH",warnings:[],data:{hourly:[{at:"2026-09-22T13:00:00Z",planets}],
    offlineReady:true,precachedHours:1}} as any;
  const projected=projectSkyPlanetGeometry(envelope);
  assert.equal(projected.dataState,"PARTIAL");
  assert.strictEqual(projected.data.hourly[0]!.planets,envelope.data.hourly[0]!.planets);
  assert.equal(projected.data.offlineReady,false);
});

test("missing Saturn ring orientation removes only the optional rings and retains all planet positions",()=>{
  const planets=SKY_PLANET_ORDER.map(body=>({body,azimuthDeg:15,altitudeDeg:25,
    angularDiameterDeg:.01,illuminatedFraction:.8,visualMagnitude:1,
    ringTiltDeg:body==="SATURN"?5:null,ringPoleEnu:body==="SATURN"?[0,0,0]:null}));
  const envelope={dataState:"FRESH",warnings:[],data:{hourly:[{at:"2026-09-22T13:00:00Z",planets}],
    offlineReady:true,precachedHours:1}} as any;
  const projected=projectSkyPlanetGeometry(envelope);
  assert.equal(projected.dataState,"PARTIAL");
  assert.equal(projected.data.hourly[0]!.planets?.length,7);
  assert.equal(projected.data.hourly[0]!.planets?.[4]!.body,"SATURN");
  assert.equal(projected.data.hourly[0]!.planets?.[4]!.azimuthDeg,15);
  assert.equal(projected.data.hourly[0]!.planets?.[4]!.ringTiltDeg,null);
  assert.equal(projected.data.hourly[0]!.planets?.[4]!.ringPoleEnu,null);
  assert.equal(projected.data.offlineReady,false);
});

test("damaged optional Saturn sunlight withdraws only ring-shadow input and a fresh row restores it",()=>{
  const planets=SKY_PLANET_ORDER.map(body=>({body,azimuthDeg:15,altitudeDeg:25,
    angularDiameterDeg:.01,illuminatedFraction:.8,visualMagnitude:1,
    ringTiltDeg:body==="SATURN"?5:null,ringPoleEnu:body==="SATURN"?[0,0,1]:null,
    ringSunEnu:body==="SATURN"?[1,0,0]:null}));
  const envelope=(items:unknown[])=>({dataState:"FRESH",warnings:[],
    data:{hourly:[{at:"2026-09-22T13:00:00Z",planets:items}],offlineReady:true,precachedHours:1}}) as any;
  const damaged=planets.map(p=>p.body==="SATURN"?{...p,ringSunEnu:[NaN,0,0]}:p);
  const degraded=projectSkyPlanetGeometry(envelope(damaged));
  const saturn=degraded.data.hourly[0]!.planets?.[4]!;
  assert.equal(degraded.dataState,"PARTIAL");
  assert.equal(degraded.data.hourly[0]!.planets?.length,7);
  assert.deepEqual(saturn.ringPoleEnu,[0,0,1]);
  assert.equal(saturn.ringTiltDeg,5);
  assert.equal(saturn.ringSunEnu,null);
  assert.equal(projectSkyPlanetGeometry(envelope(planets)).data.hourly[0]!.planets?.[4]!.ringSunEnu?.[0],1);
});
