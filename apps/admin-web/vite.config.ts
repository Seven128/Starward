import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const platformBoundaryPresent = existsSync(path.join(repositoryRoot, "packages/contracts/src/platform-boundary.ts"));
const integratedOutcomeCarriers = {
  "mobile-shell-and-preferences": "apps/mobile/src/shell/MobileShellScreen.tsx",
  "forecast-and-astronomy": "apps/mobile/src/features/forecast/ForecastScreen.tsx",
  "identity-profile-privacy": "apps/mobile/src/features/profile/ProfilePrivacyScreen.tsx",
  "tonight-decision": "apps/mobile/src/features/tonight/TonightScreen.tsx",
  "map-route-discovery": "apps/mobile/src/features/map/MapScreen.tsx",
  "notifications-and-toolbox": "apps/mobile/src/features/notifications/ToolsScreen.tsx",
  "field-offline-safety": "apps/mobile/src/features/field/FieldScreen.tsx",
  "itinerary-and-collaboration": "apps/mobile/src/features/itinerary/ItineraryScreen.tsx",
  "community-contribution": "apps/mobile/src/features/community/CommunityScreen.tsx",
  "shooting-assistant": "apps/mobile/src/features/shooting/ShootingScreen.tsx",
  "quality-release-observability": "apps/mobile/src/features/admin/QualityScreen.tsx",
} as const;
const integratedOutcomes = Object.fromEntries(
  Object.entries(integratedOutcomeCarriers).map(([outcome, carrier]) => [outcome, existsSync(path.join(repositoryRoot, carrier))]),
);
const androidRuntimeCarrierPresent = existsSync(path.join(repositoryRoot, "apps/mobile/index.js"))
  && existsSync(path.join(repositoryRoot, "apps/mobile/android"));

export default defineConfig(() => ({
  plugins: [react()],
  define: {
    __STARWARD_PLATFORM_BOUNDARY_PRESENT__: JSON.stringify(platformBoundaryPresent),
    __STARWARD_INTEGRATED_OUTCOMES__: JSON.stringify(integratedOutcomes),
    __STARWARD_ANDROID_RUNTIME_CARRIER_PRESENT__: JSON.stringify(androidRuntimeCarrierPresent),
  },
  server: {
    proxy: process.env.STARWARD_API_BASE_URL
      ? { "/v2": { target: process.env.STARWARD_API_BASE_URL, changeOrigin: false } }
      : undefined,
  },
}));
