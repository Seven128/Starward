import type { UserPreferences } from "./types.ts";

export const DEFAULT_USER_PREFERENCES: Readonly<UserPreferences> = Object.freeze({
  defaultPlace: "深圳",
  locationPreference: "ASK_ONCE",
  experience: "BEGINNER",
  maxDriveMinutes: 180,
  requiredFacilities: [],
  equipment: "未设置",
  capturePreference: "目视与手机",
  displayMode: "DAY",
  notificationEnabled: false,
  largeText: false,
  reducedMotion: false,
});

export function cloneUserPreferences(
  preferences: Readonly<UserPreferences>,
): UserPreferences {
  return {
    ...preferences,
    requiredFacilities: [...preferences.requiredFacilities],
  };
}

export interface UserPreferencesRecord {
  preferences: UserPreferences;
  revision: number;
  updatedAt: string;
}
