import Quaternion from "quaternion";
import type { SkyVector, SkyViewBasis } from "./sky-view-projection";

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
