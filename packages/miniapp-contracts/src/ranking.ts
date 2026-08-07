import type { FacilityType, UserPreferences } from "./types.ts";

export type SpotRankingPreferences = Pick<
  UserPreferences,
  | "defaultPlace"
  | "experience"
  | "maxDriveMinutes"
  | "requiredFacilities"
  | "equipment"
  | "capturePreference"
>;

export interface PreferenceRankingDisclosure {
  applied: readonly string[];
  deferred: readonly string[];
  requiredFacilities: readonly FacilityType[];
  summary: string;
  changesFacts: false;
}
