import type { SkyProjectionCenter } from "./sky-viewport";
import type { SkyLineSegment } from "./sky-render-surface";
import { skyHorizontalDirection, type SkyViewBasis } from "./sky-view-projection";
import { createSkyGridTracer } from "./sky-grid-projection";

interface SkyHorizontalGrid {
  horizon: SkyLineSegment[];
  altitude: SkyLineSegment[];
  meridians: SkyLineSegment[];
}

/** Alt-azimuth grid in the same ENU frame and stereographic camera as the sky. */
export function skyHorizontalGrid(
  basis: SkyViewBasis,
  width: number,
  height: number,
  verticalFovDeg: number,
  center?: SkyProjectionCenter,
  enabled = true,
): SkyHorizontalGrid {
  const trace = createSkyGridTracer(basis, width, height, verticalFovDeg, center, skyHorizontalDirection);
  // A wide view projects each degree to only a few pixels. Coarser base
  // sampling reduces line vertices; curvature still refines near the view.
  const step = verticalFovDeg >= 90 ? 2 : 1;
  return {
    horizon: trace(360 / step, index => [index * step, 0]),
    altitude: enabled ? [30, 60].flatMap(altitude => trace(360 / step, index => [index * step, altitude])) : [],
    meridians: enabled ? Array.from({length: 12}, (_, index) => index * 30)
      .flatMap(azimuth => trace(90 / step, index => [azimuth, index * step])) : [],
  };
}
