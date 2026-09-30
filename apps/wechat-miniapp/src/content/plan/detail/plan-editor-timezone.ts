import type { ObservationPlan, SpotId, SpotSummary } from "@starward/miniapp-contracts";

/** The editor validates and labels times in the selected destination's timezone. */
export function planEditorTimezone(input: {
  editing: boolean;
  selectedSpotId: SpotId | null;
  formalSpots: readonly Pick<SpotSummary, "spotId" | "timezone">[];
  activePlan: ObservationPlan | null;
  contextTimezone: string | null;
  contextSpotId: SpotId | null;
}): string | null {
  if (!input.editing) return input.activePlan?.contextSnapshot.timezone ?? null;
  if (!input.selectedSpotId) return null;
  return input.formalSpots.find(spot => spot.spotId === input.selectedSpotId)?.timezone ??
    (input.activePlan?.spotId === input.selectedSpotId ? input.activePlan.contextSnapshot.timezone : null) ??
    (input.contextSpotId === input.selectedSpotId ? input.contextTimezone : null);
}
