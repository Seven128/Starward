import { useEffect } from "react";
import { useDidShow } from "@tarojs/taro";
import { useAppStore } from "@/state/app-store";
import { syncNativeChrome } from "@/theme/native-chrome";

export function useThemeClass() {
  const mode = useAppStore((state) => state.mode);
  const largeText = useAppStore((state) => state.preferences.largeText);
  const reducedMotion = useAppStore((state) => state.preferences.reducedMotion);
  const hydrate = useAppStore((state) => state.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  useEffect(() => {
    void syncNativeChrome(mode).catch((error: unknown) => {
      console.warn("tab_bar_theme_sync_failed", error);
    });
  }, [mode]);
  useDidShow(() => {
    void syncNativeChrome(useAppStore.getState().mode).catch((error: unknown) => {
      console.warn("tab_bar_theme_sync_failed", error);
    });
  });
  return `theme-page theme-${mode.toLowerCase()}${largeText ? " large-text" : ""}${reducedMotion ? " reduced-motion" : ""}`;
}
