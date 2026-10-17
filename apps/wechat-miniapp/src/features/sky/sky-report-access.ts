import { MiniappApiError } from "@/services/api-client";

/** An authoritative rejection invalidates this report's scope. A transport or
 * provider outage does not invalidate independently usable cached astronomy. */
export function skyReportAccessRejection(error: unknown): MiniappApiError | null {
  if (!(error instanceof MiniappApiError)) return null;
  return error.code === "PERMISSION_DENIED" || error.code === "NOT_FOUND" ||
    error.code === "STALE_REJECTED" || error.code === "INVALID_INPUT"
    ? error : null;
}

/** Both the existing notification and recovery panel describe the same cause. */
export function skyReportRecovery(error: unknown, hasUsableData: boolean, dataState?: string) {
  const rejection = skyReportAccessRejection(error);
  if (rejection) {
    const detail = rejection.code === "PERMISSION_DENIED" ? "无权访问此地点，请从菜单返回"
      : rejection.code === "NOT_FOUND" ? "地点已失效，请从菜单返回重选"
        : rejection.code === "STALE_REJECTED" ? "观测时间已过期，请重新核验"
          : "地点或时间无效，请重新选择";
    return { reason: rejection.code, label: "重新核验",
      detail };
  }
  if (dataState === "EXPIRED" || dataState === "UNAVAILABLE")
    return { reason: dataState, label: "重新加载",
      detail: dataState === "EXPIRED" ? "天空资料已失效，请重新加载" : "天空资料暂不可用，请稍后重试" };
  return { reason: error instanceof MiniappApiError ? error.code : "TEMPORARY_FAILURE",
    label: hasUsableData ? "重试更新" : "重试天空",
    detail: hasUsableData ? "更新失败，保留已加载的星图" : "天空资料未加载，请重试" };
}
