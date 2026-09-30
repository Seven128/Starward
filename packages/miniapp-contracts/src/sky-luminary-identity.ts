import { hasSkyTargetPosition } from "./sky-target-position.ts";
import type { HourlySkyRow } from "./types.ts";

/** Sun/Moon identities are separate from the invariant seven-planet array. */
export const SKY_LUMINARY_CATALOG_VERSION = "solar-system-luminaries@1";
/** SHA-256 of solar-system-luminaries@1:SUN,MOON. */
export const SKY_LUMINARY_CATALOG_HASH = "1886605318cbab9fdd9876d98e8f103950ce91045a53545677c72e0e86a30b01";
export const SKY_LUMINARY_ORDER = ["SUN", "MOON"] as const;
export type SkyLuminaryBody = typeof SKY_LUMINARY_ORDER[number];
export const SKY_LUMINARY_NAMES = {
  SUN: { zh: "太阳", en: "Sun", kind: "STAR", aliases: ["太阳", "Sun", "日", "SOLAR:SUN"] },
  MOON: { zh: "月球", en: "Moon", kind: "MOON", aliases: ["月球", "月亮", "Moon", "SOLAR:MOON"] },
} as const;
export function isSkyLuminaryReference(value: unknown): value is `SOLAR:${SkyLuminaryBody}` {
  return value === "SOLAR:SUN" || value === "SOLAR:MOON";
}
export function skyLuminaryBody(value: unknown): SkyLuminaryBody | null {
  return isSkyLuminaryReference(value) ? value.slice(6) as SkyLuminaryBody : null;
}

/** Read the same report row as rendering; no second observer, clock or ephemeris. */
export function skyLuminaryPosition(row: Pick<HourlySkyRow,
  "sunAzimuthDeg" | "sunAltitudeDeg" | "moonAzimuthDeg" | "moonAltitudeDeg"> | null | undefined,
body: SkyLuminaryBody) {
  const position = body === "SUN"
    ? { azimuthDeg: row?.sunAzimuthDeg, altitudeDeg: row?.sunAltitudeDeg }
    : { azimuthDeg: row?.moonAzimuthDeg, altitudeDeg: row?.moonAltitudeDeg };
  return hasSkyTargetPosition(position) ? position : null;
}
