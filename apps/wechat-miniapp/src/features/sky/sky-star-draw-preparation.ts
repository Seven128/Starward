import type { DisplayMode } from "@starward/miniapp-contracts";
import type { SkyTransitionStar } from "./sky-star-transition";
import { isReusableSkyStellarFrame, type ResolvedStellarFrame, type ResolvedStellarScene,
  type ResolvedSkyReport } from "./sky-stellar-scene";
import { isReusableSkyStellarSupplementFrame, type SkyStellarSupplementFrame } from "./sky-stellar-supplement-scene";
import { validBasis, type SkyViewBasis } from "./sky-view-projection";
import type { SkyProjectionCenter } from "./sky-viewport";

type Visit = (star: SkyTransitionStar, projection: { readonly x: number; readonly y: number }) => void;
type Build = (visit: Visit) => void;
type Point = { star: SkyTransitionStar; projection: { readonly x: number; readonly y: number } };
interface View {
  canvas: object;
  context: ResolvedSkyReport["context"] | undefined;
  at: string | undefined;
  basis: SkyViewBasis;
  width: number;
  height: number;
  verticalFovDeg: number;
  center?: SkyProjectionCenter | undefined;
  mode: DisplayMode;
  sunAltitudeDeg: number | undefined;
}

/** One current Canvas/view only. These are pre-transition stars, never accepted
 * pixels or pick objects. Source admission lives with the existing resolvers;
 * mutable/legacy input executes the same build without retaining its output.
 * Every paint still applies transitions, picking/names and native submission. */
export function createSkyStarDrawPreparation() {
  let key: readonly unknown[] | null = null, revision = 0;
  let catalog: { source: ResolvedStellarScene["catalog"]; frame: ResolvedStellarFrame; points: Point[] } | null = null;
  let supplement: { frame: SkyStellarSupplementFrame; points: Point[] } | null = null;
  const reset = () => { key = null; catalog = null; supplement = null; revision++; };
  const replay = (points: readonly Point[], visit: Visit) => {
    for (const point of points) visit(point.star, point.projection);
  };
  const collect = (build: Build) => {
    const points: Point[] = [];
    build((star, projection) => { points.push({ star, projection }); });
    return points;
  };
  return {
    reset,
    prepare(view: View) {
      if (!validBasis(view.basis) || ![view.width,view.height,view.verticalFovDeg,
        view.center?.x??view.width/2,view.center?.y??view.height/2].every(Number.isFinite) ||
        view.width<=0 || view.height<=0 || view.verticalFovDeg<=0 || view.verticalFovDeg>=360 ||
        view.sunAltitudeDeg!==undefined&&(!Number.isFinite(view.sunAltitudeDeg)||Math.abs(view.sunAltitudeDeg)>90)) {
        reset(); return;
      }
      const context = view.context;
      const next = [view.canvas, context, context?.spotId, context?.contextId, context?.contextRevision,
        context?.contextFingerprint, context?.dataRevision, view.at,
        ...view.basis.right, ...view.basis.up, ...view.basis.forward,
        view.width, view.height, view.verticalFovDeg, view.center?.x ?? view.width / 2,
        view.center?.y ?? view.height / 2, view.mode, view.sunAltitudeDeg];
      if (!key || next.some((value, index) => !Object.is(value, key![index]))) {
        reset(); key = next;
      }
    },
    catalog(source: ResolvedStellarScene["catalog"], frame: ResolvedStellarFrame | undefined,
      build: Build, visit: Visit) {
      try {
        if (!key || !source || !frame || !isReusableSkyStellarFrame(frame)) {
          catalog = null; build(visit); return;
        }
        if (catalog?.source !== source || catalog.frame !== frame) {
          // Release before constructing B: a throw cannot revive prior A.
          catalog = null;
          const expected = revision, points = collect(build);
          if (revision !== expected) return;
          catalog = { source, frame, points };
        }
        replay(catalog.points, visit);
      } catch (error) { reset(); throw error; }
    },
    supplement(frame: SkyStellarSupplementFrame | null | undefined, build: Build, visit: Visit) {
      try {
        if (!key || !frame || !isReusableSkyStellarSupplementFrame(frame)) {
          supplement = null; build(visit); return;
        }
        if (supplement?.frame !== frame) {
          supplement = null;
          const expected = revision, points = collect(build);
          if (revision !== expected) return;
          supplement = { frame, points };
        }
        replay(supplement.points, visit);
      } catch (error) { reset(); throw error; }
    },
  };
}

export type SkyStarDrawPreparation = ReturnType<typeof createSkyStarDrawPreparation>;
