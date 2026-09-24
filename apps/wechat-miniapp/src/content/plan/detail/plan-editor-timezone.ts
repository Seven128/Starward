import type { ObservationPlan, SpotId, SpotSummary } from "@starward/miniapp-contracts";

/** The editor validates and labels times in the selected destination's timezone. */
export function planEditorTimezone(input: {
  editing: boolean;
  selectedSpotId: SpotId | null;
  formalSpots: readonly Pick<SpotSummary, "spotId" | "timezone">[];
  activePlan: ObservationPlan | null;
  contextTimezone: string | null;
}): string {
  if (!input.editing) return input.activePlan?.contextSnapshot.timezone ?? input.contextTimezone ?? "Asia/Shanghai";
  return input.formalSpots.find(spot => spot.spotId === input.selectedSpotId)?.timezone ??
    (input.activePlan?.spotId === input.selectedSpotId ? input.activePlan.contextSnapshot.timezone : undefined) ??
    input.contextTimezone ?? "Asia/Shanghai";
}
