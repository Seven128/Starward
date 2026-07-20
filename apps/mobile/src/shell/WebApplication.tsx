import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ForecastScreen } from "../features/forecast/ForecastScreen";
import { ProfilePrivacyScreen } from "../features/profile/ProfilePrivacyScreen";
import { TonightScreen } from "../features/tonight/TonightScreen";
import { MapScreen } from "../features/map/MapScreen";
import { SpotScreen } from "../features/spots/SpotScreen";
import { ItineraryScreen } from "../features/itinerary/ItineraryScreen";
import { SkyScreen } from "../features/sky/SkyScreen";
import { ShootingScreen } from "../features/shooting/ShootingScreen";
import { FieldScreen } from "../features/field/FieldScreen";
import { CommunityScreen } from "../features/community/CommunityScreen";
import { ToolsScreen } from "../features/notifications/ToolsScreen";
import { AdminOperationsScreen } from "../features/admin/AdminOperationsScreen";
import { QualityScreen } from "../features/admin/QualityScreen";
import { MobileShellScreen } from "./MobileShellScreen";

function currentLocation() {
  if (Platform.OS !== "web" || typeof window === "undefined") return { pathname: "/" };
  const url = new URL(window.location.href);
  return {
    pathname: url.pathname.replace(/\/$/u, "") || "/",
  };
}

function CurrentScreen() {
  const { pathname } = currentLocation();
  if (pathname === "/forecast") return <ForecastScreen />;
  if (pathname === "/profile") return <ProfilePrivacyScreen />;
  if (pathname === "/tonight") return <TonightScreen />;
  if (pathname === "/map") return <MapScreen />;
  if (pathname === "/spots/current" || pathname === "/spots") return <SpotScreen />;
  if (pathname === "/plans") return <ItineraryScreen />;
  if (pathname === "/sky") return <SkyScreen />;
  if (pathname === "/shooting") return <ShootingScreen />;
  if (pathname === "/field") return <FieldScreen />;
  if (pathname === "/community") return <CommunityScreen />;
  if (pathname === "/tools") return <ToolsScreen />;
  if (pathname === "/admin/operations") return <AdminOperationsScreen />;
  if (pathname === "/admin/quality") return <QualityScreen />;
  return <MobileShellScreen />;
}

export function WebApplication() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 60_000 },
      mutations: { retry: 0 },
    },
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <CurrentScreen />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
