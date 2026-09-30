import type { SkyObjectIdentity } from "./sky-object-picking";

export interface SkyObjectSelectionState {
  readonly object: SkyObjectIdentity | null;
  readonly spotId: string | null;
}

/** Page-session selection intent. Closing a disclosure or changing zoom does
 * not clear it; location, projection and camera tracking keep their owners. */
export function createSkyObjectSelection() {
  let state: SkyObjectSelectionState = { object: null, spotId: null };
  return {
    snapshot: () => state,
    select(object: SkyObjectIdentity, spotId: string) {
      state = { object: Object.freeze({ reference: object.reference,
        displayName: object.displayName, kind: object.kind }), spotId };
      return state;
    },
    clear() { state = { object: null, spotId: null }; return state; },
  };
}
