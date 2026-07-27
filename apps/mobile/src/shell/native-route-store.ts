import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { useSyncExternalStore } from "react";
import { normalizeApplicationPathname } from "./application-route";

let currentUrl: string | null = null;
let currentRevision = 0;
let consumedRevision = 0;
const listeners = new Set<() => void>();

function publish(url: string | null, replay = false) {
  if (!url || (!replay && url === currentUrl)) return;
  currentUrl = url;
  currentRevision += 1;
  for (const listener of listeners) listener();
}

if (Platform.OS !== "web") {
  Linking.addEventListener("url", ({ url }) => publish(url, true));
  const syncLatestIntent = () => { void Linking.getInitialURL().then(publish); };
  syncLatestIntent();
  // Android may deliver a VIEW intent while the release bundle is still
  // starting, before the JavaScript URL listener has registered. Re-read the
  // Activity intent over one bounded startup window so that an early deep link
  // is not silently replaced by the default shell route.
  for (const delayMs of [250, 750, 1_500, 3_000]) setTimeout(syncLatestIntent, delayMs);
}

export function useNativeRouteUrl() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => currentUrl,
    () => null,
  );
}

export function useNativeRouteIntent() {
  const revision = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => currentRevision,
    () => 0,
  );
  return currentUrl ? { revision, url: currentUrl } : null;
}

export function resolveNativeRouteHref(url: string) {
  try {
    const parsed = new URL(url);
    const rawPath = parsed.pathname && parsed.pathname !== "/"
      ? parsed.pathname
      : parsed.hostname
        ? `/${parsed.hostname}`
        : "/";
    return `${normalizeApplicationPathname(rawPath)}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function consumeNativeRouteIntent(intent: { revision: number; url: string } | null) {
  if (!intent || intent.revision <= consumedRevision) return null;
  consumedRevision = intent.revision;
  return resolveNativeRouteHref(intent.url);
}
