import { zonedLocalToUtc, type ObservationPlan } from "@starward/miniapp-contracts";

export interface EndedPlanRecord {
  plan: ObservationPlan;
  endedAtUtc: string;
  year: number;
}

/** A plan ending is a calendar fact, never proof of a visit or observation. */
export function endedPlanRecords(plans: readonly ObservationPlan[], now = new Date()): EndedPlanRecord[] {
  const byId = new Map<string, EndedPlanRecord>();
  for (const plan of plans) {
    if (!plan.timing || !plan.planId || !plan.spotId) continue;
    try {
      const endedAtUtc = zonedLocalToUtc({
        localDate: plan.timing.endLocalDate,
        localTime: plan.timing.endLocalTime,
        timezone: plan.contextSnapshot.timezone,
      });
      if (Date.parse(endedAtUtc) > now.getTime()) continue;
      const record = { plan, endedAtUtc, year: Number(plan.timing.endLocalDate.slice(0, 4)) };
      const previous = byId.get(plan.planId);
      if (!previous || previous.plan.revision < plan.revision) byId.set(plan.planId, record);
    } catch { /* An invalid legacy wall time is not a completed plan. */ }
  }
  return [...byId.values()].sort((left, right) => right.endedAtUtc.localeCompare(left.endedAtUtc) || left.plan.planId.localeCompare(right.plan.planId));
}

export function achievementSummary(records: readonly EndedPlanRecord[]) {
  return {
    endedPlans: records.length,
    places: new Set(records.map(record => record.plan.spotId)).size,
    events: new Set(records.flatMap(record => record.plan.eventOccurrenceIds ?? [])).size,
  };
}
