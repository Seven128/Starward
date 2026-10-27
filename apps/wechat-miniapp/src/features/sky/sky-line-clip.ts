import type { SkyLineSegment } from "./sky-render-surface";

/** Preserve a visible crossing even when both projected endpoints are offscreen. */
export function clipSkyLineToViewport(
  a: readonly [number, number],
  b: readonly [number, number],
  width: number,
  height: number,
): SkyLineSegment | null {
  return clipSkyLineCoordinatesToViewport(a[0],a[1],b[0],b[1],width,height);
}

/** Scalar entry for projected endpoints already owned by their caller. */
export function clipSkyLineCoordinatesToViewport(
  ax: number, ay: number, bx: number, by: number, width: number, height: number,
): SkyLineSegment | null {
  const dx = bx - ax, dy = by - ay;
  let start = 0, end = 1;
  for (let edge = 0; edge < 4; edge++) {
    const p = edge === 0 ? -dx : edge === 1 ? dx : edge === 2 ? -dy : dy;
    const q = edge === 0 ? ax : edge === 1 ? width - ax : edge === 2 ? ay : height - ay;
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) start = Math.max(start, t);
    else end = Math.min(end, t);
    if (start > end) return null;
  }
  return [ax + start * dx, ay + start * dy, ax + end * dx, ay + end * dy];
}
