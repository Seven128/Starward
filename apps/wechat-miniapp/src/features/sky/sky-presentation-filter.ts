import Quaternion from "quaternion";
import type { SkyOrientationSnapshot } from "./sky-orientation-controller";
import type { SkyViewBasis } from "./sky-view-projection";
import { skyViewRotation as rotation, skyRotationView as basis } from "./sky-view-rotation";

// One Euro's speed-adaptive cutoff, applied to rigid rotations rather than
// Euler components. Quaternion.js owns shortest-arc interpolation. This is
// presentation only: alignment must always receive the unfiltered attitude.
// Reference: https://gery.casiez.net/publications/CHI2012-casiez.pdf
const alpha = (hz: number, seconds: number) => 1 / (1 + 1 / (2 * Math.PI * hz * seconds));

/** A single display stream, reset at every reference/control transition. */
export function createSkyPresentationFilter() {
  let previous: Quaternion | null = null, filtered: Quaternion | null = null;
  let at = -Infinity, revision = -1;
  let velocity = [0, 0, 0];
  let displayed: SkyViewBasis | null = null;
  return (snapshot: SkyOrientationSnapshot): SkyOrientationSnapshot => {
    const pose = snapshot.pose;
    if (!pose) {
      previous = filtered = null; displayed = null; at = -Infinity;
      revision = snapshot.presentationRevision;
      return snapshot;
    }
    const target = rotation(pose.basis);
    const elapsed = (pose.sampledAt - at) / 1000;
    const locked = snapshot.alignment.mode === "editing" || snapshot.alignment.mode === "needs-alignment";
    if (!previous || !filtered || revision !== snapshot.presentationRevision || locked || elapsed > 0.5) {
      previous = filtered = target; displayed = pose.basis;
      at = pose.sampledAt; velocity = [0, 0, 0];
    } else if (elapsed > 0) {
      let delta = target.mul(previous.conjugate()).normalize();
      if (delta.w < 0) delta = delta.neg();
      const length = Math.hypot(delta.x, delta.y, delta.z);
      const scale = length > 1e-12 ? 2 * Math.atan2(length, delta.w) / (length * elapsed) : 0;
      const rate = [delta.x * scale, delta.y * scale, delta.z * scale];
      const derivativeAlpha = alpha(1, elapsed);
      velocity = velocity.map((value, i) => value + derivativeAlpha * (rate[i]! - value));
      const cutoff = 1 + 5 * Math.hypot(...velocity);
      filtered = filtered.slerp(target)(alpha(cutoff, elapsed)).normalize();
      previous = target; at = pose.sampledAt; displayed = basis(filtered);
    }
    revision = snapshot.presentationRevision;
    const view = displayed ?? pose.basis;
    const horizontal = Math.hypot(view.forward[0], view.forward[1]);
    const headingDeg = horizontal < 0.15 ? null :
      (Math.atan2(view.forward[0], view.forward[1]) * 180 / Math.PI + 360) % 360;
    return { ...snapshot, alignment: { ...snapshot.alignment, view }, pose: { ...pose, basis: view, headingDeg } };
  };
}
