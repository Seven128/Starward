import { SKY_PLANET_ORDER, validSkyBodyFrame, validSkyPlanetGeometry, type ApiEnvelope, type SkyReport } from "@starward/miniapp-contracts";

/** Cached v4 or corrupt ephemerides never acquire stale/mixed planetary pixels. */
export function projectSkyPlanetGeometry(envelope: ApiEnvelope<SkyReport>): ApiEnvelope<SkyReport> {
  let changed = false;
  const hourly = envelope.data.hourly.map(row => {
    if (Array.isArray(row.planets) && row.planets.length === SKY_PLANET_ORDER.length) {
      const planets=row.planets.map((planet,index)=>{
        // Network and persisted rows have not passed the geometry validator yet.
        // Leave malformed entries for it to reject without losing other layers.
        if(!planet || typeof planet!=="object")return planet;
        const texturedBody=planet.body==="MARS"||planet.body==="MERCURY"||planet.body==="JUPITER"||
          planet.body==="URANUS"||planet.body==="NEPTUNE";
        let candidate = texturedBody && planet.bodyFrame != null && !validSkyBodyFrame(planet.bodyFrame)
          ? {...planet,bodyFrame:null} : planet;
        if(candidate.body==="SATURN" && candidate.ringSunEnu != null &&
          !validSkyPlanetGeometry(candidate,index)) {
          // A malformed optional light vector withdraws only shadow data.
          candidate={...candidate,ringSunEnu:null};
        }
        if(candidate.body==="SATURN" && !validSkyPlanetGeometry(candidate,index)) {
          const withoutRings={...candidate,ringTiltDeg:null,ringPoleEnu:null,ringSunEnu:null};
          if(validSkyPlanetGeometry(withoutRings,index))return withoutRings;
        }
        return candidate;
      });
      if (planets.every(validSkyPlanetGeometry)) {
        if (planets.some(planet=>planet.body==="SATURN" && planet.ringTiltDeg===null)) changed=true;
        if (planets.every((planet,index)=>planet===row.planets![index])) return row;
        changed=true;
        return {...row,planets};
      }
    }
    changed = true;
    return {...row, planets: null};
  });
  if (!changed) return envelope;
  const warning = "行星精确位置、表面定向或光照部分资料暂不可用，请联网后刷新。";
  return { ...envelope, dataState: envelope.dataState === "FRESH" ? "PARTIAL" : envelope.dataState,
    warnings: envelope.warnings.includes(warning) ? envelope.warnings : [...envelope.warnings,warning],
    data: {...envelope.data,hourly,offlineReady:false,precachedHours:0} };
}
