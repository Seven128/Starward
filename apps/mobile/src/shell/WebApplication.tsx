import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
  if (typeof window === "undefined") return { pathname: "/", fixture: undefined };
  const url = new URL(window.location.href);
  return {
    pathname: url.pathname.replace(/\/$/u, "") || "/",
    fixture: url.searchParams.get("acceptanceFixture") ?? undefined,
  };
}

function CurrentScreen() {
  const { pathname, fixture } = currentLocation();
  if (pathname === "/forecast") return <ForecastScreen />;
  if (pathname === "/profile") return <ProfilePrivacyScreen fixture={fixture} />;
  if (pathname === "/tonight") return <TonightScreen fixture={fixture} />;
  if (pathname === "/map") return <MapScreen />;
  if (pathname === "/spots/fixture-spot") return <SpotScreen fixture={fixture} />;
  if (pathname === "/plans") return <ItineraryScreen fixture={fixture} />;
  if (pathname === "/sky") return <SkyScreen fixture={fixture} />;
  if (pathname === "/shooting") return <ShootingScreen fixture={fixture} />;
  if (pathname === "/field") return <FieldScreen fixture={fixture} />;
  if (pathname === "/community") return <CommunityScreen fixture={fixture} />;
  if (pathname === "/tools") return <ToolsScreen fixture={fixture} />;
  if (pathname === "/admin/operations") return <AdminOperationsScreen fixture={fixture} />;
  if (pathname === "/admin/quality") return <QualityScreen fixture={fixture} />;
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
