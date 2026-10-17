import policy from "./night-light-fixed-scale.json" with { type: "json" };
import type { LightPollutionEstimate } from "./types.ts";

export type NightLightProductBand = NonNullable<LightPollutionEstimate["productBand"]>;
interface FixedNightLightScale {
  schemaVersion: number;
  methodVersion: string;
  styleVersion: string;
  unit: "nW/cm²/sr";
  alpha: number;
  geometryPolicy: { version: string; maximumQuadratureStepDegrees: number };
  thresholds: readonly number[];
  boundaryNumericalRelativeTolerance: number;
  bands: readonly { id: NightLightProductBand; label: string; color: string; range: string }[];
  qualityPolicy: { version: string; minimumValidAreaFraction: number; areaFractionNumericalTolerance: number; cloudFreeThreshold: string; zeroRequiresValidCoverage: boolean };
  statistics: { spot: string; map: string };
  meaning: string;
}

/** One versioned policy shared by the Python producer and all consumers.
 * These are product bins, with no calibrated sky-class interpretation. */
export const NIGHT_LIGHT_FIXED_SCALE = policy as FixedNightLightScale;

export function nightLightBandForRadiance(value: number): NightLightProductBand | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const index = NIGHT_LIGHT_FIXED_SCALE.thresholds.findIndex(threshold => value <= threshold * (1 + NIGHT_LIGHT_FIXED_SCALE.boundaryNumericalRelativeTolerance));
  return NIGHT_LIGHT_FIXED_SCALE.bands[index < 0 ? NIGHT_LIGHT_FIXED_SCALE.bands.length - 1 : index]!.id;
}

export function nightLightFixedLegend() {
  return NIGHT_LIGHT_FIXED_SCALE.bands.map(band => ({ label: band.label, color: band.color,
    range: `${band.range} ${NIGHT_LIGHT_FIXED_SCALE.unit}` }));
}
