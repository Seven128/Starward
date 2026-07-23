import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { useSyncExternalStore } from "react";

let currentUrl: string | null = null;
const listeners = new Set<() => void>();

function publish(url: string | null) {
  if (!url || url === currentUrl) return;
  currentUrl = url;
  for (const listener of listeners) listener();
}

if (Platform.OS !== "web") {
  Linking.addEventListener("url", ({ url }) => publish(url));
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
