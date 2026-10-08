import { MiniappApiError, errorMessage } from "@/services/api-client";

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
    const cause = rejection.code === "INVALID_INPUT"
      ? "当前观测信息无法用于这片星空" : errorMessage(rejection);
    return { reason: rejection.code, label: "重新核验",
      detail: `${cause}。所选地点与时刻已保留，可返回入口重新选择，或重新核验当前状态。` };
  }
  if (dataState === "EXPIRED" || dataState === "UNAVAILABLE")
    return { reason: dataState, label: "重新加载天空",
      detail: "天空资料已失效或暂不可用。所选地点与时刻已保留，可重新加载或返回入口。" };
  const cause = error ? errorMessage(error) : "天空资料暂不可用";
  return { reason: error instanceof MiniappApiError ? error.code : "TEMPORARY_FAILURE",
    label: hasUsableData ? "重试更新" : "重试天空",
    detail: hasUsableData ? `${cause}。当前保留已取得的有效星空，可重试更新。`
      : `${cause}。所选地点与时刻已保留，可稍后重试或返回入口。` };
}
