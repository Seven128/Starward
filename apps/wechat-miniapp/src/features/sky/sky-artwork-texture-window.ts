import { skyArtworkUvAtDirection, type SkyArtworkRegistration, type SkyArtworkView } from "./sky-artwork-registration";
import { skyArtworkViewRayHull } from "./sky-artwork-visibility";
import type { SkyGpuTextureWindow } from "./sky-gpu-textures";

/** Retain original texels of the registered plane needed by the whole viewport.
 * The existing positive ray hull bounds curved/rolled/offset camera edges. Its
 * projective UV map is convex while all denominators have the same valid sign.
 * Uncertain, wide, behind-plane or empty bounds keep the full source; this is
 * GPU residency only, never source coverage, display support or image demand. */
export function skyArtworkTextureWindow(registration: SkyArtworkRegistration, view: SkyArtworkView,
  width: number, height: number, imageWidth: number, imageHeight: number): SkyGpuTextureWindow | undefined {
  if (![imageWidth, imageHeight].every(value => Number.isInteger(value) && value > 0)) return;
  const hull = skyArtworkViewRayHull(view, width, height);
  if (!hull || ![registration.determinant, ...registration.rows.flat(),
    ...registration.anchorU, ...registration.anchorV].every(Number.isFinite)) return;
  const points = hull.map(ray => skyArtworkUvAtDirection(registration, ray));
  if (points.some(point => !point || !point.every(Number.isFinite))) return;
  const uv = points as Array<readonly [number, number]>;
  const denominator = registration.rows.reduce<number[]>((sum, row) => sum.map((value, i) => value + row[i]!), [0, 0, 0]);
  const minimum = Math.min(...hull.map(ray => Math.abs(ray.reduce((sum, value, i) => sum + value * denominator[i]!, 0))));
  // Widen for float32 camera/plane uniforms and dot/divide arithmetic, as in
  // the existing raster certificate. Near-singular division loses its bound
  // rather than dropping samples. Three source texels keep LINEAR neighbours.
  const magnitude = registration.rows.reduce((sum, row) => sum + row.reduce((n, value) => n + Math.abs(value), 0), 0);
  const roundoff = 64 * 2 ** -23 * magnitude;
  if (!(minimum > roundoff)) return;
  const edges = [imageWidth, imageHeight].map((size, axis) => {
    const values = uv.map(point => point[axis]!);
    const anchors = axis === 0 ? registration.anchorU : registration.anchorV;
    const error = roundoff * (Math.max(...anchors.map(Math.abs)) + Math.max(...values.map(Math.abs))) / (minimum - roundoff);
    const lo = Math.max(0, Math.min(size, Math.floor(((Math.min(...values) - error) * size - 3) / 32) * 32));
    const hi = Math.max(0, Math.min(size, Math.ceil(((Math.max(...values) + error) * size + 3) / 32) * 32));
    return [lo, hi] as const;
  });
  const [x, right] = edges[0]!, [y, bottom] = edges[1]!;
  if (!(right > x && bottom > y) || (x === 0 && y === 0 && right === imageWidth && bottom === imageHeight)) return;
  return { x, y, width: right - x, height: bottom - y };
}
