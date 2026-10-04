import {
  SKY_PLANET_ORDER,
  validSkyPlanetGeometry,
  type SkyGeometryRow,
} from "@starward/miniapp-contracts";
import { projectSkyAngularDisc } from "./sky-phase-disc";
import { SATURN_BANDS, SATURN_REFERENCE_RADIUS_KM } from "./sky-saturn-rings";
import type { SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";
import { skySunDiscAt } from "./sky-sun-disc";
import { skyMoonDiscAt } from "./sky-moon-disc";

/** Keep the located target tappable, but let a resolved body disc replace its
 * visual marker when the marker would cover the disc or Saturn's rings. */
export function locatedBodyOccludesMarker(reference: string, row: SkyGeometryRow | undefined,
  basis: SkyViewBasis | null, width: number, height: number, verticalFovDeg: number,
  center: SkyProjectionCenter): boolean {
  if (!row || !basis || width <= 0 || height <= 0) return false;
  if (reference === "SOLAR:SUN" || reference === "SOLAR:MOON") {
    const disc = (reference === "SOLAR:SUN" ? skySunDiscAt : skyMoonDiscAt)(
      [row], row.at, basis, width, height, verticalFovDeg, center);
    return Boolean(disc && disc.radiusPx >= width * 12 / 750);
  }
  const index = SKY_PLANET_ORDER.findIndex(body => reference === `PLANET:${body}`);
  if (index < 0 || !row || !basis || width <= 0 || height <= 0 ||
    !Array.isArray(row.planets) || row.planets.length !== SKY_PLANET_ORDER.length ||
    row.planets.some((planet, planetIndex) => !validSkyPlanetGeometry(planet, planetIndex)) ||
    typeof row.sunAzimuthDeg !== "number" || !Number.isFinite(row.sunAzimuthDeg) ||
    row.sunAzimuthDeg < 0 || row.sunAzimuthDeg >= 360 ||
    typeof row.sunAltitudeDeg !== "number" || !Number.isFinite(row.sunAltitudeDeg) ||
    row.sunAltitudeDeg < -90 || row.sunAltitudeDeg > 90) return false;
  const planet = row.planets[index]!;
  const disc = projectSkyAngularDisc(planet, basis, width, height, verticalFovDeg, center);
  if (!disc) return false;
  const visibleExtent = planet.body === "SATURN" && planet.ringPoleEnu
    ? SATURN_BANDS[2].outerKm / SATURN_REFERENCE_RADIUS_KM : 1;
  // The marker ring has a 24rpx diameter on Taro's 750rpx design width.
  return disc.radiusPx * visibleExtent >= width * 12 / 750;
}
