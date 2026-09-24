import Taro from "@tarojs/taro";
import { useAppStore } from "@/state/app-store";
import { normalizePlatformLocation } from "./platform-location-result";

/** Consumers retain their own account, draft and page lifetime guards. */
export async function choosePlatformLocation(options: {
  isCurrent(): boolean;
  center?: { latitude: number; longitude: number };
  allowUnthemedHandoff?: boolean;
}) {
  if (!options.isCurrent()) return null;
  if (useAppStore.getState().mode === "OBSERVATION" && !options.allowUnthemedHandoff) return null;
  const selected = await Taro.chooseLocation(options.center ?? {});
  if (!options.isCurrent()) return null;
  return normalizePlatformLocation(selected);
}
