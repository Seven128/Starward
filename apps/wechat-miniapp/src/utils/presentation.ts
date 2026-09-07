import type { GuideArticle } from "@starward/miniapp-contracts";

export const GUIDE_AUTHOR_LABELS: Readonly<
  Record<GuideArticle["authorType"], string>
> = Object.freeze({
  OFFICIAL: "官方",
  WHITELIST: "已认证作者",
});

/** Preserve the source's calendar date without shifting it across timezones. */
export function formatDisplayDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/u.exec(value.trim());
  if (!match) return "日期未知";
  return `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日`;
}

/** Convert local transport/runtime failures to product copy, never raw codes. */
export function localFailureMessage(value: string): string {
  const message = value.trim().toLowerCase();
  if (!message) return "暂时无法完成此操作，请稍后重试";
  if (message.includes("cancel") || message.includes("abort"))
    return "操作已取消";
  if (message.includes("timeout")) return "请求超时";
  if (message.includes("showmodal:fail")) return "确认窗口未能打开，请重试";
  if (message.includes("writefile:fail") || message.includes("user_data_path_unavailable"))
    return "文件未能保存，请检查可用存储空间后重试";
  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("request:fail")
  )
    return "网络连接失败";
  if (message.includes("wechat_login_code_missing"))
    return "微信登录未完成";
  if (message.includes("night_requires_formal_spot_id"))
    return "请从正式观星点进入今晚夜空";
  return "暂时无法完成此操作，请稍后重试";
}
