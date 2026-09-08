export const WINDOW_MS = 24 * 60 * 60 * 1000;
export function selectUpcomingPlans(plans, now) {
  const start = Number(now);
  if (!Number.isFinite(start)) return { visible: [], total: 0, hasMore: false };
  const eligible = plans.filter(p => {
    const at = Date.parse(p.selectedAt);
    return Number.isFinite(at) && at >= start && at <= start + WINDOW_MS;
  }).slice().sort((a,b) => Date.parse(a.selectedAt)-Date.parse(b.selectedAt) || a.planId.localeCompare(b.planId));
  return { visible: eligible.slice(0,3), total: eligible.length, hasMore: eligible.length > 3 };
}
