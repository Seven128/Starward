import type {SkyGeometryRow} from "@starward/miniapp-contracts";
import {exactSkyTimeFrame} from "./sky-time-frame";
import {projectSkyAngularDisc,type SkyAngularDisc} from "./sky-phase-disc";
import type {SkyViewBasis} from "./sky-view-projection";
import type {SkyProjectionCenter} from "./sky-viewport";

/** A missing, retired or ambiguous solar sample cannot produce a measured disc. */
export function skySunDiscAt(rows:readonly SkyGeometryRow[]|undefined,at:string|undefined,
  basis:SkyViewBasis,width:number,height:number,verticalFovDeg:number,
  center?:SkyProjectionCenter):SkyAngularDisc|null{
  const row=exactSkyTimeFrame(rows,at);
  if(!row||typeof row.sunAzimuthDeg!=="number"||!Number.isFinite(row.sunAzimuthDeg)||
    row.sunAzimuthDeg<0||row.sunAzimuthDeg>=360||typeof row.sunAltitudeDeg!=="number"||
    !Number.isFinite(row.sunAltitudeDeg)||row.sunAltitudeDeg< -90||row.sunAltitudeDeg>90||
    typeof row.sunAngularDiameterDeg!=="number"||!Number.isFinite(row.sunAngularDiameterDeg)||
    row.sunAngularDiameterDeg<=.45||row.sunAngularDiameterDeg>=.6)return null;
  if(row.sunAltitudeDeg < -row.sunAngularDiameterDeg/2)return null;
  return projectSkyAngularDisc({azimuthDeg:row.sunAzimuthDeg,altitudeDeg:row.sunAltitudeDeg,
    angularDiameterDeg:row.sunAngularDiameterDeg},basis,width,height,verticalFovDeg,center);
}
