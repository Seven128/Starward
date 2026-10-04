import {calculateMiniappNightSky} from "../../../workers/miniapp-api/src/astronomy-engine-adapter.ts";

const at=Array.from({length:13},(_,hour)=>new Date(Date.UTC(2026,8,22,12+hour)).toISOString());
const rows=calculateMiniappNightSky({latitude:22.5,longitude:114.5,elevationM:20,
  timezone:"Asia/Shanghai",nightDate:"2026-09-22",target:"mars",additionalTimes:at}).samples;
for(const row of rows.filter(value=>at.includes(value.at))){
  const mars=row.planets.find(planet=>planet.body==="MARS")!;
  process.stdout.write(`${row.at} ${mars.azimuthDeg.toFixed(1)} ${mars.altitudeDeg.toFixed(1)} ${mars.angularDiameterDeg.toFixed(5)}\n`);
  if(row.at==="2026-09-22T13:00:00.000Z"&&mars.bodyFrame){
    const {poleEnu:p,primeMeridianEnu:z}=mars.bodyFrame;
    const e=[p[1]*z[2]-p[2]*z[1],p[2]*z[0]-p[0]*z[2],p[0]*z[1]-p[1]*z[0]];
    const az=mars.azimuthDeg*Math.PI/180,alt=mars.altitudeDeg*Math.PI/180;
    const v=[-Math.cos(alt)*Math.sin(az),-Math.cos(alt)*Math.cos(az),-Math.sin(alt)];
    const dot=(a:readonly number[],b:readonly number[])=>a.reduce((sum,x,i)=>sum+x*b[i]!,0);
    const eastLongitude=(Math.atan2(dot(v,e),dot(v,z))*180/Math.PI+360)%360;
    const planetocentricLatitude=Math.asin(dot(v,p))*180/Math.PI;
    process.stdout.write(`subobserver east ${eastLongitude.toFixed(6)} latitude ${planetocentricLatitude.toFixed(6)}\n`);
  }
}
