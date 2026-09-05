import Taro from "@tarojs/taro";
import type { DisplayMode } from "@starward/miniapp-contracts";

const NATIVE_CHROME_THEME: Record<
  DisplayMode,
  {
    canvas: string;
    color: string;
    selectedColor: string;
    backgroundColor: string;
    borderStyle: "black" | "white";
    suffix: string;
  }
> = {
  DAY: {
    canvas: "#FFFFFF",
    color: "#5E655F",
    selectedColor: "#4859B8",
    backgroundColor: "#FFFFFF",
    borderStyle: "white",
    suffix: "",
  },
  NIGHT: {
    canvas: "#11120F",
    color: "#989E94",
    selectedColor: "#D1D7FF",
    backgroundColor: "#181A17",
    borderStyle: "black",
    suffix: "-night",
  },
  OBSERVATION: {
    canvas: "#000000",
    color: "#D84A3C",
    selectedColor: "#FF6B58",
    backgroundColor: "#110000",
    borderStyle: "black",
    suffix: "-observation",
  },
};

export async function syncNativeChrome(mode: DisplayMode) {
  const theme = NATIVE_CHROME_THEME[mode];
  const syncTabBar = async () => {
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
    ]);
  };
  await Promise.all([
    Taro.setBackgroundColor({
      backgroundColor: theme.canvas,
      backgroundColorTop: theme.canvas,
      backgroundColorBottom: theme.canvas,
    }),
    syncTabBar(),
  ]);
}
