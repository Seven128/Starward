/** One display window for artwork, lines, names and image eligibility. The
 * overview stays clear; a close stellar crop gradually retires context that
 * no longer helps identify the constellation. These are presentation tuning
 * values, not astronomical or data-coverage thresholds. The portrait reference
 * shows a complete figure at about 84.6 degrees vertically (40.6 degrees on
 * its shorter side); the former 40-degree cutoff erased this useful field. */
export function constellationVisibility(verticalFovDeg: number, enabled: boolean): number {
  if (!enabled || !Number.isFinite(verticalFovDeg) || verticalFovDeg <= 0) return 0;
  const overview = Math.max(0,Math.min(1,(140-verticalFovDeg)/50));
  const local = Math.max(0,Math.min(1,(verticalFovDeg-10)/15));
  return overview*overview*(3-2*overview) * local*local*(3-2*local);
}
