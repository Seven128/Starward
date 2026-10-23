import type { DisplayMode } from "@starward/miniapp-contracts";
import { NATIVE_CHROME_THEME } from "../theme/design-tokens";
import primaryNavigationDayIcons from "./primary-navigation-day-icons.json";

export const PRIMARY_NAVIGATION_ITEMS = [
  { pagePath: "pages/map/index", text: "地图", icon: "primary-map" },
  { pagePath: "pages/my/index", text: "我的", icon: "primary-my" },
] as const;
export type PrimaryPageRoute = typeof PRIMARY_NAVIGATION_ITEMS[number]["pagePath"];
export type PrimaryPageUrl = `/${PrimaryPageRoute}`;
export function isPrimaryPageRoute(route: string | undefined): route is PrimaryPageRoute {
  return PRIMARY_NAVIGATION_ITEMS.some(item => item.pagePath === route);
}
export function isPrimaryPageUrl(url: string): url is PrimaryPageUrl {
  return url.startsWith("/") && isPrimaryPageRoute(url.slice(1));
}

/** The My return entry keeps the existing Map icon in each display mode. */
export function primaryMapIconPath(mode: DisplayMode) {
  if (mode === "DAY") {
    return primaryNavigationDayIcons["primary-map"].default;
  }
  return `assets/icons/tab-map${NATIVE_CHROME_THEME[mode].suffix}.png`;
}

type WindowMetrics = {
  windowHeight?: number; screenHeight?: number;
  safeArea?: { bottom: number };
};

/** The native page fills its window; primary navigation reserves no bottom bar. */
export function primaryNavigationLayout(route: PrimaryPageRoute, info: WindowMetrics = {}) {
  const pageHeight = Number.isFinite(info.windowHeight) && info.windowHeight! > 0 ? info.windowHeight : undefined;
  return {
    pageHeight,
    style: {
      "--primary-page-height": pageHeight === undefined ? "100vh" : `${pageHeight}px`,
    },
  };
}
