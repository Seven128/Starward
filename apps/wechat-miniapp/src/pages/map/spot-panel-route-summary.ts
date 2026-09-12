import type { SpotDetail } from "@starward/miniapp-contracts";

export function spotRouteSummary(
  route: SpotDetail["route"] | undefined,
  detailAvailable: boolean,
  detailPending: boolean,
) {
  if (route?.kind === "ROUTE_ESTIMATE")
    return [
      route.distanceKm !== null ? `${route.distanceKm} km` : null,
      route.driveMinutes !== null ? `驾车约${route.driveMinutes}分钟` : null,
      route.walkingMinutes !== null ? `步行${route.walkingMinutes}分钟` : null,
    ].filter(Boolean).join(" · ") || "路线结果暂不完整";
  if (route?.kind === "STRAIGHT_LINE_ONLY")
    return route.distanceKm !== null
      ? `直线距离约 ${route.distanceKm} km`
      : "直线距离暂无数据";
  if (detailPending) return "正在加载路线信息";
  return detailAvailable ? "路线服务暂不可用" : "路线暂无数据";
}
