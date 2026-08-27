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
    canvas: "#F5F7FA",
    color: "#667085",
    selectedColor: "#536DFE",
    backgroundColor: "#FFFFFF",
    borderStyle: "white",
    suffix: "",
  },
  NIGHT: {
    canvas: "#050914",
    color: "#94A0B8",
    selectedColor: "#7E8FFF",
    backgroundColor: "#0B1222",
    borderStyle: "black",
    suffix: "-night",
  },
  OBSERVATION: {
    canvas: "#000000",
    color: "#C54438",
    selectedColor: "#FF3B30",
    backgroundColor: "#120000",
    borderStyle: "black",
    suffix: "-observation",
  },
};

export async function syncNativeChrome(mode: DisplayMode) {
  const theme = NATIVE_CHROME_THEME[mode];
  await Promise.all([
    Taro.setBackgroundColor({
      backgroundColor: theme.canvas,
      backgroundColorTop: theme.canvas,
      backgroundColorBottom: theme.canvas,
    }),
    Taro.setTabBarStyle({
      color: theme.color,
      selectedColor: theme.selectedColor,
      backgroundColor: theme.backgroundColor,
      borderStyle: theme.borderStyle,
    }),
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
}
