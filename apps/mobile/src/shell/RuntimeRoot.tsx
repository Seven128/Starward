import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type ReactNode, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { consumeNativeRouteIntent, useNativeRouteIntent } from "./native-route-store";
import { useStarwardTheme } from "./useStarwardTheme";
import { DesignEvidenceRuntimeProvider } from "./DesignEvidenceRuntime";

export default function RuntimeRoot({ children }: { children?: ReactNode }) {
  const nativeRouteIntent = useNativeRouteIntent();
  const { mode, palette } = useStarwardTheme();
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 60_000 },
      mutations: { retry: 0 },
    },
  }));

  useEffect(() => {
    const href = consumeNativeRouteIntent(nativeRouteIntent);
    if (href) router.replace(href as Parameters<typeof router.replace>[0]);
  }, [nativeRouteIntent]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.canvas }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <DesignEvidenceRuntimeProvider>
            <StatusBar
              animated={false}
              style={mode === "planning" ? "dark" : "light"}
            />
            {children ?? <Slot />}
          </DesignEvidenceRuntimeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
