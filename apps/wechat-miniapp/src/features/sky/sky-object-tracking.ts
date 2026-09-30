import type { CelestialObjectPositionData, SpotSkyContext } from "@starward/miniapp-contracts";
import type { SkyObjectIdentity } from "./sky-object-picking";
import { skyObjectPositionIsCurrent } from "./sky-object-location";

export interface SkyObjectTrackingState {
  target: SkyObjectIdentity | null;
  spotId: string | null;
  position: CelestialObjectPositionData | null;
}

/** A page-session user intent, separate from sensor calibration and time.
 * Checkpoints participate in the existing cancelable sky gesture transaction. */
export function createSkyObjectTracking() {
  let state: SkyObjectTrackingState = { target: null, spotId: null, position: null };
  return {
    snapshot: () => state,
    start(target: SkyObjectIdentity, spotId: string) {
      state = { target: Object.freeze({ ...target }), spotId, position: null };
      return state;
    },
    stop() { state = { target: null, spotId: null, position: null }; return state; },
    restore(checkpoint: SkyObjectTrackingState) { state = checkpoint; return state; },
    accept(data: CelestialObjectPositionData, context: SpotSkyContext | undefined, at: string | undefined,
      catalog: { catalogVersion: string; catalogHash: string } | null) {
      if (!state.target || state.target.reference !== data.reference || state.spotId !== context?.spotId ||
        !skyObjectPositionIsCurrent(data, context, at, catalog)) return false;
      state = { ...state, position: data };
      return true;
    },
  };
}
