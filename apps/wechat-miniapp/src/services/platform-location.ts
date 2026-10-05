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
  let selected;
  try {
    selected = await Taro.chooseLocation(options.center ?? {});
  } catch (error) {
    // Classify the native result before product-copy translation loses its code.
    const message = error instanceof Error ? error.message
      : error && typeof error === "object" && "errMsg" in error ? error.errMsg : "";
    if (typeof message === "string" && /^chooseLocation:fail\s+cancel\b/iu.test(message)) return null;
    throw error;
  }
  if (!options.isCurrent()) return null;
  return normalizePlatformLocation(selected);
}
