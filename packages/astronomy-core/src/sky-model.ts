import {
  GAIA_DR3_BRIGHT_STAR_CATALOG,
  projectGaiaDr3Catalog,
  type GaiaDr3Row,
} from "./gaia-catalog.ts";
import { interpolateHorizon, type HorizonProfile } from "./sky-geometry.ts";
export { calculateFieldOfView, visibleIntervals } from "./sky-geometry.ts";
export type { HorizonPoint, HorizonProfile } from "./sky-geometry.ts";

export type SkyObjectKind = "star" | "deep-sky" | "constellation-anchor" | "milky-way-core";
export interface CatalogObject { id: string; sourceId: string; name: string; kind: SkyObjectKind; raHours: number; decDeg: number; magnitude: number; bpRp: number | null; aliases: string[] }
export interface PositionedObject extends CatalogObject { altitudeDeg: number; azimuthDeg: number; visible: boolean; obstructed: boolean | null }

/**
 * Compatibility projection for legacy callers.  Rows are the same Gaia DR3
 * rows returned by the validated catalog loader; this does not add named or
 * representative stars.  Gaia source identifiers intentionally remain the
 * only star identity and labels are blank because catalog stars are
 * non-actionable scene geometry.
 */
export const BRIGHT_SKY_CATALOG: readonly CatalogObject[] =
  GAIA_DR3_BRIGHT_STAR_CATALOG.map((row) => toCatalogObject(row));

function toCatalogObject(row: GaiaDr3Row): CatalogObject {
  return {
    id: row.sourceId,
    sourceId: row.sourceId,
    name: "",
    kind: "star",
    raHours: row.raDeg / 15,
    decDeg: row.decDeg,
    magnitude: row.gMag,
    bpRp: row.bpRp,
    aliases: [],
  };
}

export function positionCatalog(input: { at: Date; latitude: number; longitude: number; elevationM: number; magnitudeLimit: number; profile?: HorizonProfile }): PositionedObject[] {
  const projected = projectGaiaDr3Catalog({
    at: input.at,
    observer: {
      latitude: input.latitude,
      longitude: input.longitude,
      elevationM: input.elevationM,
    },
    magnitudeLimit: input.magnitudeLimit,
    ...(input.profile
      ? { horizonAltitudeAtAzimuth: (azimuthDeg: number) => interpolateHorizon(input.profile!, azimuthDeg) }
      : {}),
  });
  const bySourceId = new Map(BRIGHT_SKY_CATALOG.map((object) => [object.sourceId, object] as const));
  return projected.map((position) => {
    const object = bySourceId.get(position.sourceId);
    if (!object) throw new Error("gaia_catalog_projection_identity_invalid");
    return {
      ...object,
      altitudeDeg: position.altitudeDeg,
      azimuthDeg: position.azimuthDeg,
      visible: position.visible,
      obstructed: position.obstructed,
    };
  });
}

export function catalogChunks(magnitudeLimit: number): ReadonlyArray<{ key: string; objects: readonly CatalogObject[] }> {
  const visible = BRIGHT_SKY_CATALOG.filter((object) => object.magnitude <= magnitudeLimit);
  return [
    { key: "bright", objects: visible.filter((object) => object.magnitude <= 1.5) },
    { key: "deep", objects: visible.filter((object) => object.magnitude > 1.5) },
  ].filter((chunk) => chunk.objects.length > 0);
}
