import { assertStellarRotation, type DeepSkySceneCatalogEntry, type SkyObservationFrame } from "@starward/miniapp-contracts";
import { registerSkyArtworkPlane, skyArtworkUvAtDirection, type SkyArtworkRegistration } from "./sky-artwork-registration";
import { skyEquatorialDirectionToEnu } from "./sky-observation-frame";
import type { SkyVector } from "./sky-view-projection";

/** A catalog angular reference region in one actual observation frame. This
 * describes neither a survey-band segmentation nor sample validity/readability. */
export interface SkyDeepSkyRegion {
  readonly reference: string;
  readonly frameAt: string;
  /** UV (.5,.5) is the catalog center; the ellipse has radius .5 in UV.
   * The raw plane retains the report rotation's homogeneous weights. */
  readonly registration: SkyArtworkRegistration;
}

/** Full catalog axes become tangent-plane half axes. Position angle is north
 * eastwards, independent of screen roll and the image publication's center.
 * Missing center/minor/PA does not authorize a circle, zero PA or guessed WCS. */
export function registerSkyDeepSkyRegion(entry: DeepSkySceneCatalogEntry, observation: SkyObservationFrame | null): SkyDeepSkyRegion | null {
  const center = entry.icrsCenter, major = entry.majorAxisArcmin, minor = entry.minorAxisArcmin, angle = entry.positionAngleDeg;
  if (!observation || !center || ![center.raDeg, center.decDeg, major, minor, angle].every(value =>
    typeof value === "number" && Number.isFinite(value)) || center.raDeg < 0 || center.raDeg >= 360 ||
    Math.abs(center.decDeg) > 90 || major === null || minor === null || angle === null ||
    minor <= 0 || major < minor || major >= 180 * 60) return null;
  try { assertStellarRotation(observation.equatorialToEnu); } catch { return null; }
  const rad = Math.PI / 180, ra = center.raDeg * rad, dec = center.decDeg * rad, pa = angle * rad;
  const c: SkyVector = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  const e: SkyVector = [-Math.sin(ra), Math.cos(ra), 0];
  const n: SkyVector = [-Math.sin(dec) * Math.cos(ra), -Math.sin(dec) * Math.sin(ra), Math.cos(dec)];
  const a = Math.tan(major * rad / 120), b = Math.tan(minor * rad / 120);
  const alongMajor = n.map((value, i) => Math.cos(pa) * value + Math.sin(pa) * e[i]!) as unknown as SkyVector;
  const alongMinor = n.map((value, i) => -Math.sin(pa) * value + Math.cos(pa) * e[i]!) as unknown as SkyVector;
  const registration = registerSkyArtworkPlane(([[0, 0], [1, 0], [0, 1]] as const).map(uv => ({ uv,
    point: skyEquatorialDirectionToEnu(observation.equatorialToEnu,
      c.map((value, i) => value + (2 * uv[0] - 1) * a * alongMajor[i]! +
        (2 * uv[1] - 1) * b * alongMinor[i]!) as unknown as SkyVector),
  })));
  return registration ? Object.freeze({ reference: entry.objectRef, frameAt: observation.at, registration }) : null;
}

/** Normalized catalog-axis coordinates of the same ENU ray used by imagery.
 * Null is unknown/unrepresentable geometry, not zero signal or absent pixels. */
export function skyDeepSkyRegionCoordinates(region: SkyDeepSkyRegion | null, direction: SkyVector): readonly [number, number] | null {
  const uv = region && skyArtworkUvAtDirection(region.registration, direction);
  return uv ? [2 * uv[0] - 1, 2 * uv[1] - 1] : null;
}

export function skyDeepSkyRegionContainsDirection(region: SkyDeepSkyRegion | null, direction: SkyVector): boolean | null {
  const coordinates = skyDeepSkyRegionCoordinates(region, direction);
  return coordinates ? coordinates[0] ** 2 + coordinates[1] ** 2 <= 1 : null;
}
