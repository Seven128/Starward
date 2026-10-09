/** Adopted photo width inside the strip's two 12px edge paddings. */
export function photoStripSlideWidth(windowWidth: number): number {
  return Math.min(Math.max(0, windowWidth - 24) * .68, 520);
}

/** Reveal a newly viewed photo in the shared horizontal source strip. */
export function photoRevealLeft(index: number, count: number, windowWidth: number): number | null {
  if (count <= 1 || index < 0 || index >= count || !Number.isFinite(windowWidth) || windowWidth <= 0) return null;
  const slide = photoStripSlideWidth(windowWidth);
  return Math.max(0, index * (slide + 8) + 12 - (windowWidth - slide) / 2);
}
