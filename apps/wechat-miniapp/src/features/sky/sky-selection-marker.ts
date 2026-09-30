import { projectSkyAngularDisc } from "./sky-phase-disc";
import { projectSkyDirection, type SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";
import type { SkyObjectIdentity } from "./sky-object-picking";

/** One geometric marker for selected point and area objects. Name detail can
 * fade without erasing selection. Values below are presentation tuning. */
export function projectSkySelectionMarker(object: SkyObjectIdentity,
  position: { azimuthDeg: number; altitudeDeg: number },
  view: { basis: SkyViewBasis; width: number; height: number; verticalFovDeg: number;
    center: SkyProjectionCenter }, angularDiameterDeg: number | null = null) {
  const point = projectSkyDirection(position.azimuthDeg, position.altitudeDeg,
    view.basis, view.width, view.height, view.verticalFovDeg, view.center);
  if (!point) return null;
  const area = object.kind === "GALAXY" || object.kind === "NEBULA";
  const disc = area && angularDiameterDeg !== null
    ? projectSkyAngularDisc({ ...position, angularDiameterDeg }, view.basis,
      view.width, view.height, view.verticalFovDeg, view.center) : null;
  const detail = Math.max(0, Math.min(1, (60 - view.verticalFovDeg) / 35));
  return { ...point, shape: area ? "circle" as const : "cross" as const,
    radiusPx: Math.max(12, disc?.radiusPx ?? 0),
    nameOpacity: detail * detail * (3 - 2 * detail) };
}
