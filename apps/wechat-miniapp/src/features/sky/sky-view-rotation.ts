import Quaternion from "quaternion";
import type { SkyVector, SkyViewBasis } from "./sky-view-projection";

/** Point an orthonormal camera at a unit direction along the short arc while
 * parallel transporting its screen axes. Navigation and ongoing tracking must
 * agree on this rule rather than implicitly rolling the view upright. */
export function skyViewPointingArc(from: SkyViewBasis, forward: SkyVector): { angle: number; view: SkyViewBasis } {
  const a = from.forward, b = forward;
  const cross: SkyVector = [a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const length = Math.hypot(...cross);
  const cosine = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const angle = Math.atan2(length, cosine);
  // Antipodal directions have two equally short routes; retain one choice
  // based on the current screen-up axis, as the joint navigation already did.
  const axis: SkyVector = length > 1e-10 ? [cross[0] / length, cross[1] / length, cross[2] / length] : from.up;
  const turn = Quaternion.fromAxisAngle([...axis], angle);
  return { angle, view: angle < 1e-12 ? from : {
    right: turn.rotateVector([...from.right]) as SkyVector,
    up: turn.rotateVector([...from.up]) as SkyVector,
    forward,
  } };
}

/** Camera forward is -Z; right/up/-forward is a proper ENU rotation. */
export function skyViewRotation(view: SkyViewBasis): Quaternion {
  return Quaternion.fromMatrix([
    [view.right[0], view.up[0], -view.forward[0]],
    [view.right[1], view.up[1], -view.forward[1]],
    [view.right[2], view.up[2], -view.forward[2]],
  ]).normalize();
}

export function skyRotationView(rotation: Quaternion): SkyViewBasis {
  return {
    right: rotation.rotateVector([1, 0, 0]) as SkyVector,
    up: rotation.rotateVector([0, 1, 0]) as SkyVector,
    forward: rotation.rotateVector([0, 0, -1]) as SkyVector,
  };
}

export function interpolateSkyView(from: SkyViewBasis, to: SkyViewBasis, amount: number): SkyViewBasis {
  if (amount <= 0) return from;
  if (amount >= 1) return to;
  return skyRotationView(skyViewRotation(from).slerp(skyViewRotation(to))(amount).normalize());
}
