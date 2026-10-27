/** Cartographic Horn gradients and Igor slope/aspect shading, as documented at
 * https://gdal.org/en/stable/programs/gdal_raster_hillshade.html .
 * Independent TypeScript implementation; no GDAL runtime is required.
 * Unlike elevation colour, a relief overlay leaves level ground transparent.
 */
export function terrainReliefRgba(elevations: Float32Array, size: number, spacingM: number | ((row: number) => { x: number; y: number }),
  shadowRgb: readonly [number, number, number], legacyContrast = false, pixelOrigin = { x: 0, y: 0 }) {
  const rgba = new Uint8Array(size * size * 4);
  const lightAzimuth = 315 * Math.PI / 180;
  const color = legacyContrast ? shadowRgb : shadowRgb.map(channel => Math.round(channel * 0.4));
  // Cartographic emphasis only; never changes the published numeric elevations.
  const verticalExaggeration = 2;
  const sample = (index: number, center: number) => {
    const value = elevations[index];
    // Missing neighbours cannot create an artificial cliff against a global mean.
    return Number.isFinite(value) ? value : center;
  };
  for (let row = 0; row < size; row++) {
    // Ground spacing is constant across a Mercator row. Keep projection and
    // temporary objects out of the per-pixel shading loop.
    const spacing = typeof spacingM === "number" ? { x: spacingM, y: spacingM } : spacingM(row);
    const currentRow = row * size, northRow = Math.max(0, row - 1) * size, southRow = Math.min(size - 1, row + 1) * size;
    for (let column = 0; column < size; column++) {
      const index = currentRow + column, offset = index * 4, center = elevations[index];
      if (!Number.isFinite(center)) {
        // A level valid pixel and missing data must remain visually distinct.
        const stripe = (row + column + pixelOrigin.x + pixelOrigin.y) % 12 < 2;
        rgba[offset] = 125; rgba[offset + 1] = 130; rgba[offset + 2] = 125; rgba[offset + 3] = stripe ? 90 : 0;
        continue;
      }
      const west = Math.max(0, column - 1), east = Math.min(size - 1, column + 1);
      const nw = sample(northRow + west, center), n = sample(northRow + column, center), ne = sample(northRow + east, center);
      const w = sample(currentRow + west, center), e = sample(currentRow + east, center);
      const sw = sample(southRow + west, center), s = sample(southRow + column, center), se = sample(southRow + east, center);
      const dx = (ne + 2 * e + se - nw - 2 * w - sw) / (8 * spacing.x);
      const dy = (sw + 2 * s + se - nw - 2 * n - ne) / (8 * spacing.y);
      const slopeStrength = Math.atan(Math.hypot(dx, dy) * verticalExaggeration) / (Math.PI / 2);
      // Rows run southward; the surface normal's horizontal projection faces (-dx, dy).
      const facingAzimuth = Math.atan2(-dx, dy);
      const difference = Math.acos(Math.max(-1, Math.min(1, Math.cos(facingAzimuth - lightAzimuth))));
      const directionalStrength = difference / Math.PI;
      // Keep the existing hue, but darken the shadow and lift low-slope contrast.
      // Exactly level terrain remains transparent; this does not change elevation.
      const alpha = Math.round(255 * (legacyContrast ? slopeStrength * directionalStrength
        : Math.min(0.9, Math.pow(slopeStrength, 0.65) * 1.1 * (0.18 + 0.82 * directionalStrength))));
      rgba[offset] = color[0]; rgba[offset + 1] = color[1]; rgba[offset + 2] = color[2]; rgba[offset + 3] = alpha;
    }
  }
  return rgba;
}
