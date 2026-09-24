import type { SpotDetail } from "@starward/miniapp-contracts";

export function spotRouteSummary(
  route: SpotDetail["route"] | undefined,
  detailPending: boolean,
  detailUnavailable: boolean,
) {
  if (route?.kind === "STRAIGHT_LINE_ONLY")
    return route.distanceKm !== null
      ? `直线距离约 ${route.distanceKm} km`
      : "暂无数据";
  if (detailPending) return "正在加载距离信息";
  if (detailUnavailable) return "距离暂未获取";
  return "暂无数据";
}
