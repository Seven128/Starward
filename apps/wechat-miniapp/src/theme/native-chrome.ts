import Taro from "@tarojs/taro";
import type { DisplayMode } from "@starward/miniapp-contracts";

import { NATIVE_CHROME_THEME } from "./design-tokens";

type ChromeRequest = {
  mode: DisplayMode;
  generation: number;
  waiters: Array<{ resolve(): void; reject(error: unknown): void }>;
};
let generation = 0;
let active = false;
let pending: ChromeRequest | undefined;
let latestMode: DisplayMode = "DAY";
const photoViewerOwners = new Set<symbol>();

/** Photos always use a dark surface; release restores the latest page theme. */
export function retainPhotoViewerNativeChrome() {
  const owner = Symbol("photo-viewer");
  photoViewerOwners.add(owner);
  let released = false;
  return {
    ready: syncNativeChrome(latestMode),
    release() {
      if (released) return Promise.resolve();
      released = true;
      photoViewerOwners.delete(owner);
      return syncNativeChrome(latestMode);
    },
  };
}

// Native writes cannot be cancelled. Finish every dispatched write before the
// next batch, and retain only the latest pending mode across page consumers.
export function syncNativeChrome(mode: DisplayMode): Promise<void> {
  latestMode = mode;
  return new Promise((resolve, reject) => {
    const nextGeneration = ++generation;
    if (pending) {
      pending.mode = mode;
      pending.generation = nextGeneration;
      pending.waiters.push({ resolve, reject });
    } else {
      pending = { mode, generation: nextGeneration, waiters: [{ resolve, reject }] };
    }
    if (!active) void drainChrome();
  });
}

async function drainChrome() {
  active = true;
  try {
    while (pending) {
      const request = pending;
      pending = undefined;
      try {
        await applyNativeChrome(request.mode, () => request.generation === generation);
        for (const waiter of request.waiters) waiter.resolve();
      } catch (error) {
        for (const waiter of request.waiters) waiter.reject(error);
      }
    }
  } finally {
    active = false;
  }
}

async function settleWrites(writes: Array<() => Promise<unknown>>) {
  // Reflect failures so Promise.all cannot retire a batch while other native
  // writes are still outstanding. This uses the existing Promise API surface.
  const results = await Promise.all(writes.map(async write => {
    try { await write(); return { ok: true as const }; }
    catch (error) { return { ok: false as const, error }; }
  }));
  const failed = results.find(result => !result.ok);
  if (failed && !failed.ok) throw failed.error;
}

async function applyNativeChrome(mode: DisplayMode, isCurrent: () => boolean) {
  const theme = NATIVE_CHROME_THEME[mode];
  // Sky remains dark in day mode; native status text must follow the surface.
  const isSky = Taro.getCurrentPages().at(-1)?.route === "sky/detail/index";
  const isPhotoViewer = photoViewerOwners.size > 0;
  const canvas = isPhotoViewer && mode !== "OBSERVATION" ? "#131419" : isSky && mode !== "OBSERVATION" ? "#080D17" : theme.canvas;
  const hasTabBar = () => {
    const route = Taro.getCurrentPages().at(-1)?.route;
    return route === "pages/map/index" || route === "pages/my/index";
  };
  const syncTabBar = async () => {
    if (!isCurrent() || !hasTabBar()) return;
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
    if (!isCurrent() || !hasTabBar()) return;
    const syncItem = async (options: Parameters<typeof Taro.setTabBarItem>[0]) => {
      try {
        await Taro.setTabBarItem(options);
      } catch (error) {
        // Navigation can win after dispatch. Tolerate this per item so one
        // non-tab rejection cannot conceal the other item's unexpected error.
        if (error && typeof error === "object" && "errMsg" in error &&
          error.errMsg === "setTabBarItem:fail not TabBar page") return;
        throw error;
      }
    };
    await settleWrites([
      () => syncItem({
        index: 0,
        iconPath: mode === "DAY" ? "assets/b-icons/weapp-tabbar/map--day--default.png" : `assets/icons/tab-map${theme.suffix}.png`,
        selectedIconPath: mode === "DAY" ? "assets/b-icons/weapp-tabbar/map--day--selected.png" : `assets/icons/tab-map-selected${theme.suffix}.png`,
      }),
      () => syncItem({
        index: 1,
        iconPath: mode === "DAY" ? "assets/b-icons/weapp-tabbar/account-user--day--default.png" : `assets/icons/tab-my${theme.suffix}.png`,
        selectedIconPath: mode === "DAY" ? "assets/b-icons/weapp-tabbar/account-user--day--selected.png" : `assets/icons/tab-my-selected${theme.suffix}.png`,
      }),
    ]);
  };
  await settleWrites([
    () => Taro.setNavigationBarColor({
      frontColor: mode === "DAY" && !isSky && !isPhotoViewer ? "#000000" : "#ffffff",
      backgroundColor: canvas,
    }),
    () => Taro.setBackgroundColor({
      backgroundColor: canvas,
      backgroundColorTop: canvas,
      backgroundColorBottom: canvas,
    }),
    syncTabBar,
  ]);
}
