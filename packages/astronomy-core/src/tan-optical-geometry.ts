import type { PreparedNativeTanGeometry } from "@starward/miniapp-contracts";

type Direction = readonly [number, number, number];
const rad = Math.PI / 180;
function basis(g: PreparedNativeTanGeometry) {
  const ra = g.referenceValue[0] * rad, dec = g.referenceValue[1] * rad;
  return { c: [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)] as const,
    e: [-Math.sin(ra), Math.cos(ra), 0] as const,
    n: [-Math.sin(dec) * Math.cos(ra), -Math.sin(dec) * Math.sin(ra), Math.cos(dec)] as const };
}
/** Exact affine nominal TAN plane. Preserve homogeneous corner lengths;
 * normalizing each anchor separately would distort rectangular source UV. */
export function nativeTanDirection(g: PreparedNativeTanGeometry, uv: readonly [number, number]): Direction {
  const { c, e, n } = basis(g);
  const x = uv[0] * g.sourceWidth + .5 - g.referencePixelFitsOneBased[0];
  const y = (1 - uv[1]) * g.sourceHeight + .5 - g.referencePixelFitsOneBased[1];
  const [[a, b], [d, f]] = g.cdDegreesPerPixel;
  const xi = (a * x + b * y) * rad, eta = (d * x + f * y) * rad;
  return c.map((value, i) => value + xi * e[i]! + eta * n[i]!) as unknown as Direction;
}
export function nativeTanUvAtIcrs(g: PreparedNativeTanGeometry, raDeg: number, decDeg: number) {
  const { c, e, n } = basis(g), ra = raDeg * rad, dec = decDeg * rad;
  const v: Direction = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  const dot = (a: Direction) => a.reduce((sum, value, i) => sum + value * v[i]!, 0);
  const denominator = dot(c);
  if (!Number.isFinite(denominator) || denominator <= 0) return null;
  const xi = dot(e) / denominator / rad, eta = dot(n) / denominator / rad;
  const [[a, b], [d, f]] = g.cdDegreesPerPixel, det = a * f - b * d;
  const x = (f * xi - b * eta) / det + g.referencePixelFitsOneBased[0] - .5;
  const y = (a * eta - d * xi) / det + g.referencePixelFitsOneBased[1] - .5;
  const uv = [x / g.sourceWidth, 1 - y / g.sourceHeight] as const;
  return uv.every(Number.isFinite) ? uv : null;
}
export function nativeTanNominalWidthDegrees(g: PreparedNativeTanGeometry) {
  const a = nativeTanDirection(g, [0, .5]), b = nativeTanDirection(g, [1, .5]);
  const cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  return Math.atan2(Math.hypot(...cross), a.reduce((sum, value, i) => sum + value * b[i]!, 0)) / rad;
}
