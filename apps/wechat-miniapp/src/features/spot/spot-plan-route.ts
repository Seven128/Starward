import type { ObservationPlan, SpotId } from "@starward/miniapp-contracts";

export function spotIdFromPlanRoute(value: string | undefined): SpotId | null {
  if (!value) return null;
  try {
    const decoded = decodeURIComponent(value);
    return decoded.length <= 200 && !/[\s\p{Cc}]/u.test(decoded) ? decoded as SpotId : null;
  } catch { return null; }
}

export function spotPlanRoute(spotId: SpotId, plans: readonly ObservationPlan[]) {
  const associated = plans.filter(plan => plan.spotId === spotId);
  return {
    count: associated.length,
    label: associated.length ? "观星计划" : "去这观星",
    url: associated.length === 1
      ? `/content/plan/detail/index?planId=${encodeURIComponent(associated[0]!.planId)}`
      : associated.length
        ? `/content/plan/list/index?spotId=${encodeURIComponent(spotId)}`
        : `/content/plan/edit/index?new=1&spotId=${encodeURIComponent(spotId)}`,
  };
}
