import { coordinatesValid } from "../native/permissions/location-fix";
export type { DeviceLocationFix } from "../native/permissions/location-fix";
export type LocationSource = "unset" | "device" | "manual";

export interface ShellLocation {
  source: LocationSource;
  label: string;
  latitude?: number;
  longitude?: number;
  // Older saved locations have no accuracy/time provenance. Missing stays unknown.
  accuracyMeters?: number | null;
  timestampMs?: number;
  coordinateSystem?: "WGS84";
  mocked?: boolean;
}

export function restoreShellLocation(payload: Record<string, unknown>): ShellLocation | undefined {
  if (typeof payload.label !== "string" || !payload.label.trim()
    || !["unset", "device", "manual"].includes(String(payload.source))) return undefined;
  const location: ShellLocation = { source: payload.source as LocationSource, label: payload.label };
  if (payload.source === "device" && !coordinatesValid(payload.latitude, payload.longitude)) return undefined;
  if (coordinatesValid(payload.latitude, payload.longitude)) {
    location.latitude = payload.latitude as number;
    location.longitude = payload.longitude as number;
  }
  if (payload.coordinateSystem === "WGS84") location.coordinateSystem = "WGS84";
  else if (payload.coordinateSystem !== undefined) return undefined;
  if (payload.accuracyMeters === null || (typeof payload.accuracyMeters === "number" && Number.isFinite(payload.accuracyMeters) && payload.accuracyMeters >= 0)) {
    location.accuracyMeters = payload.accuracyMeters;
  }
  if (typeof payload.timestampMs === "number" && Number.isFinite(payload.timestampMs) && payload.timestampMs >= 0) location.timestampMs = payload.timestampMs;
  if (typeof payload.mocked === "boolean") location.mocked = payload.mocked;
  return location;
}
