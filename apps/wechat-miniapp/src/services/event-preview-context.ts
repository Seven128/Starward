import type { ObservationContext } from "@starward/miniapp-contracts";
import { observationContextRecoveryInput } from "./observation-context-recovery";

/** A modal preview owns a new date/context, never a mutation of the map or plan. */
export function eventPreviewContextInput(context: ObservationContext, localDate: string) {
  const { selectedAt: _selectedAt, ...location } = observationContextRecoveryInput(context, null);
  return { ...location, localDate, eventInstanceId: null, targetProfile: "DAILY" as const };
}
