import { SKY_OBSERVING_VERTICAL_FOV_DEG } from "./sky-zoom";

/** Display adaptation, not a measurement of visibility, flux or angular diameter. */
export function skyStarAppearance(magnitude: number, verticalFovDeg: number) {
  if (!Number.isFinite(magnitude) || !Number.isFinite(verticalFovDeg) ||
    verticalFovDeg <= 0 || verticalFovDeg >= 360) return null;
  // Use the actual stereographic magnification. Catalog coverage and asynchronous
  // arrivals must never change the appearance of a star already on screen.
  const magnification = Math.tan(SKY_OBSERVING_VERTICAL_FOV_DEG * Math.PI / 720) /
    Math.tan(verticalFovDeg * Math.PI / 720);
  const limit = Math.max(5.8, Math.min(11, 7 + 2.5 * Math.log10(magnification)));
  const fade = Math.max(0, Math.min(1, (limit - magnitude) / 0.65));
  if (fade === 0) return null;
  const opacity = 0.92 * fade * fade * (3 - 2 * fade);
  const contrast = Math.max(0, limit - 0.65 - magnitude);
  // CSS-pixel radii: a modest bounded increase preserves fine faint points.
  const radiusPx = 0.85 + 1.85 * (1 - Math.exp(-contrast / 4.5));
  return { radiusPx, opacity };
}
