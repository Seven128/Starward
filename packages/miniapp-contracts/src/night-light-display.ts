import { NIGHT_LIGHT_FIXED_SCALE, type NightLightProductBand } from "./night-light-fixed-scale.ts";

export const NIGHT_LIGHT_LEGACY_DISPLAY = "starward-vnl-fixed-bands-v1" as const;
/** Display-only mapping of the existing fixed product bands. Numerical values,
 * thresholds, quality and the sealed producer policy remain unchanged. */
export const NIGHT_LIGHT_CONTRAST_DISPLAY = {
  styleVersion: "starward-vnl-contrast-bands-v1",
  bands: {
    VERY_LOW: { color: "#4778BD", alpha: 36 },
    LOW: { color: "#279C9C", alpha: 70 },
    MODERATE: { color: "#E0BE42", alpha: 108 },
    HIGH: { color: "#E78036", alpha: 146 },
    VERY_HIGH: { color: "#C94757", alpha: 184 },
  } satisfies Record<NightLightProductBand, { color: string; alpha: number }>,
} as const;

export type NightLightDisplayStyle = typeof NIGHT_LIGHT_LEGACY_DISPLAY | typeof NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion;

export function isNightLightDisplayStyle(value: unknown): value is NightLightDisplayStyle {
  return value === NIGHT_LIGHT_LEGACY_DISPLAY || value === NIGHT_LIGHT_CONTRAST_DISPLAY.styleVersion;
}

export function nightLightDisplayBands(style: NightLightDisplayStyle = NIGHT_LIGHT_LEGACY_DISPLAY) {
  if (!isNightLightDisplayStyle(style)) throw new Error("nightlight_display_style_invalid");
  return NIGHT_LIGHT_FIXED_SCALE.bands.map(band => ({ ...band,
    ...(style === NIGHT_LIGHT_LEGACY_DISPLAY ? { alpha: NIGHT_LIGHT_FIXED_SCALE.alpha }
      : NIGHT_LIGHT_CONTRAST_DISPLAY.bands[band.id]),
  }));
}

export function nightLightDisplayLegend(style: NightLightDisplayStyle = NIGHT_LIGHT_LEGACY_DISPLAY) {
  return nightLightDisplayBands(style).map(band => ({ label: band.label, color: band.color,
    range: `${band.range} ${NIGHT_LIGHT_FIXED_SCALE.unit}` }));
}
