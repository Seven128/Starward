import { validBasis, type SkyVector, type SkyViewBasis } from "./sky-view-projection";
import { interpolateSkyView } from "./sky-view-rotation";

const smooth = (value: number) => value * value * (3 - 2 * value);
const bounded = (value: number) => Math.max(0, Math.min(1, value));
const RETURN_MS = 240;

/** Capture once, rather than inferring azimuth from a near-nadir forward ray
 * on every sensor sample. If the screen's horizontal axis is nearly vertical,
 * use its vertical axis as the orientation reference for this whole cycle.
 */
export function captureSkyDomeTarget(view: SkyViewBasis): SkyViewBasis {
  const length = Math.hypot(view.right[0], view.right[1]);
  let right: SkyVector;
  if (length > 0.25) {
    right = [view.right[0] / length, view.right[1] / length, 0];
  } else {
    const upLength = Math.hypot(view.up[0], view.up[1]);
    right = [-view.up[1] / upLength, view.up[0] / upLength, 0];
  }
  return { right, up: [right[1], -right[0], 0], forward: [0, 0, 1] };
}

interface OverviewPath {
  readonly local: SkyViewBasis;
  readonly from: SkyViewBasis;
  readonly target: SkyViewBasis;
  readonly fromProgress: number;
}
interface CameraState {
  readonly phase: "local" | "overview" | "returning";
  readonly view: SkyViewBasis | null;
  readonly progress: number;
  readonly path: OverviewPath | null;
  readonly returnElapsed: number;
}
export interface SkyBrowsingCameraFrame {
  /** Already aligned and smoothed by the existing orientation owner, or the
   * current manual view. Null means unavailable, never a substitute direction. */
  readonly localView: SkyViewBasis | null;
  readonly intent: "follow" | "manual" | "locked";
  readonly progress: number;
  readonly at: number;
  readonly reducedMotion?: boolean;
}

/** Independent browsing state; it never writes sensor/alignment state. Caller
 * drives frames while `animating` and supplies one shared result to all layers.
 * A wide view is a captured browsing cycle. Only local follow tracks a phone.
 */
export function createSkyBrowsingCamera() {
  let state: CameraState = { phase: "local", view: null, progress: 0, path: null, returnElapsed: 0 };
  let lastAt: number | null = null;
  let canReturn = false;
  const snapshot = () => ({ phase: state.phase, view: state.view, animating: state.phase === "returning" && canReturn });
  const pathView = (path: OverviewPath, progress: number): SkyViewBasis => {
    if (progress >= path.fromProgress) {
      return interpolateSkyView(path.from, path.target,
        smooth(path.fromProgress === 1 ? 1 : bounded((progress - path.fromProgress) / (1 - path.fromProgress))));
    }
    return interpolateSkyView(path.local, path.from, smooth(progress / path.fromProgress));
  };
  const capture = (view: SkyViewBasis, fromProgress: number): OverviewPath => ({
    local: view, from: view, fromProgress, target: captureSkyDomeTarget(view),
  });
  return {
    snapshot,
    /** An opaque checkpoint belongs to this page's gesture transaction. */
    checkpoint: () => state,
    restore(checkpoint: CameraState) { state = checkpoint; lastAt = null; canReturn = false; },
    suspend() { lastAt = null; canReturn = false; },
    /** Calibration owns the frozen direction and normal scale from this point. */
    freeze(view: SkyViewBasis | null) {
      state = { phase: "local", view: validBasis(view) ? view : state.view, progress: 0, path: null, returnElapsed: 0 };
      lastAt = null;
      return snapshot();
    },
    /** Explicit manual manipulation is allowed to change a captured browsing
     * view. It cancels follow recovery; the caller retains manual user intent. */
    pan(view: SkyViewBasis, progress: number) {
      if (!validBasis(view) || !Number.isFinite(progress)) return snapshot();
      const p = bounded(progress);
      const displayed = p === 1 ? captureSkyDomeTarget(view) : view;
      state = { phase: p > 0 ? "overview" : "local", view: displayed, progress: p,
        path: p > 0 ? capture(displayed, p) : null, returnElapsed: 0 };
      lastAt = null;
      return snapshot();
    },
    update(frame: SkyBrowsingCameraFrame) {
      if (!Number.isFinite(frame.at) || !Number.isFinite(frame.progress)) return snapshot();
      const elapsed = lastAt === null ? 0 : frame.at - lastAt;
      lastAt = frame.at;
      // Background gaps and out-of-order timestamps cannot advance a return.
      const step = elapsed > 0 && elapsed <= 100 ? elapsed : 0;
      const input = validBasis(frame.localView) ? frame.localView : null;
      canReturn = Boolean(input && frame.intent === "follow");
      if (frame.intent === "locked") {
        state = { phase: "local", view: input ?? state.view, progress: 0, path: null, returnElapsed: 0 };
        return snapshot();
      }
      const progress = bounded(frame.progress);
      if (progress > 0) {
        const start = state.view ?? input;
        if (!start) return snapshot();
        const path = state.phase === "overview" && state.path ? state.path : capture(start, 0);
        state = { phase: "overview", view: pathView(path, progress), progress, path, returnElapsed: 0 };
        return snapshot();
      }
      if (state.phase === "overview") {
        if (frame.intent === "manual") {
          state = { phase: "local", view: state.path!.local, progress: 0, path: null, returnElapsed: 0 };
          return snapshot();
        }
        state = { ...state, phase: "returning", progress: 0, path: null, returnElapsed: 0 };
        return snapshot();
      }
      if (state.phase === "returning" && frame.intent === "follow") {
        if (!input || !state.view) return snapshot();
        const nextElapsed = frame.reducedMotion ? RETURN_MS : Math.min(RETURN_MS, state.returnElapsed + step);
        const before = smooth(state.returnElapsed / RETURN_MS), after = smooth(nextElapsed / RETURN_MS);
        // Incremental remaining fraction follows the latest valid target without
        // recomputing a fixed-start shortest-arc branch on each sensor sample.
        const view = interpolateSkyView(state.view, input, (after - before) / (1 - before));
        state = { phase: nextElapsed === RETURN_MS ? "local" : "returning", view, progress: 0,
          path: null, returnElapsed: nextElapsed };
        return snapshot();
      }
      state = { phase: "local", view: input ?? state.view, progress: 0, path: null, returnElapsed: 0 };
      return snapshot();
    },
  };
}
