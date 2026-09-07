import Taro from "@tarojs/taro";
import type { DisplayMode } from "@starward/miniapp-contracts";

import { NATIVE_CHROME_THEME } from "./design-tokens";

export async function syncNativeChrome(mode: DisplayMode) {
  const theme = NATIVE_CHROME_THEME[mode];
  const hasTabBar = () => {
    const route = Taro.getCurrentPages().at(-1)?.route;
    return route === "pages/map/index" || route === "pages/my/index";
  };
  const syncTabBar = async () => {
    if (!hasTabBar()) return;
    try {
      await Taro.setTabBarStyle({
        color: theme.color,
        selectedColor: theme.selectedColor,
        backgroundColor: theme.backgroundColor,
        borderStyle: theme.borderStyle,
      });
    } catch (error) {
      // Child routes have no tab bar. Their page background still updates;
      // useThemeClass reapplies the current mode when a primary page shows.
      if (
        error && typeof error === "object" && "errMsg" in error &&
        error.errMsg === "setTabBarStyle:fail not TabBar page"
      ) return;
      throw error;
    }
    if (!hasTabBar()) return;
    await Promise.all([
      Taro.setTabBarItem({
        index: 0,
        iconPath: `assets/icons/tab-map${theme.suffix}.png`,
        selectedIconPath: `assets/icons/tab-map-selected${theme.suffix}.png`,
      }),
      Taro.setTabBarItem({
        index: 1,
        iconPath: `assets/icons/tab-my${theme.suffix}.png`,
        selectedIconPath: `assets/icons/tab-my-selected${theme.suffix}.png`,
      }),
    ]).catch((error: unknown) => {
      // Native dispatch can outlive the route check above when navigation wins
      // the race. A tab page's next onShow reapplies its current icons.
      if (error && typeof error === "object" && "errMsg" in error &&
        error.errMsg === "setTabBarItem:fail not TabBar page") return;
      throw error;
    });
  };
  await Promise.all([
    Taro.setNavigationBarColor({
      frontColor: mode === "DAY" ? "#000000" : "#ffffff",
      backgroundColor: theme.canvas,
    }),
    Taro.setBackgroundColor({
      backgroundColor: theme.canvas,
      backgroundColorTop: theme.canvas,
      backgroundColorBottom: theme.canvas,
    }),
    syncTabBar(),
  ]);
}
