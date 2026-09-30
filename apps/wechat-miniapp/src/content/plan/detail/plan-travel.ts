import type { PlanTravel, PlanTravelMode } from "@starward/miniapp-contracts";

const labels: Record<PlanTravelMode, string> = {
  DRIVING: "驾车",
  TRANSIT: "公共交通",
  WALKING: "步行",
};

export const emptyPlanTravel = (origin = ""): PlanTravel => ({ origin, mode: "DRIVING" });
export const planTravelModeLabel = (mode: PlanTravelMode) => labels[mode];
export const planTravelMatchesRouteOrigin = (travel: PlanTravel | undefined, origin: string | null) =>
  Boolean(travel && origin && travel.origin.trim() === origin.trim());

/** Older drafts could copy a Map context label into a user-owned departure field. */
export const planTravelNeedsExplicitOrigin = (travel: PlanTravel, routeOrigin: string | null) => {
  if (travel.originLocation !== undefined) return false;
  const origin = travel.origin.trim();
  return origin === "当前地图中心" || origin === "本次授权位置" ||
    Boolean(routeOrigin && origin === routeOrigin.trim());
};
