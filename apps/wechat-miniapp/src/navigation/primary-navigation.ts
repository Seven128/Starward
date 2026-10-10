import type { DisplayMode } from "@starward/miniapp-contracts";
import { NATIVE_CHROME_THEME } from "../theme/design-tokens";

export const PRIMARY_NAVIGATION_ITEMS = [
  { pagePath: "pages/map/index", text: "地图", icon: "primary-map" },
  { pagePath: "pages/my/index", text: "我的", icon: "primary-my" },
] as const;
export type PrimaryPageRoute = typeof PRIMARY_NAVIGATION_ITEMS[number]["pagePath"];
export type PrimaryNavigationIcon = typeof PRIMARY_NAVIGATION_ITEMS[number]["icon"];
export function isPrimaryPageRoute(route: string | undefined): route is PrimaryPageRoute {
  return PRIMARY_NAVIGATION_ITEMS.some(item => item.pagePath === route);
}

/** The native fallback and semantic adapter share the already packaged assets. */
export function primaryNavigationIconPath(icon: PrimaryNavigationIcon, mode: DisplayMode, selected: boolean) {
  const map = icon === "primary-map";
  if (mode === "DAY") {
    // The current Map source retains the default map bitmap when selected.
    const state = selected && !map ? "selected" : "default";
    return `assets/b-icons/weapp-tabbar/${map ? "map" : "account-user"}--day--${state}.png`;
  }
  return `assets/icons/tab-${map ? "map" : "my"}${selected ? "-selected" : ""}${NATIVE_CHROME_THEME[mode].suffix}.png`;
}

type WindowMetrics = {
  windowHeight?: number; screenHeight?: number;
  safeArea?: { bottom: number };
};

/** One geometry owner for the custom bar and both page consumers. */
export function primaryNavigationLayout(route: PrimaryPageRoute, info: WindowMetrics = {}) {
  const map = route === "pages/map/index";
  const row = map ? 46 : 52, top = map ? 7 : 0, bottom = map ? 18 : 24;
  const inset = Number.isFinite(info.screenHeight) && info.screenHeight! > 0 &&
    Number.isFinite(info.safeArea?.bottom) && info.safeArea!.bottom >= 0 &&
    info.safeArea!.bottom <= info.screenHeight!
    ? info.screenHeight! - info.safeArea!.bottom : undefined;
  const height = inset === undefined ? undefined : 1 + top + row + Math.max(bottom, inset);
  const pageHeight = height !== undefined && Number.isFinite(info.windowHeight) && info.windowHeight! > height
    ? info.windowHeight! - height : undefined;
  return {
    pageHeight,
    style: {
      "--primary-nav-row-height": `${row}px`,
      "--primary-nav-top": `${top}px`,
      "--primary-nav-bottom": inset === undefined ? `max(${bottom}px, env(safe-area-inset-bottom))` : `${Math.max(bottom, inset)}px`,
      "--primary-nav-height": height === undefined ? `calc(${1 + top + row}px + max(${bottom}px, env(safe-area-inset-bottom)))` : `${height}px`,
      "--primary-page-height": pageHeight === undefined ? "calc(100vh - var(--primary-nav-height))" : `${pageHeight}px`,
    },
  };
}
