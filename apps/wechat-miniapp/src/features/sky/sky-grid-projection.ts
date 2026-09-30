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

/** Both coordinate grids share curvature, horizon and viewport clipping. */
export function createSkyGridTracer(basis: SkyViewBasis, width: number, height: number,
  verticalFovDeg: number, center: SkyProjectionCenter | undefined,
  direction: (longitude: number, latitude: number) => SkyVector | null) {
  const projector = createSkyDirectionProjector(basis,width,height,verticalFovDeg,center);
  const evaluate = (sample: GridSample): GridEndpoint => ({ sample, ray: direction(sample[0], sample[1]) });
  const project = (endpoint: GridEndpoint): GridSample | null => {
    if (endpoint.point !== undefined) return endpoint.point;
    const value = endpoint.ray;
    if (!value || value[2] < -1e-12) return endpoint.point = null;
    // Never join an arc through the stereographic antipode.
    const forward = value[0] * basis.forward[0] + value[1] * basis.forward[1] + value[2] * basis.forward[2];
    if (forward < -0.98) return endpoint.point = null;
    const azimuth = Math.atan2(value[0], value[1]) * 180 / Math.PI;
    const altitude = Math.asin(Math.max(0, Math.min(1, value[2]))) * 180 / Math.PI;
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
      const first = start.ray, last = current.ray;
      if (!first || !last) continue;
      let pieces: readonly (readonly [GridEndpoint, GridEndpoint])[] = [[start, current]];
      if (first[2] < 0 && last[2] < 0) {
        // A coordinate circle may graze above the horizon between two hidden
        // base samples. Its ENU height is sinusoidal; locate the short arc's
        // interior peak from three heights and evaluate that actual ray.
        const middle = evaluate(midpoint(start.sample, current.sample)).ray;
        if (!middle) continue;
        const curvature = first[2] - 2 * middle[2] + last[2];
        if (curvature >= 0) continue;
        const fraction = 0.5 + (first[2] - last[2]) / (4 * curvature);
        if (fraction <= 0 || fraction >= 1) continue;
        const peak = evaluate([start.sample[0] + (current.sample[0] - start.sample[0]) * fraction,
          start.sample[1] + (current.sample[1] - start.sample[1]) * fraction]);
        const peakRay = peak.ray;
        if (!peakRay || peakRay[2] < 0) continue;
        pieces = [[start, peak], [peak, current]];
      }
      for (const [startPiece, endPiece] of pieces) {
        let a = startPiece, b = endPiece;
        const ra = a.ray!, rb = b.ray!;
        if ((ra[2] < 0) !== (rb[2] < 0)) {
          // Retain the visible partial segment instead of stopping a base step
          // before the horizon. Keep the chosen endpoint on its visible side.
          let below = ra[2] < 0 ? a : b, above = ra[2] < 0 ? b : a;
          for (let iteration = 0; iteration < 24; iteration++) {
            const middle = evaluate(midpoint(below.sample, above.sample)), value = middle.ray;
            if (!value || value[2] < 0) below = middle; else above = middle;
          }
          if (ra[2] < 0) a = above; else b = above;
        }
        const pa = project(a), pb = project(b);
        if (pa && pb) arc(a, b, pa, pb, 0);
      }
    }
    return lines;
  };
}
