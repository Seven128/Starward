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

/** Shared custom-navigation clearance. Missing metrics must not erase CSS fallbacks. */
export function nativeNavigationInsets(runtime: {
  getWindowInfo: () => { windowWidth: number; statusBarHeight?: number };
  getMenuButtonBoundingClientRect: () => { bottom: number };
} = Taro): { statusBarHeight: number | undefined; safeTop: number | undefined } {
  let statusBarHeight: number | undefined;
  let safeTop: number | undefined;
  try {
    const info = runtime.getWindowInfo();
    if (Number.isFinite(info.statusBarHeight) && info.statusBarHeight! >= 0) {
      statusBarHeight = info.statusBarHeight;
      if (Number.isFinite(info.windowWidth) && info.windowWidth > 0)
        safeTop = statusBarHeight! + (info.windowWidth * 96) / 750;
    }
  } catch { /* Keep the stylesheet safe-area fallback. */ }
  try {
    const { bottom } = runtime.getMenuButtonBoundingClientRect();
    if (Number.isFinite(bottom) && bottom > 0)
      safeTop = Math.max(safeTop ?? 0, bottom + 4);
  } catch { /* Capsule geometry is optional on older runtimes. */ }
  return { statusBarHeight, safeTop };
}
