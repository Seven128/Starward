import type { PreferenceLocation } from "@starward/domain/preferences/runtime";
export { restorePreferenceLocation as restoreShellLocation } from "@starward/domain/preferences/runtime";
export type { DeviceLocationFix } from "../native/permissions/location-fix";
export type LocationSource = PreferenceLocation["source"];
export type ShellLocation = PreferenceLocation;

/** One declared origin for UI, query demand and result admission, including the disclosed POC default. */
export function resolveShellOrigin(location: ShellLocation) {
  const hasCoordinates = Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
    && Math.abs(location.latitude!) <= 90 && Math.abs(location.longitude!) <= 180;
  return {
    latitude: hasCoordinates ? location.latitude! : 22.529,
    longitude: hasCoordinates ? location.longitude! : 113.9468,
    label: hasCoordinates ? location.label : "深圳南山（默认范围，尚未定位）",
    locationId: hasCoordinates ? `origin:${location.latitude},${location.longitude}` : "poc-default:shenzhen-nanshan",
    source: hasCoordinates ? "origin" as const : "poc-default" as const,
  };
}
