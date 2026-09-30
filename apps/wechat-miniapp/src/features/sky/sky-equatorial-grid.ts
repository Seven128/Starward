import type { SkyObservationFrame } from "@starward/miniapp-contracts";
import type { SkyProjectionCenter } from "./sky-viewport";
import type { SkyViewBasis } from "./sky-view-projection";
import { skyEquatorialDirectionToEnu } from "./sky-observation-frame";
import { createSkyGridTracer } from "./sky-grid-projection";

/** J2000 RA/declination grid, registered to the current report observer/time. */
export function skyEquatorialGrid(frame: SkyObservationFrame, basis: SkyViewBasis,
  width: number, height: number, verticalFovDeg: number, center?: SkyProjectionCenter) {
  const trace = createSkyGridTracer(basis, width, height, verticalFovDeg, center, (ra, dec) => {
    const longitude = ra * Math.PI / 180, latitude = dec * Math.PI / 180;
    return skyEquatorialDirectionToEnu(frame.equatorialToEnu,
      [Math.cos(latitude) * Math.cos(longitude), Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude)]);
  });
  const step = verticalFovDeg >= 90 ? 2 : 1;
  return {
    equator: trace(360 / step, index => [index * step, 0]),
    parallels: [-60, -30, 30, 60].flatMap(dec => trace(360 / step, index => [index * step, dec])),
    meridians: Array.from({ length: 12 }, (_, index) => index * 30)
      .flatMap(ra => trace(180 / step, index => [ra, -90 + index * step])),
  };
}
