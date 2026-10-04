import type { SkyProjectionCenter } from "./sky-viewport";
import type { SkyLineSegment } from "./sky-render-surface";
import { createSkyDirectionProjector, type SkyVector, type SkyViewBasis } from "./sky-view-projection";
import { clipSkyLineToViewport } from "./sky-line-clip";

type GridSample = readonly [number, number];
interface GridEndpoint {
  sample: GridSample;
  ray: SkyVector | null;
  point?: GridSample | null;
}
const midpoint = (a: GridSample, b: GridSample): GridSample => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** Both coordinate grids share full-sphere curvature and viewport clipping.
 * Terrain occlusion belongs to the composed scene, not this coordinate owner.
 */
export function createSkyGridTracer(basis: SkyViewBasis, width: number, height: number,
  verticalFovDeg: number, center: SkyProjectionCenter | undefined,
  direction: (longitude: number, latitude: number) => SkyVector | null) {
  const projector = createSkyDirectionProjector(basis,width,height,verticalFovDeg,center);
  const evaluate = (sample: GridSample): GridEndpoint => ({ sample, ray: direction(sample[0], sample[1]) });
  const project = (endpoint: GridEndpoint): GridSample | null => {
    if (endpoint.point !== undefined) return endpoint.point;
    const value = endpoint.ray;
    if (!value) return endpoint.point = null;
    // Never join an arc through the stereographic antipode.
    const forward = value[0] * basis.forward[0] + value[1] * basis.forward[1] + value[2] * basis.forward[2];
    if (forward < -0.98) return endpoint.point = null;
    const azimuth = Math.atan2(value[0], value[1]) * 180 / Math.PI;
    const altitude = Math.asin(Math.max(-1, Math.min(1, value[2]))) * 180 / Math.PI;
    const point = projector?.unclipped(azimuth, altitude);
    return endpoint.point = point ? [point.x, point.y] : null;
  };
  return (count: number, sample: (index: number) => GridSample): SkyLineSegment[] => {
    const lines: SkyLineSegment[] = [];
    if (count < 1) return lines;
    const arc = (a: GridEndpoint, b: GridEndpoint, pa: GridSample, pb: GridSample, depth: number) => {
      const middle = evaluate(midpoint(a.sample, b.sample)), pm = project(middle);
      if (!pm) return;
      const error = Math.hypot(pm[0] - (pa[0] + pb[0]) / 2, pm[1] - (pa[1] + pb[1]) / 2);
      const margin = Math.max(0.5, error);
      if (Math.max(pa[0], pm[0], pb[0]) < -margin || Math.min(pa[0], pm[0], pb[0]) > width + margin ||
        Math.max(pa[1], pm[1], pb[1]) < -margin || Math.min(pa[1], pm[1], pb[1]) > height + margin) return;
      if (depth < 12 && error > 0.35) {
        arc(a, middle, pa, pm, depth + 1);
        arc(middle, b, pm, pb, depth + 1);
      } else {
        const clipped = clipSkyLineToViewport(pa, pb, width, height);
        if (clipped) lines.push(clipped);
      }
    };
    // Retain only adjacent endpoints and the current refinement stack. A new
    // trace reevaluates its directions; nothing survives into another frame.
    let previous = evaluate(sample(0));
    for (let index = 1; index <= count; index++) {
      const current = evaluate(sample(index));
      const start = previous;
      previous = current;
      const pa = project(start), pb = project(current);
      if (pa && pb) arc(start, current, pa, pb, 0);
    }
    return lines;
  };
}
