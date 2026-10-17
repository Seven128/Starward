import { validBasis, type SkyViewBasis } from "./sky-view-projection";
import { interpolateSkyView, skyViewPointingArc } from "./sky-view-rotation";
import { clampSkyFieldOfView } from "./sky-zoom";

const RAD = Math.PI / 180;
const unit = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => value * value * (3 - 2 * value);
const viewportWidth = (fov: number) => 4 * Math.tan(fov * RAD / 4);

/** One joint pan/zoom curve, using the van Wijk/Nuij closed form also used by
 * d3-interpolate 3.0.1 (ISC; bundled sky-navigation notice). Its planar distance
 * is replaced with distance along the shortest spherical pointing arc. This
 * is a bounded spherical adaptation, not a proof of a global spherical optimum.
 */
export function createSkyNavigationPath(from: SkyViewBasis, target: SkyViewBasis,
  fromFov: number, targetFov: number, width: number, height: number) {
  if (!validBasis(from) || !validBasis(target) ||
    ![fromFov, targetFov, width, height].every(Number.isFinite) ||
    fromFov <= 0 || targetFov <= 0 || width <= 0 || height <= 0) return null;
  const startFov = clampSkyFieldOfView(fromFov, width, height);
  const endFov = clampSkyFieldOfView(targetFov, width, height);
  const { angle, view: destination } = skyViewPointingArc(from, target.forward);
  const w0 = viewportWidth(startFov), w1 = viewportWidth(endFov);
  const logarithm = Math.log(w1 / w0);
  // An already nearby object needs no outward detour just to recenter it.
  const nearby = angle <= Math.min(startFov, endFov) * RAD / 2;
  let r0 = 0, delta = logarithm, coshR0 = 1;
  if (!nearby) {
    const difference = w1 * w1 - w0 * w0, distanceSquared = angle * angle;
    r0 = -Math.asinh((difference + 4 * distanceSquared) / (4 * w0 * angle));
    const r1 = -Math.asinh((difference - 4 * distanceSquared) / (4 * w1 * angle));
    delta = r1 - r0;
    coshR0 = Math.cosh(r0);
  }
  const stationary = angle < 1e-12 && Math.abs(logarithm) < 1e-12;
  // These are interaction bounds, not frame-time budgets. Long scale jumps
  // still finish promptly rather than spending seconds over invisible detail.
  const duration = stationary ? 0 : Math.max(240, Math.min(1600, Math.abs(delta) * 180));
  return {
    duration,
    sample(progress: number) {
      const t = unit(Number.isFinite(progress) ? progress : 0);
      if (t === 0) return { view: from, fov: startFov };
      if (t === 1) return { view: destination, fov: endFov };
      const eased = smooth(t);
      const position = nearby ? eased : unit(w0 / (2 * angle) *
        (coshR0 * Math.tanh(r0 + eased * delta) - Math.sinh(r0)));
      const extent = nearby ? w0 * Math.exp(logarithm * eased)
        : w0 * coshR0 / Math.cosh(r0 + eased * delta);
      return { view: angle < 1e-12 ? from : interpolateSkyView(from, destination, position),
        fov: clampSkyFieldOfView(4 * Math.atan(extent / 4) / RAD, width, height) };
    },
  };
}
