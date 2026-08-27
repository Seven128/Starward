import type {
  ObservationContext,
  SpotId,
} from "@starward/miniapp-contracts";

export function resolvePlanSaveSpotId(input: {
  selectedSpotId: SpotId | null;
  formalSpotIds: readonly SpotId[];
  activePlanSpotId: SpotId | null;
  contextLocation: ObservationContext["location"];
}): SpotId | null {
  const selected = input.selectedSpotId;
  if (!selected) return null;
  if (input.formalSpotIds.includes(selected)) return selected;
  if (input.activePlanSpotId === selected) return selected;
  if (
    input.contextLocation.kind === "FORMAL_SPOT" &&
    input.contextLocation.spotId === selected
  )
    return selected;
  return null;
}
