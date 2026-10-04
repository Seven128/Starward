import type { SkyArtworkView } from "./sky-artwork-registration";
import { unprojectSkyPoint } from "./sky-view-projection";
export const SKY_FULL_SPHERE_DISPLAY_FADE_DEG = 15;

/** Camera display adaptation only. The terrain's geometry/source alpha and
 * every object's true geometric altitude stay unchanged. Fade through the
 * central +/-15 degrees; smoothstep has no jump on entry or return. */
export function skyLandscapeViewOpacity(view: SkyArtworkView, width: number, height: number): number {
  // The visual viewport centre may differ from the projection's optical axis.
  const ray = unprojectSkyPoint(width / 2, height / 2, view.basis, width, height,
    view.verticalFovDeg, view.center);
  if (!ray) return 1;
  const altitude = Math.asin(Math.max(-1, Math.min(1, ray[2]))) * 180 / Math.PI;
  const value = Math.max(0, Math.min(1, (altitude + SKY_FULL_SPHERE_DISPLAY_FADE_DEG) /
    (2 * SKY_FULL_SPHERE_DISPLAY_FADE_DEG)));
  return value * value * (3 - 2 * value);
}
