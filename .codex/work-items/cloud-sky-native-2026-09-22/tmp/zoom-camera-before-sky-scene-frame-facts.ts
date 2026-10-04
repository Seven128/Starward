import { resolveSkySceneFrame, type ResolvedStellarScene } from "./sky-stellar-scene";

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
