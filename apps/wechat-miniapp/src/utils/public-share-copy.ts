import type { PlanPublicShareData } from "@starward/miniapp-contracts";

/** Shared trip-card and Canvas text, including older servers without the status field. */
export function planSpotRiskMessage(status: PlanPublicShareData["spotStatus"]): string | null {
  if (status === "TEMPORARILY_CLOSED") return "此观星点暂时关闭，请勿按旧行程进入。";
  if (status !== "PUBLISHED") return "地点开放状态暂未确认，请出发前核实。";
  return null;
}
