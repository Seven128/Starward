import { resolveSkySceneFrame, type ResolvedStellarScene } from "./sky-stellar-scene";
import type { SkyPickSnapshot } from "./sky-object-picking";
import { validBasis, skyProjectionScale } from "./sky-view-projection";

/** Facts for one exact scene frame. The caller supplies either its queued or
 * completed frame; this owner never borrows facts from a newer time intent.
 * A missing bright-star layer is distinct from a valid empty layer. */
export function skySceneFrameFacts(scene: ResolvedStellarScene | undefined, at: string | undefined) {
  const frame = resolveSkySceneFrame(scene, at);
  return {
    frameAt: frame?.at ?? at ?? "",
    catalogVersion: scene?.catalog?.catalogVersion ?? "",
    starState: frame ? "AVAILABLE" as const : "UNAVAILABLE" as const,
    starCount: frame ? frame.points.length : null,
  };
}

/** Non-authoritative readback of the completed draw's camera, in logical
 * pixels and the existing ENU basis. Never replace it with a pending intent
 * or include the report, object list, source files or private context. */
export function skyPresentedViewFacts(snapshot: SkyPickSnapshot | null, at: string | undefined) {
  const view = snapshot?.view;
  if (!snapshot || !at || snapshot.frameAt !== at || !view || !validBasis(view.basis) ||
    ![snapshot.width, snapshot.height].every(value => Number.isFinite(value) && value > 0)) return null;
  const scale = skyProjectionScale(snapshot.height, view.verticalFovDeg);
  const center = view.center ?? { x: snapshot.width / 2, y: snapshot.height / 2 };
  if (scale === null || ![center.x, center.y].every(Number.isFinite)) return null;
  return { frameAt: snapshot.frameAt, width: snapshot.width, height: snapshot.height,
    basis: { right: view.basis.right, up: view.basis.up, forward: view.basis.forward },
    verticalFovDeg: view.verticalFovDeg, center: { x: center.x, y: center.y }, scale };
}
