import type { SkyLineSegment } from "./sky-render-surface";

/** Preserve a visible crossing even when both projected endpoints are offscreen. */
export function clipSkyLineToViewport(
  a: readonly [number, number],
  b: readonly [number, number],
  width: number,
  height: number,
): SkyLineSegment | null {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  let start = 0, end = 1;
  for (const [p, q] of [[-dx, a[0]], [dx, width - a[0]], [-dy, a[1]], [dy, height - a[1]]] as const) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) start = Math.max(start, t);
    else end = Math.min(end, t);
    if (start > end) return null;
  }
  return [a[0] + start * dx, a[1] + start * dy, a[0] + end * dx, a[1] + end * dy];
}
