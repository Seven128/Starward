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
    const registration=registerSkySurvey(point,4,256,128);assert.ok(registration);
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
        const r=registerSkySurvey(p,field,pixels,pixels/2);assert.ok(r,row.objectRef);
        const ray:SkyVector=[Math.sin(p[1]*rad)*Math.cos(p[2]*rad),Math.cos(p[1]*rad)*Math.cos(p[2]*rad),Math.sin(p[2]*rad)];
        const uv=skyArtworkUvAtDirection(r,ray)!;
        assert.ok(Math.abs(uv[0]-(.5-.5/pixels))<1e-8);assert.ok(Math.abs(uv[1]-(.5+.5/pixels))<1e-8);
      }
    }
  }
});

test("actual Legacy Surveys M104 TAN pixel origin preserves its centered JPEG registration",()=>{
  // ls-dr10 official g-band FITS sample, SHA-256 e6bf19e2728a119fe4ff994563f826e8f42132074c773db5721d0e960b221293.
  // Its CRPIX=(128.5,128.5), unlike the adopted CDS W3 cutouts' CRPIX=(128,128).
  const at=new Date("2026-09-20T13:00:00Z"),observer=new Observer(22.6,114.5,30),rotation=Rotation_EQJ_EQD(at);
  const ra=189.99763,dec=-11.62305,pixels=256,crpix=128.5,scale=1.4/3600;
  const toRay=(raDeg:number,decDeg:number):SkyVector=>{
    const eq=EquatorFromVector(RotateVector(rotation,VectorFromSphere(new Spherical(decDeg,raDeg,1),at)));
    const h=Horizon(at,observer,eq.ra,eq.dec,"");
    return [Math.sin(h.azimuth*rad)*Math.cos(h.altitude*rad),Math.cos(h.azimuth*rad)*Math.cos(h.altitude*rad),Math.sin(h.altitude*rad)];
  };
  const asAngles=(raDeg:number,decDeg:number)=>{
    const eq=EquatorFromVector(RotateVector(rotation,VectorFromSphere(new Spherical(decDeg,raDeg,1),at)));
    const h=Horizon(at,observer,eq.ra,eq.dec,"");
    return [h.azimuth,h.altitude] as const;
  };
  const [az,alt]=asAngles(ra,dec),[northAz,northAlt]=asAngles(ra,dec+.1),[eastAz,eastAlt]=asAngles(ra+.1,dec);
  const point:DeepSkyScenePoint=[0,az,alt,northAz,northAlt,eastAz,eastAlt];
  const field=2*Math.atan(pixels*scale*rad/2)/rad;
  const registration=registerSkySurvey(point,field,pixels,crpix);assert.ok(registration);
  const centerUv=skyArtworkUvAtDirection(registration,toRay(ra,dec));assert.ok(centerUv);
  assert.ok(Math.hypot(centerUv[0]-.5,centerUv[1]-.5)*pixels<.001,
    `Legacy WCS center must be centered, got source pixel offset ${centerUv}`);
  // Inverse of the source FITS TAN CD matrix, followed by the real JPEG row reversal.
  // Derive sky rays from source WCS instead of copying the registration formula.
  const raRad=ra*rad,decRad=dec*rad;
  const c=[Math.cos(decRad)*Math.cos(raRad),Math.cos(decRad)*Math.sin(raRad),Math.sin(decRad)];
  const e=[-Math.sin(raRad),Math.cos(raRad),0];
  const n=[-Math.sin(decRad)*Math.cos(raRad),-Math.sin(decRad)*Math.sin(raRad),Math.cos(decRad)];
  for(const [x,y] of [[20,30],[200,80],[120,210]] as const){
    const xi=-(x+1-crpix)*scale*rad,eta=(pixels-y-crpix)*scale*rad;
    const v=c.map((value,i)=>value+xi*e[i]!+eta*n[i]!);
    const w=Math.hypot(...v),sampleRa=Math.atan2(v[1]!,v[0]!)/rad;
    const sampleDec=Math.asin(v[2]!/w)/rad;
    const uv=skyArtworkUvAtDirection(registration,toRay(sampleRa,sampleDec));assert.ok(uv);
    assert.ok(Math.hypot(uv[0]-(x+.5)/pixels,uv[1]-(y+.5)/pixels)*pixels<.001,
      `Legacy FITS/JPEG pixel ${x},${y} mapped to ${uv}`);
  }
  assert.equal(registerSkySurvey(point,field,pixels,0),null,"reject a pixel origin outside the image");
});
