import { zonedLocalToUtc, type ObservationPlan } from "@starward/miniapp-contracts";

export interface EndedPlanRecord {
  plan: ObservationPlan;
  endedAtUtc: string;
  year: number;
}

function latestPlans(plans: readonly ObservationPlan[]) {
  const latestById = new Map<string, ObservationPlan>();
  for (const plan of plans) {
    if (!plan.planId) continue;
    const previous = latestById.get(plan.planId);
    if (!previous || previous.revision < plan.revision) latestById.set(plan.planId, plan);
  }
  return latestById.values();
}

function planEndAt(plan: ObservationPlan): number | null {
  if (!plan.timing || !plan.spotId) return null;
  try {
    const end = Date.parse(zonedLocalToUtc({
      localDate: plan.timing.endLocalDate,
      localTime: plan.timing.endLocalTime,
      timezone: plan.contextSnapshot.timezone,
    }));
    return Number.isFinite(end) ? end : null;
  } catch { return null; }
}

/** The visible achievement page can refresh exactly when a plan becomes ended. */
export function nextPlanEndAt(plans: readonly ObservationPlan[], now: Date): number | null {
  let next: number | null = null;
  for (const plan of latestPlans(plans)) {
    const end = planEndAt(plan);
    if (end !== null && end > now.getTime() && (next === null || end < next)) next = end;
  }
  return next;
}

/** A plan ending is a calendar fact, never proof of a visit or observation. */
export function endedPlanRecords(plans: readonly ObservationPlan[], now = new Date()): EndedPlanRecord[] {
  const records: EndedPlanRecord[] = [];
  for (const plan of latestPlans(plans)) {
    const end = planEndAt(plan);
    if (end === null || end > now.getTime()) continue;
    const record = { plan, endedAtUtc: new Date(end).toISOString(), year: Number(plan.timing!.endLocalDate.slice(0, 4)) };
    records.push(record);
  }
  return records.sort((left, right) => right.endedAtUtc.localeCompare(left.endedAtUtc) || left.plan.planId.localeCompare(right.plan.planId));
}

export function achievementSummary(records: readonly EndedPlanRecord[]) {
  return {
    endedPlans: records.length,
    places: new Set(records.map(record => record.plan.spotId)).size,
    events: new Set(records.flatMap(record => record.plan.eventOccurrenceIds ?? [])).size,
  };
}
