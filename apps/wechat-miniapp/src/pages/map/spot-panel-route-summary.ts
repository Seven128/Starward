import type { SpotDetail } from "@starward/miniapp-contracts";

export function spotRouteSummary(
  route: SpotDetail["route"] | undefined,
  _detailAvailable: boolean,
  detailPending: boolean,
) {
  if (route?.kind === "STRAIGHT_LINE_ONLY")
    return route.distanceKm !== null
      ? `直线距离约 ${route.distanceKm} km`
      : "暂无数据";
  if (detailPending) return "正在加载距离信息";
  return "暂无数据";
}
