import Taro from "@tarojs/taro";
import type { DisplayMode } from "@starward/miniapp-contracts";

import { NATIVE_CHROME_THEME } from "./design-tokens";

type ChromeRequest = {
  mode: DisplayMode;
  waiters: Array<{ resolve(): void; reject(error: unknown): void }>;
};
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
    if (pending) {
      pending.mode = mode;
      pending.waiters.push({ resolve, reject });
    } else {
      pending = { mode, waiters: [{ resolve, reject }] };
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
        await applyNativeChrome(request.mode);
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

async function applyNativeChrome(mode: DisplayMode) {
  const theme = NATIVE_CHROME_THEME[mode];
  // Sky remains dark in day mode; native status text must follow the surface.
  const isSky = Taro.getCurrentPages().at(-1)?.route === "sky/detail/index";
  const isPhotoViewer = photoViewerOwners.size > 0;
  const canvas = isPhotoViewer && mode !== "OBSERVATION" ? "#131419" : isSky && mode !== "OBSERVATION" ? "#080D17" : theme.canvas;
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
  ]);
}
