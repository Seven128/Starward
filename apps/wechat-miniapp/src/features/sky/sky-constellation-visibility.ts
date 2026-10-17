/** Lines retain local identification after the illustration fades. All
 * constellation consumers share intent, including the full-sky overview.
 * Values are presentation tuning, not astronomical/data-coverage thresholds.
 * The portrait reference's 40.6-degree shorter-side field is about 84.6
 * degrees vertically; that useful identification field remains available. */
// Pinch inversion can land a few ulps on either side of a retirement edge.
// Match the camera's numerical-noise tolerance without shifting visible fades.
const BOUNDARY_EPSILON_DEG = 1e-9;
export function constellationLineVisibility(verticalFovDeg: number, enabled: boolean): number {
  if (!enabled || !Number.isFinite(verticalFovDeg) || verticalFovDeg <= 0 || verticalFovDeg >= 360) return 0;
  return 1;
}

/** Artwork, names and bitmap eligibility retire together in a local crop;
 * their spherical line geometry keeps the shared wider-view rule above. */
export function constellationVisibility(verticalFovDeg: number, enabled: boolean): number {
  const overview = constellationLineVisibility(verticalFovDeg,enabled);
  if (overview===0 || verticalFovDeg <= 10 + BOUNDARY_EPSILON_DEG) return 0;
  const local = Math.max(0,Math.min(1,(verticalFovDeg-10)/15));
  return overview * local*local*(3-2*local);
}
