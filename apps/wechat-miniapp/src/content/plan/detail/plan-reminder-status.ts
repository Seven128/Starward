import type { PlanReminderNotificationStatus } from "@starward/miniapp-contracts";

export function planReminderStatusLabel(status?: PlanReminderNotificationStatus) {
  if (!status) return "通知状态读取中";
  switch (status.state) {
    case "NOT_REQUESTED": return "通知未开启";
    case "CAPABILITY_UNAVAILABLE": return "通知当前不可开通";
    case "AUTHORIZATION_REQUIRED": return "通知未授权";
    case "SCHEDULED": return "待发送";
    case "SENT": return "已发送";
    case "SKIPPED": return status.reason === "DEPARTURE_EXPIRED" ? "出发时间已过" : "已错过发送时间";
    case "FAILED": return "发送失败";
    case "RESULT_UNKNOWN": return "结果待确认";
  }
}

export function planReminderStatusDetail(status?: PlanReminderNotificationStatus) {
  if (!status) return "提醒清单不受通知状态影响。";
  if (status.state === "CAPABILITY_UNAVAILABLE") return "微信通知服务尚未接通；清单仍可保存和勾选。";
  if (status.state === "AUTHORIZATION_REQUIRED") return "需要由用户点击并完成微信订阅授权。";
  if (status.state === "SCHEDULED" && status.triggerAtUtc) return `计划在 ${status.triggerAtUtc} 触发；发送前仍会复核计划版本与授权。`;
  if (status.state === "RESULT_UNKNOWN") return "尚无法确认发送结果；为避免重复通知，不会自动重发。";
  return "提醒清单不受通知状态影响。";
}
