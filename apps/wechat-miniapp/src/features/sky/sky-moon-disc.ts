import type { SkyGeometryRow } from "@starward/miniapp-contracts";
import { exactSkyTimeFrame } from "./sky-time-frame";
import type { SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";
import { skySolarLightAt } from "./sky-solar-light";
import { projectSkyPhaseDisc, type SkyPhaseDisc } from "./sky-phase-disc";
import {skyBodySurfaceOrientation,type SkyBodySurfaceOrientation} from "./sky-body-surface-orientation";

export interface SkyMoonDisc extends SkyPhaseDisc {
  /** Surface normal expressed in IAU body x/east/north for the facing, right and down screen axes. */
  surfaceOrientation: SkyBodySurfaceOrientation | null;
}

/** The phase uses the report's illuminated fraction; the terminator points at the same report's Sun. */
export function skyMoonDiscAt(rows: readonly SkyGeometryRow[] | undefined, at: string | undefined,
  basis: SkyViewBasis, width: number, height: number, verticalFovDeg: number,
  center?: SkyProjectionCenter): SkyMoonDisc | null {
  const row = exactSkyTimeFrame(rows, at);
  if (!row || typeof row.moonAzimuthDeg !== "number" || !Number.isFinite(row.moonAzimuthDeg) ||
    row.moonAzimuthDeg < 0 || row.moonAzimuthDeg >= 360 ||
    typeof row.moonAltitudeDeg !== "number" || !Number.isFinite(row.moonAltitudeDeg) || row.moonAltitudeDeg < -90 || row.moonAltitudeDeg > 90 ||
    typeof row.moonAngularDiameterDeg !== "number" || !Number.isFinite(row.moonAngularDiameterDeg) ||
    row.moonAngularDiameterDeg <= 0 || row.moonAngularDiameterDeg >= 1 ||
    typeof row.moonIllumination !== "number" || !Number.isFinite(row.moonIllumination) ||
    row.moonIllumination < 0 || row.moonIllumination > 1) return null;
  // Full-sphere browsing and landscape occlusion share this unchanged body
  // direction; a set Moon is not an invalid or missing geometry sample.
  const sun = skySolarLightAt(rows,at);
  const disc=sun ? projectSkyPhaseDisc({ azimuthDeg: row.moonAzimuthDeg, altitudeDeg: row.moonAltitudeDeg,
    angularDiameterDeg: row.moonAngularDiameterDeg, illuminatedFraction: row.moonIllumination },
    sun,basis,width,height,verticalFovDeg,center) : null;
  if(!disc)return null;
  return {...disc,surfaceOrientation:skyBodySurfaceOrientation(row.moonBodyFrame,
    row.moonAzimuthDeg,row.moonAltitudeDeg,disc,basis,width,height,verticalFovDeg,center)};
}
