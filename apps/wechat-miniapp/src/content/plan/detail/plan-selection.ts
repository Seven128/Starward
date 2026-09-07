import type { ObservationPlan, PlanId } from "@starward/miniapp-contracts";

export function planIdFromRoute(value: string | undefined): PlanId | null {
  if (!value) return null;
  try { return decodeURIComponent(value) as PlanId; }
  catch { return value as PlanId; }
}

export function initialPlanSelection(requestedId: PlanId | null, plans: readonly ObservationPlan[]) {
  const planId = requestedId ?? plans[0]?.planId ?? null;
  return { planId, plan: plans.find((plan) => plan.planId === planId) ?? null };
}
