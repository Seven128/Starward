import type { DisplayMode, FilterOptionId } from "@starward/miniapp-contracts";
import type { SemanticIconName } from "./semantic-asset";

// The strip and sheet present the same fourteen filter meanings. Unadopted
// modes retain their existing strip symbols; DAY consumes the current source.
const FILTER_ICONS: Record<FilterOptionId, { day: SemanticIconName; legacy: SemanticIconName }> = {
  lightPollution: { day: "bulb", legacy: "horizon" },
  lessCloud: { day: "cloud", legacy: "conditions" },
  parking: { day: "parking", legacy: "location" },
  restroom: { day: "restroom", legacy: "info" },
  driveUpAccess: { day: "plan-suv", legacy: "compass" },
  photoForeground: { day: "images", legacy: "images" },
  campingOvernightParking: { day: "tent", legacy: "location" },
  specificCelestialEvent: { day: "meteor", legacy: "horizon" },
  moonImpact: { day: "moon", legacy: "conditions" },
  hikingDifficulty: { day: "walking", legacy: "compass" },
  signal: { day: "signal", legacy: "wifi-off" },
  charging: { day: "charging", legacy: "info" },
  openSkyDirection: { day: "horizon", legacy: "horizon" },
  lastVerifiedAt: { day: "verified", legacy: "info" },
};

export const filterIconName = (id: FilterOptionId, mode: DisplayMode): SemanticIconName =>
  FILTER_ICONS[id][mode === "DAY" ? "day" : "legacy"];
