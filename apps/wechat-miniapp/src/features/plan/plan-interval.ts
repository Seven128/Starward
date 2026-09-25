import { zonedLocalToUtc, type ObservationPlan } from "@starward/miniapp-contracts";

type PlanTimeFields = Pick<ObservationPlan, "localDate" | "localTime" | "timing" | "contextSnapshot">;

/** One read boundary for saved observing time across My, lists and achievements. */
export function planInterval(plan: PlanTimeFields): { start: number; end: number | null } | null {
  try {
    const timezone = plan.contextSnapshot.timezone;
    const start = Date.parse(zonedLocalToUtc({ localDate: plan.localDate, localTime: plan.localTime, timezone }));
    if (!Number.isFinite(start) || start !== Date.parse(plan.contextSnapshot.selectedAtUtc)) return null;
    const end = plan.timing ? Date.parse(zonedLocalToUtc({
      localDate: plan.timing.endLocalDate, localTime: plan.timing.endLocalTime, timezone,
    })) : null;
    if (end !== null && (!Number.isFinite(end) || end <= start)) return null;
    return { start, end };
  } catch { return null; }
}
