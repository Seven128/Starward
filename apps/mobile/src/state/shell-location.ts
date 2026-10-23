import type { PreferenceLocation } from "@starward/domain/preferences/runtime";
export { restorePreferenceLocation as restoreShellLocation } from "@starward/domain/preferences/runtime";
export type { DeviceLocationFix } from "../native/permissions/location-fix";
export type LocationSource = PreferenceLocation["source"];
export type ShellLocation = PreferenceLocation;
