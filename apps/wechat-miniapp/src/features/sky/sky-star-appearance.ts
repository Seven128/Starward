import { SKY_OBSERVING_VERTICAL_FOV_DEG } from "./sky-zoom";

/** Display adaptation, not a measurement of visibility, flux or angular diameter.
 * Sun altitude uses standard civil/nautical/astronomical twilight boundaries to
 * fade fainter stars before brighter ones. It cannot infer local clouds,
 * aerosols, horizon obstructions, light pollution or actual eye adaptation. */
export function skyStarAppearance(magnitude: number, verticalFovDeg: number, sunAltitudeDeg?: number,
  geometricAltitudeDeg?: number) {
  if (!Number.isFinite(magnitude) || !Number.isFinite(verticalFovDeg) ||
    verticalFovDeg <= 0 || verticalFovDeg >= 360 ||
    (sunAltitudeDeg !== undefined && (!Number.isFinite(sunAltitudeDeg) || sunAltitudeDeg < -90 || sunAltitudeDeg > 90)) ||
    (geometricAltitudeDeg !== undefined && (!Number.isFinite(geometricAltitudeDeg) ||
      geometricAltitudeDeg <= 0 || geometricAltitudeDeg > 90))) return null;
  // Use the actual stereographic magnification. Catalog coverage and asynchronous
  // arrivals must never change the appearance of a star already on screen.
  const magnification = Math.tan(SKY_OBSERVING_VERTICAL_FOV_DEG * Math.PI / 720) /
    Math.tan(verticalFovDeg * Math.PI / 720);
  const nightLimit = Math.max(5.8, Math.min(11, 7 + 2.5 * Math.log10(magnification)));
  const twilightLimit = sunAltitudeDeg === undefined || sunAltitudeDeg <= -18 ? nightLimit
    : sunAltitudeDeg >= 0 ? -3
    : sunAltitudeDeg >= -6 ? -3 + (-sunAltitudeDeg / 6) * 4.5
    : sunAltitudeDeg >= -12 ? 1.5 + ((-sunAltitudeDeg - 6) / 6) * 2.5
    : 4 + ((-sunAltitudeDeg - 12) / 6) * (nightLimit - 4);
  const limit = Math.min(nightLimit, twilightLimit);
  const fade = Math.max(0, Math.min(1, (limit - magnitude) / 0.65));
  if (fade === 0) return null;
  const opacity = 0.92 * fade * fade * (3 - 2 * fade) *
    (geometricAltitudeDeg === undefined ? 1 : referenceAtmosphericTransmission(geometricAltitudeDeg));
  const contrast = Math.max(0, limit - 0.65 - magnitude);
  // CSS-pixel radii: a modest bounded increase preserves fine faint points.
  const radiusPx = 0.85 + 1.85 * (1 - Math.exp(-contrast / 4.5));
  return { radiusPx, opacity };
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
