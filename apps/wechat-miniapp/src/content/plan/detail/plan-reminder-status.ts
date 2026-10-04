import type { PlanReminderNotificationStatus } from "@starward/miniapp-contracts";
import { calendarDateInTimezone, clockTimeInTimezone } from "../../../utils/zoned-date";

export function canAuthorizePlanReminder(status: PlanReminderNotificationStatus | undefined, planRevision: number, requested: boolean) {
  return requested && status?.state === "AUTHORIZATION_REQUIRED" && status.planRevision === planRevision && Boolean(status.scheduleVersion);
}

export function planReminderRecoveryAction(status:PlanReminderNotificationStatus|undefined,planRevision:number,requested:boolean) {
  if(!requested || status?.state!=='CAPABILITY_UNAVAILABLE' || status.planRevision!==planRevision || !status.scheduleVersion)return null;
  return status.reason==='DELIVERY_IDENTITY_REQUIRED' ? 'VERIFY_IDENTITY'
    : status.reason==='REMINDER_TITLE_NOT_SUPPORTED' ? 'EDIT_TITLE' : null;
}

export function planReminderStatusLabel(status?: PlanReminderNotificationStatus) {
  if (!status) return "通知状态读取中";
  switch (status.state) {
    case "NOT_REQUESTED": return "通知未开启";
    case "CAPABILITY_UNAVAILABLE": return status.reason==='DELIVERY_IDENTITY_REQUIRED' ? '需验证微信身份'
      : status.reason==='REMINDER_TITLE_NOT_SUPPORTED' ? '需修改提醒标题'
      : status.reason==='SPOT_NAME_NOT_SUPPORTED' ? '通知地点资料暂不可用' : "通知当前不可开通";
    case "AUTHORIZATION_REQUIRED": return "通知未授权";
    case "SCHEDULED": return "待发送";
    case "SENT": return "已发送";
    case "SKIPPED": return status.reason === "DEPARTURE_TIME_REQUIRED" ? "需补充出发时间"
      : status.reason === "DEPARTURE_EXPIRED" ? "出发时间已过"
      : status.reason === "TRIGGER_MISSED" ? "已错过发送时间" : "本次通知已跳过";
    case "FAILED": return "发送失败";
    case "RESULT_UNKNOWN": return "结果待确认";
  }
}

export function planReminderStatusDetail(status?: PlanReminderNotificationStatus, timezone?: string) {
  if (!status) return "提醒清单不受通知状态影响。";
  if (status.state === "NOT_REQUESTED") return "本组未开启微信通知；清单仍可保存和勾选。";
  if (status.state === "CAPABILITY_UNAVAILABLE") return status.reason==='DELIVERY_IDENTITY_REQUIRED'
    ? '当前账户的微信接收身份需要重新验证。验证只更新接收身份，不代表已订阅或已发送；清单仍可使用。'
    : status.reason==='REMINDER_TITLE_NOT_SUPPORTED'
    ? '本组提醒标题不符合当前微信通知要求。请编辑为不超过20个字符的非空标题，避免换行或控制字符；不会自动截短你的内容，清单仍可使用。'
    : status.reason==='SPOT_NAME_NOT_SUPPORTED'
    ? '地点名称暂不符合当前通知要求，当前无法申请本组授权。请稍后重新读取通知状态；清单和已保存计划仍可使用。'
    : "微信通知服务尚未接通；清单仍可保存和勾选。";
  if (status.state === "AUTHORIZATION_REQUIRED") return "需要由用户点击并完成微信订阅授权。";
  if (status.state === "SCHEDULED") {
    let trigger = "触发时间暂不可用";
    if (status.triggerAtUtc && timezone) {
      try {
        const date = new Date(status.triggerAtUtc);
        trigger = `计划在 ${calendarDateInTimezone(date, timezone)} ${clockTimeInTimezone(date, timezone)}（${timezone}）触发`;
      } catch { /* Keep unavailable time distinct from a guessed device-local time. */ }
    }
    return `${trigger}；发送前仍会复核计划版本与授权。`;
  }
  if (status.state === "SENT") return "微信发送接口已接受本次通知，不代表你已收到或阅读。清单仍可使用。";
  if (status.state === "SKIPPED") {
    if (status.reason === "DEPARTURE_TIME_REQUIRED") return "缺少有效出发时间，请编辑计划补充出发时间后保存。清单仍可使用。";
    if (status.reason === "DEPARTURE_EXPIRED") return "出发时间已过，本次通知已跳过，不补发过时通知。清单仍可使用。";
    if (status.reason === "TRIGGER_MISSED") return "已错过本次触发时间，不补发过时通知。清单仍可使用。";
    return "本次通知已跳过，清单仍可使用。";
  }
  if (status.state === "FAILED") return status.reason === "PROVIDER_NOT_ATTEMPTED"
    ? "本次未能发起发送，不能视为已送达。清单仍可使用。"
    : "本次发送失败，不能视为已送达。清单仍可使用。";
  if (status.state === "RESULT_UNKNOWN") return "尚无法确认发送结果；为避免重复通知，不会自动重发。";
  return "提醒清单不受通知状态影响。";
}
