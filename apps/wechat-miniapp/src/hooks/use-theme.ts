import { useEffect } from "react";
import { useDidShow } from "@tarojs/taro";
import { useAppStore } from "@/state/app-store";
import { syncNativeChrome } from "@/theme/native-chrome";
import { useReducedMotion } from "./use-reduced-motion";

function useThemeInputs() {
  const mode = useAppStore((state) => state.mode);
  const largeText = useAppStore((state) => state.preferences.largeText);
  const hydrate = useAppStore((state) => state.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  useEffect(() => {
    void syncNativeChrome(useAppStore.getState().mode).catch((error: unknown) => {
      console.warn("native_chrome_theme_sync_failed", error);
    });
  }, [mode]);
  useDidShow(() => {
    void syncNativeChrome(useAppStore.getState().mode).catch((error: unknown) => {
      console.warn("native_chrome_theme_sync_failed", error);
    });
  });
  return { mode, largeText };
}

function themeClass({ mode, largeText }: ReturnType<typeof useThemeInputs>, reducedMotion: boolean) {
  return `theme-page theme-${mode.toLowerCase()}${largeText ? " large-text" : ""}${reducedMotion ? " reduced-motion" : ""}`;
}

/** Existing account-only behavior retained for the excluded cloud-sky pages. */
export function useThemeClass() {
  const inputs = useThemeInputs();
  const reduced = useAppStore(state => state.preferences.reducedMotion);
  return themeClass(inputs, reduced);
}

/** In-scope pages consume the shared page probe; this hook never starts one. */
export function useMotionThemeClass() {
  const inputs = useThemeInputs();
  return themeClass(inputs, useReducedMotion());
}
