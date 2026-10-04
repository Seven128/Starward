import {calculateMiniappNightSky} from "../../../workers/miniapp-api/src/astronomy-engine-adapter.ts";

const results=[];
for(let day=16;day<=30;day++)results.push(`2026-09-${String(day).padStart(2,"0")}`);
for(let day=1;day<=8;day++)results.push(`2026-10-${String(day).padStart(2,"0")}`);
const rows=[];
const daylight=[];
for(const nightDate of results){
  const additionalTimes=[0,2,4,6,8,10].map(hour=>`${nightDate}T${String(hour).padStart(2,"0")}:00:00.000Z`);
  const report=calculateMiniappNightSky({latitude:22.596,longitude:114.534,elevationM:20,
    timezone:"Asia/Shanghai",nightDate,target:"mercury",additionalTimes});
  for(const row of report.samples){
    const mercury=row.planets.find(p=>p.body==="MERCURY")!;
    if(mercury.altitudeDeg>=2&&row.sunAltitudeDeg<0)
      rows.push({at:row.at,sunAltitudeDeg:row.sunAltitudeDeg,
        mercuryAltitudeDeg:mercury.altitudeDeg,angularDiameterArcsec:mercury.angularDiameterDeg*3600,
        radiusAt780pxAnd015Deg:mercury.angularDiameterDeg/.15*780/2});
    if(mercury.altitudeDeg>=2&&row.sunAltitudeDeg>=0)
      daylight.push({at:row.at,sunAltitudeDeg:row.sunAltitudeDeg,
        mercuryAltitudeDeg:mercury.altitudeDeg,angularDiameterArcsec:mercury.angularDiameterDeg*3600,
        radiusAt780pxAnd015Deg:mercury.angularDiameterDeg/.15*780/2});
  }
}
rows.sort((a,b)=>b.radiusAt780pxAnd015Deg-a.radiusAt780pxAnd015Deg);
daylight.sort((a,b)=>b.radiusAt780pxAnd015Deg-a.radiusAt780pxAnd015Deg);
process.stdout.write(JSON.stringify({nights:results.length,visibleNightRows:rows.length,
  bestNight:rows.slice(0,5),visibleDayRows:daylight.length,bestDay:daylight.slice(0,5)},null,2));
