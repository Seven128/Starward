import Taro from "@tarojs/taro";

/**
 * Return the native status-bar inset when WEAPP exposes a finite metric.
 * Callers retain their CSS safe-area fallback when this returns zero.
 */
export function nativeStatusBarHeightPx(): number {
  try {
    const height = Taro.getWindowInfo().statusBarHeight;
    return typeof height === "number" && Number.isFinite(height) && height >= 0
      ? height
      : 0;
  } catch {
    return 0;
  }
}
