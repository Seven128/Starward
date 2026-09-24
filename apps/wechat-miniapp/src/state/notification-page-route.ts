import Taro from "@tarojs/taro";

export function currentNotificationPageRoute(): string | undefined {
  try {
    return Taro.getCurrentPages().at(-1)?.route?.replace(/^\/+/, "") || undefined;
  } catch {
    return undefined;
  }
}
