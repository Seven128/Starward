/** Cartographic Horn gradients and Igor slope/aspect shading, as documented at
 * https://gdal.org/en/stable/programs/gdal_raster_hillshade.html .
 * Independent TypeScript implementation; no GDAL runtime is required.
 * Unlike elevation colour, a relief overlay leaves level ground transparent.
 */
export function terrainReliefRgba(elevations: Float32Array, size: number, spacingM: number,
  shadowRgb: readonly [number, number, number]) {
  const rgba = new Uint8Array(size * size * 4);
  const lightAzimuth = 315 * Math.PI / 180;
  // Cartographic emphasis only; never changes the published numeric elevations.
  const verticalExaggeration = 2;
  for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
    const index = row * size + column, center = elevations[index];
    if (!Number.isFinite(center)) {
      // A level valid pixel and missing data must remain visually distinct.
      const stripe = (row + column) % 12 < 2;
      rgba.set([125, 130, 125, stripe ? 90 : 0], index * 4);
      continue;
    }
    const sample = (dy: number, dx: number) => {
      const value = elevations[Math.max(0, Math.min(size - 1, row + dy)) * size + Math.max(0, Math.min(size - 1, column + dx))];
      // Missing neighbours cannot create an artificial cliff against a global mean.
      return Number.isFinite(value) ? value : center;
    };
    const dx = (sample(-1, 1) + 2 * sample(0, 1) + sample(1, 1)
      - sample(-1, -1) - 2 * sample(0, -1) - sample(1, -1)) / (8 * spacingM);
    const dy = (sample(1, -1) + 2 * sample(1, 0) + sample(1, 1)
      - sample(-1, -1) - 2 * sample(-1, 0) - sample(-1, 1)) / (8 * spacingM);
    const slopeStrength = Math.atan(Math.hypot(dx, dy) * verticalExaggeration) / (Math.PI / 2);
    // Rows run southward; the surface normal's horizontal projection faces (-dx, dy).
    const facingAzimuth = Math.atan2(-dx, dy);
    const difference = Math.acos(Math.max(-1, Math.min(1, Math.cos(facingAzimuth - lightAzimuth))));
    const alpha = Math.round(255 * slopeStrength * difference / Math.PI);
    rgba.set([shadowRgb[0], shadowRgb[1], shadowRgb[2], alpha], index * 4);
  }
  return rgba;
}
