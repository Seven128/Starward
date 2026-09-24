/** Reveal a newly viewed photo in the shared horizontal source strip. */
export function photoRevealLeft(index: number, count: number, windowWidth: number): number | null {
  if (count <= 1 || index < 0 || index >= count || !Number.isFinite(windowWidth) || windowWidth <= 0) return null;
  const slide = Math.min(windowWidth * .68, 520);
  return Math.max(0, index * (slide + 8) + 12 - (windowWidth - slide) / 2);
}
