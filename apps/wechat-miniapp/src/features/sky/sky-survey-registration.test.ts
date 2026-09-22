import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { positionDeepSkyCatalog } from "@starward/astronomy-core/deep-sky-catalog";
import { EquatorFromVector, Horizon, Observer, RotateVector, Rotation_EQJ_EQD, Spherical, VectorFromSphere } from "../../../../../packages/astronomy-core/src/astronomy-engine-runtime.ts";
import type { DeepSkyScenePoint } from "@starward/miniapp-contracts";
import { registerSkySurvey } from "./sky-survey-registration.ts";
import { skyArtworkUvAtDirection } from "./sky-artwork-registration.ts";
import type { SkyVector } from "./sky-view-projection.ts";

const fixture=JSON.parse(readFileSync(new URL("./sky-survey-wcs.fixture.json",import.meta.url),"utf8")) as {
  rows:{uv:[number,number];raDeg:number;decDeg:number}[];
};
const rad=Math.PI/180;
test("actual M31 FITS WCS pixels remain registered after observer and time rotations",()=>{
  for(const [latitude,longitude,instant] of [[22.6,114.5,"2026-09-20T13:00:00Z"],[-35,149,"2026-12-21T05:00:00Z"],[65,-20,"2027-03-21T00:00:00Z"]] as const){
    const at=new Date(instant),observer=new Observer(latitude,longitude,30),rotation=Rotation_EQJ_EQD(at);
    const source=positionDeepSkyCatalog({at,latitude,longitude,elevationM:30}).find(r=>r.objectRef==="M:31")!;
    const point=[0,source.azimuthDeg,source.altitudeDeg,source.northAzimuthDeg,source.northAltitudeDeg,source.eastAzimuthDeg,source.eastAltitudeDeg]
      .map(n=>Math.round(n*1e9)/1e9) as unknown as DeepSkyScenePoint;
    const registration=registerSkySurvey(point,4,256);assert.ok(registration);
    for(const pixel of fixture.rows){
      const eq=EquatorFromVector(RotateVector(rotation,VectorFromSphere(new Spherical(pixel.decDeg,pixel.raDeg,1),at)));
      const h=Horizon(at,observer,eq.ra,eq.dec,"");
      const ray:SkyVector=[Math.sin(h.azimuth*rad)*Math.cos(h.altitude*rad),Math.cos(h.azimuth*rad)*Math.cos(h.altitude*rad),Math.sin(h.altitude*rad)];
      const uv=skyArtworkUvAtDirection(registration,ray);assert.ok(uv);
      assert.ok(Math.hypot(uv[0]-pixel.uv[0],uv[1]-pixel.uv[1])*256<.001,`pixel registration ${uv} vs ${pixel.uv}`);
    }
  }
});

test("all 51 source centers bind to FITS half-pixel origin at each published resolution",()=>{
  for(const at of ["2026-09-20T13:00:00Z","2026-12-21T05:00:00Z"]){
    const rows=positionDeepSkyCatalog({at,latitude:22.6,longitude:114.5,elevationM:30});assert.equal(rows.length,51);
    for(const row of rows){
      const p:DeepSkyScenePoint=[0,row.azimuthDeg,row.altitudeDeg,row.northAzimuthDeg,row.northAltitudeDeg,row.eastAzimuthDeg,row.eastAltitudeDeg];
      for(const [field,pixels] of [[4,256],[.75,512],[.25,512]] as const){
        const r=registerSkySurvey(p,field,pixels);assert.ok(r,row.objectRef);
        const ray:SkyVector=[Math.sin(p[1]*rad)*Math.cos(p[2]*rad),Math.cos(p[1]*rad)*Math.cos(p[2]*rad),Math.sin(p[2]*rad)];
        const uv=skyArtworkUvAtDirection(r,ray)!;
        assert.ok(Math.abs(uv[0]-(.5-.5/pixels))<1e-8);assert.ok(Math.abs(uv[1]-(.5+.5/pixels))<1e-8);
      }
    }
  }
});
