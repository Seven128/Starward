import { SKY_OBSERVING_VERTICAL_FOV_DEG } from "./sky-zoom";
import { SKY_FULL_SPHERE_DISPLAY_FADE_DEG } from "./sky-landscape-visibility";
import type { DisplayMode } from "@starward/miniapp-contracts";

/** Display adaptation, not a measurement of visibility, flux or angular diameter.
 * Sun altitude uses standard civil/nautical/astronomical twilight boundaries to
 * fade fainter stars before brighter ones. It cannot infer local clouds,
 * aerosols, horizon obstructions, light pollution or actual eye adaptation. */
export function skyStarAppearance(magnitude: number, verticalFovDeg: number, sunAltitudeDeg?: number,
  geometricAltitudeDeg?: number, mode: DisplayMode = "NIGHT") {
  return createSkyStarAppearance(verticalFovDeg, sunAltitudeDeg, mode)(magnitude, geometricAltitudeDeg);
}

/** Shared cheap eligibility bound; full appearance retains its original formula. */
export function skyStarMagnitudeLimit(verticalFovDeg: number, sunAltitudeDeg?: number, mode: DisplayMode = "NIGHT"): number | null {
  if (!Number.isFinite(verticalFovDeg) ||
    verticalFovDeg <= 0 || verticalFovDeg >= 360 ||
    (sunAltitudeDeg !== undefined && (!Number.isFinite(sunAltitudeDeg) || sunAltitudeDeg < -90 || sunAltitudeDeg > 90)))
    return null;
  // Use the actual stereographic magnification. Catalog coverage and asynchronous
  // arrivals must never change the appearance of a star already on screen.
  const magnification = Math.tan(SKY_OBSERVING_VERTICAL_FOV_DEG * Math.PI / 720) /
    Math.tan(verticalFovDeg * Math.PI / 720);
  const zoom = Math.log10(magnification);
  // The matched 10.8-degree field exposed hundreds of already supplied SAO
  // identities hidden by the former local-scale limit. Reveal that depth as
  // the view narrows; keep the 45-degree/local curve and deferred red display.
  // This is display adaptation, not a telescope aperture or catalogue claim.
  const localDepth = mode === "OBSERVATION" ? 0 : 2.5 * Math.max(0, zoom);
  // The ordinary overview retains the existing 6.5-magnitude bright catalogue
  // depth. Previously its 5.8 floor hid supplied real stars as the sky widened.
  // This changes display eligibility, never the catalogue, positions or rights.
  const nightLimit = Math.max(mode === "OBSERVATION" ? 5.8 : 6.5, Math.min(11, 7 + 2.5 * zoom + localDepth));
  // The matched late-nautical wide field showed supplied fourth-magnitude
  // stars suppressed by the former 4.0 endpoint. Ordinary display reserves
  // the existing .65-magnitude fade band above them, while still withholding
  // the faint night layer. Deferred red display keeps its previous endpoint.
  const nauticalLimit = mode === "OBSERVATION" ? 4 : 5.5;
  const twilightLimit = sunAltitudeDeg === undefined || sunAltitudeDeg <= -18 ? nightLimit
    : sunAltitudeDeg >= 0 ? -3
    : sunAltitudeDeg >= -6 ? -3 + (-sunAltitudeDeg / 6) * 4.5
    : sunAltitudeDeg >= -12 ? 1.5 + ((-sunAltitudeDeg - 6) / 6) * (nauticalLimit - 1.5)
    : nauticalLimit + ((-sunAltitudeDeg - 12) / 6) * (nightLimit - nauticalLimit);
  return Math.min(nightLimit, twilightLimit);
}

/** One synchronous view/selection job shares its scale and twilight limit.
 * No result survives a change of view, time, or catalogue. */
export function createSkyStarAppearance(verticalFovDeg: number, sunAltitudeDeg?: number, mode: DisplayMode = "NIGHT"):
  (magnitude: number, geometricAltitudeDeg?: number) => { radiusPx: number; opacity: number } | null {
  const limit = skyStarMagnitudeLimit(verticalFovDeg, sunAltitudeDeg, mode);
  if (limit === null) return () => null;
  return (magnitude, geometricAltitudeDeg) => {
    if (!Number.isFinite(magnitude) ||
      (geometricAltitudeDeg !== undefined && (!Number.isFinite(geometricAltitudeDeg) ||
        geometricAltitudeDeg < -90 || geometricAltitudeDeg > 90))) return null;
    const fade = Math.max(0, Math.min(1, (limit - magnitude) / 0.65));
    if (fade === 0) return null;
    const opacity = 0.92 * fade * fade * (3 - 2 * fade) *
      (geometricAltitudeDeg === undefined ? 1 : skyStarDisplayTransmission(geometricAltitudeDeg));
    const contrast = Math.max(0, limit - 0.65 - magnitude);
    // CSS-pixel radii: a modest bounded increase preserves fine faint points.
    const radiusPx = 0.85 + 1.85 * (1 - Math.exp(-contrast / 4.5));
    return { radiusPx, opacity };
  };
}

/** Below the horizon this is a chart display, never a physical air-mass model.
 * Join the existing horizon limit continuously, returning to airless catalogue
 * contrast across the first 15 degrees below it. */
export function skyStarDisplayTransmission(altitude: number): number {
  if (altitude > 0) return referenceAtmosphericTransmission(altitude);
  const reveal = Math.min(1, -altitude / SKY_FULL_SPHERE_DISPLAY_FADE_DEG);
  return HORIZON_TRANSMISSION + (1 - HORIZON_TRANSMISSION) * reveal * reveal * (3 - 2 * reveal);
}

/** Clear-sky, visual-band reference only: geometry and catalog magnitudes stay airless.
 * Saemundsson/Meeus refraction supplies apparent altitude to Kasten–Young 1989
 * relative air mass. 0.11 mag/airmass is ESO's La Silla 540–560 nm reference,
 * not a measured coefficient at the selected spot or current weather.
 * https://github.com/cosinekitty/astronomy/blob/master/source/js/astronomy.js
 * https://opg.optica.org/ao/abstract.cfm?uri=ao-28-22-4735
 * https://eso.org/sci/observing/tools/Extinction.html */
export function referenceAtmosphericTransmission(geometricAltitudeDeg: number): number {
  if (!Number.isFinite(geometricAltitudeDeg) || geometricAltitudeDeg <= 0 || geometricAltitudeDeg > 90) return 0;
  const apparentAltitudeDeg = Math.min(90, geometricAltitudeDeg +
    1.02 / Math.tan((geometricAltitudeDeg + 10.3 / (geometricAltitudeDeg + 5.11)) * Math.PI / 180) / 60);
  const airMass = 1 / (Math.sin(apparentAltitudeDeg * Math.PI / 180) +
    0.50572 * Math.pow(apparentAltitudeDeg + 6.07995, -1.6364));
  return Math.max(0, Math.min(1, Math.pow(10, -0.4 * 0.11 * (airMass - 1))));
}

const HORIZON_TRANSMISSION = referenceAtmosphericTransmission(Number.EPSILON);

// A restrained screen palette for catalogued Johnson B-V, not a measured RGB
// colour or a temperature estimate. Missing SAO/BSC photometry stays neutral.
const STAR_COLOR_STOPS = [
  [-0.3, 190, 216, 255],
  [0, 218, 232, 255],
  [0.5, 242, 243, 245],
  [1, 255, 228, 204],
  [1.5, 255, 199, 167],
  [2, 255, 181, 153],
] as const;

export function skyStarDisplayColor(colorIndex: number | null): string | null {
  if (colorIndex === null || !Number.isFinite(colorIndex)) return null;
  const first = STAR_COLOR_STOPS[0]!;
  const last = STAR_COLOR_STOPS[STAR_COLOR_STOPS.length - 1]!;
  const value = Math.max(first[0], Math.min(last[0], colorIndex));
  const upperIndex = STAR_COLOR_STOPS.findIndex(stop => stop[0] >= value);
  const upper = STAR_COLOR_STOPS[Math.max(upperIndex, 1)]!;
  const lower = STAR_COLOR_STOPS[Math.max(upperIndex - 1, 0)]!;
  const fraction = (value - lower[0]) / (upper[0] - lower[0]);
  const channel = (index: 1 | 2 | 3) => Math.round(lower[index] + (upper[index] - lower[index]) * fraction)
    .toString(16).padStart(2, "0");
  return `#${channel(1)}${channel(2)}${channel(3)}`.toUpperCase();
}
