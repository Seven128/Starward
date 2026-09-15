import Taro from "@tarojs/taro";
import { useAppStore } from "@/state/app-store";
import { normalizePlatformLocation } from "./platform-location-result";

/** Consumers retain their own account, draft and page lifetime guards. */
export async function choosePlatformLocation(options: {
  isCurrent(): boolean;
  center?: { latitude: number; longitude: number };
}) {
  if (!options.isCurrent()) return null;
  if (useAppStore.getState().mode === "OBSERVATION") {
    const warning = await Taro.showModal({ title: "打开微信地图", content: "微信选点界面可能较亮，无法跟随红光模式。",
      confirmText: "继续", cancelText: "取消" });
    if (!options.isCurrent() || !warning.confirm) return null;
  }
  const selected = await Taro.chooseLocation(options.center ?? {});
  if (!options.isCurrent()) return null;
  return normalizePlatformLocation(selected);
}
