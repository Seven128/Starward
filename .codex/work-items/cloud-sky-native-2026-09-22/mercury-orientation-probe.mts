import {calculateMiniappNightSky} from "../../../workers/miniapp-api/src/astronomy-engine-adapter.ts";

const dot=(a:readonly number[],b:readonly number[])=>a.reduce((sum,x,i)=>sum+x*b[i]!,0);
const times=["2026-10-08T10:00:00.000Z","2026-10-08T11:00:00.000Z"];
const rows=calculateMiniappNightSky({latitude:22.5,longitude:114.5,elevationM:20,
  timezone:"Asia/Shanghai",nightDate:"2026-10-08",target:"mercury",additionalTimes:times}).samples;
const samples=times.map((at,index)=>{
  const mercury=rows.find(sample=>sample.at===at)?.planets.find(planet=>planet.body==="MERCURY");
  if(!mercury?.bodyFrame)throw new Error("mercury_exact_frame_missing");
  const {poleEnu:p,primeMeridianEnu:z}=mercury.bodyFrame;
  const e=[p[1]*z[2]-p[2]*z[1],p[2]*z[0]-p[0]*z[2],p[0]*z[1]-p[1]*z[0]];
  const az=mercury.azimuthDeg*Math.PI/180,alt=mercury.altitudeDeg*Math.PI/180;
  const observer=[-Math.cos(alt)*Math.sin(az),-Math.cos(alt)*Math.cos(az),-Math.sin(alt)];
  const eastLongitude=(Math.atan2(dot(observer,e),dot(observer,z))*180/Math.PI+360)%360;
  const planetocentricLatitude=Math.asin(dot(observer,p))*180/Math.PI;
  const jplWestLongitude=[195.312673,195.521008][index]!;
  const jplEastLongitude=(360-jplWestLongitude)%360;
  const difference=Math.abs(((eastLongitude-jplEastLongitude+540)%360)-180);
  if(difference>0.1)throw new Error(`mercury_subobserver_longitude_mismatch:${at}:${difference}`);
  return {at,mercury:{azimuthDeg:mercury.azimuthDeg,altitudeDeg:mercury.altitudeDeg,
      eastLongitudeDeg:eastLongitude,planetocentricLatitudeDeg:planetocentricLatitude},
    jpl:{westLongitudeDeg:jplWestLongitude,eastLongitudeDeg:jplEastLongitude,
      planetodeticLatitudeDeg:[3.607425,3.605661][index]},differenceDeg:difference};
});
const result={observer:{latitude:22.5,longitude:114.5,elevationM:20},
  jpl:{center:"500@399",quantity:14},samples};
process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
