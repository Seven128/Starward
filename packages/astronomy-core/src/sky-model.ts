import {
  GAIA_DR3_BRIGHT_STAR_CATALOG,
  projectGaiaDr3Catalog,
  type GaiaDr3Row,
} from "./gaia-catalog.ts";

export type SkyObjectKind = "star" | "deep-sky" | "constellation-anchor" | "milky-way-core";
export interface CatalogObject { id: string; sourceId: string; name: string; kind: SkyObjectKind; raHours: number; decDeg: number; magnitude: number; bpRp: number | null; aliases: string[] }
export interface PositionedObject extends CatalogObject { altitudeDeg: number; azimuthDeg: number; visible: boolean; obstructed: boolean | null }
export interface HorizonPoint { azimuthDeg: number; altitudeDeg: number }
export interface HorizonProfile { source: "measured" | "manual" | "estimated"; version: string; confidence: number; points: HorizonPoint[] }

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

const normalize = (value: number) => ((value % 360) + 360) % 360;
const interpolateHorizon = (profile: HorizonProfile, azimuthDeg: number): number | null => {
  if (profile.points.length < 2) return null;
  const points = [...profile.points].map((point) => ({ ...point, azimuthDeg: normalize(point.azimuthDeg) })).sort((a, b) => a.azimuthDeg - b.azimuthDeg);
  const target = normalize(azimuthDeg);
  const wrapped = [...points, { ...points[0], azimuthDeg: points[0].azimuthDeg + 360 }];
  const adjusted = target < points[0].azimuthDeg ? target + 360 : target;
  for (let index = 0; index < wrapped.length - 1; index += 1) {
    const left = wrapped[index]; const right = wrapped[index + 1];
    if (adjusted >= left.azimuthDeg && adjusted <= right.azimuthDeg) {
      const ratio = (adjusted - left.azimuthDeg) / Math.max(0.0001, right.azimuthDeg - left.azimuthDeg);
      return left.altitudeDeg + (right.altitudeDeg - left.altitudeDeg) * ratio;
    }
  }
  return null;
};

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

export function calculateFieldOfView(input: { sensorWidthMm?: number; sensorHeightMm?: number; focalLengthMm?: number; orientation: "landscape" | "portrait" }) {
  const { sensorWidthMm, sensorHeightMm, focalLengthMm } = input;
  if (![sensorWidthMm, sensorHeightMm, focalLengthMm].every((value) => typeof value === "number" && Number.isFinite(value) && value > 0)) return null;
  const horizontal = 2 * Math.atan(sensorWidthMm! / (2 * focalLengthMm!)) * 180 / Math.PI;
  const vertical = 2 * Math.atan(sensorHeightMm! / (2 * focalLengthMm!)) * 180 / Math.PI;
  return input.orientation === "landscape" ? { horizontalDeg: horizontal, verticalDeg: vertical } : { horizontalDeg: vertical, verticalDeg: horizontal };
}

export function visibleIntervals(samples: Array<{ at: string; altitudeDeg: number; azimuthDeg: number }>, profile?: HorizonProfile) {
  return samples.map((sample) => {
    const horizon = profile ? interpolateHorizon(profile, sample.azimuthDeg) : null;
    return { ...sample, horizonAltitudeDeg: horizon, visible: sample.altitudeDeg > (horizon ?? 0), evidence: profile?.source ?? "astronomical-horizon" };
  });
}
