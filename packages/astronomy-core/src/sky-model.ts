import { Horizon, Observer } from "astronomy-engine";

export type SkyObjectKind = "star" | "deep-sky" | "constellation-anchor" | "milky-way-core";
export interface CatalogObject { id: string; name: string; kind: SkyObjectKind; raHours: number; decDeg: number; magnitude: number; aliases: string[] }
export interface PositionedObject extends CatalogObject { altitudeDeg: number; azimuthDeg: number; visible: boolean; obstructed: boolean | null }
export interface HorizonPoint { azimuthDeg: number; altitudeDeg: number }
export interface HorizonProfile { source: "measured" | "manual" | "estimated"; version: string; confidence: number; points: HorizonPoint[] }

export const BRIGHT_SKY_CATALOG: readonly CatalogObject[] = [
  { id: "sirius", name: "天狼星", kind: "star", raHours: 6.7525, decDeg: -16.7161, magnitude: -1.46, aliases: ["Sirius"] },
  { id: "vega", name: "织女星", kind: "star", raHours: 18.6156, decDeg: 38.7837, magnitude: 0.03, aliases: ["Vega"] },
  { id: "antares", name: "心宿二", kind: "star", raHours: 16.4901, decDeg: -26.432, magnitude: 1.06, aliases: ["Antares"] },
  { id: "m31", name: "仙女座星系", kind: "deep-sky", raHours: 0.712, decDeg: 41.269, magnitude: 3.44, aliases: ["M31", "Andromeda"] },
  { id: "milky-way-core", name: "银河核心", kind: "milky-way-core", raHours: 17.7611, decDeg: -29.0078, magnitude: 0, aliases: ["Sagittarius A*"] },
] as const;

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
  const observer = new Observer(input.latitude, input.longitude, input.elevationM);
  return BRIGHT_SKY_CATALOG.filter((object) => object.magnitude <= input.magnitudeLimit).map((object) => {
    const horizontal = Horizon(input.at, observer, object.raHours, object.decDeg, "normal");
    const obstruction = input.profile ? interpolateHorizon(input.profile, horizontal.azimuth) : null;
    return { ...object, altitudeDeg: horizontal.altitude, azimuthDeg: horizontal.azimuth, visible: horizontal.altitude > 0, obstructed: obstruction === null ? null : horizontal.altitude <= obstruction };
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

